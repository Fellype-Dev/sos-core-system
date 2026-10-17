const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, FootnoteReferenceRun,
} = require('docx');

// ---- Formatação exigida pelo template do Sapien -----------------------------
// A4, margens superior/esquerda 3 cm e inferior/direita 2 cm, Arial 12,
// espaçamento 1,5 em todo o texto, recuo de primeira linha de 2 cm.
const CM = 567;
const FONTE = 'Arial';
const TAMANHO = 24;              // 12 pt em meios-pontos
const ENTRELINHA = 360;          // 1,5 (240 = simples)

const corpo = (texto) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  indent: { firstLine: 2 * CM },
  spacing: { line: ENTRELINHA, after: 0 },
  children: [new TextRun({ text: texto, font: FONTE, size: TAMANHO })],
});

const secao = (texto) => new Paragraph({
  spacing: { line: ENTRELINHA, before: ENTRELINHA, after: 0 },
  children: [new TextRun({ text: texto, font: FONTE, size: TAMANHO, bold: true })],
});

const autor = (nome, nota) => new Paragraph({
  alignment: AlignmentType.RIGHT,
  spacing: { line: ENTRELINHA, after: 0 },
  children: [new TextRun({ text: nome, font: FONTE, size: TAMANHO }), new FootnoteReferenceRun(nota)],
});

const rodape = (texto) => ({
  children: [new Paragraph({ children: [new TextRun({ text: texto, font: FONTE, size: 20 })] })],
});

// ---- Texto ------------------------------------------------------------------
const PERIODO = '8°';
const ORIENTADOR = 'SOBRENOME, Nome';   // [preencher]

const filhos = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: ENTRELINHA, after: ENTRELINHA },
    children: [new TextRun({
      text: 'SIGU: SISTEMA INTEGRADO DE GERENCIAMENTO DE USUÁRIOS PARA O SERVIÇO DE OBRAS SOCIAIS DE GUARAPUAVA-PR',
      font: FONTE, size: TAMANHO, bold: true,
    })],
  }),
  autor('KEKIS, Fellype', 1),
  autor('CHODOMA, Pablo Gabriel Lara', 2),
  autor('NOVAKOSKI, Luis Henryque', 3),
  autor(ORIENTADOR, 4),

  secao('1 JUSTIFICATIVA'),
  corpo('O Serviço de Obras Sociais (SOS) de Guarapuava é uma organização socioassistencial que atende crianças, adolescentes, adultos e idosos em três unidades — Semear, Viver e Sonhar — por meio do Serviço de Convivência e Fortalecimento de Vínculos (SCFV). Até o início deste projeto, o controle dos assistidos, das turmas e da frequência era feito em planilhas e fichas de papel, mantidas separadamente por cada unidade e com estruturas diferentes entre si. Essa forma de registro dificultava a consolidação das informações pela sede, gerava retrabalho na prestação de contas ao Sistema de Informações do SCFV (SISC) e expunha a risco de perda e de acesso indevido dados pessoais sensíveis de crianças e idosos, protegidos pela Lei Geral de Proteção de Dados.'),
  corpo('O projeto insere-se no programa institucional Fábrica de Software, por consistir no desenvolvimento e na entrega de uma solução de software sob demanda para uma instituição parceira, conduzida por alunos do curso de Engenharia de Software. O escopo principal foi o desenvolvimento e a implantação de um sistema web que reúne, em um único lugar, o cadastro completo dos assistidos, a organização das turmas conforme o cronograma do SCFV, o lançamento diário da lista de presença, o registro da vinculação ao SISC e a emissão de fichas, planilhas e relatórios, com os dados de cada unidade isolados por perfil de acesso.'),
  corpo(`O desenvolvimento foi conduzido por três alunos do curso de Engenharia de Software do Centro Universitário Campo Real, cursando o ${PERIODO} período: Fellype Kekis, Pablo Gabriel Lara Chodoma e Luis Henryque Novakoski. As etapas compreenderam o levantamento de requisitos junto à instituição e a elaboração do backlog do produto; o desenvolvimento iterativo em sprints, com entregas validadas em reuniões com a equipe do SOS; a apresentação do sistema à instituição e a incorporação do retorno recebido; a publicação em nuvem; a migração dos cadastros existentes nas planilhas das três unidades; a entrega do acesso às equipes; e a produção da documentação técnica e de uso — especificação de requisitos, arquitetura, manuais do usuário e técnico, plano e relatório de implantação.`),

  secao('2 OBJETIVOS'),
  corpo('O objetivo geral do projeto foi desenvolver e implantar um sistema web para a gestão do Serviço de Convivência e Fortalecimento de Vínculos nas unidades do SOS, substituindo o controle em planilhas e papel por um registro único, seguro e acessível.'),
  corpo('Como objetivos específicos, buscou-se: centralizar o cadastro dos assistidos, incluindo dados de saúde, escola, responsável, composição familiar e pessoas autorizadas a retirá-los; organizar os assistidos nas turmas do cronograma do SCFV, com período, dias da semana e faixa etária; registrar a frequência diária com histórico consultável e corrigível; apoiar a prestação de contas ao SISC, sinalizando divergências entre o grupo informado ao governo e a turma na instituição; emitir fichas individuais e relatórios consolidados; garantir que cada profissional acesse apenas os dados das unidades a que está vinculado; preservar o histórico de quem deixa de frequentar, sem exclusão de registros; e migrar os dados já existentes para o novo sistema.'),

  secao('3 RESULTADOS E IMPACTO SOCIAL'),
  corpo('O sistema, denominado SIGU — Sistema Integrado de Gerenciamento de Usuários, está publicado e em operação no Serviço de Obras Sociais de Guarapuava. Por ser uma aplicação web hospedada, não exigiu instalação nem configuração nas unidades: a entrega às equipes consistiu em compartilhar o endereço de acesso e as credenciais. Foram cadastradas as 38 turmas do cronograma do SCFV das três unidades e migrados 526 cadastros de assistidos a partir das planilhas anteriores, por meio de um importador construído para tratar as diferenças de estrutura entre elas. O código conta com testes automatizados e a documentação completa foi entregue à instituição.'),
  corpo('Para as equipes das unidades, o impacto está na redução do retrabalho e do tempo gasto com controles paralelos: a lista de presença é lançada em poucos minutos, a ficha de um assistido é emitida com um clique e a consulta a qualquer cadastro deixou de depender de localizar uma planilha ou uma pasta. Para a sede, o sistema oferece pela primeira vez uma visão consolidada das três unidades, com indicadores de frequência e de distribuição por turma atualizados a cada lançamento. Para a prestação de contas, o alerta de divergência com o SISC permite corrigir inconsistências antes que cheguem ao órgão gestor.'),
  corpo('Para os assistidos e suas famílias, o benefício é a segurança e a integridade do registro: a lista de pessoas autorizadas a retirar cada criança na unidade, o histórico preservado mesmo após o desligamento e o mascaramento de dados sensíveis reduzem riscos que o controle em papel não cobria. Para os alunos envolvidos, o projeto proporcionou a experiência completa de um produto de software, do levantamento com o cliente à operação com dados reais.'),

  secao('4 NÚMERO DE PESSOAS ALCANÇADAS'),
  corpo('De forma direta, o sistema alcança os 526 assistidos atualmente cadastrados nas três unidades do SOS, cujos registros passaram a ser mantidos de forma centralizada e segura, e os profissionais que operam o sistema — coordenadores, técnicos e assistentes das unidades e a equipe administrativa da sede.'),
  corpo('De forma indireta, alcança as famílias dos assistidos, beneficiadas pela agilidade no atendimento e pela segurança dos registros; considerando-se uma média de quatro pessoas por núcleo familiar, estima-se em torno de duas mil pessoas. Alcança ainda a comunidade de Guarapuava, que conta com 189.630 habitantes segundo o Instituto Brasileiro de Geografia e Estatística (IBGE), na medida em que o fortalecimento da gestão do SOS amplia a capacidade de atendimento de uma das principais entidades socioassistenciais do município.'),
];

const doc = new Document({
  creator: 'Fellype Kekis',
  title: 'SIGU — Resumo Sapien 2026',
  styles: { default: { document: { run: { font: FONTE, size: TAMANHO } } } },
  footnotes: {
    1: rodape(`Acadêmico, Engenharia de Software, ${PERIODO} período, Centro Universitário Campo Real.`),
    2: rodape(`Acadêmico, Engenharia de Software, ${PERIODO} período, Centro Universitário Campo Real.`),
    3: rodape(`Acadêmico, Engenharia de Software, ${PERIODO} período, Centro Universitário Campo Real.`),
    4: rodape('Titulação, Engenharia de Software, Professor Orientador, Centro Universitário Campo Real.'),
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 3 * CM, left: 3 * CM, bottom: 2 * CM, right: 2 * CM },
      },
    },
    children: filhos,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const destino = path.join(__dirname, 'Sapien-2026-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  const palavras = filhos.reduce((n, par) => n + par.root.filter((r) => r.constructor.name === 'TextRun')
    .reduce((m, r) => m + String(r.root.find((x) => x.constructor.name === 'Text')?.root?.[1] || '').split(/\s+/).length, 0), 0);
  console.log('gerado:', destino, '|', (buffer.length / 1024).toFixed(0), 'KB');
});
