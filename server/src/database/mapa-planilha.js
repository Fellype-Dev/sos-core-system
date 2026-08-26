/**
 * Mapa entre as colunas da planilha do SOS e os campos do cadastro de assistidos.
 *
 * A chave é o texto do cabeçalho na planilha. A comparação ignora acentos,
 * maiúsculas, pontos finais e espaços repetidos — "DATA DE NASCIM." e
 * "Data de Nascim" chegam ao mesmo lugar.
 *
 * Formas aceitas no valor:
 *   'campo'                → copia o texto para a coluna indicada
 *   { campo, tipo }        → converte antes de gravar (ver tipos abaixo)
 *   { anexar, rotulo }     → acrescenta o conteúdo às anotações da equipe
 *   { ignorar: 'motivo' }  → coluna conhecida que não vai para o banco
 *
 * Tipos disponíveis: texto, data, digitos, telefone, dias, turnos, etnia,
 * situacao e turma.
 */

const COLUNAS = {
  'NOME': 'full_name',
  'DATA DE INSERCAO': { campo: 'scfv_insertion_date', tipo: 'data' },
  'FAIXA ETARIA': { ignorar: 'A faixa etária é atributo da turma, não do assistido.' },
  'SITUACAO': { campo: 'situacao', tipo: 'situacao' },
  'MOTIVO DA VINCULACAO': 'cras_link_reason',
  'CRAS CREAS': 'cras_referral_agency',
  'TECNICO': 'cras_technician',
  'G': { ignorar: 'Coluna não identificada. Informe o significado para mapeá-la.' },
  'NIS': { campo: 'nis_user', tipo: 'digitos' },
  'DATA DE NASCIM': { campo: 'birth_date', tipo: 'data' },
  'MES': { ignorar: 'Derivado da data de nascimento.' },
  'CPF': { campo: 'cpf_cns', tipo: 'digitos' },
  'ETNIA': { campo: 'color', tipo: 'etnia' },
  'GENITORA/RESPONSAVEL': 'guardian_name',
  'DIA DE FREQUENCIA NO SCFV': { campo: 'scfv_frequency_days', tipo: 'dias' },
  'TURNO': { campo: 'scfv_shift', tipo: 'turnos' },
  'NOME DO GRUPO NO SCFV': { campo: 'scfv_group', tipo: 'texto', tambemTurma: true },
  'ORIENTADOR (A)': 'scfv_instructor',
  'FONE': { campo: 'guardian_phone', tipo: 'telefone' },
  'ENDERECO': 'address_street',
  'BAIRRO': 'address_neighborhood',
  'ESCOLA': 'school_name',
  'DATA VINCULACAO NO SISC': { campo: 'sisc_link_date', tipo: 'data' },
  'GRUPO NO SISC': { campo: 'sisc_group', tipo: 'turmaOuTexto' },
  'ESCOLARIDADE': 'school_grade',

  // Colunas da aba do Viver que ainda não têm campo próprio no cadastro.
  // Vão para as anotações da equipe, com rótulo, para não se perderem — e em
  // formato que permite extraí-las depois, se ganharem coluna própria.
  'RG': { anexar: 'advisor_notes', rotulo: 'RG' },
  'ESTADO CIVIL': { anexar: 'advisor_notes', rotulo: 'Estado civil' },
  'TRANSPORTE': { anexar: 'advisor_notes', rotulo: 'Transporte' },

  'DT REUNIAO CRAS': { anexar: 'advisor_notes', rotulo: 'Reunião no CRAS' },
  'ANOTACOES GERAIS DA EQUIPE': 'advisor_notes',
  'ULTIMA ATUALIZACAO': { campo: 'scfv_update_date', tipo: 'data' },
};

/**
 * Outros nomes usados para a mesma coluna. Cada aba da planilha escreve o
 * cabeçalho à sua maneira; aqui as variações apontam para a coluna oficial.
 */
const SINONIMOS = {
  'NOME': ['NOME COMPLETO', 'NOME DO USUARIO', 'NOME DO ASSISTIDO', 'USUARIO', 'USUARIOS'],
  'DATA DE INSERCAO': ['DATA INSERCAO', 'DT INSERCAO', 'DATA DE INSERCAO NO SCFV', 'INSERCAO', 'DATA DE ENTRADA'],
  'FAIXA ETARIA': ['FAIXA ETARIA/PUBLICO'],
  'SITUACAO': ['SITUACAO NO SCFV', 'STATUS', 'SITUACAO ATUAL'],
  'MOTIVO DA VINCULACAO': ['MOTIVO', 'MOTIVO DO VINCULO', 'MOTIVO DA VINCULACAO AO SCFV', 'MOTIVO DA INSERCAO'],
  'CRAS CREAS': ['CRAS', 'CREAS', 'CRAS/CREAS', 'CRAS - CREAS', 'ORGAO ENCAMINHADOR', 'ORGAO DE ENCAMINHAMENTO'],
  'TECNICO': ['TECNICO (A)', 'TECNICA', 'TECNICO RESPONSAVEL', 'TECNICO DE REFERENCIA'],
  'NIS': ['N NIS', 'NIS DO USUARIO', 'NIS USUARIO', 'NIS/NIT'],
  'DATA DE NASCIM': [
    'DATA DE NASCIMENTO', 'DATA NASCIMENTO', 'DATA NASC', 'DATA DE NASC',
    'DT NASCIMENTO', 'DT NASC', 'DT DE NASCIMENTO', 'NASCIMENTO', 'NASC',
  ],
  'CPF': ['CPF/CNS', 'CPF CNS', 'CPF/SUS', 'CPF OU CNS'],
  'ETNIA': ['COR', 'COR/ETNIA', 'COR / ETNIA', 'RACA/COR', 'RACA'],
  'GENITORA/RESPONSAVEL': [
    'GENITORA', 'RESPONSAVEL', 'GENITORA / RESPONSAVEL', 'MAE/RESPONSAVEL',
    'NOME DA GENITORA', 'NOME DO RESPONSAVEL', 'RESPONSAVEL LEGAL',
  ],
  'DIA DE FREQUENCIA NO SCFV': ['DIA DE FREQUENCIA', 'DIAS DE FREQUENCIA', 'DIA DA SEMANA', 'DIAS', 'FREQUENCIA'],
  'TURNO': ['TURNO NO SCFV', 'PERIODO', 'PERIODO DE FREQUENCIA NO SCFV', 'PERIODO NO SCFV'],
  'ESCOLARIDADE': ['SERIE', 'SERIE/ANO ESCOLAR', 'ANO ESCOLAR', 'GRAU DE INSTRUCAO'],
  'NOME DO GRUPO NO SCFV': ['GRUPO NO SCFV', 'GRUPO SCFV', 'NOME DO GRUPO', 'GRUPO', 'TURMA', 'NOME DA TURMA'],
  'ORIENTADOR (A)': ['ORIENTADOR', 'ORIENTADORA', 'ORIENTADOR(A)', 'ORIENTADOR (A) TECNICO (A)'],
  'FONE': ['TELEFONE', 'CELULAR', 'CONTATO', 'FONE/CONTATO', 'TEL'],
  'ENDERECO': [
    'ENDERECO RESIDENCIAL', 'RUA', 'LOGRADOURO',
    'ENDERECO/PONTO DE REFERENCIA', 'ENDERECO E PONTO DE REFERENCIA', 'ENDERECO/REFERENCIA',
  ],
  'BAIRRO': ['BAIRRO/LOCALIDADE', 'LOCALIDADE'],
  'ESCOLA': ['NOME DA ESCOLA', 'ESCOLA QUE FREQUENTA'],
  'DATA VINCULACAO NO SISC': [
    'DATA DE VINCULACAO NO SISC', 'DT VINCULACAO SISC', 'DT VINCULACAO NO SISC',
    'VINCULACAO NO SISC', 'DATA SISC', 'DATA DE VINCULACAO SISC', 'DATA DO SISC', 'DT SISC',
  ],
  'GRUPO NO SISC': ['GRUPO SISC', 'NOME DO GRUPO NO SISC', 'SISC'],
  'DT REUNIAO CRAS': ['DATA REUNIAO CRAS', 'REUNIAO CRAS', 'DT DE REUNIAO CRAS'],
  'ANOTACOES GERAIS DA EQUIPE': ['ANOTACOES', 'ANOTACOES GERAIS', 'OBSERVACOES', 'OBS', 'OBSERVACAO'],
  'ULTIMA ATUALIZACAO': ['DATA DE ATUALIZACAO', 'ATUALIZACAO', 'ULT ATUALIZACAO', 'DT ATUALIZACAO'],
};

/** Normaliza o texto de um cabeçalho para comparação. */
function normalizarCabecalho(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nome da unidade a partir do nome da aba: "Usuários Semear" → "SEMEAR". */
function unidadeDaAba(nomeAba) {
  const limpo = normalizarCabecalho(nomeAba).replace(/USUARIOS?/g, '').trim();
  return limpo || null;
}

const COLUNAS_NORMALIZADAS = Object.entries(COLUNAS).reduce((acc, [chave, valor]) => {
  const regra = typeof valor === 'string' ? { campo: valor, tipo: 'texto' } : valor;
  acc[normalizarCabecalho(chave)] = regra;
  (SINONIMOS[chave] || []).forEach((sinonimo) => {
    const alternativa = normalizarCabecalho(sinonimo);
    if (!acc[alternativa]) acc[alternativa] = regra;
  });
  return acc;
}, {});

/** Só as letras do cabeçalho: descarta números e pontuação soltos da planilha. */
function apenasLetras(texto) {
  return normalizarCabecalho(texto).replace(/[^A-Z]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const COLUNAS_FROUXAS = Object.entries(COLUNAS_NORMALIZADAS).reduce((acc, [chave, regra]) => {
  const frouxa = apenasLetras(chave);
  if (frouxa && !acc[frouxa]) acc[frouxa] = regra;
  return acc;
}, {});

/**
 * Regra de uma coluna. Tenta o nome exato e, se não achar, o nome sem números
 * e pontuação — cabeçalhos como "FAIXA ETARIA5," caem no lugar certo.
 */
function regraDaColuna(cabecalho) {
  return COLUNAS_NORMALIZADAS[cabecalho] || COLUNAS_FROUXAS[apenasLetras(cabecalho)] || null;
}

module.exports = {
  COLUNAS,
  SINONIMOS,
  COLUNAS_NORMALIZADAS,
  regraDaColuna,
  normalizarCabecalho,
  unidadeDaAba,
};
