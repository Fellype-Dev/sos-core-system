// Ilustrações das telas do SIGU para o Manual do Usuário.
// Reproduzem o layout real da interface, com numeração de referência usada no texto.

const NAVY = '#1a3a4a';
const INDIGO = '#4f46e5';
const SLATE = '#64748b';
const CINZA = '#94a3b8';
const BORDA = '#cbd5e1';
const FUNDO = '#f8fafc';
const VERDE = '#059669';
const VERMELHO = '#dc2626';
const AMBAR = '#b45309';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function txt(x, y, t, o = {}) {
  const { size = 10, bold = false, cor = '#0f172a', anchor = 'start', italic = false } = o;
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial" font-size="${size}"${bold ? ' font-weight="bold"' : ''}${italic ? ' font-style="italic"' : ''} fill="${cor}">${esc(t)}</text>`;
}

/** Moldura de janela do navegador, com barra de título. */
function janela(x, y, w, h, titulo) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#ffffff" stroke="${BORDA}" stroke-width="1.6"/>`;
  s += `<path d="M ${x} ${y + 26} L ${x} ${y + 10} Q ${x} ${y} ${x + 10} ${y} L ${x + w - 10} ${y} Q ${x + w} ${y} ${x + w} ${y + 10} L ${x + w} ${y + 26} Z" fill="#f1f5f9"/>`;
  s += `<line x1="${x}" y1="${y + 26}" x2="${x + w}" y2="${y + 26}" stroke="${BORDA}" stroke-width="1.2"/>`;
  [0, 1, 2].forEach((i) => {
    s += `<circle cx="${x + 16 + i * 12}" cy="${y + 13}" r="3.6" fill="${CINZA}"/>`;
  });
  s += txt(x + w / 2, y + 17, titulo, { size: 9.5, bold: true, cor: SLATE, anchor: 'middle' });
  return s;
}

/** Cartão interno com título e, opcionalmente, subtítulo. */
function cartao(x, y, w, h, titulo, sub) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#ffffff" stroke="${BORDA}" stroke-width="1.2"/>`;
  if (titulo) s += txt(x + 12, y + 19, titulo, { size: 10.5, bold: true, cor: NAVY });
  if (sub) s += txt(x + 12, y + 33, sub, { size: 8.5, cor: CINZA });
  return s;
}

/** Campo de formulário: rótulo em caixa alta e caixa de entrada. */
function campo(x, y, w, rotulo, valor, alturaCaixa = 22) {
  let s = txt(x, y, rotulo.toUpperCase(), { size: 7.5, bold: true, cor: CINZA });
  s += `<rect x="${x}" y="${y + 5}" width="${w}" height="${alturaCaixa}" rx="5" fill="#ffffff" stroke="${BORDA}" stroke-width="1.1"/>`;
  if (valor) s += txt(x + 8, y + 5 + alturaCaixa / 2 + 3.5, valor, { size: 9, cor: valor.startsWith('—') ? CINZA : '#334155' });
  return s;
}

/** Campo de seleção: igual ao campo, com seta à direita. */
function selecao(x, y, w, rotulo, valor) {
  let s = campo(x, y, w, rotulo, valor);
  const cx = x + w - 12;
  const cy = y + 16;
  s += `<path d="M ${cx - 4} ${cy - 2} L ${cx} ${cy + 2.5} L ${cx + 4} ${cy - 2}" fill="none" stroke="${SLATE}" stroke-width="1.4"/>`;
  return s;
}

function botao(x, y, w, texto, { cor = INDIGO, vazado = false, h = 26 } = {}) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${vazado ? '#ffffff' : cor}" stroke="${cor}" stroke-width="1.3"/>`;
  s += txt(x + w / 2, y + h / 2 + 3.5, texto, { size: 9, bold: true, cor: vazado ? cor : '#ffffff', anchor: 'middle' });
  return s;
}

function pilula(x, y, w, texto, ativo = false, cor = INDIGO) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="22" rx="11" fill="${ativo ? '#ffffff' : 'transparent'}" stroke="${ativo ? BORDA : 'none'}" stroke-width="1"/>`;
  s += txt(x + w / 2, y + 15, texto, { size: 9, bold: true, cor: ativo ? cor : SLATE, anchor: 'middle' });
  return s;
}

function etiqueta(x, y, w, texto, cor, fundo) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="${fundo}" stroke="${cor}" stroke-width="0.9"/>`;
  s += txt(x + w / 2, y + 11.5, texto, { size: 7.5, bold: true, cor, anchor: 'middle' });
  return s;
}

/** Tabela com cabeçalho e linhas. */
function tabela(x, y, larguras, cabecalhos, linhas, { alturaLinha = 26 } = {}) {
  const w = larguras.reduce((a, b) => a + b, 0);
  let s = `<rect x="${x}" y="${y}" width="${w}" height="24" fill="#f8fafc"/>`;
  let cx = x;
  cabecalhos.forEach((c, i) => {
    s += txt(cx + 8, y + 16, c.toUpperCase(), { size: 7.5, bold: true, cor: CINZA });
    cx += larguras[i];
  });
  s += `<line x1="${x}" y1="${y + 24}" x2="${x + w}" y2="${y + 24}" stroke="${BORDA}" stroke-width="1"/>`;
  linhas.forEach((linha, j) => {
    const ly = y + 24 + j * alturaLinha;
    cx = x;
    linha.forEach((valor, i) => {
      if (typeof valor === 'function') s += valor(cx + 8, ly + alturaLinha / 2);
      else if (valor) s += txt(cx + 8, ly + alturaLinha / 2 + 3.5, valor, { size: 9, cor: i === 0 ? '#0f172a' : '#475569', bold: i === 0 });
      cx += larguras[i];
    });
    if (j < linhas.length - 1) {
      s += `<line x1="${x}" y1="${ly + alturaLinha}" x2="${x + w}" y2="${ly + alturaLinha}" stroke="#e2e8f0" stroke-width="0.9"/>`;
    }
  });
  return s;
}

/** Marcador numerado usado nas referências do texto. */
function nota(n, x, y) {
  return `<g><circle cx="${x}" cy="${y}" r="10" fill="${INDIGO}" stroke="#ffffff" stroke-width="2"/>${txt(x, y + 3.5, String(n), { size: 10, bold: true, cor: '#ffffff', anchor: 'middle' })}</g>`;
}

function svg(w, h, corpo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#ffffff"/>${corpo}</svg>`;
}

// ---------------- 1. Tela de acesso ----------------
function telaLogin() {
  const W = 900;
  const H = 470;
  let s = janela(20, 20, 860, 430, 'SIGU · Serviço de Obras Sociais');

  // Painel esquerdo (apresentação)
  s += `<rect x="21" y="47" width="420" height="402" fill="#1e1b4b"/>`;
  s += txt(50, 80, 'SERVIÇO DE OBRAS SOCIAIS', { size: 8, bold: true, cor: '#a5b4fc' });
  s += txt(50, 145, 'SIGU', { size: 40, bold: true, cor: '#ffffff' });
  s += txt(50, 172, 'Sistema Integrado de Gerenciamento de Usuários', { size: 11, bold: true, cor: '#cbd5e1' });
  s += txt(50, 194, 'Cadastro, controle de presença e relatórios', { size: 9, cor: '#94a3b8' });
  s += txt(50, 208, 'das unidades Semear, Viver e Sonhar.', { size: 9, cor: '#94a3b8' });

  [['Programa Semear', '#fbbf24', 240], ['Programa Viver', '#34d399', 292], ['Programa Sonhar', '#38bdf8', 344]].forEach(([nome, cor, y]) => {
    s += `<rect x="50" y="${y}" width="300" height="44" rx="9" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.14"/>`;
    s += `<circle cx="70" cy="${y + 22}" r="4" fill="${cor}"/>`;
    s += txt(86, y + 20, nome, { size: 9.5, bold: true, cor: '#ffffff' });
    s += txt(86, y + 33, 'Unidade atendida pelo sistema', { size: 8, cor: '#94a3b8' });
  });

  // Painel direito (formulário)
  s += `<rect x="441" y="47" width="438" height="402" fill="${FUNDO}"/>`;
  s += cartao(520, 90, 280, 300, '', '');
  s += `<rect x="520" y="90" width="280" height="4" rx="2" fill="${INDIGO}"/>`;
  s += `<rect x="640" y="112" width="40" height="40" rx="8" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(660, 137, 'SOS', { size: 10, bold: true, cor: NAVY, anchor: 'middle' });
  s += etiqueta(612, 162, 96, 'ACESSO RESTRITO', INDIGO, '#eef2ff');
  s += txt(660, 197, 'Entrar no sistema', { size: 13, bold: true, cor: '#0f172a', anchor: 'middle' });
  s += txt(660, 213, 'Use seu e-mail corporativo.', { size: 8.5, cor: CINZA, anchor: 'middle' });

  s += campo(544, 240, 232, 'E-mail corporativo', 'nome@instituicao.org');
  s += campo(544, 288, 232, 'Senha', '••••••••');
  s += botao(544, 336, 232, 'Entrar', { h: 28 });

  s += txt(660, 410, 'Coordenadores e assistentes usam a senha fornecida pela sede.', { size: 8, cor: CINZA, anchor: 'middle' });

  s += nota(1, 776, 245);
  s += nota(2, 776, 293);
  s += nota(3, 776, 336);

  return svg(W, H, s);
}

// ---------------- 2. Barra de navegação ----------------
function barraNavegacao() {
  const W = 900;
  const H = 190;
  let s = `<rect x="20" y="40" width="860" height="66" rx="10" fill="#ffffff" stroke="${BORDA}" stroke-width="1.6"/>`;

  s += `<rect x="40" y="58" width="30" height="30" rx="7" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(55, 78, 'SOS', { size: 8, bold: true, cor: NAVY, anchor: 'middle' });
  s += txt(78, 71, 'SIGU', { size: 12, bold: true, cor: '#0f172a' });
  s += txt(78, 83, 'SERVIÇO DE OBRAS SOCIAIS', { size: 6.5, bold: true, cor: INDIGO });

  // Menu em pílulas
  s += `<rect x="196" y="61" width="416" height="26" rx="13" fill="#f1f5f9" stroke="#e2e8f0"/>`;
  const itens = [['Início', 54], ['Usuários', 62], ['Turmas', 56], ['Lista de Presença', 96], ['Relatórios', 66], ['Funcionários', 74]];
  let x = 198;
  itens.forEach(([rotulo, largura], i) => {
    s += pilula(x, 63, largura, rotulo, i === 0);
    x += largura;
  });

  // Unidade ativa
  s += txt(622, 62, 'UNIDADE ATIVA', { size: 6.5, bold: true, cor: CINZA });
  s += `<rect x="622" y="66" width="110" height="22" rx="5" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(629, 81, 'Programa Semear', { size: 8.5, bold: true, cor: '#334155' });
  s += `<path d="M 715 74 L 719 78.5 L 723 74" fill="none" stroke="${SLATE}" stroke-width="1.3"/>`;

  s += txt(792, 71, 'Maria Souza', { size: 9, bold: true, cor: '#0f172a', anchor: 'end' });
  s += txt(792, 82, 'UNIDADE', { size: 6.5, bold: true, cor: CINZA, anchor: 'end' });
  s += botao(802, 62, 56, 'Sair', { vazado: true, cor: SLATE, h: 26 });

  s += nota(1, 224, 28);
  s += nota(2, 677, 28);
  s += nota(3, 830, 28);

  return svg(W, H, s);
}

// ---------------- 3. Listagem de usuários ----------------
function telaUsuarios() {
  const W = 900;
  const H = 500;
  let s = janela(20, 20, 860, 460, 'SIGU · Usuários');
  s += `<rect x="21" y="47" width="858" height="432" fill="${FUNDO}"/>`;

  s += etiqueta(44, 62, 96, 'GESTÃO DE USUÁRIOS', INDIGO, '#eef2ff');
  s += txt(44, 96, 'Membros Cadastrados na Unidade', { size: 14, bold: true, cor: '#0f172a' });
  s += txt(44, 112, 'Gerencie a lista de usuários da sua unidade ativa.', { size: 9, cor: CINZA });
  s += botao(748, 76, 108, '+  Novo usuário', { h: 28 });

  // Barra de filtros
  s += `<rect x="44" y="132" width="812" height="60" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += campo(60, 148, 232, 'Buscar', 'Buscar usuário por nome ou NIS...');
  s += selecao(304, 148, 150, 'Turma', 'Todas as turmas');
  s += selecao(466, 148, 150, 'Situação', 'Somente ativos');
  s += botao(628, 153, 104, 'SISC divergente', { vazado: true, cor: AMBAR, h: 24 });
  s += botao(744, 153, 96, 'Exportar Excel', { vazado: true, cor: VERDE, h: 24 });

  // Tabela
  s += `<rect x="44" y="206" width="812" height="256" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  const acoes = (x, y) => {
    let g = '';
    [['👁', SLATE], ['✎', INDIGO], ['⊘', AMBAR], ['🗑', VERMELHO]].forEach(([ic, cor], i) => {
      g += `<rect x="${x + i * 26}" y="${y - 10}" width="22" height="20" rx="5" fill="#ffffff" stroke="${BORDA}"/>`;
      g += txt(x + i * 26 + 11, y + 4, ic, { size: 9, cor, anchor: 'middle' });
    });
    return g;
  };
  const ativo = (x, y) => etiqueta(x, y - 8, 44, 'Ativo', VERDE, '#ecfdf5');
  const inativo = (x, y) => etiqueta(x, y - 8, 50, 'Inativo', SLATE, '#f1f5f9');

  s += tabela(44, 222, [230, 150, 130, 100, 202],
    ['Nome', 'Turma', 'NIS', 'Situação', 'Ações'],
    [
      ['Ana Paula Ribeiro', 'Estrela da Manhã I', '•••••••• 👁', ativo, acoes],
      ['Bruno Carvalho Lima', 'Boa Nova I', '•••••••• 👁', ativo, acoes],
      ['Carla Mendes Alves', 'Sem Turma', '•••••••• 👁', inativo, acoes],
      ['Daniel Rocha Pinto', 'Caminhada I', '•••••••• 👁', ativo, acoes],
      ['Eduarda Nunes Faria', 'Alegria I', '•••••••• 👁', ativo, acoes],
    ],
    { alturaLinha: 34 });

  s += txt(44, 476, 'Os nomes apresentados são fictícios.', { size: 8, italic: true, cor: CINZA });

  s += nota(1, 292, 153);
  s += nota(2, 454, 153);
  s += nota(3, 616, 153);
  s += nota(4, 732, 153);
  s += nota(5, 840, 153);
  s += nota(6, 866, 273);

  return svg(W, H, s);
}

// ---------------- 4. Formulário em quatro etapas ----------------
function formularioEtapas() {
  const W = 900;
  const H = 430;
  let s = janela(20, 20, 860, 390, 'SIGU · Novo cadastro de usuário');
  s += `<rect x="21" y="47" width="858" height="362" fill="${FUNDO}"/>`;

  s += txt(44, 78, '←  Voltar à lista', { size: 9, bold: true, cor: SLATE });
  s += txt(44, 102, 'Novo cadastro de usuário', { size: 14, bold: true, cor: '#0f172a' });
  s += txt(44, 118, 'Preencha uma etapa por vez. Você pode voltar quando quiser.', { size: 9, cor: CINZA });

  // Trilha de etapas
  const etapas = ['Identificação e saúde', 'Escola e endereço', 'Responsável e família', 'CRAS e SCFV'];
  let x = 44;
  etapas.forEach((nome, i) => {
    const largura = 190;
    const ativo = i === 0;
    s += `<circle cx="${x + 14}" cy="${152}" r="12" fill="${ativo ? INDIGO : '#ffffff'}" stroke="${ativo ? INDIGO : BORDA}" stroke-width="1.4"/>`;
    s += txt(x + 14, 156, String(i + 1), { size: 10, bold: true, cor: ativo ? '#ffffff' : SLATE, anchor: 'middle' });
    s += txt(x + 32, 149, `Etapa ${i + 1}`, { size: 7.5, bold: true, cor: CINZA });
    s += txt(x + 32, 160, nome, { size: 9, bold: true, cor: ativo ? '#0f172a' : SLATE });
    if (i < etapas.length - 1) s += `<line x1="${x + 172}" y1="152" x2="${x + largura + 2}" y2="152" stroke="${BORDA}" stroke-width="1.2"/>`;
    x += largura;
  });

  // Conteúdo da etapa
  s += `<rect x="44" y="182" width="812" height="180" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(60, 204, 'Dados do Usuário', { size: 11, bold: true, cor: NAVY });
  s += campo(60, 218, 250, 'Nome completo *', 'Ana Paula Ribeiro');
  s += campo(326, 218, 150, 'Data de nascimento', '14/03/2016');
  s += campo(492, 218, 150, 'NIS do usuário', '000.00000.00-0');
  s += selecao(658, 218, 182, 'Cor / etnia', 'Selecione…');
  s += campo(60, 266, 250, 'CPF / Cartão SUS', '—');
  s += selecao(326, 266, 150, 'É alérgico?', 'Não');
  s += campo(492, 266, 150, 'Se sim, a quê?', '—');
  s += selecao(658, 266, 182, 'Possui deficiência (PCD)?', 'Não');
  s += txt(60, 336, '*  Campo obrigatório. Os demais podem ser preenchidos depois.', { size: 8.5, cor: CINZA });
  s += botao(740, 322, 100, 'Próximo  →', { h: 26 });

  s += nota(1, 34, 152);
  s += nota(2, 310, 223);
  s += nota(3, 840, 322);

  return svg(W, H, s);
}

// ---------------- 5. Turmas ----------------
function telaTurmas() {
  const W = 900;
  const H = 500;
  let s = janela(20, 20, 860, 460, 'SIGU · Turmas');
  s += `<rect x="21" y="47" width="858" height="432" fill="${FUNDO}"/>`;

  s += etiqueta(44, 62, 88, 'GESTÃO DE TURMAS', INDIGO, '#eef2ff');
  s += txt(44, 96, 'Gerenciar Turmas da Unidade', { size: 14, bold: true, cor: '#0f172a' });
  s += txt(44, 112, 'Crie turmas e vincule os usuários da unidade ativa.', { size: 9, cor: CINZA });

  // Criar nova turma
  s += `<rect x="44" y="128" width="812" height="104" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(60, 150, 'Criar Nova Turma', { size: 11, bold: true, cor: NAVY });
  s += campo(60, 162, 220, 'Nome da turma', 'Turma C');
  s += selecao(296, 162, 130, 'Período', 'Manhã');
  s += campo(442, 162, 160, 'Faixa etária / público', 'Ex.: 6 a 8 anos, 60+');
  s += txt(618, 162, 'DIAS DA SEMANA', { size: 7.5, bold: true, cor: CINZA });
  ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].forEach((d, i) => {
    const ativo = i === 0 || i === 2;
    s += `<rect x="${618 + i * 32}" y="167" width="28" height="22" rx="5" fill="${ativo ? INDIGO : '#ffffff'}" stroke="${ativo ? INDIGO : BORDA}"/>`;
    s += txt(618 + i * 32 + 14, 182, d, { size: 8, bold: true, cor: ativo ? '#ffffff' : SLATE, anchor: 'middle' });
  });
  s += botao(740, 200, 100, '+  Adicionar Turma', { h: 24 });

  // Cartões de turma
  s += txt(44, 254, 'Selecione uma Turma para Gerenciar os Alunos', { size: 11, bold: true, cor: NAVY });
  [['Estrela da Manhã I', 'Manhã', 'Seg · Qua', '6 a 8 anos', 44, true],
   ['Boa Nova I', 'Manhã', 'Seg · Qua', '8 a 10 anos', 314, false],
   ['Caminhada I', 'Tarde', 'Ter · Qui', '11 a 13 anos', 584, false]].forEach(([nome, periodo, dias, faixa, x, ativo]) => {
    s += `<rect x="${x}" y="266" width="252" height="72" rx="9" fill="#ffffff" stroke="${ativo ? INDIGO : BORDA}" stroke-width="${ativo ? 1.8 : 1.2}"/>`;
    s += txt(x + 12, 288, nome, { size: 10.5, bold: true, cor: '#0f172a' });
    s += etiqueta(x + 12, 298, 48, periodo, AMBAR, '#fffbeb');
    s += etiqueta(x + 66, 298, 72, faixa, '#7c3aed', '#f5f3ff');
    s += txt(x + 12, 328, '📅  ' + dias, { size: 8.5, cor: SLATE });
    s += txt(x + 230, 288, '🗑', { size: 10, cor: VERMELHO, anchor: 'middle' });
  });

  // Painel de alunos
  s += `<rect x="44" y="352" width="812" height="110" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(60, 374, 'Gerenciar Alunos da Turma: Estrela da Manhã I', { size: 10.5, bold: true, cor: NAVY });
  s += `<rect x="60" y="386" width="386" height="64" rx="7" fill="${FUNDO}" stroke="#e2e8f0"/>`;
  s += txt(72, 402, 'Alunos da turma', { size: 8.5, bold: true, cor: CINZA });
  s += txt(72, 420, 'Ana Paula Ribeiro', { size: 9, bold: true });
  s += botao(370, 412, 62, 'Remover', { vazado: true, cor: VERMELHO, h: 18 });
  s += txt(72, 438, 'Bruno Carvalho Lima', { size: 9, bold: true });

  s += `<rect x="462" y="386" width="386" height="64" rx="7" fill="${FUNDO}" stroke="#e2e8f0"/>`;
  s += txt(474, 402, 'Adicionar alunos à turma', { size: 8.5, bold: true, cor: CINZA });
  s += txt(474, 420, 'Carla Mendes Alves', { size: 9, bold: true });
  s += botao(776, 412, 62, 'Adicionar', { h: 18 });
  s += txt(474, 438, 'Daniel Rocha Pinto', { size: 9, bold: true });

  s += nota(1, 280, 167);
  s += nota(2, 632, 148);
  s += nota(3, 296, 266);
  s += nota(4, 846, 394);

  return svg(W, H, s);
}

// ---------------- 6. Lista de presença ----------------
function telaPresenca() {
  const W = 900;
  const H = 470;
  let s = janela(20, 20, 860, 430, 'SIGU · Lista de Presença');
  s += `<rect x="21" y="47" width="858" height="402" fill="${FUNDO}"/>`;

  s += etiqueta(44, 62, 106, 'REGISTRO DE FREQUÊNCIA', INDIGO, '#eef2ff');
  s += txt(44, 96, 'Lista de Presença', { size: 14, bold: true, cor: '#0f172a' });
  s += txt(44, 112, 'Lançamento diário e histórico das listas de presença das turmas ativas.', { size: 9, cor: CINZA });

  // Abas
  s += `<rect x="44" y="126" width="360" height="28" rx="14" fill="#f1f5f9" stroke="#e2e8f0"/>`;
  s += pilula(47, 129, 176, 'Lançar Lista de Presença', true);
  s += pilula(225, 129, 176, 'Histórico de Listas de Presença', false);

  // Filtros
  s += `<rect x="44" y="168" width="812" height="58" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += selecao(60, 184, 170, 'Turma', 'Estrela da Manhã I');
  s += selecao(246, 184, 130, 'Período', 'Manhã');
  s += txt(392, 191, 'DATA DO LANÇAMENTO', { size: 7.5, bold: true, cor: CINZA });
  s += txt(392, 208, 'Hoje — 02/08/2026', { size: 10, bold: true, cor: NAVY });
  s += botao(700, 189, 140, 'Salvar Lista de Presença', { h: 28 });

  // Tabela
  s += `<rect x="44" y="240" width="812" height="196" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(60, 262, 'Lista de Presença', { size: 11, bold: true, cor: NAVY });
  s += txt(60, 276, 'Marque a presença ou falta dos participantes correspondentes.', { size: 8.5, cor: CINZA });

  const marcado = (cor) => (x, y) => `<rect x="${x + 34}" y="${y - 8}" width="16" height="16" rx="4" fill="${cor}" stroke="${cor}"/>${txt(x + 42, y + 4, '✓', { size: 10, bold: true, cor: '#ffffff', anchor: 'middle' })}`;
  const vazio = (x, y) => `<rect x="${x + 34}" y="${y - 8}" width="16" height="16" rx="4" fill="#ffffff" stroke="${BORDA}"/>`;
  const nomeInativo = (x, y) => txt(x, y + 3.5, 'Carla Mendes Alves', { size: 9, bold: true }) + etiqueta(x + 116, y - 8, 44, 'Inativo', SLATE, '#f1f5f9');

  s += tabela(60, 288, [420, 140, 140],
    ['Nome do participante', 'Presente', 'Falta'],
    [
      ['Ana Paula Ribeiro', marcado(VERDE), vazio],
      ['Bruno Carvalho Lima', vazio, marcado(VERMELHO)],
      [nomeInativo, vazio, marcado(VERMELHO)],
      ['Daniel Rocha Pinto', marcado(VERDE), vazio],
    ],
    { alturaLinha: 28 });

  s += nota(1, 230, 189);
  s += nota(2, 512, 203);
  s += nota(3, 566, 330);
  s += nota(4, 840, 189);
  s += nota(5, 401, 129);

  return svg(W, H, s);
}

// ---------------- 7. Relatórios ----------------
function telaRelatorios() {
  const W = 900;
  const H = 450;
  let s = janela(20, 20, 860, 410, 'SIGU · Relatórios');
  s += `<rect x="21" y="47" width="858" height="382" fill="${FUNDO}"/>`;

  s += etiqueta(44, 62, 116, 'RELATÓRIOS E EXPORTAÇÕES', INDIGO, '#eef2ff');
  s += txt(44, 96, 'Relatórios e Exportações', { size: 14, bold: true, cor: '#0f172a' });

  // Configurar exportação
  s += `<rect x="44" y="112" width="480" height="200" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(60, 134, 'Configurar Exportação (Excel)', { size: 11, bold: true, cor: NAVY });
  s += txt(60, 148, 'Escopo: unidade ativa.', { size: 8.5, cor: CINZA });

  s += txt(60, 172, 'TIPO DE RELATÓRIO', { size: 7.5, bold: true, cor: CINZA });
  [['Turmas da unidade', 178, true],
   ['Histórico de listas de presença', 214, false],
   ['Lista de presença detalhada do dia', 250, false]].forEach(([rotulo, y, ativo]) => {
    s += `<rect x="60" y="${y}" width="448" height="30" rx="7" fill="${ativo ? '#eef2ff' : '#ffffff'}" stroke="${ativo ? INDIGO : BORDA}"/>`;
    s += `<circle cx="76" cy="${y + 15}" r="6" fill="#ffffff" stroke="${ativo ? INDIGO : BORDA}" stroke-width="1.4"/>`;
    if (ativo) s += `<circle cx="76" cy="${y + 15}" r="3" fill="${INDIGO}"/>`;
    s += txt(92, y + 19, rotulo, { size: 9.5, bold: true, cor: ativo ? INDIGO : '#334155' });
  });
  s += botao(60, 288, 130, 'Exportar Excel (XLSX)', { cor: VERDE, h: 26 });

  // Configuração de saída
  s += `<rect x="540" y="112" width="316" height="200" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(556, 134, 'Configuração de Saída', { size: 11, bold: true, cor: NAVY });
  s += txt(556, 148, 'Verifique os dados da exportação ativa.', { size: 8.5, cor: CINZA });
  [['Relatório', 'Turmas da unidade'], ['Unidade ativa', 'Programa Semear'], ['Data / Período', 'Este mês'], ['Turno', 'Todos']].forEach(([r, v], i) => {
    const y = 174 + i * 26;
    s += txt(556, y, r, { size: 9, cor: CINZA });
    s += txt(840, y, v, { size: 9, bold: true, cor: '#0f172a', anchor: 'end' });
    s += `<line x1="556" y1="${y + 8}" x2="840" y2="${y + 8}" stroke="#f1f5f9"/>`;
  });
  s += botao(556, 288, 172, 'Relatório Consolidado (PDF)', { cor: VERMELHO, h: 26, vazado: true });

  // Prévia dos gráficos
  s += `<rect x="44" y="326" width="812" height="88" rx="9" fill="#ffffff" stroke="${BORDA}"/>`;
  s += txt(60, 348, 'Prévia dos gráficos incluídos no PDF', { size: 10.5, bold: true, cor: NAVY });
  [[60, 'Evolução da Frequência'], [330, 'Usuários por Turma'], [600, 'Status de Frequência']].forEach(([x, rotulo]) => {
    s += `<rect x="${x}" y="358" width="240" height="46" rx="6" fill="${FUNDO}" stroke="#e2e8f0"/>`;
    s += txt(x + 10, 372, rotulo, { size: 8, bold: true, cor: SLATE });
    [0, 1, 2, 3, 4, 5].forEach((i) => {
      const h = 8 + ((i * 7) % 20);
      s += `<rect x="${x + 14 + i * 20}" y="${398 - h}" width="12" height="${h}" rx="2" fill="${INDIGO}" fill-opacity="${0.35 + i * 0.1}"/>`;
    });
  });

  s += nota(1, 508, 178);
  s += nota(2, 190, 288);
  s += nota(3, 728, 288);

  return svg(W, H, s);
}

module.exports = {
  'man-login': telaLogin(),
  'man-navbar': barraNavegacao(),
  'man-usuarios': telaUsuarios(),
  'man-formulario': formularioEtapas(),
  'man-turmas': telaTurmas(),
  'man-presenca': telaPresenca(),
  'man-relatorios': telaRelatorios(),
};
