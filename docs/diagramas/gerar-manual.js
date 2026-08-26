const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, ImageRun, TableOfContents, Header, Footer, PageNumber, LevelFormat,
} = require('docx');
const conteudo = require('./conteudo-manual');

// ---- Métricas de página (A4, margens de 2 cm) -------------------------------
const MARGEM = 1134;
const LARGURA_UTIL = 11906 - MARGEM * 2;

const NAVY = '1A3A4A';
const BRAND = '3E4095';
const CINZA = '64748B';
const CINZA_CLARO = 'F1F5F9';
const AVISO_FUNDO = 'FFFBEB';

const BORDA = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

// ---- Auxiliares -------------------------------------------------------------
const p = (texto, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 276 },
  alignment: opts.alignment,
  children: [new TextRun({ text: texto, size: opts.size ?? 21, color: opts.color, bold: opts.bold, italics: opts.italics })],
});

const h1 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 180 },
  children: [new TextRun({ text: texto, bold: true, size: 30, color: NAVY })],
});

const h2 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text: texto, bold: true, size: 25, color: BRAND })],
});

const h3 = (texto) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: texto, bold: true, size: 22, color: NAVY })],
});

const bullet = (texto) => new Paragraph({
  numbering: { reference: 'marcadores', level: 0 },
  spacing: { after: 60, line: 276 },
  children: [new TextRun({ text: texto, size: 21 })],
});

let instancia = 0;
const passo = (texto, inst) => new Paragraph({
  numbering: { reference: 'passos', level: 0, instance: inst },
  spacing: { after: 70, line: 276 },
  children: [new TextRun({ text: texto, size: 21 })],
});

function celula(filhos, { largura, fundo, cabecalho = false }) {
  return new TableCell({
    width: { size: largura, type: WidthType.DXA },
    shading: fundo ? { type: ShadingType.CLEAR, fill: fundo, color: 'auto' } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: filhos.map((t) =>
      typeof t === 'string'
        ? new Paragraph({
            spacing: { after: 0, line: 264 },
            children: [new TextRun({ text: t, size: 20, bold: cabecalho, color: cabecalho ? NAVY : undefined })],
          })
        : t
    ),
  });
}

function tabela(cabecalhos, linhas, larguras) {
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: larguras,
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabecalhos.map((c, i) => celula([c], { largura: larguras[i], fundo: CINZA_CLARO, cabecalho: true })),
      }),
      ...linhas.map((linha) => new TableRow({
        children: linha.map((v, i) => celula([v], { largura: larguras[i] })),
      })),
    ],
  });
}

/** Caixa de observações, em fundo âmbar, ao final de um procedimento. */
function observacoes(itens) {
  const filhos = [
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Observações', bold: true, size: 19, color: '92400E' })],
    }),
    ...itens.map((t, i) => new Paragraph({
      spacing: { after: i === itens.length - 1 ? 0 : 60, line: 264 },
      indent: { left: 200, hanging: 200 },
      children: [new TextRun({ text: '•  ' + t, size: 19, color: '78350F' })],
    })),
  ];

  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [LARGURA_UTIL],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'FCD34D' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FCD34D' },
      left: { style: BorderStyle.SINGLE, size: 12, color: 'F59E0B' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'FCD34D' },
    },
    rows: [new TableRow({ children: [celula(filhos, { largura: LARGURA_UTIL, fundo: AVISO_FUNDO })] })],
  });
}

/** Procedimento completo: título, passos numerados e observações. */
function procedimento(proc, { titulo = true } = {}) {
  instancia += 1;
  const saida = [];
  if (titulo) saida.push(h3(proc.titulo));
  proc.passos.forEach((t) => saida.push(passo(t, instancia)));
  if (proc.obs && proc.obs.length) {
    saida.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
    saida.push(observacoes(proc.obs));
    saida.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  }
  return saida;
}

function imagem(arquivo, largura, altura, legenda) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 80 },
      children: [new ImageRun({
        data: fs.readFileSync(path.join(__dirname, arquivo)),
        type: 'png',
        transformation: { width: largura, height: altura },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: legenda, size: 18, italics: true, color: CINZA })],
    }),
  ];
}

const quebra = () => new Paragraph({ children: [new PageBreak()] });

// ---- Montagem ---------------------------------------------------------------
const filhos = [];

// Capa
filhos.push(
  new Paragraph({ spacing: { before: 2200, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SERVIÇO DE OBRAS SOCIAIS', bold: true, size: 24, color: CINZA })] }),
  new Paragraph({ spacing: { before: 480, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SIGU', bold: true, size: 72, color: NAVY })] }),
  new Paragraph({ spacing: { before: 120, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Sistema Integrado de Gerenciamento de Usuários', size: 28, color: BRAND })] }),
  new Paragraph({ spacing: { before: 900, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'MANUAL DO USUÁRIO', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { before: 120, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Guia de operação para as equipes das unidades e da sede', size: 22, italics: true, color: CINZA })] }),
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 1.0', size: 22, color: CINZA })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 22, color: CINZA })] }),
  quebra(),
);

// Sumário
filhos.push(h1('Sumário'), new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }), quebra());

// 1. Introdução
filhos.push(h1('1. Introdução'));

filhos.push(h2('1.1. Objetivo deste manual'));
filhos.push(p('Este manual ensina a usar o SIGU — Sistema Integrado de Gerenciamento de Usuários, do Serviço de Obras Sociais (SOS). Apresenta, passo a passo, como entrar no sistema, cadastrar e acompanhar os assistidos, organizar as turmas, lançar a lista de presença e emitir relatórios.'));
filhos.push(p('O texto foi escrito para ser consultado durante o trabalho: cada funcionalidade é explicada em passos numerados, seguidos de observações sobre os pontos que costumam gerar dúvida. Não é necessário ler o documento inteiro para começar — o Guia de Primeiros Passos, na seção 3, é suficiente para o primeiro dia.'));

filhos.push(h2('1.2. A quem se destina'));
filhos.push(p('Destina-se a todos os profissionais que operam o sistema:'));
filhos.push(bullet('coordenadores, técnicos e assistentes das unidades Semear, Viver e Sonhar, que cadastram assistidos, organizam turmas e lançam a frequência;'));
filhos.push(bullet('equipe da sede, que acompanha as três unidades e emite relatórios consolidados;'));
filhos.push(bullet('administração, responsável pelo cadastro de funcionários e pelas permissões de acesso.'));
filhos.push(p('Não é exigido conhecimento técnico de informática. Basta saber usar um navegador de internet.'));

filhos.push(h2('1.3. Como este manual está organizado'));
filhos.push(tabela(
  ['Seção', 'Conteúdo'],
  [
    ['2. Visão Geral do Sistema', 'O que o sistema faz, os benefícios para o trabalho diário e os perfis de acesso.'],
    ['3. Guia de Primeiros Passos', 'O que é preciso para acessar, como entrar e como circular pelas telas.'],
    ['4. Funcionalidades Detalhadas', 'O passo a passo de cada tela, com ilustrações numeradas.'],
    ['5. Perguntas Frequentes', 'Respostas diretas para as dúvidas mais comuns.'],
    ['6. Solução de Problemas', 'O que fazer quando algo não funciona como esperado.'],
    ['7. Informações de Contato', 'A quem recorrer em cada tipo de situação.'],
    ['8. Glossário', 'Significado dos termos usados nas telas.'],
  ],
  [3000, LARGURA_UTIL - 3000]
));

filhos.push(h2('1.4. Convenções adotadas'));
filhos.push(bullet('Os nomes de menus, botões e campos aparecem exatamente como estão na tela, em destaque: Usuários, Salvar Lista de Presença, Nome Completo.'));
filhos.push(bullet('Os números entre parênteses — (1), (2), (3) — remetem aos marcadores azuis das ilustrações de cada seção.'));
filhos.push(bullet('No sistema, Usuários são as pessoas atendidas pela instituição, e Funcionários são os profissionais que operam o sistema. Este manual segue essa mesma nomenclatura.'));
filhos.push(bullet('As ilustrações reproduzem o desenho das telas; todos os nomes e dados nelas apresentados são fictícios, criados apenas para o manual.'));

filhos.push(quebra());

// 2. Visão geral
filhos.push(h1('2. Visão geral do sistema'));

filhos.push(h2('2.1. O que o sistema faz'));
filhos.push(p('O SIGU reúne, em um único lugar, as informações de que as unidades precisam para acompanhar o Serviço de Convivência e Fortalecimento de Vínculos (SCFV): quem é atendido, em qual turma, com que frequência comparece e o que precisa ser prestado de contas.'));
filhos.push(p('O sistema é acessado pelo navegador, sem instalação, e organiza o trabalho em cinco frentes: o painel de acompanhamento, o cadastro dos assistidos, a organização das turmas, o registro diário da frequência e a emissão de relatórios. Uma sexta área, restrita à sede, cuida do cadastro dos funcionários e de suas permissões.'));

filhos.push(h2('2.2. Principais benefícios'));
conteudo.BENEFICIOS.forEach((item) => filhos.push(bullet(item)));

filhos.push(h2('2.3. Perfis de acesso'));
filhos.push(p('O que cada profissional pode fazer depende do seu perfil, definido pela administração no momento do cadastro.'));
filhos.push(tabela(['Perfil', 'O que pode fazer'], conteudo.PERFIS, [2900, LARGURA_UTIL - 2900]));

filhos.push(h2('2.4. O que o sistema não faz'));
filhos.push(p('Para evitar expectativas equivocadas, convém saber desde já:'));
filhos.push(bullet('não envia informações automaticamente ao SISC nem a qualquer sistema do governo — o registro no SISC continua sendo digitado manualmente;'));
filhos.push(bullet('não funciona sem internet;'));
filhos.push(bullet('não controla finanças, estoque, doações ou folha de pagamento;'));
filhos.push(bullet('não recupera senha automaticamente: a redefinição é feita pela sede.'));

filhos.push(quebra());

// 3. Primeiros passos
filhos.push(h1('3. Guia de primeiros passos'));

filhos.push(h2('3.1. O que você precisa'));
filhos.push(tabela(['Item', 'Detalhe'], conteudo.REQUISITOS, [2200, LARGURA_UTIL - 2200]));

filhos.push(h2('3.2. Primeiro acesso'));
filhos.push(p('A tela de entrada pede apenas o e-mail corporativo e a senha fornecida pela sede.'));
filhos.push(...imagem('man-login.png', 462, 241, 'Figura 1 — Tela de acesso ao sistema.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.primeiroAcesso));

filhos.push(quebra());

filhos.push(h2('3.3. Conhecendo a tela'));
filhos.push(p('A barra superior acompanha você em todas as telas. É por ela que se navega entre as áreas do sistema, se confere a unidade em que se está trabalhando e se encerra a sessão.'));
filhos.push(...imagem('man-navbar.png', 462, 98, 'Figura 2 — Barra de navegação, presente em todas as telas.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.navegacao));

filhos.push(h2('3.4. Cuidados com o acesso e com os dados'));
filhos.push(p('O sistema guarda dados pessoais de crianças, adolescentes e idosos, protegidos pela Lei Geral de Proteção de Dados. Alguns cuidados são obrigatórios no dia a dia:'));
filhos.push(bullet('não compartilhe a sua senha, nem deixe o sistema aberto em computador de uso comum — clique em Sair ao terminar;'));
filhos.push(bullet('consulte somente os dados necessários ao seu trabalho;'));
filhos.push(bullet('trate as fichas e planilhas exportadas com o mesmo cuidado de um documento em papel: não envie por aplicativos pessoais e apague os arquivos do equipamento após o uso;'));
filhos.push(bullet('em caso de suspeita de acesso indevido à sua conta, avise imediatamente a sede para que a senha seja trocada.'));

filhos.push(quebra());

// 4. Funcionalidades detalhadas
filhos.push(h1('4. Funcionalidades detalhadas'));
filhos.push(p('Esta seção percorre as telas do sistema na ordem do menu. Antes de qualquer operação, confira sempre a unidade ativa no topo da tela: é ela que determina onde os dados serão gravados.'));

filhos.push(h2('4.1. Início — Painel de Monitoramento'));
filhos.push(p('É a tela que abre após a entrada no sistema. Reúne os números da unidade em cartões e gráficos, permitindo acompanhar a frequência ao longo do tempo.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.painel));

filhos.push(quebra());

filhos.push(h2('4.2. Usuários — cadastro dos assistidos'));
filhos.push(p('A tela Usuários reúne todas as pessoas atendidas pela unidade ativa. É onde se cadastra, consulta, edita, desativa e exporta a ficha de cada uma.'));
filhos.push(...imagem('man-usuarios.png', 462, 257, 'Figura 3 — Listagem de usuários da unidade.'));

filhos.push(...procedimento(conteudo.PROCEDIMENTOS.consultar));

filhos.push(quebra());

filhos.push(h3('Cadastrar um novo usuário'));
filhos.push(p('O cadastro é dividido em quatro etapas, para que se possa preencher aos poucos, conforme a família apresenta as informações.'));
filhos.push(...imagem('man-formulario.png', 462, 221, 'Figura 4 — Formulário de cadastro, dividido em quatro etapas.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.cadastrar, { titulo: false }));

filhos.push(h3('Editar um cadastro existente'));
filhos.push(p('Na listagem, clique no ícone de edição da linha correspondente. O formulário abre com os dados já preenchidos, nas mesmas quatro etapas, e o botão final passa a ser Salvar alterações. É por aqui que se completa um cadastro iniciado com poucas informações.'));

filhos.push(...procedimento(conteudo.PROCEDIMENTOS.autorizados));

filhos.push(quebra());

filhos.push(...procedimento(conteudo.PROCEDIMENTOS.exportarFicha));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.desativar));

filhos.push(quebra());

filhos.push(...procedimento(conteudo.PROCEDIMENTOS.excluir));

filhos.push(h2('4.3. Turmas — organização dos grupos'));
filhos.push(p('A tela Turmas cuida dos grupos de convivência da unidade e do vínculo de cada usuário com a sua turma.'));
filhos.push(...imagem('man-turmas.png', 462, 257, 'Figura 5 — Tela de turmas, com o painel de vínculo de alunos.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.turmas));

filhos.push(quebra());

filhos.push(...procedimento(conteudo.PROCEDIMENTOS.vincular));

filhos.push(h2('4.4. Lista de Presença — registro da frequência'));
filhos.push(p('A tela tem duas abas: uma para lançar a presença do dia e outra para consultar e corrigir as listas já gravadas.'));
filhos.push(...imagem('man-presenca.png', 462, 241, 'Figura 6 — Lançamento da lista de presença do dia.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.lancarPresenca));

filhos.push(quebra());

filhos.push(...procedimento(conteudo.PROCEDIMENTOS.historicoPresenca));

filhos.push(h2('4.5. Relatórios e exportações'));
filhos.push(p('A tela Relatórios gera planilhas em Excel e documentos em PDF a partir dos dados já registrados.'));
filhos.push(...imagem('man-relatorios.png', 462, 231, 'Figura 7 — Tela de relatórios e exportações.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.relatorios));

filhos.push(quebra());

filhos.push(h2('4.6. Funcionários — acesso ao sistema'));
filhos.push(p('Esta área é restrita: apenas os perfis Administrador e Equipe Sede a enxergam no menu, e somente o Administrador pode alterar cadastros.'));
filhos.push(...procedimento(conteudo.PROCEDIMENTOS.funcionarios));

filhos.push(quebra());

// 5. FAQ
filhos.push(h1('5. Perguntas frequentes'));
filhos.push(p('As perguntas abaixo reúnem as dúvidas mais comuns durante o uso do sistema.'));
conteudo.FAQ.forEach(([pergunta, resposta]) => {
  filhos.push(new Paragraph({
    spacing: { before: 200, after: 60, line: 276 },
    children: [new TextRun({ text: pergunta, bold: true, size: 21, color: NAVY })],
  }));
  filhos.push(p(resposta, { after: 40 }));
});

filhos.push(quebra());

// 6. Solução de problemas
filhos.push(h1('6. Solução de problemas'));
filhos.push(p('A tabela relaciona as situações mais comuns, a causa provável e o que fazer. Se o problema persistir após a orientação indicada, procure o contato correspondente na seção 7, informando o horário da ocorrência e a tela em que ela aconteceu.'));
filhos.push(tabela(
  ['O que acontece', 'Causa provável', 'O que fazer'],
  conteudo.PROBLEMAS,
  [3000, 2600, LARGURA_UTIL - 3000 - 2600]
));

filhos.push(h2('6.1. Antes de pedir ajuda'));
filhos.push(bullet('Atualize a página com F5: boa parte das telas desatualizadas se resolve assim.'));
filhos.push(bullet('Confira a unidade ativa no topo da tela — muitas ausências de dados são apenas unidade trocada.'));
filhos.push(bullet('Confira os filtros aplicados na tela, principalmente o de situação e o de turma.'));
filhos.push(bullet('Teste em outro navegador ou em outro equipamento, para saber se o problema é geral ou local.'));
filhos.push(bullet('Anote a mensagem exibida, o horário e o que estava fazendo. Uma captura de tela ajuda bastante o suporte.'));

filhos.push(quebra());

// 7. Contatos
filhos.push(h1('7. Informações de contato'));
filhos.push(p('Cada tipo de dúvida tem um caminho mais rápido. Procure o contato correspondente à sua situação.'));
filhos.push(tabela(
  ['Situação', 'A quem recorrer', 'Contato'],
  conteudo.CONTATOS,
  [3400, 3000, LARGURA_UTIL - 3400 - 3000]
));
filhos.push(p('Os campos assinalados como [preencher] devem ser completados pela sede antes da distribuição deste manual às unidades.', { italics: true, color: CINZA }));

filhos.push(h2('7.1. Como relatar um problema'));
filhos.push(p('Para que o atendimento seja rápido, informe:'));
filhos.push(bullet('seu nome, unidade e perfil de acesso;'));
filhos.push(bullet('a tela em que o problema ocorreu e o que estava sendo feito;'));
filhos.push(bullet('a mensagem exibida, transcrita ou em captura de tela;'));
filhos.push(bullet('a data e o horário aproximado da ocorrência;'));
filhos.push(bullet('se o problema acontece sempre ou apenas naquela vez.'));

filhos.push(quebra());

// 8. Glossário
filhos.push(h1('8. Glossário'));
filhos.push(tabela(['Termo', 'Significado'], conteudo.GLOSSARIO, [2400, LARGURA_UTIL - 2400]));

// ---- Documento --------------------------------------------------------------
const doc = new Document({
  creator: 'Serviço de Obras Sociais',
  title: 'SIGU — Manual do Usuário',
  description: 'Guia de operação do SIGU para as equipes das unidades e da sede',
  numbering: {
    config: [
      {
        reference: 'marcadores',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 240 } } },
        }],
      },
      {
        reference: 'passos',
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 520, hanging: 300 } },
            run: { bold: true, color: BRAND },
          },
        }],
      },
    ],
  },
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: MARGEM, right: MARGEM, bottom: MARGEM, left: MARGEM } } },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 6 } },
          children: [new TextRun({ text: 'SIGU — Manual do Usuário', size: 16, color: CINZA })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Serviço de Obras Sociais  ·  Página ', size: 16, color: CINZA }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: CINZA }),
            new TextRun({ text: ' de ', size: 16, color: CINZA }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: CINZA }),
          ],
        })],
      }),
    },
    children: filhos,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const destino = path.join(__dirname, 'Manual-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  const passos = Object.values(conteudo.PROCEDIMENTOS).reduce((n, proc) => n + proc.passos.length, 0);
  console.log('gerado:', destino);
  console.log('  tamanho:', (buffer.length / 1024).toFixed(0), 'KB');
  console.log('  procedimentos:', Object.keys(conteudo.PROCEDIMENTOS).length, '| passos:', passos);
  console.log('  perguntas frequentes:', conteudo.FAQ.length, '| problemas:', conteudo.PROBLEMAS.length);
});
