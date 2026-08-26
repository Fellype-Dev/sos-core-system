// Conteúdo do SRS — separado da montagem do documento para facilitar revisão.

const PERFIS = {
  ADMIN: 'Administrador',
  SEDE: 'Equipe Sede',
  UNIDADE: 'Coordenador, Técnico e Assistente',
  TODOS: 'Todos os perfis autenticados',
};

const REQUISITOS_FUNCIONAIS = [
  {
    modulo: 'Autenticação e Controle de Acesso',
    itens: [
      {
        id: 'RF-01',
        nome: 'Autenticar usuário',
        perfis: 'Público (não autenticado)',
        descricao:
          'Permitir que o funcionário acesse o sistema mediante e-mail e senha. Em caso de sucesso, o sistema emite um token de sessão contendo o perfil de acesso e as unidades autorizadas para aquele usuário.',
        entradas: 'E-mail corporativo; senha; opcionalmente o identificador da unidade a ativar.',
        saidas:
          'Token de autenticação (JWT); dados do usuário; lista de unidades autorizadas; unidade ativa selecionada.',
        criterios: [
          'Credenciais inválidas resultam em recusa, sem indicar qual dos dois campos está incorreto.',
          'Usuário inativo é impedido de entrar, mesmo com senha correta.',
          'Usuário de perfil de unidade sem nenhuma unidade vinculada é impedido de entrar, com mensagem explicativa.',
          'Após 10 tentativas malsucedidas em 15 minutos, novas tentativas são bloqueadas temporariamente.',
          'A senha é armazenada apenas como hash, nunca em texto puro.',
        ],
      },
      {
        id: 'RF-02',
        nome: 'Selecionar unidade ativa',
        perfis: PERFIS.TODOS,
        descricao:
          'Permitir a troca da unidade de trabalho corrente entre aquelas autorizadas ao usuário. Todas as consultas e gravações passam a se referir à unidade ativa.',
        entradas: 'Identificador da unidade escolhida.',
        saidas: 'Novo token com a unidade ativa atualizada; recarga das listagens no contexto da nova unidade.',
        criterios: [
          'Somente unidades vinculadas ao usuário aparecem como opção.',
          'Tentativa de ativar unidade não autorizada é recusada pelo servidor.',
          'O perfil Administrador pode operar sobre qualquer unidade.',
        ],
      },
      {
        id: 'RF-03',
        nome: 'Encerrar sessão',
        perfis: PERFIS.TODOS,
        descricao: 'Permitir o encerramento da sessão, descartando o token e os dados locais do navegador.',
        entradas: 'Comando de saída acionado pelo usuário.',
        saidas: 'Sessão encerrada e redirecionamento para a tela de acesso.',
        criterios: [
          'Nenhum dado de sessão permanece no navegador após a saída.',
          'Resposta de não autorizado vinda do servidor encerra a sessão automaticamente.',
        ],
      },
    ],
  },
  {
    modulo: 'Gestão de Assistidos',
    itens: [
      {
        id: 'RF-04',
        nome: 'Cadastrar e editar assistido',
        perfis: PERFIS.TODOS,
        descricao:
          'Registrar e manter a ficha do assistido por meio de formulário em quatro etapas: (1) identificação e saúde; (2) escola e endereço; (3) responsável, composição familiar e pessoas autorizadas a retirar; (4) CRAS/SCFV e registro no SISC.',
        entradas:
          'Dados de identificação (nome, nascimento, NIS, CPF/CNS, cor/raça); saúde (alergias, condições, deficiência, tamanhos); escolares e endereço; responsável e composição familiar; dados do CRAS e do SCFV; dados do SISC.',
        saidas: 'Ficha do assistido persistida e vinculada à unidade; confirmação ao usuário.',
        criterios: [
          'O nome completo é obrigatório; a gravação é impedida sem ele.',
          'O assistido é sempre vinculado a uma unidade; para o perfil Administrador, a unidade deve ser informada explicitamente.',
          'É possível navegar entre as etapas sem perder o que já foi preenchido.',
          'Na edição, todos os campos são recarregados com os valores gravados.',
        ],
      },
      {
        id: 'RF-05',
        nome: 'Registrar pessoas autorizadas a retirar',
        perfis: PERFIS.TODOS,
        descricao:
          'Manter, na ficha do assistido, uma lista de pessoas autorizadas a retirá-lo da unidade, incluindo pessoas sem vínculo familiar. A lista fica visível na consulta de detalhes para conferência no momento da retirada.',
        entradas: 'Nome, documento de identificação, telefone, vínculo e observação de cada pessoa autorizada.',
        saidas: 'Lista de autorizados gravada na ficha e exibida na consulta de detalhes e na ficha exportada.',
        criterios: [
          'A lista aceita quantidade variável de pessoas, com inclusão e remoção individuais.',
          'Registros sem nome preenchido são descartados na gravação.',
          'O vínculo é texto livre, não restrito a graus de parentesco.',
        ],
      },
      {
        id: 'RF-06',
        nome: 'Ativar e desativar assistido',
        perfis: PERFIS.TODOS,
        descricao:
          'Permitir sinalizar que o assistido não frequenta mais a unidade, preservando o cadastro e todo o histórico de frequência. A operação é reversível.',
        entradas: 'Comando de ativação ou desativação sobre um assistido.',
        saidas: 'Situação do assistido atualizada; listagens e listas de presença ajustadas.',
        criterios: [
          'A desativação não remove nenhum dado do assistido nem do seu histórico.',
          'Assistidos inativos não aparecem em novas listas de presença.',
          'Assistidos inativos permanecem visíveis nas datas em que já possuem registro de presença.',
          'A reativação restabelece o assistido nas listagens correntes.',
        ],
      },
      {
        id: 'RF-07',
        nome: 'Consultar e filtrar assistidos',
        perfis: PERFIS.TODOS,
        descricao:
          'Listar os assistidos da unidade ativa, com busca textual e filtros combináveis por turma, situação e divergência de registro no SISC.',
        entradas: 'Termo de busca (nome ou NIS); filtro de turma; filtro de situação; filtro de divergência.',
        saidas:
          'Relação de assistidos com turma, situação, tempo de programa e indicação de divergência, além da contagem de resultados.',
        criterios: [
          'A listagem exibe, por padrão, apenas os assistidos ativos.',
          'Os filtros são cumulativos entre si e com a busca textual.',
          'A contagem exibida corresponde ao conjunto filtrado.',
          'O usuário só visualiza assistidos das unidades às quais tem acesso.',
        ],
      },
      {
        id: 'RF-08',
        nome: 'Indicar tempo de vínculo com o programa',
        perfis: PERFIS.TODOS,
        descricao:
          'Apresentar há quanto tempo o assistido participa do programa, calculado a partir da data de inserção no SCFV. Na ausência dessa data, o cálculo utiliza a data de cadastro no sistema, hipótese em que o valor é sinalizado como aproximado.',
        entradas: 'Data de inserção no SCFV ou, subsidiariamente, data de cadastro no sistema.',
        saidas: 'Tempo decorrido em anos e meses, exibido na listagem e na consulta de detalhes.',
        criterios: [
          'Datas futuras ou inválidas não produzem indicação de tempo.',
          'Valores calculados a partir da data de cadastro são explicitamente marcados como aproximados.',
        ],
      },
      {
        id: 'RF-09',
        nome: 'Excluir assistido',
        perfis: PERFIS.ADMIN,
        descricao:
          'Remover definitivamente o cadastro do assistido. Por remover também o histórico de frequência associado, a operação é restrita ao perfil Administrador.',
        entradas: 'Identificador do assistido e confirmação explícita do usuário.',
        saidas: 'Registro removido do banco de dados.',
        criterios: [
          'A ação exige confirmação que informa a perda do histórico de frequência.',
          'Perfis diferentes de Administrador não visualizam a ação e têm a operação recusada pelo servidor.',
          'A desativação é apresentada como alternativa preservadora do histórico.',
        ],
      },
    ],
  },
  {
    modulo: 'Gestão de Turmas',
    itens: [
      {
        id: 'RF-10',
        nome: 'Manter turmas da unidade',
        perfis: PERFIS.TODOS,
        descricao:
          'Cadastrar, listar e excluir as turmas da unidade ativa, com nome, período, dias da semana e faixa etária, conforme o cronograma dos grupos do SCFV.',
        entradas: 'Nome da turma; período (manhã ou tarde); dias da semana; faixa etária ou público.',
        saidas: 'Turma persistida e disponível para vinculação de assistidos e lançamento de presença.',
        criterios: [
          'O nome da turma é obrigatório.',
          'O identificador interno da turma é único dentro da unidade.',
          'A exclusão é recusada quando existirem assistidos ou listas de presença associados à turma.',
          'As turmas são exibidas com período, dias e faixa etária.',
        ],
      },
      {
        id: 'RF-11',
        nome: 'Vincular assistido a turma',
        perfis: PERFIS.TODOS,
        descricao:
          'Associar e desassociar assistidos de uma turma, com busca por nome ou NIS e visualização dos integrantes já vinculados.',
        entradas: 'Turma selecionada; assistido a incluir ou remover.',
        saidas: 'Vínculo atualizado; contagem de integrantes da turma recalculada.',
        criterios: [
          'Um assistido pertence a, no máximo, uma turma por vez.',
          'A remoção do vínculo não exclui o assistido.',
          'Apenas assistidos da unidade ativa são oferecidos para vinculação.',
        ],
      },
    ],
  },
  {
    modulo: 'Lista de Presença',
    itens: [
      {
        id: 'RF-12',
        nome: 'Lançar lista de presença',
        perfis: PERFIS.TODOS,
        descricao:
          'Registrar presença ou falta dos assistidos de uma turma, para uma data e um período determinados.',
        entradas: 'Turma; período; data; marcação de presença ou falta por assistido.',
        saidas: 'Lista de presença gravada, com um registro por assistido; confirmação ao usuário.',
        criterios: [
          'A gravação é impedida quando não há unidade ativa selecionada.',
          'Existe no máximo uma lista por combinação de unidade, data, turma e período; um novo lançamento sobre a mesma combinação atualiza a lista existente em vez de duplicá-la.',
          'Assistidos inativos não são oferecidos para novas marcações.',
          'A operação é registrada em trilha de auditoria.',
        ],
      },
      {
        id: 'RF-13',
        nome: 'Consultar e corrigir listas anteriores',
        perfis: PERFIS.TODOS,
        descricao:
          'Consultar o histórico de listas de presença, com filtros por data e turma, e permitir a correção das marcações de uma lista já gravada.',
        entradas: 'Filtros de data e turma; alterações nas marcações de uma lista existente.',
        saidas: 'Detalhamento da lista com presentes e faltosos; lista atualizada após a correção.',
        criterios: [
          'O detalhamento identifica cada assistido e sua situação na data.',
          'Assistidos posteriormente desativados continuam visíveis nas listas em que constam.',
          'Correções são registradas em trilha de auditoria.',
        ],
      },
    ],
  },
  {
    modulo: 'Integração com o SISC',
    itens: [
      {
        id: 'RF-14',
        nome: 'Registrar vinculação no SISC',
        perfis: PERFIS.TODOS,
        descricao:
          'Registrar, na ficha do assistido, a data de vinculação e o grupo informados no SISC, sistema externo de referência do serviço.',
        entradas: 'Data de vinculação no SISC; grupo no SISC, selecionado entre as turmas da unidade.',
        saidas: 'Dados do SISC gravados na ficha e exibidos na consulta de detalhes.',
        criterios: [
          'O grupo do SISC é escolhido a partir das turmas cadastradas, não digitado livremente.',
          'Grupo previamente gravado que não corresponda a turma existente é preservado na edição.',
        ],
      },
      {
        id: 'RF-15',
        nome: 'Sinalizar divergência entre SISC e turma',
        perfis: PERFIS.TODOS,
        descricao:
          'Identificar e destacar os assistidos cujo grupo informado no SISC difere da turma à qual estão vinculados na unidade, permitindo o controle e a regularização dos cadastros.',
        entradas: 'Grupo no SISC e turma vinculada do assistido.',
        saidas:
          'Indicação visual de divergência na listagem, no formulário e na consulta de detalhes; filtro e contagem de casos divergentes.',
        criterios: [
          'A divergência é sinalizada apenas quando ambos os valores estão preenchidos.',
          'Cadastro incompleto não é tratado como divergência.',
          'A listagem pode ser restrita somente aos casos divergentes.',
        ],
      },
    ],
  },
  {
    modulo: 'Exportações e Relatórios',
    itens: [
      {
        id: 'RF-16',
        nome: 'Exportar ficha do assistido',
        perfis: PERFIS.TODOS,
        descricao:
          'Gerar a ficha individual do assistido em formato PDF, com identidade visual institucional, ou os seus dados em planilha eletrônica.',
        entradas: 'Assistido selecionado na consulta de detalhes.',
        saidas:
          'Arquivo PDF paginado com os dados cadastrais, composição familiar, pessoas autorizadas e observações; ou planilha com os mesmos campos.',
        criterios: [
          'A ficha apresenta cabeçalho institucional, numeração de páginas e identificação da unidade.',
          'Campos não preenchidos são exibidos de forma padronizada.',
          'O nome do arquivo identifica o assistido.',
        ],
      },
      {
        id: 'RF-17',
        nome: 'Exportar relação de assistidos',
        perfis: PERFIS.TODOS,
        descricao:
          'Gerar planilha eletrônica com os assistidos presentes na listagem, respeitando os filtros aplicados.',
        entradas: 'Conjunto de assistidos resultante dos filtros correntes.',
        saidas: 'Planilha com uma linha por assistido e colunas correspondentes aos campos da ficha.',
        criterios: [
          'A exportação reflete exatamente o conjunto filtrado em tela.',
          'A ação fica indisponível quando não há resultados.',
        ],
      },
      {
        id: 'RF-18',
        nome: 'Emitir relatórios operacionais',
        perfis: PERFIS.TODOS,
        descricao:
          'Gerar planilhas de turmas da unidade, histórico de listas de presença e lista de presença detalhada de uma data, mediante filtros de data, turma e período.',
        entradas: 'Tipo de relatório; filtros de data ou intervalo, turma e período.',
        saidas: 'Planilha eletrônica com os dados selecionados.',
        criterios: [
          'A ausência de resultados é informada sem gerar arquivo vazio.',
          'Os filtros aplicáveis variam conforme o tipo de relatório escolhido.',
        ],
      },
      {
        id: 'RF-19',
        nome: 'Emitir relatório analítico consolidado',
        perfis: PERFIS.TODOS,
        descricao:
          'Apresentar painel analítico com indicadores de frequência e distribuição por turma e período, filtrável por intervalo de tempo e unidade, e exportá-lo em PDF. A exportação pode abranger a unidade selecionada ou gerar documento único com uma seção por unidade seguida do consolidado geral.',
        entradas: 'Intervalo de análise; unidade ou conjunto de unidades.',
        saidas:
          'Painel com indicadores e gráficos; documento PDF com cabeçalho institucional e numeração contínua.',
        criterios: [
          'O documento consolidado contém uma seção por unidade e uma seção final consolidada.',
          'A numeração de páginas é contínua ao longo de todo o documento.',
          'O usuário só exporta dados das unidades às quais tem acesso.',
        ],
      },
    ],
  },
  {
    modulo: 'Administração',
    itens: [
      {
        id: 'RF-20',
        nome: 'Consultar funcionários',
        perfis: `${PERFIS.ADMIN} e ${PERFIS.SEDE}`,
        descricao: 'Listar os funcionários cadastrados, com perfil de acesso, situação e unidades vinculadas.',
        entradas: 'Requisição autenticada de perfil autorizado.',
        saidas: 'Relação de funcionários com perfil, situação e unidades.',
        criterios: ['Perfis de unidade não têm acesso à relação de funcionários.'],
      },
      {
        id: 'RF-21',
        nome: 'Manter funcionários e permissões',
        perfis: PERFIS.ADMIN,
        descricao:
          'Cadastrar, editar e excluir funcionários, definindo perfil de acesso, situação e unidades autorizadas.',
        entradas: 'Nome, e-mail, senha, perfil de acesso, unidades vinculadas e situação.',
        saidas: 'Funcionário persistido com as permissões definidas.',
        criterios: [
          'Nome, e-mail, senha e perfil são obrigatórios na criação.',
          'O e-mail é único no sistema.',
          'Perfil informado fora da lista admitida é recusado com mensagem explicativa.',
          'Na edição, a senha só é alterada quando informada.',
          'Somente o perfil Administrador executa operações de escrita.',
        ],
      },
      {
        id: 'RF-22',
        nome: 'Registrar trilha de auditoria',
        perfis: 'Sistema',
        descricao:
          'Registrar automaticamente eventos relevantes de autenticação e de gravação de listas de presença, com autor, ação e detalhes.',
        entradas: 'Eventos gerados pelas operações do sistema.',
        saidas: 'Registros de auditoria persistidos.',
        criterios: [
          'A indisponibilidade da trilha não interrompe a operação em curso.',
          'Cada registro identifica o autor, a ação e o momento da ocorrência.',
        ],
      },
    ],
  },
];

const REQUISITOS_NAO_FUNCIONAIS = [
  {
    categoria: 'Segurança',
    itens: [
      ['RNF-01', 'As senhas são armazenadas exclusivamente como hash criptográfico, nunca em texto puro.'],
      ['RNF-02', 'O acesso às funcionalidades é controlado por perfil, verificado no servidor a cada requisição. A ocultação de elementos na interface é complementar e não constitui, por si só, mecanismo de controle.'],
      ['RNF-03', 'Cada requisição é restrita às unidades vinculadas ao usuário; tentativas de acesso a unidade não autorizada são recusadas com código de erro apropriado.'],
      ['RNF-04', 'A autenticação utiliza token assinado, com prazo de validade configurável (padrão de sete dias).'],
      ['RNF-05', 'As tentativas de autenticação são limitadas a dez ocorrências malsucedidas a cada quinze minutos por origem; a API possui limite geral de quinhentas requisições no mesmo intervalo.'],
      ['RNF-06', 'A aplicação só aceita requisições das origens declaradas em configuração.'],
      ['RNF-07', 'Cabeçalhos de segurança HTTP são aplicados a todas as respostas.'],
      ['RNF-08', 'O servidor não inicia quando variáveis de ambiente essenciais estiverem ausentes, evitando operação em estado inconsistente.'],
      ['RNF-09', 'Dados sensíveis exibidos em tela, como NIS, são apresentados de forma mascarada, com revelação sob ação explícita do usuário.'],
      ['RNF-10', 'A exclusão de assistidos, por implicar perda de histórico, é restrita ao perfil Administrador.'],
    ],
  },
  {
    categoria: 'Desempenho',
    itens: [
      ['RNF-11', 'As operações de consulta e gravação devem responder em até três segundos em condições normais de uso.'],
      ['RNF-12', 'Filtros e buscas na listagem de assistidos são aplicados no cliente sobre os dados já carregados, sem nova requisição ao servidor.'],
      ['RNF-13', 'A geração de relatório consolidado exibe indicação de progresso, por envolver captura sequencial de múltiplas unidades.'],
    ],
  },
  {
    categoria: 'Usabilidade',
    itens: [
      ['RNF-14', 'A interface é integralmente apresentada em português do Brasil, com datas no formato dia/mês/ano.'],
      ['RNF-15', 'O cadastro de assistidos é dividido em etapas, permitindo preenchimento gradual sem perda de dados entre elas.'],
      ['RNF-16', 'Ações destrutivas exigem confirmação explícita, com indicação clara das consequências e da alternativa não destrutiva, quando existir.'],
      ['RNF-17', 'A interface é responsiva, adequando-se a computadores e dispositivos móveis.'],
      ['RNF-18', 'Mensagens de erro e de confirmação são apresentadas em linguagem compreensível ao usuário final, sem termos técnicos.'],
    ],
  },
  {
    categoria: 'Confiabilidade e Integridade',
    itens: [
      ['RNF-19', 'O lançamento de lista de presença é idempotente: repetições sobre a mesma combinação de unidade, data, turma e período atualizam o registro existente, sem duplicação.'],
      ['RNF-20', 'A desativação de assistidos preserva integralmente o cadastro e o histórico de frequência.'],
      ['RNF-21', 'A exclusão de turmas é impedida quando houver assistidos ou listas de presença associados.'],
      ['RNF-22', 'Eventos de autenticação e de gravação de presença são registrados em trilha de auditoria.'],
      ['RNF-23', 'A alteração da estrutura do banco de dados é feita por meio de scripts de migração numerados e idempotentes.'],
    ],
  },
  {
    categoria: 'Escalabilidade e Manutenibilidade',
    itens: [
      ['RNF-24', 'A arquitetura permite a inclusão de novas unidades sem alteração de código.'],
      ['RNF-25', 'O código do servidor segue separação em camadas de rotas, controladores e modelos.'],
      ['RNF-26', 'Os perfis de acesso são definidos em ponto único do código, evitando divergência entre as camadas.'],
      ['RNF-27', 'O sistema possui suíte de testes automatizados executável por comando único.'],
    ],
  },
];

const RESTRICOES = [
  ['Tecnológica', 'A interface é desenvolvida em React com Vite; o servidor, em Node.js com Express; a persistência utiliza PostgreSQL provido pela plataforma Supabase.'],
  ['Tecnológica', 'A comunicação entre interface e servidor ocorre exclusivamente por API HTTP com payloads em JSON.'],
  ['Operacional', 'A interface e o servidor são publicados de forma independente, em provedores distintos; a atualização de um não implica a atualização do outro.'],
  ['Operacional', 'As migrações de banco de dados são aplicadas manualmente pelo administrador, não havendo execução automática durante a publicação.'],
  ['Operacional', 'O sistema pressupõe conectividade com a internet, não havendo modo de operação off-line.'],
  ['Regulatória', 'O tratamento de dados pessoais observa a Lei nº 13.709/2018 (LGPD). O sistema trata dados pessoais sensíveis e dados de crianças e adolescentes, o que exige atenção reforçada quanto a finalidade, acesso e compartilhamento.'],
];

const INTERFACES = [
  ['Interface de usuário', 'Aplicação web responsiva, acessada por navegador em versão atual, com resolução mínima recomendada de 1280 × 720 pixels.'],
  ['Interface de software', 'API HTTP própria, autenticada por token, consumida exclusivamente pela interface web do sistema.'],
  ['Interface de software', 'Serviço de banco de dados PostgreSQL da plataforma Supabase, acessado pelo servidor por meio de credencial de serviço.'],
  ['Interface de comunicação', 'Protocolo HTTPS em todas as comunicações entre navegador, servidor e banco de dados.'],
  ['Interface de hardware', 'Não há requisitos específicos de hardware além de dispositivo capaz de executar navegador web compatível.'],
];

const GLOSSARIO = [
  ['API', 'Interface de Programação de Aplicações; conjunto de operações expostas pelo servidor.'],
  ['Assistido', 'Pessoa atendida pelo serviço socioassistencial, também referida como usuário do serviço.'],
  ['CRAS', 'Centro de Referência de Assistência Social.'],
  ['CREAS', 'Centro de Referência Especializado de Assistência Social.'],
  ['JSON', 'Formato de intercâmbio de dados utilizado na comunicação com a API.'],
  ['JWT', 'JSON Web Token; token assinado utilizado para autenticar as requisições.'],
  ['LGPD', 'Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).'],
  ['NIS', 'Número de Identificação Social.'],
  ['PDF', 'Formato de documento portátil, utilizado nas fichas e relatórios emitidos.'],
  ['Perfil de acesso', 'Conjunto de permissões atribuído ao funcionário: Administrador, Equipe Sede, Coordenador, Técnico ou Assistente.'],
  ['RF', 'Requisito Funcional.'],
  ['RNF', 'Requisito Não Funcional.'],
  ['SCFV', 'Serviço de Convivência e Fortalecimento de Vínculos.'],
  ['SIGU', 'Sistema Integrado de Gerenciamento de Usuários; denominação do produto.'],
  ['SISC', 'Sistema de Informações do Serviço de Convivência e Fortalecimento de Vínculos, mantido pelo Governo Federal.'],
  ['SOS', 'Serviço de Obras Sociais; organização responsável pelo produto.'],
  ['SRS', 'Software Requirements Specification; documento de especificação de requisitos de software.'],
  ['Turma', 'Grupo de assistidos de uma unidade, com nome, período, dias da semana e faixa etária.'],
  ['Unidade', 'Centro de convivência onde o serviço é prestado; no sistema, corresponde a um programa (Semear, Viver ou Sonhar).'],
  ['XLSX', 'Formato de planilha eletrônica utilizado nas exportações.'],
];

const PERFIS_TABELA = [
  ['Administrador', 'Acesso irrestrito a todas as unidades e funcionalidades, incluindo a manutenção de funcionários e a exclusão definitiva de assistidos.'],
  ['Equipe Sede', 'Acesso a todas as unidades para operação e consulta, além da consulta à relação de funcionários. Não executa exclusões definitivas nem altera permissões.'],
  ['Coordenador', 'Acesso restrito às unidades vinculadas, com operação plena de assistidos, turmas, listas de presença e relatórios.'],
  ['Técnico', 'Mesmas permissões do perfil Coordenador; a distinção existe para identificar o cargo do profissional.'],
  ['Assistente', 'Mesmas permissões do perfil Coordenador; a distinção existe para identificar o cargo do profissional.'],
];

// Rastreabilidade com o Backlog do Produto — SOS, versão 4.0 (15/06/2026).
// Colunas: item do backlog | requisitos correspondentes | situação.
const RASTREABILIDADE = [
  ['EP001 — Gerenciamento de usuários', 'RF-01 a RF-03; RF-20; RF-21', 'Atendido'],
  ['US001 — Login no Sistema', 'RF-01', 'Atendido'],
  ['US002 — Seleção de Unidade', 'RF-02', 'Atendido'],
  ['US003 — Registrar Presenças', 'RF-12', 'Atendido'],
  ['US004 — Visualizar Presenças', 'RF-13', 'Atendido'],
  ['US005 — Cadastrar Alunos', 'RF-04', 'Atendido'],
  ['US006 — Editar Aluno', 'RF-04', 'Atendido'],
  ['US007 — Consultar Prontuário', 'RF-07; RF-16', 'Atendido'],
  ['US008 — Registrar Anotações', 'RF-04 (campo "Observações do orientador")', 'Atendido parcialmente'],
  ['US009 — Filtrar Alunos', 'RF-07; RF-15', 'Atendido'],
  ['US010 — Gerar Relatórios', 'RF-18; RF-19', 'Atendido'],
  ['US011 — Cadastrar Usuário', 'RF-21', 'Atendido'],
  ['US012 — Exportar informações', 'RF-16; RF-17; RF-18; RF-19', 'Atendido'],
  ['US013 — Cadastro de usuário (campos reais)', 'RF-04; RF-05; RF-14', 'Atendido'],
  ['US014 — Padronização de Turmas', 'RF-10', 'Atendido'],
  ['US015 — Módulo de Chamadas', 'RF-12; RF-13', 'Atendido'],
  ['US016 — Exportação de Relatórios', 'RF-18; RF-19', 'Atendido'],
  ['T001 — Fundação da Infraestrutura', 'RNF-24 a RNF-27; restrições tecnológicas', 'Atendido'],
  ['T002 — Modelagem do Banco de Dados', 'RNF-23', 'Atendido'],
];

const OBSERVACOES_RASTREABILIDADE = [
  'US008 — Registrar Anotações: o sistema disponibiliza um campo único de observações do orientador na ficha do assistido, preenchido e alterado livremente. O critério de aceitação original previa o registro em histórico, com preservação das anotações anteriores e identificação de autor e data. Essa capacidade não está implementada e permanece como evolução pendente.',
  'US003 e US015 — a funcionalidade descrita no backlog como "chamada" foi renomeada para "lista de presença" a pedido do SOS, sem alteração de comportamento. Este documento adota a denominação corrente.',
  'Os requisitos RF-05, RF-06, RF-08, RF-09, RF-14, RF-15 e RF-22 decorrem de solicitações posteriores à versão 4.0 do backlog ou de decisões técnicas de implementação, e ainda não possuem item correspondente naquele artefato.',
];

module.exports = {
  REQUISITOS_FUNCIONAIS,
  REQUISITOS_NAO_FUNCIONAIS,
  RESTRICOES,
  INTERFACES,
  GLOSSARIO,
  PERFIS_TABELA,
  RASTREABILIDADE,
  OBSERVACOES_RASTREABILIDADE,
};
