const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, ImageRun, TableOfContents, Header, Footer, PageNumber, LevelFormat,
} = require('docx');

const MARGEM = 1134;
const LARGURA_UTIL = 11906 - MARGEM * 2;

const NAVY = '1A3A4A';
const BRAND = '3E4095';
const CINZA = '64748B';
const CINZA_CLARO = 'F1F5F9';

const BORDA = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
const A_CONFIRMAR = '[confirmar]';

const p = (texto, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276 },
  children: [new TextRun({ text: texto, size: o.size ?? 21, color: o.color, bold: o.bold, italics: o.italics })],
});

const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 340, after: 170 },
  children: [new TextRun({ text: t, bold: true, size: 30, color: NAVY })],
});
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 130 },
  children: [new TextRun({ text: t, bold: true, size: 25, color: BRAND })],
});
const h3 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 110 },
  children: [new TextRun({ text: t, bold: true, size: 22, color: NAVY })],
});

const bullet = (t) => new Paragraph({
  numbering: { reference: 'marcadores', level: 0 },
  spacing: { after: 60, line: 276 },
  children: [new TextRun({ text: t, size: 21 })],
});

let inst = 0;
function passos(lista) {
  inst += 1;
  return lista.map((t) => new Paragraph({
    numbering: { reference: 'passos', level: 0, instance: inst },
    spacing: { after: 70, line: 276 },
    children: [new TextRun({ text: t, size: 21 })],
  }));
}

function celula(filhos, { largura, fundo, cabecalho = false }) {
  return new TableCell({
    width: { size: largura, type: WidthType.DXA },
    shading: fundo ? { type: ShadingType.CLEAR, fill: fundo, color: 'auto' } : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: filhos.map((t) => typeof t === 'string'
      ? new Paragraph({
          spacing: { after: 0, line: 258 },
          children: [new TextRun({ text: t, size: 19, bold: cabecalho, color: cabecalho ? NAVY : undefined })],
        })
      : t),
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
      ...linhas.map((l) => new TableRow({ children: l.map((v, i) => celula([v], { largura: larguras[i] })) })),
    ],
  });
}

/** Ficha de um desafio enfrentado durante a implantação. */
function fichaDesafio(d) {
  const L1 = 2100;
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
      linha('Como apareceu', d.sintoma),
      linha('Causa', d.causa),
      linha('Solução aplicada', d.solucao),
      linha('Situação', d.situacao),
    ],
  });
}

function imagem(arquivo, largura, altura, legenda) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 140, after: 70 },
      children: [new ImageRun({
        data: fs.readFileSync(path.join(__dirname, arquivo)),
        type: 'png',
        transformation: { width: largura, height: altura },
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: legenda, size: 18, italics: true, color: CINZA })],
    }),
  ];
}

const quebra = () => new Paragraph({ children: [new PageBreak()] });
const espaco = (n = 140) => new Paragraph({ spacing: { after: n }, children: [] });

// ---- Conteúdo ---------------------------------------------------------------

const DESAFIOS = [
  {
    titulo: 'O serviço da API não iniciava no provedor',
    sintoma: 'A interface publicada abria normalmente, mas nenhuma consulta funcionava. O registro de eventos do provedor da API acusava a falta do módulo principal, em um caminho da raiz do repositório.',
    causa: 'O diretório-raiz do serviço estava apontado para a raiz do repositório, e não para a pasta do servidor. Com isso, a instalação de dependências não encontrava o arquivo de dependências correto e o comando de execução não localizava o ponto de entrada da aplicação.',
    solucao: 'Ajuste da configuração do serviço: diretório-raiz definido como "server", com os comandos de instalação e de execução mantidos. O serviço subiu na primeira tentativa seguinte.',
    situacao: 'Resolvido. Registrado no Manual Técnico como configuração obrigatória, por ser a falha mais provável em uma nova publicação.',
  },
  {
    titulo: 'Turmas apareciam incompletas no ambiente publicado',
    sintoma: 'Na estação de desenvolvimento as turmas apareciam com período, dias da semana e faixa etária; no endereço publicado, os mesmos campos apareciam vazios.',
    causa: 'Duas causas somadas. A primeira era a indisponibilidade da API, descrita acima. A segunda: as turmas já existiam no banco, criadas antes da inclusão dessas colunas, e portanto sem os valores — o script que cadastra as turmas não sobrescreve o que já existe, por segurança.',
    solucao: 'Criação de uma migração de complemento, que preenche apenas os campos vazios das turmas existentes e preserva qualquer ajuste feito pelas unidades. Como todas as migrações do projeto, pode ser executada mais de uma vez sem efeito colateral.',
    situacao: 'Resolvido.',
  },
  {
    titulo: 'Cabeçalhos diferentes entre as abas da planilha de origem',
    sintoma: 'A importação da unidade Viver não trouxe as datas de nascimento, e outras colunas ficaram vazias sem qualquer mensagem de erro.',
    causa: 'Cada unidade mantinha a sua planilha com nomes próprios de coluna — "DATA DE NASCIM." em uma aba e "DATA DE NASCIMENTO" em outra, "MOTIVO DA VINCULAÇÃO" e "MOTIVO DA INSERÇÃO" para o mesmo dado. As colunas não reconhecidas eram ignoradas em silêncio.',
    solucao: 'Três medidas no importador: um dicionário de sinônimos de cabeçalho, que aceita as variações de nome; um modo de diagnóstico que lista cada coluna da aba, o campo de destino e quantas linhas têm conteúdo, sem exibir dado pessoal; e um relatório de preenchimento ao final da simulação, que mostra em quantos cadastros cada campo entrou. Uma coluna que não entra em ninguém passou a saltar aos olhos antes da gravação.',
    situacao: 'Resolvido. As três abas foram diagnosticadas e todas as colunas estão mapeadas.',
  },
  {
    titulo: 'Grupo do SISC descartado na importação',
    sintoma: 'O grupo informado no SISC não aparecia no cadastro de parte dos assistidos.',
    causa: 'O importador tratava o grupo do SISC como se fosse obrigatoriamente uma turma cadastrada no SOS. Quando o nome não correspondia a nenhuma turma — situação comum, já que os dois cadastros seguem nomenclaturas diferentes —, o valor era descartado.',
    solucao: 'Quando o nome corresponde a uma turma, o sistema grava a referência à turma, que é o que permite acusar divergência entre SOS e SISC; quando não corresponde, o texto original é preservado. Nada mais é descartado.',
    situacao: 'Resolvido. Exige reimportação para recuperar os valores perdidos na primeira carga.',
  },
  {
    titulo: 'Turmas de mesmo nome em períodos diferentes',
    sintoma: 'Após a importação da unidade Sonhar, 141 assistidos ficaram sem turma vinculada.',
    causa: 'A unidade mantém turmas homônimas em períodos distintos — "Estrela da Manhã I" pela manhã e "II" à tarde, entre outras. Quando a planilha traz apenas o nome comum, ele não identifica uma turma única, e o vínculo não era feito.',
    solucao: 'O importador passou a usar o turno informado na própria planilha para desempatar. Quando ainda assim houver mais de uma turma possível, o aviso indica exatamente quais são, em vez de deixar o campo vazio sem explicação.',
    situacao: 'Solução implementada; a reimportação da unidade Sonhar está pendente.',
  },
  {
    titulo: 'Banco de dados único para desenvolvimento e produção',
    sintoma: 'Não é uma falha ocorrida, e sim uma condição do ambiente: a mesma instância de banco atende à estação de desenvolvimento e ao endereço publicado.',
    causa: 'Opção de simplicidade e custo na montagem do ambiente inicial.',
    solucao: 'Mitigação por procedimento, não por infraestrutura: migrações escritas de forma idempotente e aplicadas manualmente; simulação obrigatória antes de qualquer carga de dados em massa; backup do banco antes de cada gravação relevante; e atualização que nunca apaga campo preenchido.',
    situacao: 'Mitigado, não resolvido. A separação das instâncias é a principal recomendação técnica deste relatório.',
  },
  {
    titulo: 'Ausência de exclusão de listas de presença na interface',
    sintoma: 'As listas de presença lançadas durante os testes permaneceram no histórico, e a interface não oferece ação para removê-las.',
    causa: 'A funcionalidade não foi prevista: a tela de histórico permite consultar e corrigir, por decisão de projeto que privilegia a preservação do registro.',
    solucao: 'Remoção pontual dos lançamentos de teste diretamente no banco, com conferência prévia do que seria apagado e backup anterior à operação.',
    situacao: 'Contornado. Recomenda-se incluir a ação na interface, restrita ao perfil Administrador.',
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
    children: [new TextRun({ text: 'RELATÓRIO DE IMPLANTAÇÃO PILOTO', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 1.0', size: 22, color: CINZA })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 22, color: CINZA })] }),
  quebra(),
);

filhos.push(h1('Sumário'), new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-2' }), quebra());

// 1. Introdução
filhos.push(h1('1. Introdução'));
filhos.push(p('Este relatório descreve como o SIGU — Sistema Integrado de Gerenciamento de Usuários — foi colocado em operação no Serviço de Obras Sociais (SOS), quais obstáculos apareceram no caminho, como foram resolvidos e em que ponto a implantação se encontra.'));
filhos.push(p('O SOS é uma organização socioassistencial que atende crianças, adolescentes e idosos em três unidades — Semear, Viver e Sonhar — por meio do Serviço de Convivência e Fortalecimento de Vínculos (SCFV). Antes do sistema, o controle de assistidos, turmas e frequência era feito em planilhas e fichas de papel, mantidas separadamente por cada unidade.'));
filhos.push(p('O SIGU é um sistema web que reúne esse controle em um único lugar: cadastro dos assistidos, organização das turmas do cronograma do SCFV, lançamento diário da lista de presença e emissão de fichas e relatórios. É acessado pelo navegador, sem instalação, e separa os dados por unidade conforme o perfil de cada profissional.'));
filhos.push(p('O relatório destina-se à coordenação do SOS, à equipe responsável pela manutenção do sistema e à disciplina de Extensão do Centro Universitário Campo Real, no âmbito da qual o projeto foi desenvolvido.'));

filhos.push(h2('1.1. Documentos relacionados'));
filhos.push(bullet('Plano de Implantação — o que estava previsto; este relatório registra o que de fato ocorreu.'));
filhos.push(bullet('Manual Técnico e Guia de Implantação — o passo a passo técnico e a configuração de cada provedor.'));
filhos.push(bullet('Manual do Usuário — a operação do sistema pelas equipes.'));
filhos.push(bullet('Documento de Arquitetura e Design — as decisões de projeto citadas ao longo do texto.'));

filhos.push(quebra());

// 2. Processo
filhos.push(h1('2. Processo de implantação'));
filhos.push(p('A implantação seguiu cinco frentes, descritas a seguir na ordem em que foram executadas. Vale registrar de saída uma característica que definiu o esforço de todo o processo: como o sistema é uma aplicação web hospedada, não houve instalação em nenhum computador das unidades.'));

filhos.push(...imagem('arq-implantacao.png', 420, 289, 'Figura 1 — Distribuição dos componentes do sistema entre os provedores.'));

filhos.push(h2('2.1. Preparação do ambiente'));
filhos.push(...passos([
  'Criação das contas nos provedores: banco de dados gerenciado, hospedagem da API e hospedagem da interface, além do repositório de código.',
  'Criação da instância do banco de dados e registro das credenciais de acesso.',
  'Execução do script de esquema, que cria as tabelas, os índices e os gatilhos, e já cadastra as três unidades e as 38 turmas do cronograma do SCFV.',
  'Execução do script de carga inicial, que cria o usuário administrador.',
]));

filhos.push(h2('2.2. Publicação do sistema'));
filhos.push(...passos([
  'Publicação da API no provedor de contêineres, com as variáveis de ambiente definidas no painel do serviço: segredo de assinatura das sessões, credenciais do banco, origens autorizadas e ambiente de execução.',
  'Publicação da interface no provedor de hospedagem estática, com o endereço da API informado por variável de ambiente.',
  'Ligação da publicação ao repositório: a integração de código na branch principal passou a disparar automaticamente a atualização das duas partes.',
  'Verificação do endereço de saúde da API e primeiro acesso à interface publicada.',
]));

filhos.push(h2('2.3. Configuração pós-instalação'));
filhos.push(...passos([
  'Primeiro acesso com o usuário administrador e troca da senha inicial.',
  'Cadastro dos funcionários, com perfil de acesso e unidades autorizadas de cada um.',
  'Conferência das turmas de cada unidade em relação ao cronograma vigente do SCFV.',
  'Aplicação das migrações de banco correspondentes às funcionalidades desenvolvidas ao longo do período: campos de perfil do assistido, pessoas autorizadas a retirar, dados do SISC, cronograma das turmas e perfis de acesso.',
]));

filhos.push(quebra());

filhos.push(h2('2.4. Migração dos dados existentes'));
filhos.push(p('Os cadastros das três unidades estavam em uma planilha mantida em nuvem, com uma aba por unidade. A carga foi feita por um script de importação desenvolvido para este fim, que lê a planilha, converte os dados para o formato do banco e grava.'));
filhos.push(...passos([
  'Diagnóstico das colunas de cada aba, para conferir o campo de destino de cada uma sem exibir dado pessoal.',
  'Simulação da importação, que valida linha a linha e informa o que seria gravado, sem gravar nada.',
  'Conferência dos avisos e correção dos dados na planilha de origem.',
  'Importação efetiva, uma unidade por vez, com backup do banco antes da primeira carga.',
  'Conferência dos cadastros importados na tela de usuários.',
]));
filhos.push(espaco());
filhos.push(p('O script trabalha em modo de simulação por padrão: a gravação exige um parâmetro explícito. A atualização de quem já existe envia apenas os campos com conteúdo, de modo que uma coluna vazia na planilha nunca apaga informação já registrada no sistema — inclusive a digitada manualmente pelas equipes.'));

filhos.push(h2('2.5. Distribuição do acesso'));
filhos.push(p('Esta foi a etapa mais simples de toda a implantação, e merece registro justamente por isso. Por se tratar de aplicação web hospedada, bastou compartilhar o endereço do sistema com a equipe da sede, que o repassou às unidades junto com as credenciais de acesso.'));
filhos.push(p('Não houve instalação de programa, configuração de estação de trabalho, abertura de porta de rede, licença a distribuir ou requisito de hardware a atender. Qualquer computador, tablet ou celular com navegador atualizado e conexão com a internet acessa o sistema. A decisão de arquitetura por uma aplicação web hospedada, tomada no início do projeto, é a responsável direta por esse resultado.'));

filhos.push(h2('2.6. Testes iniciais'));
filhos.push(p('Após a publicação, foram exercitados os caminhos que atravessam as três camadas do sistema — interface, servidor e banco de dados: autenticação, consulta e cadastro de assistidos, vínculo com turmas, lançamento e correção de listas de presença e emissão de relatórios. Os resultados constam da seção 5.'));

filhos.push(quebra());

// 3. Desafios
filhos.push(h1('3. Desafios e soluções'));
filhos.push(p('Os obstáculos abaixo estão na ordem em que apareceram. Nenhum deles impediu a continuidade da implantação, mas os três primeiros produziram sintomas que, à primeira vista, sugeriam causas diferentes das reais — o que justifica registrá-los em detalhe.'));

DESAFIOS.forEach((desafio, i) => {
  filhos.push(h2(`3.${i + 1}. ${desafio.titulo}`));
  filhos.push(fichaDesafio(desafio));
  filhos.push(espaco(160));
});

filhos.push(h2('3.8. Obstáculos que não se confirmaram'));
filhos.push(p('Alguns riscos previstos no Plano de Implantação não se materializaram e vale registrar por quê:'));
filhos.push(bullet('Compatibilidade de equipamentos e navegadores: não houve ocorrência. A aplicação roda em navegador atualizado e não exige recurso específico da máquina.'));
filhos.push(bullet('Configuração de rede nas unidades: nenhuma alteração foi necessária. O sistema usa apenas tráfego de saída pela porta padrão da web, já liberada.'));
filhos.push(bullet('Instalação e atualização nas estações: inexistente. A atualização do sistema é feita na publicação e chega a todos no próximo acesso.'));
filhos.push(bullet('Permissões de sistema operacional: não se aplicam, por não haver programa instalado.'));

filhos.push(quebra());

// 4. Status
filhos.push(h1('4. Status da implantação'));
filhos.push(p('O sistema está publicado e operacional: as três camadas respondem, os acessos foram criados e as equipes já dispõem do endereço. A implantação não está encerrada — há pendências de dados e de configuração listadas adiante.'));

filhos.push(h2('4.1. Situação por frente'));
filhos.push(tabela(['Frente', 'Situação', 'Observação'], [
  ['Interface publicada', 'Operacional', 'Publicação automática a cada integração na branch principal.'],
  ['API publicada', 'Operacional', 'Estável após o ajuste do diretório-raiz do serviço.'],
  ['Banco de dados', 'Operacional', 'Instância única, compartilhada com o ambiente de desenvolvimento.'],
  ['Estrutura do banco', 'Concluída', 'Esquema e migrações aplicados, incluindo as 38 turmas do cronograma.'],
  ['Acessos dos funcionários', 'Parcial', `Criados para a sede e distribuídos às unidades. Cobertura total das equipes: ${A_CONFIRMAR}.`],
  ['Distribuição do endereço', 'Concluída', 'Repassado pela sede às três unidades.'],
  ['Migração dos cadastros', 'Concluída com pendência', 'As três unidades foram importadas; é necessária uma reimportação com o mapeamento corrigido.'],
  ['Vínculo com turmas', 'Pendente', 'Parte dos assistidos ainda sem turma, principalmente na unidade Sonhar.'],
  ['Uso em regime', 'Em início', `Lançamento diário da frequência pelas unidades: ${A_CONFIRMAR}.`],
], [2200, 2100, LARGURA_UTIL - 2200 - 2100]));

filhos.push(h2('4.2. Volume de dados migrados'));
filhos.push(p('Números observados durante a importação. Devem ser conferidos na tela de usuários no encerramento da implantação.'));
filhos.push(tabela(['Unidade', 'Cadastros importados', 'Sem turma vinculada'], [
  ['Semear', '160', '23'],
  ['Viver', '205', '23'],
  ['Sonhar', '161', '141'],
  ['Total', '526', '187'],
], [2400, 3200, LARGURA_UTIL - 2400 - 3200]));

filhos.push(h2('4.3. Pendências'));
filhos.push(tabela(['Pendência', 'Origem', 'Responsável'], [
  ['Reimportar as três abas da planilha com o mapeamento corrigido', 'Desafios 3.3, 3.4 e 3.5', 'Responsável técnico'],
  ['Vincular às turmas os assistidos que ficaram sem vínculo', 'Consequência da importação', 'Multiplicadores das unidades'],
  ['Completar os campos da ficha que não existem na planilha de origem', 'Escopo da planilha', 'Equipes das unidades'],
  ['Preencher os contatos de suporte no Manual do Usuário', 'Manual do Usuário, seção 7', 'Sede'],
  ['Confirmar a cobertura de acessos das equipes das unidades', 'Configuração pós-instalação', 'Secretaria administrativa'],
  ['Criar a tabela de auditoria no banco de dados', 'Arquitetura, decisão DEC-16', 'Responsável técnico'],
], [3600, 2600, LARGURA_UTIL - 3600 - 2600]));

filhos.push(quebra());

// 5. Testes
filhos.push(h1('5. Resultados dos testes pós-implantação'));
filhos.push(p('Os testes foram executados no ambiente publicado, com dados reais, e não em ambiente de ensaio — condição decorrente da instância única de banco. Por esse motivo, os lançamentos de presença criados para teste foram removidos ao final, conforme descrito no desafio 3.7.'));

filhos.push(h2('5.1. Verificações executadas'));
filhos.push(tabela(['Verificação', 'Resultado'], [
  ['Disponibilidade da API no endereço de saúde', 'Responde corretamente após o ajuste de configuração do serviço.'],
  ['Autenticação e abertura do painel', 'Funcionando. O painel abre na unidade correta do usuário.'],
  ['Consulta e cadastro de assistidos', 'Funcionando, com os dados migrados visíveis na listagem.'],
  ['Vínculo de assistido a turma', 'Funcionando.'],
  ['Lançamento da lista de presença', 'Funcionando. O relançamento da mesma turma, data e período atualiza a lista existente, sem duplicar.'],
  ['Correção de lista pelo histórico', 'Funcionando.'],
  ['Emissão de ficha em PDF e planilha', 'Funcionando.'],
  ['Painel de indicadores e relatório consolidado', 'Funcionando. Foi o painel que revelou o volume de assistidos sem turma.'],
  ['Suíte de testes automatizados do servidor', '20 testes em 2 conjuntos, todos aprovados, incluindo a separação de dados por unidade.'],
], [3400, LARGURA_UTIL - 3400]));

filhos.push(h2('5.2. O que os testes revelaram'));
filhos.push(p('Além de confirmar o funcionamento, os testes com dados reais expuseram três situações que não apareceriam com dados de ensaio:'));
filhos.push(bullet('o volume de assistidos sem turma vinculada — 187 no total, dos quais 141 em uma única unidade —, o que levou à investigação e à correção do importador;'));
filhos.push(bullet('a inexistência de exclusão de listas de presença na interface, percebida ao tentar remover os lançamentos de teste;'));
filhos.push(bullet('limitações de leitura no painel de distribuição por turma, que com 38 turmas reais tornou-se ilegível e foi refeito.'));
filhos.push(p('A observação vale como método: o painel de indicadores mostrou-se um bom detector de problemas de dados, porque expõe agregados que a conferência registro a registro não revela.'));

filhos.push(quebra());

// 6. Observações e recomendações
filhos.push(h1('6. Observações e recomendações'));

filhos.push(h2('6.1. Observações sobre o processo'));
filhos.push(bullet('A escolha por uma aplicação web hospedada eliminou de uma vez as etapas que costumam concentrar o esforço de uma implantação: instalação, compatibilidade de equipamento, configuração de rede e distribuição de atualizações. A entrega às unidades resumiu-se a compartilhar um endereço.'));
filhos.push(bullet('Em compensação, o esforço migrou para os dados. Praticamente todo o trabalho não trivial da implantação esteve na migração das planilhas — nomes de coluna divergentes, formatos de data variados, nomes de turma ambíguos. É onde vale concentrar o planejamento em implantações semelhantes.'));
filhos.push(bullet('Os três primeiros problemas apresentaram sintomas enganosos: o que parecia dado faltante no banco era, na origem, um serviço fora do ar; o que parecia erro de importação era um nome de coluna diferente. Verificar a disponibilidade de cada camada antes de investigar os dados teria encurtado o diagnóstico.'));
filhos.push(bullet('A prática de simular antes de gravar evitou danos em todas as cargas de dados. Nenhuma importação foi executada sem conferência prévia do que seria gravado.'));

filhos.push(h2('6.2. Recomendações para o SOS'));
filhos.push(tabela(['Recomendação', 'Motivo'], [
  ['Separar as instâncias de banco de desenvolvimento e produção', 'Hoje qualquer teste local escreve na base real, e uma migração aplicada em desenvolvimento vale imediatamente em produção. É a maior fragilidade do ambiente atual.'],
  ['Concluir os vínculos de turma antes de iniciar o lançamento diário', 'A lista de presença é montada por turma; sem vínculo, o assistido não aparece para ser marcado.'],
  ['Manter as planilhas de origem preservadas até o encerramento da conferência', 'São a única forma de auditar o que foi migrado.'],
  ['Definir e divulgar os contatos de suporte', 'O Manual do Usuário depende deles para ser distribuído às equipes.'],
  ['Confirmar o backup automático do banco no painel do provedor', 'O plano de recuperação pressupõe backup diário habilitado.'],
  ['Padronizar as planilhas caso continuem em uso paralelo', 'Cabeçalhos divergentes entre unidades foram a maior fonte de retrabalho da migração.'],
], [3600, LARGURA_UTIL - 3600]));

filhos.push(h2('6.3. Melhorias sugeridas para o sistema'));
filhos.push(bullet('Exclusão de lista de presença na interface, restrita ao perfil Administrador, com confirmação explícita.'));
filhos.push(bullet('Criação da tabela de auditoria, hoje ausente: a trilha existe, mas fica apenas no registro do servidor, sujeita à retenção do provedor.'));
filhos.push(bullet('Campos próprios para RG, estado civil e transporte, que existem nas planilhas de origem e hoje são preservados dentro das anotações da equipe.'));
filhos.push(bullet('Lançamento de presença com data retroativa, hoje possível apenas quando a lista já existe.'));
filhos.push(bullet('Registro das migrações já aplicadas ao banco, hoje controlado apenas pela disciplina de quem aplica.'));

filhos.push(h2('6.4. Recomendações para implantações semelhantes'));
filhos.push(bullet('Levantar os cabeçalhos reais de todas as fontes de dados antes de escrever qualquer importador — não presumir que abas do mesmo arquivo sigam o mesmo padrão.'));
filhos.push(bullet('Construir o importador com simulação obrigatória e relatório de preenchimento por campo. Foi o que revelou colunas que não entravam em ninguém.'));
filhos.push(bullet('Importar uma unidade por vez, conferindo antes de seguir. O erro de mapeamento apareceu na segunda unidade e teria contaminado as três.'));
filhos.push(bullet('Verificar a cadeia inteira — interface, servidor, banco — antes de concluir que o problema está nos dados.'));
filhos.push(bullet('Observar os painéis de indicadores logo após a carga: agregados expõem problemas que a conferência amostral não encontra.'));

const doc = new Document({
  creator: 'Serviço de Obras Sociais',
  title: 'SIGU — Relatório de Implantação Piloto',
  description: 'Processo, desafios, status e resultados da implantação do SIGU',
  numbering: {
    config: [
      {
        reference: 'marcadores',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 460, hanging: 240 } } },
        }],
      },
      {
        reference: 'passos',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 520, hanging: 300 } }, run: { bold: true, color: BRAND } },
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
          alignment: AlignmentType.RIGHT, spacing: { after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 6 } },
          children: [new TextRun({ text: 'SIGU — Relatório de Implantação Piloto', size: 16, color: CINZA })],
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
  const destino = path.join(__dirname, 'Relatorio-Implantacao-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  console.log('gerado:', destino, '|', (buffer.length / 1024).toFixed(0), 'KB');
  console.log('  desafios registrados:', DESAFIOS.length);
});
