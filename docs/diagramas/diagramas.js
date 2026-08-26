// SVGs dos diagramas do SRS. Renderizados para PNG no navegador (não há
// biblioteca de imagem disponível no ambiente).

const NAVY = '#1a3a4a';
const BRAND = '#3e4095';
const GREEN = '#72b736';
const SLATE = '#64748b';
const LIGHT = '#f1f5f9';

// ---------- 1. Casos de uso ----------
function ator(x, y, nome, linhas) {
  const rotulo = (linhas || [nome])
    .map((t, i) => `<text x="${x}" y="${y + 54 + i * 12}" text-anchor="middle" font-family="Arial" font-size="10.5" font-weight="bold" fill="${NAVY}">${t}</text>`)
    .join('');
  return `
    <g>
      <circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${NAVY}" stroke-width="2"/>
      <line x1="${x}" y1="${y + 9}" x2="${x}" y2="${y + 30}" stroke="${NAVY}" stroke-width="2"/>
      <line x1="${x - 13}" y1="${y + 17}" x2="${x + 13}" y2="${y + 17}" stroke="${NAVY}" stroke-width="2"/>
      <line x1="${x}" y1="${y + 30}" x2="${x - 11}" y2="${y + 44}" stroke="${NAVY}" stroke-width="2"/>
      <line x1="${x}" y1="${y + 30}" x2="${x + 11}" y2="${y + 44}" stroke="${NAVY}" stroke-width="2"/>
      ${rotulo}
    </g>`;
}

function caso(x, y, texto, w = 168) {
  const linhas = texto.split('|');
  const t = linhas
    .map((l, i) => `<text x="${x}" y="${y + 4 + (i - (linhas.length - 1) / 2) * 11}" text-anchor="middle" font-family="Arial" font-size="10" fill="${NAVY}">${l}</text>`)
    .join('');
  return `<g><ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="21" fill="#ffffff" stroke="${BRAND}" stroke-width="1.4"/>${t}</g>`;
}

function liga(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${SLATE}" stroke-width="1" stroke-opacity="0.75"/>`;
}

function casosDeUso() {
  const casos = [
    'Autenticar-se no sistema',
    'Selecionar unidade ativa',
    'Consultar assistidos',
    'Cadastrar / editar assistido',
    'Ativar / desativar assistido',
    'Gerenciar turmas',
    'Vincular assistido a turma',
    'Lançar lista de presença',
    'Consultar e corrigir|listas de presença',
    'Exportar ficha e planilha|do assistido',
    'Emitir relatórios (PDF/XLSX)',
    'Consultar funcionários',
    'Excluir assistido',
    'Cadastrar / editar / excluir|funcionários e permissões',
  ];
  // Faixas de acesso por perfil (índices em `casos`):
  //   unidade → 0..10   |   sede → 0..11   |   admin → todos
  const ATE_UNIDADE = 10;
  const ATE_SEDE = 11;

  const xCaso = 430;
  const y0 = 92;
  const dy = 47;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="${y0 + dy * casos.length + 40}" viewBox="0 0 820 ${y0 + dy * casos.length + 40}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <rect x="250" y="${y0 - 44}" width="360" height="${dy * casos.length + 26}" rx="10" fill="${LIGHT}" stroke="#cbd5e1" stroke-width="1"/>
    <text x="430" y="${y0 - 26}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="${NAVY}">SIGU — Sistema Integrado de Gerenciamento de Usuários</text>`;

  const ys = casos.map((_, i) => y0 + i * dy);
  casos.forEach((c, i) => { svg += caso(xCaso, ys[i], c, 300); });

  // Perfil de unidade (coordenador/técnico/assistente)
  const yUnidade = y0 + dy * 3;
  for (let i = 0; i <= ATE_UNIDADE; i += 1) svg += liga(150, yUnidade + 10, xCaso - 152, ys[i]);
  svg += ator(110, yUnidade, 'unidade', ['Coordenador /', 'Técnico / Assistente', '(escopo: sua unidade)']);

  // Equipe Sede: mesmos casos em todas as unidades + consulta de funcionários
  const ySede = y0 + dy * 8.6;
  for (let i = 0; i <= ATE_SEDE; i += 1) svg += liga(150, ySede + 10, xCaso - 152, ys[i]);
  svg += ator(110, ySede, 'sede', ['Equipe Sede', '(todas as unidades)']);

  // Administrador: tudo, inclusive exclusão e gestão de funcionários
  const yAdmin = y0 + dy * 6;
  for (let i = 0; i < casos.length; i += 1) svg += liga(710, yAdmin + 10, xCaso + 152, ys[i]);
  svg += ator(750, yAdmin, 'admin', ['Administrador', '(acesso total)']);

  svg += '</svg>';
  return svg;
}

// ---------- Blocos para diagramas de atividade ----------
function inicio(x, y) {
  return `<circle cx="${x}" cy="${y}" r="10" fill="${NAVY}"/>`;
}
function fim(x, y) {
  return `<g><circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${NAVY}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="6" fill="${NAVY}"/></g>`;
}
function acao(x, y, texto, w = 250) {
  const linhas = texto.split('|');
  const h = 20 + linhas.length * 13;
  const t = linhas
    .map((l, i) => `<text x="${x}" y="${y + 5 + (i - (linhas.length - 1) / 2) * 13}" text-anchor="middle" font-family="Arial" font-size="10.5" fill="#0f172a">${l}</text>`)
    .join('');
  return `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="7" fill="#ffffff" stroke="${BRAND}" stroke-width="1.4"/>${t}</g>`;
}
function decisao(x, y, texto, w = 150, h = 56) {
  const linhas = texto.split('|');
  const t = linhas
    .map((l, i) => `<text x="${x}" y="${y + 4 + (i - (linhas.length - 1) / 2) * 11}" text-anchor="middle" font-family="Arial" font-size="9.5" fill="#0f172a">${l}</text>`)
    .join('');
  return `<g><path d="M ${x} ${y - h / 2} L ${x + w / 2} ${y} L ${x} ${y + h / 2} L ${x - w / 2} ${y} Z" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.4"/>${t}</g>`;
}
// Trecho sem ponta, usado para montar cotovelos (horizontal + vertical).
function linha(x1, y1, x2, y2, rotulo) {
  const r = rotulo
    ? `<text x="${(x1 + x2) / 2}" y="${y1 - 6}" text-anchor="middle" font-family="Arial" font-size="9.5" font-weight="bold" fill="${SLATE}">${rotulo}</text>`
    : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="1.4"/>${r}`;
}

function seta(x1, y1, x2, y2, rotulo, lado) {
  const r = rotulo
    ? `<text x="${(x1 + x2) / 2 + (lado === 'esq' ? -14 : 12)}" y="${(y1 + y2) / 2 - 3}" text-anchor="${lado === 'esq' ? 'end' : 'start'}" font-family="Arial" font-size="9.5" font-weight="bold" fill="${SLATE}">${rotulo}</text>`
    : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="1.4" marker-end="url(#pta)"/>${r}`;
}
const DEFS = `<defs><marker id="pta" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${NAVY}"/></marker></defs>`;

// ---------- 2. Atividade: lançar lista de presença ----------
function atividadePresenca() {
  const cx = 390;
  const W = 800;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="700" viewBox="0 0 ${W} 700"><rect width="100%" height="100%" fill="#ffffff"/>${DEFS}`;
  s += inicio(cx, 28);
  s += seta(cx, 38, cx, 56);
  s += acao(cx, 78, 'Selecionar turma, período e data', 300);
  s += seta(cx, 100, cx, 118);
  s += acao(cx, 145, 'Sistema carrega assistidos ativos da turma|(inativos entram só se já tiverem registro)', 360);
  s += seta(cx, 172, cx, 190);
  s += acao(cx, 212, 'Marcar presença ou falta de cada assistido', 330);
  s += seta(cx, 234, cx, 252);

  // Decisão 1 — bloqueio sem unidade ativa (ramo à esquerda)
  s += decisao(cx, 284, 'Unidade ativa|selecionada?', 190, 62);
  s += linha(cx - 95, 284, 120, 284, 'não');
  s += seta(120, 284, 120, 322);
  s += acao(120, 348, 'Exibir aviso e|bloquear gravação', 175);
  s += seta(cx, 315, cx, 344, 'sim', 'dir');
  s += acao(cx, 368, 'Gravar lista de presença', 250);
  s += seta(cx, 390, cx, 410);

  // Decisão 2 — cria ou atualiza (ramo à direita)
  s += decisao(cx, 444, 'Já existe lista para|turma + data + período?', 215, 66);
  s += linha(cx + 108, 444, 675, 444, 'sim');
  s += seta(675, 444, 675, 482);
  s += acao(675, 508, 'Atualizar a lista|existente', 175);
  s += seta(cx, 477, cx, 506, 'não', 'dir');
  s += acao(cx, 530, 'Criar nova lista de presença', 250);
  s += seta(cx, 552, cx, 572);

  s += acao(cx, 598, 'Registrar em log de auditoria|e confirmar ao usuário', 280);
  s += seta(cx, 624, cx, 648);
  s += fim(cx, 660);
  s += '</svg>';
  return s;
}

// ---------- 3. Atividade: cadastro de assistido ----------
function atividadeCadastro() {
  const cx = 400;
  const W = 800;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="770" viewBox="0 0 ${W} 770"><rect width="100%" height="100%" fill="#ffffff"/>${DEFS}`;
  s += inicio(cx, 28);
  s += seta(cx, 38, cx, 56);
  s += acao(cx, 78, 'Etapa 1 — Identificação e saúde', 300);
  s += seta(cx, 100, cx, 118);

  s += decisao(cx, 150, 'Nome completo|informado?', 190, 60);
  s += linha(cx - 95, 150, 128, 150, 'não');
  s += seta(128, 150, 128, 188);
  s += acao(128, 214, 'Sinalizar campo|obrigatório', 175);
  s += seta(cx, 180, cx, 208, 'sim', 'dir');

  s += acao(cx, 230, 'Etapa 2 — Escola e endereço', 300);
  s += seta(cx, 252, cx, 272);
  s += acao(cx, 300, 'Etapa 3 — Responsável, composição familiar|e pessoas autorizadas a retirar', 390);
  s += seta(cx, 328, cx, 348);
  s += acao(cx, 376, 'Etapa 4 — CRAS/SCFV e registro no SISC|(alerta se o grupo divergir da turma)', 390);
  s += seta(cx, 404, cx, 424);
  s += acao(cx, 446, 'Salvar cadastro', 220);
  s += seta(cx, 468, cx, 488);

  s += decisao(cx, 522, 'Perfil administrador|sem unidade definida?', 220, 66);
  s += linha(cx - 110, 522, 122, 522, 'sim');
  s += seta(122, 522, 122, 560);
  s += acao(122, 586, 'Exigir seleção|da unidade', 175);
  s += seta(cx, 555, cx, 584, 'não', 'dir');

  s += acao(cx, 610, 'Persistir no banco e gerar|código de matrícula', 290);
  s += seta(cx, 636, cx, 660);
  s += acao(cx, 684, 'Retornar à listagem com confirmação', 320);
  s += seta(cx, 706, cx, 726);
  s += fim(cx, 740);
  s += '</svg>';
  return s;
}

module.exports = {
  'casos-de-uso': casosDeUso(),
  'atividade-presenca': atividadePresenca(),
  'atividade-cadastro': atividadeCadastro(),
};
