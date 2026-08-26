/**
 * Importa os cadastros de assistidos a partir da planilha do SOS.
 *
 * Uso:
 *   node src/database/importar-planilha.js <arquivo.xlsx> [opções]
 *
 * Opções:
 *   --aba "Usuários Semear"   importa apenas essa aba (padrão: todas)
 *   --unidade SEMEAR          força a unidade, quando o nome da aba não a identifica
 *   --aplicar                 grava no banco (sem esta opção, apenas simula)
 *   --limite 20               processa só as N primeiras linhas, para testar
 *   --detalhar                mostra os primeiros registros já convertidos, campo a campo
 *   --colunas                 só diagnostica: lista os cabeçalhos, para onde vão
 *                             e quantas linhas têm conteúdo (não mostra dados)
 *
 * Sem --aplicar nada é gravado: o script lê a planilha, valida linha a linha e
 * mostra o que faria. Só rode com --aplicar depois de conferir a simulação.
 */

const path = require('path');
const fs = require('fs');

const envPath = fs.existsSync(path.join(__dirname, '../../.env'))
  ? path.join(__dirname, '../../.env')
  : path.join(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });

const XLSX = require('xlsx');
const { supabase } = require('../config/database');
const { slugify } = require('../utils/slugify');
const { regraDaColuna, normalizarCabecalho, unidadeDaAba } = require('./mapa-planilha');

// ---------------------------------------------------------------- utilidades

const semAcento = (texto) => String(texto || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim();

const textoOuNulo = (valor) => {
  const t = String(valor ?? '').trim();
  return t.length > 0 ? t : null;
};

/** Datas chegam como número serial do Excel, objeto Date ou texto em vários formatos. */
function paraData(valor, avisos, coluna) {
  if (valor === null || valor === undefined || valor === '') return null;

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    // Serial do Excel: dias desde 30/12/1899.
    const ms = Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000;
    return new Date(ms).toISOString().slice(0, 10);
  }

  const texto = String(valor).trim();

  let m = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const [, d, mes, a] = m;
    const ano = a.length === 2 ? Number(a) + (Number(a) > 30 ? 1900 : 2000) : Number(a);
    const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return dataValida(iso) ? iso : registrarInvalida(texto, avisos, coluna);
  }

  m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const iso = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    return dataValida(iso) ? iso : registrarInvalida(texto, avisos, coluna);
  }

  return registrarInvalida(texto, avisos, coluna);
}

function dataValida(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

function registrarInvalida(texto, avisos, coluna) {
  avisos.push(`${coluna}: data não reconhecida ("${texto}") — campo ficou vazio`);
  return null;
}

const soDigitos = (valor) => {
  const d = String(valor ?? '').replace(/\D/g, '');
  return d.length > 0 ? d : null;
};

function paraTelefone(valor) {
  const d = soDigitos(valor);
  if (!d) return null;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return textoOuNulo(valor);
}

// A ordem é a da semana: também define o resultado de intervalos como "seg a sex".
const DIAS = [
  [/\b(seg|segunda|2a|2ª)/, 'seg'],
  [/\b(ter|terca|3a|3ª)/, 'ter'],
  [/\b(qua|quarta|4a|4ª)/, 'qua'],
  [/\b(qui|quinta|5a|5ª)/, 'qui'],
  [/\b(sex|sexta|6a|6ª)/, 'sex'],
  [/\b(sab|sabado)/, 'sab'],
  [/\b(dom|domingo)/, 'dom'],
];

const ORDEM_DIAS = DIAS.map(([, dia]) => dia);

/** Reconhece "Seg e Qua", "segundas e quartas", "2ª/4ª" e intervalos como "seg a sex". */
function paraDias(valor) {
  const texto = semAcento(valor).replace(/[/,;+]/g, ' ');
  if (!texto) return [];

  const intervalo = texto.match(/(.+?)\s+(?:a|as|ate)\s+(.+)/);
  if (intervalo) {
    const inicio = ORDEM_DIAS.indexOf(diaDoTexto(intervalo[1]));
    const fim = ORDEM_DIAS.indexOf(diaDoTexto(intervalo[2]));
    if (inicio !== -1 && fim !== -1 && fim > inicio) return ORDEM_DIAS.slice(inicio, fim + 1);
  }

  return DIAS.filter(([regex]) => regex.test(texto)).map(([, dia]) => dia);
}

function diaDoTexto(trecho) {
  const achado = DIAS.find(([regex]) => regex.test(trecho.trim()));
  return achado ? achado[1] : null;
}

function paraTurnos(valor) {
  const texto = semAcento(valor);
  if (!texto) return [];
  const turnos = [];
  if (/manha|matutino/.test(texto)) turnos.push('manha');
  if (/tarde|vespertino/.test(texto)) turnos.push('tarde');
  return turnos;
}

const ETNIAS = [
  [/branc/, 'Branca'],
  [/pret|negr/, 'Preta'],
  [/pard/, 'Parda'],
  [/amarel/, 'Amarela'],
  [/indigen|indio/, 'Indigena'],
];

function paraEtnia(valor, avisos) {
  const texto = semAcento(valor);
  if (!texto) return null;
  const achado = ETNIAS.find(([regex]) => regex.test(texto));
  if (achado) return achado[1];
  avisos.push(`ETNIA: valor "${valor}" não corresponde às opções do sistema — gravado como "Outro"`);
  return 'Outro';
}

/**
 * A coluna SITUAÇÃO pode trazer prioridade no SCFV ou situação do assistido.
 * Decide pelo conteúdo e devolve o campo correspondente.
 */
function paraSituacao(valor, avisos) {
  const texto = semAcento(valor);
  if (!texto) return {};

  if (/nao\s*priorit|n\s*priorit/.test(texto)) return { cras_status: 'nao_prioritario' };
  if (/priorit/.test(texto)) return { cras_status: 'prioritario' };
  if (/^(ativ|frequent|em atendimento)/.test(texto)) return { is_active: true };
  if (/(inativ|desligad|desistente|evadid|transferid)/.test(texto)) return { is_active: false };

  avisos.push(`SITUAÇÃO: valor "${valor}" não reconhecido — nem prioridade, nem situação`);
  return {};
}

// ------------------------------------------------------------------- planilha

/** Localiza a linha de cabeçalho e devolve as linhas como objetos. */
function lerAba(planilha, nomeAba) {
  const matriz = XLSX.utils.sheet_to_json(planilha.Sheets[nomeAba], {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
    cellDates: true,
  });

  const indiceCabecalho = matriz.findIndex((linha) =>
    (linha || []).some((celula) => normalizarCabecalho(celula) === 'NOME')
  );

  if (indiceCabecalho === -1) {
    return { erro: 'não foi encontrada uma coluna NOME', linhas: [], cabecalhos: [] };
  }

  const cabecalhos = (matriz[indiceCabecalho] || []).map((c) => normalizarCabecalho(c));
  const linhas = matriz.slice(indiceCabecalho + 1).map((linha, i) => {
    const registro = { __linha: indiceCabecalho + i + 2 };
    cabecalhos.forEach((cabecalho, coluna) => {
      if (cabecalho) registro[cabecalho] = (linha || [])[coluna] ?? null;
    });
    return registro;
  });

  return { erro: null, linhas, cabecalhos: cabecalhos.filter(Boolean) };
}

/** Converte uma linha da planilha no registro a ser gravado. */
function montarCadastro(linha, turmasDaUnidade) {
  const avisos = [];
  const cadastro = {};
  const anexos = [];
  let nomeGrupoScfv = null;
  let grupoSisc = null;

  Object.entries(linha).forEach(([cabecalho, valor]) => {
    if (cabecalho === '__linha') return;
    const regra = regraDaColuna(cabecalho);
    if (!regra || regra.ignorar) return;

    if (regra.anexar) {
      const t = valor instanceof Date ? paraData(valor, avisos, cabecalho) : textoOuNulo(valor);
      if (t) anexos.push(`${regra.rotulo}: ${t}`);
      return;
    }

    switch (regra.tipo) {
      case 'data':
        cadastro[regra.campo] = paraData(valor, avisos, cabecalho);
        break;
      case 'digitos':
        cadastro[regra.campo] = soDigitos(valor);
        break;
      case 'telefone':
        cadastro[regra.campo] = paraTelefone(valor);
        break;
      case 'dias':
        cadastro[regra.campo] = paraDias(valor);
        break;
      case 'turnos':
        cadastro[regra.campo] = paraTurnos(valor);
        break;
      case 'etnia':
        cadastro[regra.campo] = paraEtnia(valor, avisos);
        break;
      case 'situacao':
        Object.assign(cadastro, paraSituacao(valor, avisos));
        break;
      case 'turmaOuTexto':
        // Resolvido depois do laço, quando o turno já é conhecido.
        grupoSisc = { campo: regra.campo, texto: textoOuNulo(valor), cabecalho };
        break;
      default:
        cadastro[regra.campo] = textoOuNulo(valor);
    }

    if (regra.tambemTurma) {
      nomeGrupoScfv = textoOuNulo(valor);
    }
  });

  // O turno ajuda a escolher entre turmas de mesmo nome em períodos diferentes.
  const turno = (cadastro.scfv_shift || [])[0] || null;

  // Turma do assistido, a partir do nome do grupo no SCFV.
  if (nomeGrupoScfv) {
    const { slug, motivo } = resolverTurma(nomeGrupoScfv, turmasDaUnidade, turno);
    if (slug) cadastro.class_group = slug;
    else avisos.push(`GRUPO NO SCFV: ${motivo} ("${nomeGrupoScfv}") — assistido ficará sem turma`);
  }

  // O grupo do SISC nem sempre corresponde a uma turma do SOS. Quando
  // corresponder, grava o código da turma (é assim que o sistema compara as
  // duas informações); quando não, preserva o texto original.
  if (grupoSisc) {
    const { slug } = resolverTurma(grupoSisc.texto, turmasDaUnidade, turno);
    cadastro[grupoSisc.campo] = slug || grupoSisc.texto;
  }

  if (anexos.length > 0) {
    cadastro.advisor_notes = [cadastro.advisor_notes, ...anexos].filter(Boolean).join(' | ');
  }

  delete cadastro.situacao;
  return { cadastro, avisos };
}

/** Remove o algarismo romano final: "Estrela da Manhã II" → "estrela da manha". */
function nomeBase(texto) {
  return semAcento(texto).replace(/\s+/g, ' ').replace(/\s+(i{1,3}|iv|v)$/, '').trim();
}

/**
 * Casa o nome do grupo da planilha com uma turma cadastrada na unidade.
 *
 * Várias unidades repetem o mesmo nome de turma na manhã e na tarde — no
 * Sonhar como "Estrela da Manhã I" e "II", no Semear como "Caminho Jovem" nos
 * dois períodos. Quando o nome sozinho não decide, o turno da planilha decide.
 *
 * @returns {{ slug: string|null, motivo: string|null }}
 */
function resolverTurma(valor, turmas, turno = null) {
  const texto = textoOuNulo(valor);
  if (!texto) return { slug: null, motivo: null };

  const porSlug = turmas.find((t) => t.slug === slugify(texto));
  if (porSlug) return { slug: porSlug.slug, motivo: null };

  const alvo = semAcento(texto).replace(/\s+/g, ' ');
  const porNome = turmas.filter((t) => semAcento(t.name).replace(/\s+/g, ' ') === alvo);
  const candidatas = porNome.length > 0
    ? porNome
    : turmas.filter((t) => nomeBase(t.name) === nomeBase(texto));

  if (candidatas.length === 1) return { slug: candidatas[0].slug, motivo: null };

  if (candidatas.length > 1) {
    const doTurno = turno ? candidatas.filter((t) => t.period === turno) : [];
    if (doTurno.length === 1) return { slug: doTurno[0].slug, motivo: null };
    return {
      slug: null,
      motivo: `o nome corresponde a ${candidatas.length} turmas (${candidatas.map((t) => t.name).join(', ')}) e o turno não desempatou`,
    };
  }

  return { slug: null, motivo: 'turma não existe nesta unidade' };
}

/**
 * Diagnóstico das colunas da aba: o que cada cabeçalho vira no cadastro e
 * quantas linhas têm conteúdo. Mostra a contagem, nunca o conteúdo.
 */
function relatorioDeColunas(cabecalhos, linhas) {
  console.log(`\n  Colunas encontradas (${cabecalhos.length}) — ${linhas.length} linhas de dados:\n`);
  console.log(`  ${'COLUNA NA PLANILHA'.padEnd(34)} ${'VAI PARA'.padEnd(24)} PREENCHIDAS`);
  console.log(`  ${'-'.repeat(34)} ${'-'.repeat(24)} -----------`);

  cabecalhos.forEach((cabecalho) => {
    const preenchidas = linhas.filter((linha) => {
      const v = linha[cabecalho];
      return v !== null && v !== undefined && String(v).trim() !== '';
    }).length;

    const regra = regraDaColuna(cabecalho);
    let destino;
    if (!regra) destino = '(não mapeada)';
    else if (regra.ignorar) destino = '(sem campo no sistema)';
    else if (regra.anexar) destino = `${regra.anexar} (anexado)`;
    else destino = regra.campo;

    console.log(`  ${cabecalho.slice(0, 34).padEnd(34)} ${destino.padEnd(24)} ${String(preenchidas).padStart(6)}`);
  });
}

/** Remove do registro os campos sem conteúdo. */
function somentePreenchidos(cadastro) {
  return Object.fromEntries(
    Object.entries(cadastro).filter(([, valor]) => {
      if (valor === null || valor === undefined) return false;
      if (Array.isArray(valor)) return valor.length > 0;
      return String(valor).trim() !== '';
    })
  );
}

/** Quantas linhas resultaram em cada campo preenchido — revela perdas silenciosas. */
function relatorioDePreenchimento(registros) {
  if (registros.length === 0) return;

  const contagem = new Map();
  registros.forEach(({ cadastro }) => {
    Object.entries(cadastro).forEach(([campo, valor]) => {
      if (campo === 'program_id') return;
      const vazio = valor === null || valor === undefined
        || (Array.isArray(valor) && valor.length === 0)
        || String(valor).trim() === '';
      if (!vazio) contagem.set(campo, (contagem.get(campo) || 0) + 1);
    });
  });

  console.log(`\n  Campos preenchidos (de ${registros.length} cadastros):`);
  [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([campo, total]) => {
      const alerta = total < registros.length ? `  ← faltou em ${registros.length - total}` : '';
      console.log(`    ${campo.padEnd(24)} ${String(total).padStart(4)}${alerta}`);
    });
}

// ---------------------------------------------------------------- banco

async function carregarUnidades() {
  const { data, error } = await supabase.from('programs').select('id, code, name');
  if (error) throw error;
  return data || [];
}

async function carregarTurmas(programId) {
  const { data, error } = await supabase
    .from('class_groups')
    .select('slug, name, period')
    .eq('program_id', programId);
  if (error) throw error;
  return data || [];
}

async function carregarExistentes(programId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, nis_user, birth_date')
    .eq('program_id', programId);
  if (error) throw error;
  return data || [];
}

/** Procura o assistido já cadastrado: primeiro pelo NIS, depois pelo nome. */
function encontrarExistente(cadastro, existentes) {
  if (cadastro.nis_user) {
    const porNis = existentes.find((e) => e.nis_user && soDigitos(e.nis_user) === cadastro.nis_user);
    if (porNis) return porNis;
  }
  const nome = semAcento(cadastro.full_name).replace(/\s+/g, ' ');
  return existentes.find((e) => semAcento(e.full_name).replace(/\s+/g, ' ') === nome) || null;
}

// ---------------------------------------------------------------- execução

function lerArgumentos(argv) {
  const opcoes = {
    arquivo: null, aba: null, unidade: null,
    aplicar: false, limite: null, detalhar: false, colunas: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--aplicar') opcoes.aplicar = true;
    else if (arg === '--detalhar') opcoes.detalhar = true;
    else if (arg === '--colunas') opcoes.colunas = true;
    else if (arg === '--aba') opcoes.aba = argv[++i];
    else if (arg === '--unidade') opcoes.unidade = argv[++i];
    else if (arg === '--limite') opcoes.limite = Number(argv[++i]);
    else if (!arg.startsWith('--') && !opcoes.arquivo) opcoes.arquivo = arg;
  }
  return opcoes;
}

async function processarAba(planilha, nomeAba, unidades, opcoes) {
  const codigoAba = opcoes.unidade || unidadeDaAba(nomeAba);
  const unidade = unidades.find(
    (u) => semAcento(u.code) === semAcento(codigoAba) || semAcento(u.name) === semAcento(codigoAba)
  );

  console.log(`\n${'='.repeat(70)}\nAba: "${nomeAba}"`);

  if (!unidade) {
    console.log(`  ✗ unidade não identificada a partir de "${codigoAba}". Use --unidade SEMEAR.`);
    return { lidas: 0, novos: 0, atualizados: 0, ignorados: 0, avisos: 0 };
  }
  console.log(`  Unidade: ${unidade.name} (${unidade.code})`);

  const { erro, linhas, cabecalhos } = lerAba(planilha, nomeAba);
  if (erro) {
    console.log(`  ✗ ${erro}`);
    return { lidas: 0, novos: 0, atualizados: 0, ignorados: 0, avisos: 0 };
  }

  const desconhecidas = cabecalhos.filter((c) => !regraDaColuna(c));
  if (desconhecidas.length > 0) {
    console.log(`  Colunas sem mapeamento (serão ignoradas): ${desconhecidas.join(', ')}`);
  }

  if (opcoes.colunas) {
    relatorioDeColunas(cabecalhos, linhas);
    return { lidas: 0, novos: 0, atualizados: 0, ignorados: 0, avisos: 0 };
  }

  const turmas = await carregarTurmas(unidade.id);
  const existentes = await carregarExistentes(unidade.id);
  console.log(`  Turmas cadastradas: ${turmas.length}  ·  Assistidos já no sistema: ${existentes.length}`);

  const selecionadas = opcoes.limite ? linhas.slice(0, opcoes.limite) : linhas;
  const paraInserir = [];
  const paraAtualizar = [];
  const problemas = [];
  let ignorados = 0;

  selecionadas.forEach((linha) => {
    const { cadastro, avisos } = montarCadastro(linha, turmas);

    if (!cadastro.full_name) {
      ignorados += 1;
      return;
    }

    cadastro.program_id = unidade.id;

    const existente = encontrarExistente(cadastro, existentes);
    if (existente) paraAtualizar.push({ id: existente.id, cadastro, linha: linha.__linha });
    else paraInserir.push({ cadastro, linha: linha.__linha });

    if (avisos.length > 0) {
      problemas.push(`  linha ${linha.__linha} (${cadastro.full_name}): ${avisos.join('; ')}`);
    }
  });

  console.log(`  Linhas lidas: ${selecionadas.length}`);
  console.log(`  A inserir: ${paraInserir.length}  ·  A atualizar: ${paraAtualizar.length}  ·  Sem nome (ignoradas): ${ignorados}`);

  if (problemas.length > 0) {
    console.log(`\n  Pontos de atenção (${problemas.length}):`);
    problemas.slice(0, 40).forEach((linha) => console.log(linha));
    if (problemas.length > 40) console.log(`  … e mais ${problemas.length - 40}.`);
  }

  const semTurma = paraInserir.concat(paraAtualizar).filter((r) => !r.cadastro.class_group).length;
  if (semTurma > 0) console.log(`\n  ${semTurma} cadastro(s) ficarão sem turma vinculada.`);

  relatorioDePreenchimento(paraInserir.concat(paraAtualizar));

  if (opcoes.detalhar) {
    console.log('\n  Primeiros registros convertidos:');
    paraInserir.concat(paraAtualizar).slice(0, 3).forEach((registro) => {
      const preenchidos = Object.entries(registro.cadastro)
        .filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));
      console.log(`\n  linha ${registro.linha}:`);
      preenchidos.forEach(([campo, valor]) => {
        console.log(`    ${campo.padEnd(22)} ${Array.isArray(valor) ? valor.join(', ') : valor}`);
      });
    });
  }

  if (!opcoes.aplicar) {
    console.log('\n  SIMULAÇÃO — nada foi gravado. Rode de novo com --aplicar para efetivar.');
    return {
      lidas: selecionadas.length,
      novos: paraInserir.length,
      atualizados: paraAtualizar.length,
      ignorados,
      avisos: problemas.length,
    };
  }

  for (let i = 0; i < paraInserir.length; i += 100) {
    const lote = paraInserir.slice(i, i + 100).map((r) => r.cadastro);
    const { error } = await supabase.from('students').insert(lote);
    if (error) throw new Error(`falha ao inserir lote a partir da linha ${paraInserir[i].linha}: ${error.message}`);
  }

  for (const registro of paraAtualizar) {
    // Na atualização só vão os campos com conteúdo: coluna vazia na planilha
    // não apaga o que já está no sistema, inclusive o que foi digitado à mão.
    const alteracoes = somentePreenchidos(registro.cadastro);
    const { error } = await supabase.from('students').update(alteracoes).eq('id', registro.id);
    if (error) throw new Error(`falha ao atualizar a linha ${registro.linha}: ${error.message}`);
  }

  console.log(`\n  ✓ ${paraInserir.length} inseridos e ${paraAtualizar.length} atualizados.`);
  return {
    lidas: selecionadas.length,
    novos: paraInserir.length,
    atualizados: paraAtualizar.length,
    ignorados,
    avisos: problemas.length,
  };
}

async function principal() {
  const opcoes = lerArgumentos(process.argv.slice(2));

  if (!opcoes.arquivo) {
    console.error('Informe o arquivo. Ex.: node src/database/importar-planilha.js planilha.xlsx');
    process.exit(1);
  }
  if (!fs.existsSync(opcoes.arquivo)) {
    console.error(`Arquivo não encontrado: ${opcoes.arquivo}`);
    process.exit(1);
  }

  const planilha = XLSX.readFile(opcoes.arquivo, { cellDates: true });
  const abas = opcoes.aba ? [opcoes.aba] : planilha.SheetNames;

  console.log(`Arquivo: ${path.basename(opcoes.arquivo)}`);
  console.log(`Abas a processar: ${abas.join(', ')}`);
  console.log(opcoes.aplicar ? 'Modo: GRAVAÇÃO' : 'Modo: simulação (nada será gravado)');

  const unidades = await carregarUnidades();
  const total = { lidas: 0, novos: 0, atualizados: 0, ignorados: 0, avisos: 0 };

  for (const nomeAba of abas) {
    if (!planilha.Sheets[nomeAba]) {
      console.log(`\nAba "${nomeAba}" não existe no arquivo.`);
      continue;
    }
    const parcial = await processarAba(planilha, nomeAba, unidades, opcoes);
    Object.keys(total).forEach((chave) => { total[chave] += parcial[chave]; });
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Total — linhas: ${total.lidas} · inserir: ${total.novos} · atualizar: ${total.atualizados} · ignoradas: ${total.ignorados} · com aviso: ${total.avisos}`);
}

principal().catch((erro) => {
  console.error('\nErro na importação:', erro.message);
  process.exit(1);
});
