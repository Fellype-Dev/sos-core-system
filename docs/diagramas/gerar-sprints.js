const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, TableOfContents, Header, Footer, PageNumber, LevelFormat,
} = require('docx');

const MARGEM = 1134;
const LARGURA_UTIL = 11906 - MARGEM * 2;
const NAVY = '1A3A4A';
const BRAND = '3E4095';
const CINZA = '64748B';
const CINZA_CLARO = 'F1F5F9';
const BORDA = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

const p = (texto, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  children: [new TextRun({ text: texto, size: o.size ?? 21, color: o.color, bold: o.bold, italics: o.italics })],
});
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 170 },
  children: [new TextRun({ text: t, bold: true, size: 30, color: NAVY })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 130 },
  children: [new TextRun({ text: t, bold: true, size: 25, color: BRAND })] });
const bullet = (t) => new Paragraph({ numbering: { reference: 'marcadores', level: 0 },
  spacing: { after: 60, line: 276 }, children: [new TextRun({ text: t, size: 21 })] });

function celula(filhos, { largura, fundo, cabecalho = false }) {
  return new TableCell({
    width: { size: largura, type: WidthType.DXA },
    shading: fundo ? { type: ShadingType.CLEAR, fill: fundo, color: 'auto' } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: filhos.map((t) => typeof t === 'string'
      ? new Paragraph({ spacing: { after: 0, line: 258 },
          children: [new TextRun({ text: t, size: 19, bold: cabecalho, color: cabecalho ? NAVY : undefined })] })
      : t),
  });
}
function tabela(cabecalhos, linhas, larguras) {
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA }, columnWidths: larguras,
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      new TableRow({ tableHeader: true, children: cabecalhos.map((c, i) => celula([c], { largura: larguras[i], fundo: CINZA_CLARO, cabecalho: true })) }),
      ...linhas.map((l) => new TableRow({ children: l.map((v, i) => celula([v], { largura: larguras[i] })) })),
    ],
  });
}
function fichaSprint(s) {
  const L1 = 2000;
  const L2 = LARGURA_UTIL - L1;
  const lista = (itens) => itens.map((t, i) => new Paragraph({
    spacing: { after: i === itens.length - 1 ? 0 : 50, line: 258 },
    children: [new TextRun({ text: '• ' + t, size: 19 })],
  }));
  const linha = (rotulo, filhos) => new TableRow({
    children: [celula([rotulo], { largura: L1, fundo: CINZA_CLARO, cabecalho: true }), celula(filhos, { largura: L2 })],
  });
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA }, columnWidths: [L1, L2],
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      linha('Período', [s.periodo]),
      linha('Objetivo', [s.objetivo]),
      linha('Entregas', lista(s.entregas)),
      linha('Evidências', lista(s.evidencias)),
      ...(s.obs ? [linha('Observações', [s.obs])] : []),
    ],
  });
}
const quebra = () => new Paragraph({ children: [new PageBreak()] });
const espaco = (n = 160) => new Paragraph({ spacing: { after: n }, children: [] });

// ---- Sprints (reconstituídas do histórico do repositório) --------------------
const SPRINTS = [
  {
    nome: 'Sprint 0 — Concepção',
    periodo: '09/03/2026 a 17/03/2026',
    objetivo: 'Definir a estrutura do projeto e alinhar as expectativas da equipe e da instituição.',
    entregas: [
      'Estrutura principal do repositório: separação entre cliente (React) e servidor (Node.js).',
      'Modelos iniciais de código para controladores, modelos e rotas.',
      'README com a descrição do projeto e a seção de expectativas.',
    ],
    evidencias: ['Commits de 09/03 (estrutura e modelos) e 17/03 (README).', 'Participação de dois integrantes da equipe no repositório.'],
  },
  {
    nome: 'Sprint 1 — Fundação',
    periodo: '18/03/2026 a 12/04/2026',
    objetivo: 'Colocar de pé as três camadas do sistema e o isolamento de dados por unidade, requisito central do SOS.',
    entregas: [
      'Esquema do banco de dados no Supabase: unidades, funcionários, assistidos e listas de presença.',
      'Autenticação com token e escopo de unidade transportado na sessão.',
      'Primeira versão da interface: login, listagem e cadastro de assistidos.',
      'Configuração de publicação da interface (reescrita de rotas para a SPA).',
      'Rotas de cadastro de assistidos revisadas.',
    ],
    evidencias: ['Commit de 12/04 com 49 arquivos e cerca de 16 mil linhas — a maior entrega do projeto.', 'vercel.json e ajuste das rotas de estudantes no mesmo dia.'],
    obs: 'O intervalo entre 17/03 e 12/04 foi dedicado ao levantamento de requisitos junto ao SOS, sem integração no repositório.',
  },
  {
    nome: 'Sprint 2 — Turmas e lista de presença',
    periodo: '13/04/2026 a 04/05/2026',
    objetivo: 'Entregar o fluxo operacional diário: organizar assistidos em turmas e lançar a frequência.',
    entregas: [
      'Refatoração de UI/UX das telas de assistidos, turmas e cadastro.',
      'Tabela de turmas por unidade e vínculo do assistido à turma.',
      'Sistema de chamada: lançamento de presença por turma, data e período, com histórico.',
      'Primeiras telas de exibição de dados agregados.',
    ],
    evidencias: ['PR #1 (ft_2) em 03/05 e PR #2 (ft_3) em 04/05.', 'Migrações 002 (turma no assistido) e 003 (tabela de turmas; assistido sem turma).'],
  },
  {
    nome: 'Sprint 3 — Aderência ao cenário real',
    periodo: '05/05/2026 a 25/05/2026',
    objetivo: 'Adequar o cadastro à ficha cadastral usada pelas unidades e emitir os primeiros relatórios.',
    entregas: [
      'Cadastro de assistido reestruturado conforme a ficha do SOS: identificação, saúde, escola, endereço, responsável e composição familiar.',
      'Ficha de encaminhamento (posteriormente retirada a pedido da instituição).',
      'Observações do orientador no cadastro.',
      'Exportação em PDF dos gráficos do sistema.',
      'Remoção de informações sensíveis do README.',
    ],
    evidencias: ['PRs #3 a #6 (ft_4), todos em 25/05.', 'Migrações 004 (campos de perfil), 005 (anotações do orientador) e 006 (encaminhamento).'],
  },
  {
    nome: 'Sprint 4 — Identidade visual e segurança',
    periodo: '26/05/2026 a 30/05/2026',
    objetivo: 'Dar ao sistema a aparência de produto e reforçar a proteção da API antes da primeira apresentação.',
    entregas: [
      'Adoção de componentes de interface padronizados (shadcn/ui) e revisão da identidade visual.',
      'Tela de gestão de funcionários e permissões, restrita à sede.',
      'Cabeçalhos de segurança, limitação de tentativas de login e de requisições, validação de variáveis de ambiente.',
      'Troca da biblioteca de geração de PDF.',
    ],
    evidencias: ['PRs #7 e #8 (Kekis) em 30/05.', 'Commit de segurança em 30/05.'],
  },
  {
    nome: 'Sprint 5 — UX do módulo de assistidos',
    periodo: '01/06/2026 a 03/07/2026',
    objetivo: 'Refazer a experiência do módulo mais usado do sistema a partir do retorno da instituição.',
    entregas: [
      'Formulário de cadastro em quatro etapas, com navegação livre entre elas.',
      'Listagem com busca, filtros por turma e detalhes em janela.',
      'Tratamento de erros e mensagens em linguagem do usuário.',
    ],
    evidencias: ['PR #9 (Kekis) em 03/07: 24 arquivos, cerca de 2,8 mil linhas.', 'Backlog do Produto v4.0 datado de 15/06, entre as duas integrações.'],
    obs: 'Sprint mais longa do projeto, com a apresentação do sistema ao SOS e a consolidação do backlog no meio do período.',
  },
  {
    nome: 'Sprint 6 — Turmas do cronograma do SCFV',
    periodo: '04/07/2026 a 12/07/2026',
    objetivo: 'Cadastrar as turmas reais das três unidades, com período, dias da semana e faixa etária.',
    entregas: [
      'As 38 turmas do cronograma do SCFV (11 no Viver, 17 no Sonhar, 10 no Semear).',
      'Período, dias da semana e faixa etária como atributos da turma, exibidos nos cartões.',
      'Migração de complemento para turmas já existentes em produção.',
    ],
    evidencias: ['Commit de 12/07.', 'Migrações 007 (cronograma) e 008 (complemento).'],
  },
  {
    nome: 'Sprint 7 — Retorno da apresentação ao SOS',
    periodo: '13/07/2026 a 01/08/2026',
    objetivo: 'Implementar as melhorias levantadas na última reunião com a instituição.',
    entregas: [
      'Pessoas autorizadas a retirar o assistido, além do responsável.',
      'Desativação de assistido com preservação do histórico; exclusão restrita ao administrador.',
      'Indicação do tempo de vínculo com o programa.',
      'Ficha individual em PDF e planilha por assistido; exportação da listagem em Excel.',
      'Registro da vinculação no SISC e alerta de divergência com a turma.',
      'Perfis Técnico e Assistente, com as mesmas permissões do Coordenador.',
      'Remoção da ficha de encaminhamento.',
    ],
    evidencias: ['Commit de 01/08: 33 arquivos.', 'Migrações 009 (autorizados), 010 (SISC) e 011 (perfis).'],
  },
  {
    nome: 'Sprint 8 — Implantação, dados e documentação',
    periodo: '02/08/2026 a 25/08/2026',
    objetivo: 'Colocar o sistema em produção com os dados reais e documentar o produto.',
    entregas: [
      'Correção da publicação da API (diretório-raiz do serviço) e complemento das turmas em produção.',
      'Importador de planilhas: simulação obrigatória, sinônimos de cabeçalho, diagnóstico de colunas, desambiguação de turma por turno, atualização não destrutiva.',
      'Migração de 526 cadastros das três unidades.',
      'Painel de usuários por turma refeito: todas as turmas, agrupadas por unidade.',
      'Documentação: SRS, Arquitetura e Design, Manual do Usuário, Manual Técnico e Plano de Implantação.',
      'README reescrito.',
    ],
    evidencias: ['Commits de 25/08: 53 arquivos e cerca de 5,6 mil linhas, além do ajuste do gráfico.', 'Pasta docs/ com cinco documentos e os geradores.'],
  },
  {
    nome: 'Sprint 9 — Piloto e encerramento',
    periodo: '26/08/2026 em diante',
    objetivo: 'Acompanhar o uso real, fechar as pendências de dados e concluir a documentação.',
    entregas: [
      'Relatório de Implantação Piloto.',
      'Reimportação das planilhas com o mapeamento corrigido (pendente).',
      'Vínculo dos assistidos sem turma (pendente).',
      'Registro do desenvolvimento em sprints (este documento).',
    ],
    evidencias: ['Relatório de Implantação Piloto em docs/.', 'Pendências registradas na seção 4.3 do relatório.'],
  },
];

// ---- Documento --------------------------------------------------------------
const filhos = [];
filhos.push(
  new Paragraph({ spacing: { before: 2200, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SERVIÇO DE OBRAS SOCIAIS', bold: true, size: 24, color: CINZA })] }),
  new Paragraph({ spacing: { before: 480, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SIGU', bold: true, size: 72, color: NAVY })] }),
  new Paragraph({ spacing: { before: 120, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Sistema Integrado de Gerenciamento de Usuários', size: 28, color: BRAND })] }),
  new Paragraph({ spacing: { before: 900, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'DESENVOLVIMENTO EM SPRINTS', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { before: 120, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Registro das iterações do projeto, de março a setembro de 2026', size: 22, italics: true, color: CINZA })] }),
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 1.0', size: 22, color: CINZA })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 22, color: CINZA })] }),
  quebra(),
);
filhos.push(h1('Sumário'), new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-2' }), quebra());

filhos.push(h1('1. Método'));
filhos.push(p('O SIGU foi desenvolvido de forma iterativa, com entregas incrementais validadas junto ao Serviço de Obras Sociais. Este documento organiza o desenvolvimento em sprints, do primeiro commit ao encerramento da implantação.'));
filhos.push(p('As sprints foram reconstituídas a partir do histórico do repositório — commits, pull requests e scripts de migração de banco — e não de um planejamento prévio. Por isso têm duração variável: cada uma corresponde a um ciclo real de desenvolvimento encerrado por uma integração na branch principal, e não a uma janela fixa de tempo. As datas são as registradas no controle de versão.'));
filhos.push(p('A equipe foi formada por três integrantes; o desenvolvimento do código concentrou-se em um deles, com os demais atuando na definição do escopo, no levantamento junto à instituição e na documentação.'));

filhos.push(h2('1.1. Visão geral'));
filhos.push(tabela(['Sprint', 'Período', 'Foco'], SPRINTS.map((s) => [
  s.nome.split(' — ')[0], s.periodo, s.nome.split(' — ')[1],
]), [1500, 3000, LARGURA_UTIL - 1500 - 3000]));

filhos.push(h2('1.2. Números do projeto'));
filhos.push(tabela(['Indicador', 'Valor'], [
  ['Duração', '09/03/2026 a 25/08/2026 (código); documentação e piloto em setembro'],
  ['Commits na branch principal', '33'],
  ['Pull requests integrados', '9'],
  ['Migrações de banco', '11, além do esquema inicial'],
  ['Turmas cadastradas', '38, nas três unidades'],
  ['Cadastros migrados', '526'],
  ['Testes automatizados', '20, em 2 conjuntos'],
  ['Documentos produzidos', '7: SRS, Arquitetura, Manual do Usuário, Manual Técnico, Plano de Implantação, Relatório Piloto e este'],
], [3400, LARGURA_UTIL - 3400]));

filhos.push(quebra());

filhos.push(h1('2. Sprints'));
SPRINTS.forEach((s, i) => {
  filhos.push(h2(`2.${i + 1}. ${s.nome}`));
  filhos.push(fichaSprint(s));
  filhos.push(espaco());
  if (i === 3 || i === 6) filhos.push(quebra());
});

filhos.push(quebra());
filhos.push(h1('3. Observações sobre o processo'));
filhos.push(bullet('As sprints mais longas (1 e 5) coincidem com os momentos de contato com a instituição — levantamento inicial e apresentação do sistema. O tempo sem integração no repositório não foi tempo parado: foi levantamento e validação.'));
filhos.push(bullet('A cada retorno do SOS seguiu-se uma sprint de adequação (3, 5 e 7). O produto convergiu para o cenário real por aproximações sucessivas, não de uma vez.'));
filhos.push(bullet('As migrações de banco numeradas contam a mesma história que os commits: cada funcionalidade nova que exigiu dado novo tem o seu script, na ordem em que apareceu.'));
filhos.push(bullet('A documentação ficou concentrada no fim (Sprint 8). Em projetos futuros, o SRS e o registro de decisões de arquitetura renderiam mais se escritos junto com as Sprints 1 a 3, quando as decisões foram tomadas.'));
filhos.push(bullet('A importação dos dados reais (Sprint 8) foi a etapa que mais expôs problemas — e a que mais melhorou o sistema. Antecipá-la, ainda que com uma amostra, teria encurtado as Sprints 5 e 7.'));

const doc = new Document({
  creator: 'Serviço de Obras Sociais',
  title: 'SIGU — Desenvolvimento em Sprints',
  numbering: { config: [{ reference: 'marcadores', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 460, hanging: 240 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: MARGEM, right: MARGEM, bottom: MARGEM, left: MARGEM } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 6 } },
      children: [new TextRun({ text: 'SIGU — Desenvolvimento em Sprints', size: 16, color: CINZA })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'Serviço de Obras Sociais  ·  Página ', size: 16, color: CINZA }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16, color: CINZA }),
      new TextRun({ text: ' de ', size: 16, color: CINZA }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: CINZA }),
    ] })] }) },
    children: filhos,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const destino = path.join(__dirname, 'Sprints-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  console.log('gerado:', destino, '|', (buffer.length / 1024).toFixed(0), 'KB |', SPRINTS.length, 'sprints');
});
