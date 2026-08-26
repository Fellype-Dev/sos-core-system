const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, ImageRun, TableOfContents, Header, Footer, PageNumber, LevelFormat,
} = require('docx');
const conteudo = require('./conteudo');

// ---- Métricas de página (A4, margens de 2 cm) -------------------------------
const MARGEM = 1134;              // 2 cm em DXA
const LARGURA_UTIL = 11906 - MARGEM * 2;  // 9638 DXA

const NAVY = '1A3A4A';
const BRAND = '3E4095';
const CINZA = '64748B';
const CINZA_CLARO = 'F1F5F9';

const SEM_BORDA = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
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
  spacing: { before: 220, after: 120 },
  children: [new TextRun({ text: texto, bold: true, size: 22, color: NAVY })],
});

const bullet = (texto) => new Paragraph({
  numbering: { reference: 'marcadores', level: 0 },
  spacing: { after: 60, line: 276 },
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

/** Tabela simples de duas colunas com cabeçalho. */
function tabela2(cabecalhos, linhas, larguras) {
  const [l1, l2] = larguras;
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [l1, l2],
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          celula([cabecalhos[0]], { largura: l1, fundo: CINZA_CLARO, cabecalho: true }),
          celula([cabecalhos[1]], { largura: l2, fundo: CINZA_CLARO, cabecalho: true }),
        ],
      }),
      ...linhas.map(([a, b]) => new TableRow({
        children: [celula([a], { largura: l1 }), celula([b], { largura: l2 })],
      })),
    ],
  });
}

/** Tabela de três colunas com cabeçalho. */
function tabela3(cabecalhos, linhas, larguras) {
  const [l1, l2, l3] = larguras;
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [l1, l2, l3],
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: cabecalhos.map((c, i) =>
          celula([c], { largura: larguras[i], fundo: CINZA_CLARO, cabecalho: true })
        ),
      }),
      ...linhas.map((linha) => new TableRow({
        children: linha.map((v, i) => celula([v], { largura: larguras[i] })),
      })),
    ],
  });
}

/** Ficha de um requisito funcional. */
function fichaRequisito(rf) {
  const L1 = 2100;
  const L2 = LARGURA_UTIL - L1;
  const linha = (rotulo, filhos) => new TableRow({
    children: [
      celula([rotulo], { largura: L1, fundo: CINZA_CLARO, cabecalho: true }),
      celula(filhos, { largura: L2 }),
    ],
  });

  const criterios = rf.criterios.map((c, i) => new Paragraph({
    spacing: { after: i === rf.criterios.length - 1 ? 0 : 60, line: 264 },
    children: [new TextRun({ text: '• ' + c, size: 20 })],
  }));

  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [L1, L2],
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      linha('Identificador', [rf.id]),
      linha('Nome', [rf.nome]),
      linha('Perfis autorizados', [rf.perfis]),
      linha('Descrição', [rf.descricao]),
      linha('Entradas', [rf.entradas]),
      linha('Saídas', [rf.saidas]),
      linha('Critérios de aceitação', criterios),
    ],
  });
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
    children: [new TextRun({ text: 'DOCUMENTO DE ESPECIFICAÇÃO DE REQUISITOS DE SOFTWARE', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { before: 120, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Software Requirements Specification (SRS)', size: 22, italics: true, color: CINZA })] }),
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 1.0', size: 22, color: CINZA })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 22, color: CINZA })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Sumário
filhos.push(
  h1('Sumário'),
  new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. Introdução
filhos.push(h1('1. Introdução'));

filhos.push(h2('1.1. Propósito'));
filhos.push(p('Este documento especifica os requisitos funcionais e não funcionais do SIGU — Sistema Integrado de Gerenciamento de Usuários, desenvolvido para o Serviço de Obras Sociais (SOS).'));
filhos.push(p('Destina-se à equipe de desenvolvimento e manutenção do sistema, à coordenação do SOS responsável pela validação das funcionalidades e aos profissionais que operam o sistema nas unidades. Serve como referência para verificar se o produto entregue atende ao que foi acordado e como base para a evolução futura do sistema.'));

filhos.push(h2('1.2. Escopo do produto'));
filhos.push(p('O SIGU é um sistema web destinado à gestão operacional do Serviço de Convivência e Fortalecimento de Vínculos (SCFV) nas unidades do SOS. O sistema abrange:'));
filhos.push(bullet('o cadastro e o acompanhamento dos assistidos, incluindo dados de identificação, saúde, escolaridade, endereço, responsáveis e composição familiar;'));
filhos.push(bullet('a organização dos assistidos em turmas, com período, dias da semana e faixa etária;'));
filhos.push(bullet('o registro diário de frequência por meio de listas de presença, com histórico consultável e corrigível;'));
filhos.push(bullet('o registro dos dados de vinculação no SISC e a identificação de divergências em relação às turmas da unidade;'));
filhos.push(bullet('a emissão de fichas individuais, planilhas e relatórios analíticos, individuais ou consolidados;'));
filhos.push(bullet('a administração de funcionários, perfis de acesso e unidades autorizadas.'));
filhos.push(p('Não estão no escopo deste sistema: a integração automatizada com o SISC ou com quaisquer sistemas governamentais, que ocorre por digitação manual; a gestão financeira, de recursos humanos ou de patrimônio; e o funcionamento sem conexão com a internet.', { after: 200 }));

filhos.push(h2('1.3. Definições, acrônimos e abreviações'));
filhos.push(tabela2(['Termo', 'Definição'], conteudo.GLOSSARIO, [2100, LARGURA_UTIL - 2100]));

filhos.push(new Paragraph({ children: [new PageBreak()] }));

// 2. Descrição geral
filhos.push(h1('2. Descrição geral'));

filhos.push(h2('2.1. Perspectiva do produto'));
filhos.push(p('O SIGU é um produto novo, sem sistema antecessor a substituir. Adota arquitetura cliente-servidor em três camadas: uma interface web executada no navegador, um servidor de aplicação que concentra as regras de negócio e o controle de acesso, e um banco de dados relacional.'));
filhos.push(p('O sistema opera sobre três unidades do SOS — Semear, Viver e Sonhar —, cada uma com suas próprias turmas e assistidos. O isolamento entre unidades é regra central: salvo para os perfis com alcance institucional, cada profissional acessa apenas os dados das unidades às quais está vinculado.'));

filhos.push(h2('2.2. Perfis de usuário'));
filhos.push(p('O sistema define cinco perfis de acesso. Os perfis Coordenador, Técnico e Assistente possuem exatamente as mesmas permissões, diferindo apenas na identificação do cargo do profissional.'));
filhos.push(tabela2(['Perfil', 'Permissões'], conteudo.PERFIS_TABELA, [2400, LARGURA_UTIL - 2400]));

filhos.push(h2('2.3. Suposições e dependências'));
filhos.push(bullet('Os profissionais possuem dispositivo com navegador web atualizado e acesso à internet durante a operação.'));
filhos.push(bullet('Os dados de referência do SISC são obtidos e digitados manualmente pelos profissionais, não havendo integração automatizada.'));
filhos.push(bullet('A disponibilidade do sistema depende dos provedores de hospedagem da interface, do servidor e do banco de dados.'));
filhos.push(bullet('As turmas seguem o cronograma de grupos do SCFV definido pelo SOS, sujeito a revisão periódica.'));

filhos.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Requisitos funcionais
filhos.push(h1('3. Requisitos funcionais'));
filhos.push(p('Os requisitos funcionais estão organizados por módulo. Cada requisito é identificado pelo prefixo RF seguido de numeração sequencial e descrito em termos de perfis autorizados, comportamento esperado, entradas, saídas e critérios de aceitação.'));

let indiceModulo = 0;
conteudo.REQUISITOS_FUNCIONAIS.forEach((modulo) => {
  indiceModulo += 1;
  filhos.push(h2(`3.${indiceModulo}. ${modulo.modulo}`));
  modulo.itens.forEach((rf, i) => {
    filhos.push(h3(`${rf.id} — ${rf.nome}`));
    filhos.push(fichaRequisito(rf));
    if (i < modulo.itens.length - 1) filhos.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  });
});

filhos.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Requisitos não funcionais
filhos.push(h1('4. Requisitos não funcionais'));
filhos.push(p('Os requisitos não funcionais descrevem os atributos de qualidade esperados do sistema, bem como as restrições que condicionam a sua construção e operação.'));

let indiceCategoria = 0;
conteudo.REQUISITOS_NAO_FUNCIONAIS.forEach((cat) => {
  indiceCategoria += 1;
  filhos.push(h2(`4.${indiceCategoria}. ${cat.categoria}`));
  filhos.push(tabela2(['Id.', 'Requisito'], cat.itens, [1250, LARGURA_UTIL - 1250]));
});

indiceCategoria += 1;
filhos.push(h2(`4.${indiceCategoria}. Restrições`));
filhos.push(tabela2(['Natureza', 'Restrição'], conteudo.RESTRICOES, [1900, LARGURA_UTIL - 1900]));

indiceCategoria += 1;
filhos.push(h2(`4.${indiceCategoria}. Requisitos de interface`));
filhos.push(tabela2(['Tipo', 'Descrição'], conteudo.INTERFACES, [2400, LARGURA_UTIL - 2400]));

filhos.push(new Paragraph({ children: [new PageBreak()] }));

// 5. Modelos
filhos.push(h1('5. Modelos'));
filhos.push(p('Os modelos a seguir ilustram os requisitos especificados. Complementam o texto e não o substituem: em caso de divergência, prevalece a descrição textual dos requisitos.'));

filhos.push(h2('5.1. Diagrama de casos de uso'));
filhos.push(p('O diagrama apresenta os casos de uso do sistema e a sua associação com os perfis de acesso. Os perfis Coordenador, Técnico e Assistente estão representados por um único ator, por possuírem permissões idênticas.'));
filhos.push(...imagem('casos-de-uso.png', 505, 486, 'Figura 1 — Diagrama de casos de uso do SIGU, por perfil de acesso.'));

filhos.push(new Paragraph({ children: [new PageBreak()] }));

filhos.push(h2('5.2. Diagrama de atividades — Lançamento de lista de presença'));
filhos.push(p('O diagrama detalha o fluxo do requisito RF-12, com destaque para a verificação de unidade ativa e para o comportamento idempotente descrito no requisito RNF-19.'));
filhos.push(...imagem('atividade-presenca.png', 500, 438, 'Figura 2 — Fluxo de lançamento de lista de presença.'));

filhos.push(new Paragraph({ children: [new PageBreak()] }));

filhos.push(h2('5.3. Diagrama de atividades — Cadastro de assistido'));
filhos.push(p('O diagrama detalha o fluxo do requisito RF-04, evidenciando as quatro etapas do formulário e as validações aplicadas antes da persistência.'));
filhos.push(...imagem('atividade-cadastro.png', 500, 481, 'Figura 3 — Fluxo de cadastro de assistido em quatro etapas.'));

filhos.push(new Paragraph({ children: [new PageBreak()] }));

// 6. Rastreabilidade
filhos.push(h1('6. Rastreabilidade com o backlog do produto'));
filhos.push(p('Esta seção relaciona os itens do documento Backlog do Produto — SOS, versão 4.0, de 15 de junho de 2026, aos requisitos especificados neste documento. A correspondência permite verificar a cobertura das necessidades levantadas junto à instituição e identificar itens pendentes.'));
filhos.push(tabela3(
  ['Item do backlog', 'Requisitos correspondentes', 'Situação'],
  conteudo.RASTREABILIDADE,
  [3400, 4238, LARGURA_UTIL - 3400 - 4238]
));

filhos.push(h2('6.1. Observações sobre a rastreabilidade'));
conteudo.OBSERVACOES_RASTREABILIDADE.forEach((obs) => filhos.push(bullet(obs)));

// ---- Documento --------------------------------------------------------------
const doc = new Document({
  creator: 'Serviço de Obras Sociais',
  title: 'SIGU — Documento de Especificação de Requisitos de Software',
  description: 'Especificação de requisitos funcionais e não funcionais do SIGU',
  numbering: {
    config: [{
      reference: 'marcadores',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '•',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 460, hanging: 240 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Calibri', size: 21 } } },
  },
  sections: [{
    properties: { page: { margin: { top: MARGEM, right: MARGEM, bottom: MARGEM, left: MARGEM } } },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 6 } },
          children: [new TextRun({ text: 'SIGU — Especificação de Requisitos de Software', size: 16, color: CINZA })],
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
  const destino = path.join(__dirname, 'SRS-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  const rfs = conteudo.REQUISITOS_FUNCIONAIS.reduce((n, m) => n + m.itens.length, 0);
  const rnfs = conteudo.REQUISITOS_NAO_FUNCIONAIS.reduce((n, c) => n + c.itens.length, 0);
  console.log('gerado:', destino);
  console.log('  tamanho:', (buffer.length / 1024).toFixed(0), 'KB');
  console.log('  requisitos funcionais:', rfs);
  console.log('  requisitos não funcionais:', rnfs);
});
