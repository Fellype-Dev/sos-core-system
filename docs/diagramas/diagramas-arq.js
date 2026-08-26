// Diagramas do Documento de Arquitetura e Design.
const NAVY = '#1a3a4a';
const BRAND = '#3e4095';
const GREEN = '#5d972b';
const ORANGE = '#c2620f';
const SLATE = '#64748b';
const LINE = '#94a3b8';

const DEFS = `<defs>
  <marker id="pt" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${NAVY}"/></marker>
  <marker id="pt2" markerWidth="9" markerHeight="9" refX="0" refY="3" orient="auto"><path d="M8,0 L8,6 L0,3 z" fill="${NAVY}"/></marker>
</defs>`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function txt(x, y, t, { size = 10, bold = false, cor = '#0f172a', anchor = 'middle' } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial" font-size="${size}" ${bold ? 'font-weight="bold"' : ''} fill="${cor}">${esc(t)}</text>`;
}

/** Caixa com título e lista de itens. */
function caixa(x, y, w, titulo, itens, { cor = BRAND, fundo = '#ffffff', tituloFundo = '#eef2ff' } = {}) {
  const hT = 22;
  const h = hT + itens.length * 13 + 10;
  let s = `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fundo}" stroke="${cor}" stroke-width="1.5"/>`;
  s += `<path d="M ${x} ${y + hT} L ${x} ${y + 6} Q ${x} ${y} ${x + 6} ${y} L ${x + w - 6} ${y} Q ${x + w} ${y} ${x + w} ${y + 6} L ${x + w} ${y + hT} Z" fill="${tituloFundo}"/>`;
  s += `<line x1="${x}" y1="${y + hT}" x2="${x + w}" y2="${y + hT}" stroke="${cor}" stroke-width="1.2"/>`;
  s += txt(x + w / 2, y + 15, titulo, { size: 10.5, bold: true, cor: NAVY });
  itens.forEach((it, i) => {
    s += txt(x + 8, y + hT + 15 + i * 13, it, { size: 9, anchor: 'start', cor: '#334155' });
  });
  return s + '</g>';
}

function seta(x1, y1, x2, y2, rotulo) {
  const r = rotulo ? txt((x1 + x2) / 2, (y1 + y2) / 2 - 5, rotulo, { size: 8.5, bold: true, cor: SLATE }) : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NAVY}" stroke-width="1.3" marker-end="url(#pt)"/>${r}`;
}

// ---------------- 1. Componentes ----------------
function componentes() {
  const W = 900;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="880" viewBox="0 0 ${W} 880"><rect width="100%" height="100%" fill="#ffffff"/>${DEFS}`;

  // Camada 1 — navegador
  s += `<rect x="20" y="20" width="860" height="248" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="5 4"/>`;
  s += txt(40, 40, 'NAVEGADOR DO USUÁRIO', { size: 10, bold: true, cor: SLATE, anchor: 'start' });
  s += caixa(45, 52, 200, 'Páginas (views)', ['Login, Início', 'Assistidos, Turmas', 'Lista de Presença', 'Relatórios, Funcionários']);
  s += caixa(265, 52, 190, 'Componentes de UI', ['Navbar, Card, Button', 'Avatar, MaskedValue', 'DashboardFilters']);
  s += caixa(475, 52, 190, 'Estado global', ['AuthContext', '(sessão, perfil,', 'unidade ativa)']);
  s += caixa(685, 52, 170, 'Bibliotecas', ['Recharts (gráficos)', 'jsPDF + html2canvas', 'SheetJS (XLSX)']);
  s += caixa(265, 168, 400, 'Camada de serviços (Axios)', ['studentService · classGroupService · attendanceService', 'authService · userService · programService', 'Interceptores: injeção de token e tratamento de 401']);

  s += seta(465, 160, 465, 166);
  s += seta(155, 148, 260, 190);
  s += seta(770, 148, 670, 190);

  // Fronteira HTTP
  s += `<line x1="20" y1="292" x2="880" y2="292" stroke="${ORANGE}" stroke-width="1.6" stroke-dasharray="7 5"/>`;
  s += txt(450, 287, 'HTTPS  ·  REST/JSON  ·  Bearer Token (JWT)', { size: 10, bold: true, cor: ORANGE });
  s += seta(450, 232, 450, 320);

  // Camada 2 — servidor
  s += `<rect x="20" y="316" width="860" height="330" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="5 4"/>`;
  s += txt(40, 336, 'SERVIDOR DE APLICAÇÃO (Node.js + Express)', { size: 10, bold: true, cor: SLATE, anchor: 'start' });

  s += caixa(45, 348, 250, 'Middleware (cadeia)', ['helmet · cors · morgan', 'rateLimiter (login e API)', 'auth (verificação do JWT)', 'authorize (perfis de acesso)', 'errorHandler'], { cor: ORANGE, tituloFundo: '#fff7ed' });
  s += caixa(320, 348, 250, 'Rotas', ['/auth · /users · /programs', '/students · /class-groups', '/attendance'], { cor: ORANGE, tituloFundo: '#fff7ed' });
  s += caixa(595, 348, 260, 'Utilitários', ['programContext (escopo de unidade)', 'roles (perfis) · classGroup · slugify', 'jwtUtils · ApiResponse · validateEnv'], { cor: ORANGE, tituloFundo: '#fff7ed' });

  s += caixa(150, 470, 300, 'Controladores (regras de negócio)', ['AuthController · StudentController', 'ClassGroupController · AttendanceController', 'UserController · ProgramController'], { cor: ORANGE, tituloFundo: '#fff7ed' });
  s += caixa(500, 470, 280, 'Modelos (acesso a dados)', ['Student · ClassGroup · Attendance', 'User · AuditLog'], { cor: ORANGE, tituloFundo: '#fff7ed' });

  s += seta(445, 425, 350, 466);
  s += seta(455, 520, 496, 520);
  s += caixa(300, 570, 300, 'Cliente Supabase (@supabase/supabase-js)', ['Credencial de serviço · consultas e gravações'], { cor: ORANGE, tituloFundo: '#fff7ed' });
  s += seta(640, 545, 560, 566);

  // Fronteira de rede
  s += `<line x1="20" y1="672" x2="880" y2="672" stroke="${GREEN}" stroke-width="1.6" stroke-dasharray="7 5"/>`;
  s += txt(450, 667, 'HTTPS  ·  credencial de serviço', { size: 10, bold: true, cor: GREEN });
  s += seta(450, 618, 450, 700);

  // Camada 3 — dados
  s += `<rect x="20" y="696" width="860" height="164" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="5 4"/>`;
  s += txt(40, 716, 'PLATAFORMA DE DADOS (Supabase)', { size: 10, bold: true, cor: SLATE, anchor: 'start' });
  s += caixa(160, 728, 290, 'PostgreSQL', ['programs · users · user_programs', 'class_groups · students', 'attendance_sessions · attendance_records'], { cor: GREEN, tituloFundo: '#f0fdf4' });
  s += caixa(490, 728, 250, 'Scripts de migração', ['schema.sql', 'migrations/ (001…011)', 'aplicação manual'], { cor: GREEN, tituloFundo: '#f0fdf4' });

  return s + '</svg>';
}

// ---------------- 2. Implantação ----------------
function implantacao() {
  const W = 900;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="620" viewBox="0 0 ${W} 620"><rect width="100%" height="100%" fill="#ffffff"/>${DEFS}`;

  const no = (x, y, w, h, titulo, sub, cor, fundo) => {
    let g = `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fundo}" stroke="${cor}" stroke-width="1.8"/>`;
    g += `<rect x="${x}" y="${y}" width="${w}" height="26" rx="8" fill="${cor}" fill-opacity="0.12"/>`;
    g += txt(x + w / 2, y + 17, titulo, { size: 11, bold: true, cor: NAVY });
    g += txt(x + w / 2, y + 40, sub, { size: 9, cor: SLATE });
    return g + '</g>';
  };

  // Nó 1 — dispositivo do usuário
  s += no(40, 40, 250, 150, '«dispositivo» Estação de trabalho', 'Windows / Android / iOS', BRAND, '#ffffff');
  s += caixa(60, 96, 210, 'Navegador web', ['Aplicação React (SPA)', 'Sessão em localStorage']);

  // Nó 2 — Vercel
  s += no(325, 40, 250, 150, '«nó» Vercel', 'Hospedagem estática + CDN', GREEN, '#ffffff');
  s += caixa(345, 96, 210, 'Artefatos da interface', ['HTML, CSS e JavaScript', 'gerados por Vite (build)'], { cor: GREEN, tituloFundo: '#f0fdf4' });

  // Nó 3 — Render
  s += no(325, 250, 250, 160, '«nó» Render', 'Contêiner Node.js', ORANGE, '#ffffff');
  s += caixa(345, 306, 210, 'API SIGU (Express)', ['Processo único', 'Variáveis de ambiente', 'Porta atribuída pelo provedor'], { cor: ORANGE, tituloFundo: '#fff7ed' });

  // Nó 4 — Supabase
  s += no(325, 460, 250, 130, '«nó» Supabase', 'Banco de dados gerenciado', GREEN, '#ffffff');
  s += caixa(345, 516, 210, 'PostgreSQL', ['Instância única', 'Backups do provedor'], { cor: GREEN, tituloFundo: '#f0fdf4' });

  // Nó 5 — GitHub
  s += no(630, 40, 230, 370, '«nó» GitHub', 'Repositório do projeto', SLATE, '#ffffff');
  s += caixa(650, 96, 190, 'Branch main', ['Código-fonte versionado']);
  s += txt(745, 190, 'Publicação automática', { size: 9, bold: true, cor: SLATE });
  s += txt(745, 204, 'a cada integração', { size: 9, cor: SLATE });
  s += `<line x1="700" y1="215" x2="700" y2="250" stroke="${SLATE}" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#pt)"/>`;
  s += caixa(650, 258, 190, 'Gatilho de publicação', ['Vercel (interface)', 'Render (servidor)']);
  s += `<line x1="648" y1="130" x2="580" y2="115" stroke="${SLATE}" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#pt)"/>`;
  s += `<line x1="648" y1="290" x2="580" y2="320" stroke="${SLATE}" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#pt)"/>`;

  // Comunicações
  s += `<line x1="292" y1="115" x2="323" y2="115" stroke="${NAVY}" stroke-width="1.4" marker-end="url(#pt)"/>`;
  s += txt(307, 105, 'HTTPS', { size: 8.5, bold: true, cor: SLATE });
  s += txt(307, 138, 'carrega', { size: 8, cor: SLATE });

  s += `<path d="M 165 192 L 165 330 L 323 330" fill="none" stroke="${NAVY}" stroke-width="1.4" marker-end="url(#pt)"/>`;
  s += txt(200, 322, 'HTTPS · REST/JSON · JWT', { size: 8.5, bold: true, cor: SLATE, anchor: 'start' });

  s += `<line x1="450" y1="412" x2="450" y2="458" stroke="${NAVY}" stroke-width="1.4" marker-end="url(#pt)"/>`;
  s += txt(460, 438, 'HTTPS · credencial de serviço', { size: 8.5, bold: true, cor: SLATE, anchor: 'start' });

  s += txt(450, 606, 'Observação: os ambientes de desenvolvimento e produção compartilham a mesma instância de banco de dados.', { size: 9, bold: true, cor: ORANGE });

  return s + '</svg>';
}

// ---------------- 3. Entidade-Relacionamento ----------------
function der() {
  const W = 980;
  const H = 700;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#ffffff"/>${DEFS}`;

  const ent = (x, y, w, nome, attrs) => caixa(x, y, w, nome, attrs, { cor: BRAND, tituloFundo: '#eef2ff' });

  // relação com cardinalidade nas pontas
  const rel = (x1, y1, x2, y2, c1, c2) => {
    let g = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${LINE}" stroke-width="1.5"/>`;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    g += txt(x1 + ux * 18 - uy * 8, y1 + uy * 18 + ux * 8 + 3, c1, { size: 9.5, bold: true, cor: NAVY });
    g += txt(x2 - ux * 18 - uy * 8, y2 - uy * 18 + ux * 8 + 3, c2, { size: 9.5, bold: true, cor: NAVY });
    return g;
  };

  // Entidades
  const eProgramas = ent(420, 30, 210, 'programs', ['PK id : uuid', 'code (único) · name', 'age_range · location']);
  const eUsers = ent(40, 250, 200, 'users', ['PK id : uuid', 'email (único)', 'password_hash · role', 'is_active']);
  const eUserPrograms = ent(250, 120, 200, 'user_programs', ['PK (user_id, program_id)', 'FK user_id → users', 'FK program_id → programs']);
  const eClassGroups = ent(740, 120, 210, 'class_groups', ['PK id : uuid', 'FK program_id → programs', 'slug · name · period', 'weekdays[] · age_range', 'único (program_id, slug)']);
  const eStudents = ent(420, 280, 220, 'students', ['PK id : uuid', 'FK program_id → programs', 'class_group (slug)', 'full_name · nis_user', 'family_members : jsonb', 'authorized_pickups : jsonb', 'is_active · …55 colunas']);
  const eSessions = ent(730, 330, 220, 'attendance_sessions', ['PK id : uuid', 'FK program_id → programs', 'FK created_by → users', 'attendance_date · class_group', 'period', 'único (program, data,', 'class_group, period)']);
  const eRecords = ent(500, 545, 230, 'attendance_records', ['PK (session_id, student_id)', 'FK session_id → sessions', 'FK student_id → students', 'status : present | absent']);
  const eNotes = ent(120, 520, 220, 'student_notes', ['PK id : uuid', 'FK student_id → students', 'FK author_user_id → users', 'note_text']);

  // Relacionamentos desenhados antes das caixas, para as linhas ficarem por baixo.
  let L = '';
  L += rel(240, 285, 250, 200, '1', 'N');                  // users → user_programs
  L += rel(450, 160, 470, 100, 'N', '1');                  // user_programs → programs
  L += rel(628, 78, 738, 165, '1', 'N');                   // programs → class_groups
  L += rel(525, 106, 525, 278, '1', 'N');                  // programs → students
  L += rel(630, 90, 826, 328, '1', 'N');                   // programs → attendance_sessions
  // users → attendance_sessions (created_by): contornando students por baixo,
  // para a linha não passar por trás de outra entidade.
  L += `<path d="M 175 340 L 175 470 L 690 470 L 690 448" fill="none" stroke="${LINE}" stroke-width="1.5"/>`;
  L += txt(188, 360, '1', { size: 9.5, bold: true, cor: NAVY, anchor: 'start' });
  L += txt(678, 462, 'N', { size: 9.5, bold: true, cor: NAVY, anchor: 'end' });
  L += txt(430, 464, 'created_by', { size: 8.5, cor: SLATE });
  L += rel(600, 452, 615, 543, '1', 'N');                  // students → attendance_records
  L += rel(800, 470, 700, 545, '1', 'N');                  // sessions → attendance_records
  L += rel(440, 452, 300, 520, '1', 'N');                  // students → student_notes
  L += rel(140, 340, 190, 518, '1', 'N');                  // users → student_notes

  s += L;
  s += eProgramas + eUsers + eUserPrograms + eClassGroups + eStudents + eSessions + eRecords + eNotes;

  // Legenda
  s += `<rect x="40" y="628" width="410" height="54" rx="6" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.2"/>`;
  s += txt(52, 646, 'students.class_group referencia class_groups.slug por valor,', { size: 8.8, anchor: 'start', cor: '#92400e' });
  s += txt(52, 658, 'sem chave estrangeira declarada. A integridade é garantida pela', { size: 8.8, anchor: 'start', cor: '#92400e' });
  s += txt(52, 670, 'aplicação (mesma regra vale para attendance_sessions.class_group).', { size: 8.8, anchor: 'start', cor: '#92400e' });

  return s + '</svg>';
}

module.exports = {
  'arq-componentes': componentes(),
  'arq-implantacao': implantacao(),
  'arq-der': der(),
};
