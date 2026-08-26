const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, ImageRun, TableOfContents, Header, Footer, PageNumber, LevelFormat,
} = require('docx');
const conteudo = require('./conteudo-arq');

// ---- Métricas de página (A4, margens de 2 cm) -------------------------------
const MARGEM = 1134;                      // 2 cm em DXA
const LARGURA_UTIL = 11906 - MARGEM * 2;  // 9638 DXA

const NAVY = '1A3A4A';
const BRAND = '3E4095';
const CINZA = '64748B';
const CINZA_CLARO = 'F1F5F9';

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

const mono = (texto) => new Paragraph({
  spacing: { after: 0, line: 240 },
  children: [new TextRun({ text: texto, size: 17, font: 'Consolas' })],
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

/** Tabela com cabeçalho, para qualquer número de colunas. */
function tabela(cabecalhos, linhas, larguras) {
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: larguras,
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

/** Ficha de uma decisão de design. */
function fichaDecisao(dec) {
  const L1 = 2300;
  const L2 = LARGURA_UTIL - L1;
  const linha = (rotulo, texto) => new TableRow({
    children: [
      celula([rotulo], { largura: L1, fundo: CINZA_CLARO, cabecalho: true }),
      celula([texto], { largura: L2 }),
    ],
  });

  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [L1, L2],
    borders: { top: BORDA, bottom: BORDA, left: BORDA, right: BORDA, insideHorizontal: BORDA, insideVertical: BORDA },
    rows: [
      linha('Identificador', dec.id),
      linha('Contexto', dec.contexto),
      linha('Alternativas consideradas', dec.alternativas),
      linha('Decisão', dec.decisao),
      linha('Justificativa', dec.justificativa),
      linha('Consequências', dec.consequencias),
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
    children: [new TextRun({ text: 'DOCUMENTO DE ARQUITETURA E DESIGN', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { before: 120, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Software Architecture and Design Document', size: 22, italics: true, color: CINZA })] }),
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 1.0', size: 22, color: CINZA })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 22, color: CINZA })] }),
  quebra(),
);

// Sumário
filhos.push(
  h1('Sumário'),
  new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }),
  quebra(),
);

// 1. Introdução
filhos.push(h1('1. Introdução'));

filhos.push(h2('1.1. Propósito'));
filhos.push(p('Este documento descreve a arquitetura e as decisões de projeto do SIGU — Sistema Integrado de Gerenciamento de Usuários, desenvolvido para o Serviço de Obras Sociais (SOS). Apresenta a organização do sistema em camadas e componentes, a sua distribuição física nos provedores de hospedagem, o modelo de dados e a justificativa das principais escolhas técnicas.'));
filhos.push(p('Destina-se à equipe de desenvolvimento e manutenção, a quem venha a assumir a evolução do sistema e à coordenação do SOS, no que se refere às consequências operacionais das decisões adotadas. Enquanto o Documento de Especificação de Requisitos responde o que o sistema faz, este documento responde como ele foi construído e por quê.'));

filhos.push(h2('1.2. Escopo'));
filhos.push(p('O documento cobre a totalidade do sistema em operação: a aplicação web executada no navegador, o servidor de aplicação que expõe a API e o banco de dados relacional. Estão descritos os componentes de cada camada, os contratos entre elas, a estrutura de dados e o processo de publicação.'));
filhos.push(p('Não fazem parte do escopo os procedimentos operacionais de uso do sistema, objeto do manual do usuário, nem o planejamento de entregas, objeto do backlog do produto.'));

filhos.push(h2('1.3. Documentos relacionados'));
filhos.push(tabela(
  ['Documento', 'Relação com este documento'],
  [
    ['SIGU — Documento de Especificação de Requisitos de Software (SRS), versão 1.0', 'Define os requisitos funcionais (RF) e não funcionais (RNF) referenciados ao longo deste documento. A seção 8 relaciona requisitos e componentes.'],
    ['Backlog do Produto — SOS, versão 4.0, de 15 de junho de 2026', 'Registra as necessidades levantadas junto à instituição, cuja rastreabilidade consta do documento de requisitos.'],
    ['Código-fonte do repositório sos-core-system', 'Fonte de todas as informações técnicas apresentadas. Em caso de divergência, prevalece o código.'],
  ],
  [3800, LARGURA_UTIL - 3800]
));

filhos.push(h2('1.4. Convenções adotadas'));
filhos.push(bullet('As decisões de projeto são identificadas pelo prefixo DEC seguido de numeração sequencial, e apresentadas em fichas com contexto, alternativas, decisão, justificativa e consequências.'));
filhos.push(bullet('As referências a requisitos utilizam os identificadores RF e RNF do documento de especificação de requisitos.'));
filhos.push(bullet('Nomes de arquivos, tabelas, colunas e caminhos da API são apresentados exatamente como constam do código-fonte, em inglês; o texto explicativo permanece em português.'));
filhos.push(bullet('O termo unidade designa o centro de convivência do SOS e corresponde, no banco de dados, à entidade programs.'));

filhos.push(quebra());

// 2. Visão geral da arquitetura
filhos.push(h1('2. Visão geral da arquitetura'));

filhos.push(h2('2.1. Estilo arquitetural'));
filhos.push(p('O SIGU adota arquitetura cliente-servidor organizada em três camadas fisicamente separadas. A camada de apresentação é uma aplicação de página única executada no navegador; a camada de aplicação é um servidor Node.js que expõe uma API HTTP; a camada de dados é um banco PostgreSQL gerenciado. Cada camada comunica-se apenas com a camada imediatamente seguinte: o navegador nunca acessa o banco, e o banco nunca inicia comunicação com a aplicação.'));
filhos.push(p('As duas fronteiras entre camadas são explícitas e verificáveis. Entre navegador e servidor trafega JSON sobre HTTPS, com autenticação por token assinado enviado no cabeçalho de autorização. Entre servidor e banco, a comunicação usa credencial de serviço mantida exclusivamente no ambiente do servidor. Essa separação é o que permite afirmar que toda regra de acesso é aplicada em um ponto único e não pode ser contornada pelo cliente.'));
filhos.push(p('A escolha do estilo, com as alternativas consideradas, está registrada na decisão DEC-01.'));

filhos.push(h2('2.2. Princípios arquiteturais'));
filhos.push(p('Os princípios a seguir orientaram a construção do sistema e explicam a maior parte das decisões registradas na seção 4.'));
conteudo.PRINCIPIOS.forEach((item) => filhos.push(bullet(item)));

filhos.push(h2('2.3. Camadas e responsabilidades'));
filhos.push(tabela(
  ['Camada', 'Responsabilidades', 'Tecnologias'],
  conteudo.CAMADAS,
  [1500, 4600, LARGURA_UTIL - 1500 - 4600]
));

filhos.push(h2('2.4. Padrões de design utilizados'));
filhos.push(p('Os padrões abaixo estão efetivamente aplicados no código. A relação não é exaustiva do repertório disponível, e sim descritiva do que foi adotado.'));
filhos.push(tabela(
  ['Padrão', 'Aplicação no sistema'],
  conteudo.PADROES,
  [2900, LARGURA_UTIL - 2900]
));

filhos.push(h2('2.5. Ciclo de vida de uma requisição'));
filhos.push(p('Toda requisição dirigida à API atravessa a mesma cadeia de middlewares antes de alcançar o controlador. A ordem importa: a limitação de requisições precede a autenticação, que precede a verificação de perfil, que precede a regra de negócio.'));
filhos.push(tabela(
  ['Etapa', 'Função'],
  conteudo.CADEIA_SEGURANCA,
  [2600, LARGURA_UTIL - 2600]
));
filhos.push(p('Alcançado o controlador, a unidade efetiva da requisição é resolvida pelo utilitário programContext: os perfis Administrador e Equipe Sede podem indicá-la na requisição, desde que conste da relação de unidades permitidas gravada no token; os demais perfis operam obrigatoriamente sobre a unidade ativa do token. A resposta é montada pelo utilitário ApiResponse, que padroniza o envelope devolvido ao cliente.', { after: 200 }));

filhos.push(quebra());

// 3. Diagramas arquiteturais
filhos.push(h1('3. Diagramas arquiteturais'));
filhos.push(p('Os diagramas desta seção representam o sistema em três perspectivas complementares: a organização lógica dos componentes, a sua distribuição física nos provedores de hospedagem e a estrutura das entidades no banco de dados.'));

filhos.push(h2('3.1. Diagrama de componentes'));
filhos.push(p('O diagrama apresenta os componentes de cada camada e as suas interações, com destaque para as duas fronteiras de comunicação.'));
filhos.push(...imagem('arq-componentes.png', 462, 452, 'Figura 1 — Diagrama de componentes do SIGU.'));

filhos.push(quebra());

filhos.push(h3('3.1.1. Componentes da camada de apresentação'));
filhos.push(tabela(
  ['Componente', 'Responsabilidade', 'Localização'],
  conteudo.COMPONENTES_CLIENTE,
  [1900, 5000, LARGURA_UTIL - 1900 - 5000]
));

filhos.push(h3('3.1.2. Componentes da camada de aplicação'));
filhos.push(tabela(
  ['Componente', 'Responsabilidade', 'Localização'],
  conteudo.COMPONENTES_SERVIDOR,
  [1900, 5000, LARGURA_UTIL - 1900 - 5000]
));

filhos.push(p('A dependência entre os componentes do servidor flui em uma única direção: rotas dependem de middlewares e de controladores; controladores dependem de modelos e de utilitários; modelos dependem apenas da configuração de banco. Nenhuma consulta ao banco de dados é escrita fora dos modelos, o que mantém em um único lugar a projeção de colunas e o formato dos dados devolvidos pela API.', { after: 200 }));

filhos.push(quebra());

filhos.push(h2('3.2. Diagrama de implantação'));
filhos.push(p('A interface e o servidor são publicados em provedores distintos, ambos disparados pela integração de código na branch principal do repositório. O banco de dados é gerenciado por um terceiro provedor.'));
filhos.push(...imagem('arq-implantacao.png', 462, 318, 'Figura 2 — Diagrama de implantação do SIGU.'));

filhos.push(h3('3.2.1. Nós de implantação'));
filhos.push(tabela(
  ['Nó', 'Conteúdo', 'Configuração relevante'],
  conteudo.NOS_IMPLANTACAO,
  [1700, 4400, LARGURA_UTIL - 1700 - 4400]
));

filhos.push(quebra());

filhos.push(h3('3.2.2. Configuração por variáveis de ambiente'));
filhos.push(p('Nenhum endereço, credencial ou segredo é gravado no código-fonte. A configuração de cada ambiente é fornecida por variáveis, verificadas na inicialização do servidor: a ausência de item crítico interrompe a subida do processo, em vez de produzir falha no primeiro uso.'));
filhos.push(tabela(
  ['Variável', 'Onde', 'Finalidade'],
  conteudo.VARIAVEIS_AMBIENTE,
  [2400, 1200, LARGURA_UTIL - 2400 - 1200]
));

filhos.push(h3('3.2.3. Ambientes'));
filhos.push(p('O desenvolvimento executa a interface e o servidor na própria estação de trabalho, com o empacotador encaminhando ao servidor local as chamadas dirigidas à API. A produção executa cada parte no respectivo provedor.'));
filhos.push(p('Os dois ambientes compartilham a mesma instância de banco de dados. A consequência é direta e precisa ser considerada em qualquer alteração de estrutura: uma migração aplicada durante o desenvolvimento produz efeito imediato em produção, e dados criados em testes locais são dados reais da base. A separação das instâncias é a evolução recomendada assim que houver disponibilidade para mantê-las.', { after: 200 }));

filhos.push(quebra());

filhos.push(h2('3.3. Diagrama de entidade-relacionamento'));
filhos.push(p('O diagrama apresenta as entidades do banco de dados, as chaves e os relacionamentos, com a respectiva cardinalidade. O detalhamento coluna a coluna está na seção 5.'));
filhos.push(...imagem('arq-der.png', 462, 330, 'Figura 3 — Modelo entidade-relacionamento do SIGU.'));

filhos.push(h3('3.3.1. Relacionamentos'));
filhos.push(tabela(
  ['Relacionamento', 'Cardinalidade', 'Regra associada'],
  [
    ['users — user_programs — programs', 'N para N', 'Define as unidades que o funcionário pode acessar. A remoção do funcionário ou da unidade remove o vínculo em cascata.'],
    ['programs — class_groups', '1 para N', 'A turma pertence a uma unidade e é identificada, dentro dela, por um valor único.'],
    ['programs — students', '1 para N', 'O assistido pertence a uma unidade, que determina o escopo de acesso ao seu registro.'],
    ['class_groups — students', '1 para N, por valor', 'Vínculo estabelecido pelo identificador textual da turma, sem chave estrangeira declarada (DEC-09).'],
    ['programs — attendance_sessions', '1 para N', 'A lista de presença pertence a uma unidade.'],
    ['users — attendance_sessions', '1 para N', 'Registra o funcionário responsável pelo lançamento.'],
    ['attendance_sessions — attendance_records', '1 para N', 'Os registros são removidos em cascata com a lista.'],
    ['students — attendance_records', '1 para N', 'A exclusão definitiva do assistido remove os registros de presença em cascata.'],
    ['students — student_notes', '1 para N', 'Anotações datadas sobre o assistido; estrutura prevista e ainda não utilizada.'],
    ['users — student_notes', '1 para N', 'Registra a autoria da anotação.'],
  ],
  [2600, 1700, LARGURA_UTIL - 2600 - 1700]
));

filhos.push(quebra());

// 4. Decisões de design
filhos.push(h1('4. Decisões de design'));
filhos.push(p('Esta seção registra as decisões que moldaram o sistema, no formato adotado para registros de decisão de arquitetura. O objetivo é preservar a justificativa e, sobretudo, as consequências assumidas — inclusive as desfavoráveis —, de modo que uma revisão futura possa reavaliar a escolha conhecendo o contexto em que foi tomada.'));

conteudo.DECISOES.forEach((dec, i) => {
  filhos.push(h2(`4.${i + 1}. ${dec.id} — ${dec.titulo}`));
  filhos.push(fichaDecisao(dec));
  filhos.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
});

filhos.push(quebra());

// 5. Estrutura de dados
filhos.push(h1('5. Estrutura de dados'));

filhos.push(h2('5.1. Visão geral do modelo'));
filhos.push(p('O modelo é relacional e normalizado, com oito tabelas. A entidade programs é a raiz do escopo de acesso: users vincula-se a ela por tabela de associação, e class_groups, students e attendance_sessions referenciam-na diretamente. Praticamente toda consulta do sistema é filtrada por essa coluna.'));
filhos.push(p('Duas construções fogem à normalização estrita, por decisão registrada: o vínculo entre assistido e turma, feito por identificador textual e não por chave estrangeira (DEC-09), e as listas de composição familiar e de pessoas autorizadas, armazenadas em colunas JSONB do próprio assistido (DEC-12).'));
filhos.push(p('Todos os identificadores são do tipo uuid, gerados pelo banco por meio da extensão pgcrypto. Datas de criação e de atualização utilizam o tipo timestamptz, com fuso horário.'));

filhos.push(h2('5.2. Dicionário de dados'));
filhos.push(p('As tabelas a seguir descrevem cada coluna do banco de dados, na ordem em que constam do esquema.'));

conteudo.TABELAS_DADOS.forEach((tab, i) => {
  filhos.push(h3(`5.2.${i + 1}. ${tab.nome}`));
  filhos.push(p(tab.descricao));
  filhos.push(tabela(
    ['Coluna', 'Tipo e restrições', 'Descrição'],
    tab.colunas,
    [2500, 2400, LARGURA_UTIL - 2500 - 2400]
  ));
  filhos.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
});

filhos.push(quebra());

filhos.push(h2('5.3. Estruturas em JSONB'));
filhos.push(p('As duas colunas JSONB armazenam listas de objetos de estrutura fixa, definida pelo formulário de cadastro e normalizada pela aplicação antes da gravação.'));
conteudo.JSONB_ESTRUTURAS.forEach((estrutura) => {
  filhos.push(h3(estrutura.coluna));
  filhos.push(p(estrutura.descricao));
  filhos.push(tabela(
    ['Campo', 'Conteúdo'],
    estrutura.campos,
    [2200, LARGURA_UTIL - 2200]
  ));
  filhos.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
});

filhos.push(h2('5.4. Índices'));
filhos.push(p('Os índices acompanham os caminhos de consulta efetivamente utilizados pelo sistema.'));
filhos.push(tabela(
  ['Índice', 'Colunas', 'Finalidade'],
  conteudo.INDICES,
  [2600, 2600, LARGURA_UTIL - 2600 - 2600]
));

filhos.push(h2('5.5. Gatilhos'));
filhos.push(tabela(
  ['Objeto', 'Comportamento'],
  conteudo.GATILHOS,
  [2600, LARGURA_UTIL - 2600]
));

filhos.push(quebra());

filhos.push(h2('5.6. Evolução do esquema'));
filhos.push(p('A estrutura do banco evolui por meio de arquivos SQL numerados, escritos de forma idempotente e aplicados manualmente pelo administrador (DEC-14). O arquivo schema.sql descreve o estado completo do banco e é utilizado na criação de um ambiente novo; os arquivos de migração descrevem as alterações incrementais aplicadas a um banco já existente.'));
filhos.push(tabela(
  ['Arquivo', 'Efeito'],
  conteudo.MIGRACOES,
  [3200, LARGURA_UTIL - 3200]
));
filhos.push(p('A numeração 003 aparece em dois arquivos, resultado de alterações desenvolvidas em paralelo; como ambos são idempotentes e independentes entre si, a ordem de aplicação não altera o resultado.', { after: 200 }));

filhos.push(quebra());

// 6. Interface da API
filhos.push(h1('6. Interface da API'));
filhos.push(p('A API é o único contrato entre a camada de apresentação e o restante do sistema. Todas as operações devolvem JSON no envelope padronizado { success, message, data }, e todas exigem autenticação, com exceção da verificação de saúde, da relação de unidades e da própria autenticação.'));
filhos.push(p('A coluna de perfis indica a autorização verificada no servidor. Quando a operação está disponível a todos os perfis, o alcance dos dados permanece limitado às unidades do usuário, conforme descrito na seção 2.5.'));
filhos.push(tabela(
  ['Operação', 'Perfis', 'Descrição'],
  conteudo.ENDPOINTS,
  [3100, 2000, LARGURA_UTIL - 3100 - 2000]
));

filhos.push(quebra());

// 7. Organização do código
filhos.push(h1('7. Organização do código-fonte'));
filhos.push(p('O repositório reúne, em um único versionamento, a interface e o servidor, cada qual com o seu próprio conjunto de dependências e o seu próprio ciclo de publicação. A estrutura reflete diretamente as camadas descritas na seção 2.'));
conteudo.ESTRUTURA_DIRETORIOS.forEach((linha) => filhos.push(mono(linha)));
filhos.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
filhos.push(p('Os testes automatizados residem em server/tests e são executados por comando único. Cobrem o comportamento da API e, em especial, a segregação de dados por unidade — verificação relevante porque, conforme a decisão DEC-05, essa separação é garantida exclusivamente pelo código da aplicação.'));

filhos.push(quebra());

// 8. Rastreabilidade
filhos.push(h1('8. Rastreabilidade entre requisitos e arquitetura'));
filhos.push(p('A tabela relaciona os requisitos especificados no documento de requisitos aos componentes que os realizam e às decisões de projeto que os condicionam. Serve para avaliar o impacto de uma alteração antes de executá-la.'));
filhos.push(tabela(
  ['Requisitos', 'Componentes envolvidos', 'Decisões'],
  conteudo.RASTREABILIDADE_ARQ,
  [3000, 4500, LARGURA_UTIL - 3000 - 4500]
));

filhos.push(h2('8.1. Pontos de atenção para a evolução'));
filhos.push(bullet('Instâncias de banco separadas para desenvolvimento e produção: hoje compartilhadas, o que torna qualquer teste local uma operação sobre dados reais.'));
filhos.push(bullet('Criação da tabela de auditoria no banco: enquanto não existir, a trilha permanece apenas no log do servidor, sujeita à retenção do provedor (DEC-16).'));
filhos.push(bullet('Registro das migrações já aplicadas: a ausência de controle depende da escrita idempotente de cada script e da disciplina do administrador (DEC-14).'));
filhos.push(bullet('Revogação imediata de sessão: a desativação de um funcionário só produz efeito quando o token expira (DEC-06).'));
filhos.push(bullet('Divisão do pacote da interface por rota, caso o tempo de carga inicial se torne perceptível nas unidades (DEC-02).'));
filhos.push(bullet('Remoção das estruturas não utilizadas — tabela referrals e colunas legadas de students — após confirmação de que nenhum dado relevante depende delas.'));

// ---- Documento --------------------------------------------------------------
const doc = new Document({
  creator: 'Serviço de Obras Sociais',
  title: 'SIGU — Documento de Arquitetura e Design',
  description: 'Arquitetura, decisões de projeto e modelo de dados do SIGU',
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
          children: [new TextRun({ text: 'SIGU — Documento de Arquitetura e Design', size: 16, color: CINZA })],
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
  const destino = path.join(__dirname, 'Arquitetura-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  const colunas = conteudo.TABELAS_DADOS.reduce((n, t) => n + t.colunas.length, 0);
  console.log('gerado:', destino);
  console.log('  tamanho:', (buffer.length / 1024).toFixed(0), 'KB');
  console.log('  decisoes de design:', conteudo.DECISOES.length);
  console.log('  tabelas documentadas:', conteudo.TABELAS_DADOS.length, '| linhas de dicionario:', colunas);
});
