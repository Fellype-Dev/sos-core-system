// Conteúdo do Manual do Usuário do SIGU.
// Os procedimentos descrevem a interface tal como ela se encontra no sistema.

const BENEFICIOS = [
  'Substitui as planilhas e as fichas de papel por um cadastro único, acessível de qualquer computador ou celular com internet.',
  'Mantém a lista de presença sempre disponível para consulta e correção, sem depender de cadernos ou arquivos locais.',
  'Organiza os assistidos nas turmas do cronograma do SCFV, com período, dias da semana e faixa etária de cada grupo.',
  'Aponta automaticamente quando a turma registrada no SOS difere do grupo informado no SISC, o que reduz retrabalho na prestação de contas.',
  'Gera fichas individuais em PDF e planilhas em Excel com um clique, prontas para imprimir ou enviar.',
  'Preserva o histórico de quem deixou de frequentar a unidade: o cadastro é desativado, nunca apagado.',
  'Separa os dados por unidade, de modo que cada profissional enxerga apenas o que lhe compete.',
];

const PERFIS = [
  ['Coordenador, Técnico e Assistente', 'Trabalham nas unidades às quais estão vinculados. Cadastram e editam assistidos, criam turmas, lançam e corrigem listas de presença e emitem relatórios. Os três perfis têm exatamente as mesmas permissões; o que muda é apenas o cargo registrado.'],
  ['Equipe Sede', 'Faz tudo o que os perfis de unidade fazem, em todas as unidades, e ainda consulta a relação de funcionários. Não cadastra funcionários nem exclui assistidos definitivamente.'],
  ['Administrador', 'Acesso completo: todas as unidades, cadastro e edição de funcionários e permissões, e exclusão definitiva de assistidos.'],
];

const REQUISITOS = [
  ['Equipamento', 'Computador, notebook, tablet ou celular. Não é preciso instalar nada.'],
  ['Navegador', 'Google Chrome, Microsoft Edge, Firefox ou Safari, em versão atualizada.'],
  ['Internet', 'Conexão ativa durante todo o uso. O sistema não funciona sem internet.'],
  ['Credenciais', 'E-mail corporativo e senha, fornecidos pela secretaria administrativa da sede.'],
  ['Tela', 'Qualquer tamanho. Em telas pequenas o menu e as tabelas se ajustam automaticamente; para preencher cadastros longos, a tela do computador é mais confortável.'],
];

const PROCEDIMENTOS = {
  primeiroAcesso: {
    titulo: 'Entrar no sistema',
    passos: [
      'Abra o navegador e digite o endereço do sistema fornecido pela sede.',
      'No campo E-mail corporativo (1), digite o seu e-mail institucional completo.',
      'No campo Senha (2), digite a senha recebida da secretaria administrativa.',
      'Clique em Entrar (3). O sistema abre direto no Painel de Monitoramento.',
    ],
    obs: [
      'A senha é pessoal e não deve ser compartilhada. Caso precise trocá-la, peça à secretaria administrativa da sede — o sistema não possui a opção "esqueci minha senha".',
      'Se aparecer a mensagem "Credenciais inválidas", confira se o e-mail está completo e se a tecla Caps Lock está desligada.',
      'Após várias tentativas erradas seguidas, o sistema bloqueia novas tentativas por alguns minutos. Aguarde e tente de novo.',
    ],
  },
  navegacao: {
    titulo: 'Circular pelo sistema',
    passos: [
      'Use o menu (1) para alternar entre Início, Usuários, Turmas, Lista de Presença, Relatórios e, para quem tem permissão, Funcionários.',
      'Confira sempre a Unidade ativa (2) antes de cadastrar ou lançar qualquer coisa: tudo o que você faz vale para a unidade que estiver selecionada ali.',
      'Ao terminar o trabalho, clique em Sair (3), principalmente em computadores compartilhados.',
    ],
    obs: [
      'Quem atende uma única unidade não vê o seletor: no lugar dele aparece o nome da unidade, fixo.',
      'A opção Funcionários só aparece para os perfis Administrador e Equipe Sede.',
      'Trocar de unidade recarrega os dados da tela. Nada do que já foi salvo se perde.',
    ],
  },
  cadastrar: {
    titulo: 'Cadastrar um novo usuário',
    passos: [
      'Confira a unidade ativa no topo da tela.',
      'Vá em Usuários e clique em + Novo usuário.',
      'Etapa 1 — Identificação e saúde (1): preencha o Nome completo (2), único campo obrigatório, e o que mais tiver em mãos: nascimento, NIS, cor/etnia, CPF ou Cartão SUS, tamanhos de calçado e roupa, alergias, problemas de saúde e deficiência.',
      'Clique em Próximo (3) e preencha a Etapa 2 — Escola e endereço: escola, série, turno, endereço, bairro e ponto de referência.',
      'Na Etapa 3 — Responsável e família: dados do responsável legal, situação socioeconômica, composição familiar e pessoas autorizadas a retirar.',
      'Na Etapa 4 — CRAS e SCFV: encaminhamento, datas e dados do SCFV, registro no SISC e observações do orientador.',
      'Clique em Concluir cadastro. O sistema volta para a listagem com a confirmação.',
    ],
    obs: [
      'Você pode voltar às etapas anteriores a qualquer momento pelos botões da trilha; nada é perdido ao navegar entre elas.',
      'Só o nome completo é obrigatório. Todo o restante pode ser preenchido depois, à medida que a família traz os documentos.',
      'A turma não é escolhida aqui: o vínculo é feito na tela Turmas, depois que o cadastro existir.',
      'Perfis com acesso a mais de uma unidade precisam confirmar a Unidade do Usuário na Etapa 2.',
    ],
  },
  autorizados: {
    titulo: 'Registrar quem pode retirar o assistido',
    passos: [
      'Abra o cadastro do usuário (novo ou em edição) e vá até a Etapa 3 — Responsável e família.',
      'Na seção Pessoas Autorizadas a Retirar, clique em Adicionar Pessoa Autorizada.',
      'Preencha Nome, Documento, Telefone e Vínculo (por exemplo: vizinha, tia, motorista do transporte escolar).',
      'Use o campo Observação para condições da autorização, como "retira somente às sextas" ou "autorização assinada entregue em 10/02".',
      'Repita para quantas pessoas forem necessárias e salve o cadastro.',
    ],
    obs: [
      'Só é gravada a pessoa que tiver o nome preenchido — linhas em branco são descartadas.',
      'Essa lista é diferente da composição familiar: aqui entra quem tem autorização para retirar, mesmo sem ser da família.',
      'Na portaria, a conferência é feita pela tela de Detalhes do usuário, na seção Pessoas Autorizadas a Retirar.',
    ],
  },
  consultar: {
    titulo: 'Encontrar e consultar um usuário',
    passos: [
      'Vá em Usuários. A tela abre com todos os cadastros da unidade ativa.',
      'Use a busca (1) para filtrar por nome ou NIS enquanto digita.',
      'Use o filtro de turma (2) para ver apenas uma turma ou os que estão sem turma.',
      'Use o filtro de situação (3) para alternar entre Somente ativos e Ativos e inativos.',
      'Clique no ícone de detalhes, na coluna Ações (6), para abrir a ficha completa do usuário.',
    ],
    obs: [
      'O botão SISC divergente (4) mostra apenas quem está com a turma do SOS diferente do grupo informado no SISC — é o atalho para revisar a prestação de contas.',
      'O NIS aparece mascarado na listagem; clique no ícone de olho ao lado para revelá-lo.',
      'Na ficha de detalhes, o campo Tempo no Programa indica há quanto tempo a pessoa está cadastrada, contado a partir da data do cadastro no sistema.',
    ],
  },
  exportarFicha: {
    titulo: 'Emitir a ficha do usuário em PDF ou Excel',
    passos: [
      'Vá em Usuários e abra os detalhes da pessoa desejada.',
      'No alto da janela de detalhes, clique em Ficha PDF para gerar o documento pronto para impressão.',
      'Clique em Excel para baixar os mesmos dados em planilha.',
      'O arquivo é gerado no próprio navegador e vai para a pasta de downloads do equipamento.',
    ],
    obs: [
      'Em cadastros extensos a geração leva alguns segundos. Aguarde a mensagem de confirmação antes de fechar a janela.',
      'Para exportar vários usuários de uma vez, use o botão Exportar Excel (5) da listagem: ele exporta exatamente quem está aparecendo na tela, respeitando os filtros aplicados.',
    ],
  },
  desativar: {
    titulo: 'Desativar e reativar um usuário',
    passos: [
      'Vá em Usuários e localize a pessoa na listagem.',
      'Na coluna Ações, clique no ícone Desativar (mantém o histórico).',
      'Leia a confirmação e conclua.',
      'Para ver quem está desativado, mude o filtro de situação para Ativos e inativos; a etiqueta Inativo aparece ao lado do nome.',
      'Para reativar, clique no mesmo ícone na linha de quem está inativo e confirme.',
    ],
    obs: [
      'Desativar é a ação indicada para quem deixou de frequentar a unidade: o cadastro e todo o histórico de frequência continuam guardados.',
      'Quem está inativo sai da lista de presença do dia, mas continua visível nas listas antigas em que já tinha registro — o histórico não é alterado.',
      'A reativação devolve a pessoa às listas normalmente, sem precisar cadastrar de novo.',
    ],
  },
  excluir: {
    titulo: 'Excluir um usuário definitivamente',
    passos: [
      'Confirme que a exclusão é mesmo necessária: ela apaga o cadastro e todo o histórico de frequência, sem possibilidade de recuperação.',
      'Vá em Usuários, localize a pessoa e clique no ícone Excluir definitivamente.',
      'Leia com atenção o aviso apresentado e confirme apenas se tiver certeza.',
    ],
    obs: [
      'Essa ação está disponível somente para o perfil Administrador.',
      'Se a intenção é apenas registrar que a pessoa não frequenta mais a unidade, use Desativar. A exclusão existe para casos como cadastro duplicado ou registro criado por engano.',
    ],
  },
  turmas: {
    titulo: 'Criar uma turma',
    passos: [
      'Confira a unidade ativa e vá em Turmas.',
      'No painel Criar Nova Turma, digite o Nome da Turma (1).',
      'Escolha o Período — Manhã ou Tarde — e informe a Faixa Etária / Público, como "6 a 8 anos" ou "60+".',
      'Marque os Dias da Semana (2) em que a turma se encontra. Os dias marcados ficam destacados.',
      'Clique em + Adicionar Turma. Ela passa a aparecer na relação abaixo.',
    ],
    obs: [
      'As turmas do cronograma do SCFV já vêm cadastradas nas três unidades. Crie turmas novas apenas quando o cronograma mudar.',
      'Cada cartão de turma (3) mostra o período, a faixa etária e os dias de encontro, para conferência rápida.',
      'Não é possível excluir uma turma que ainda tenha usuários vinculados ou listas de presença lançadas. Transfira os usuários antes.',
    ],
  },
  vincular: {
    titulo: 'Vincular usuários a uma turma',
    passos: [
      'Vá em Turmas e clique no cartão da turma desejada (3). O painel de alunos abre logo abaixo.',
      'No quadro da direita, Adicionar Alunos à Turma (4), use a busca por nome ou NIS para localizar a pessoa.',
      'Clique em Adicionar. O nome passa imediatamente para o quadro da esquerda.',
      'Para tirar alguém da turma, clique em Remover na lista da esquerda.',
    ],
    obs: [
      'O quadro da direita mostra os usuários da unidade que ainda não estão nesta turma.',
      'Remover da turma não desativa nem apaga o cadastro: a pessoa apenas volta a ficar Sem Turma.',
      'A troca de turma é feita adicionando o usuário à turma nova; o vínculo anterior é substituído.',
    ],
  },
  lancarPresenca: {
    titulo: 'Lançar a lista de presença do dia',
    passos: [
      'Confira a unidade ativa e vá em Lista de Presença.',
      'Mantenha-se na aba Lançar Lista de Presença.',
      'Escolha a Turma (1) e o Período (2). A data usada é sempre a de hoje, mostrada ao lado dos filtros.',
      'A lista carrega os usuários ativos da turma. Marque Presente ou Falta (3) para cada um.',
      'Clique em Salvar Lista de Presença (4) e aguarde a confirmação.',
    ],
    obs: [
      'Clicar de novo na mesma marcação desfaz a escolha, caso tenha marcado por engano.',
      'Salvar duas vezes o mesmo dia não gera lista duplicada: o sistema atualiza a lista que já existe para aquela turma, data e período.',
      'Quem está inativo aparece com a etiqueta Inativo apenas se já tiver registro naquela lista; caso contrário, não aparece.',
      'Se a lista abrir vazia, confira a turma escolhida e se os usuários estão vinculados a ela na tela Turmas.',
    ],
  },
  historicoPresenca: {
    titulo: 'Consultar e corrigir listas anteriores',
    passos: [
      'Vá em Lista de Presença e abra a aba Histórico de Listas de Presença (5).',
      'Use os filtros de data e turma para localizar a lista desejada.',
      'Clique em Visualizar na linha correspondente. A janela mostra os totais de presentes, faltas e atendidos, com os nomes de cada grupo.',
      'Para corrigir, clique em Editar, ajuste as marcações e salve.',
    ],
    obs: [
      'O histórico mostra quem lançou a lista e quando, o que ajuda a esclarecer divergências.',
      'A correção substitui o que estava gravado. O sistema guarda a situação atual da lista, não as versões anteriores.',
      'É por aqui que se corrige a presença de um dia passado — a aba de lançamento trabalha sempre com a data de hoje.',
    ],
  },
  relatorios: {
    titulo: 'Exportar planilhas e relatórios',
    passos: [
      'Vá em Relatórios e confira a unidade ativa no topo.',
      'Em Tipo de Relatório (1), escolha entre Turmas da unidade, Histórico de listas de presença ou Lista de presença detalhada do dia.',
      'Ajuste os filtros que aparecem para o tipo escolhido: intervalo de datas ou data específica, turma e período.',
      'Confira o quadro Configuração de Saída, à direita, que resume o que será exportado.',
      'Clique em Exportar Excel (XLSX) (2) e aguarde o download.',
      'Para o documento em PDF, com gráficos e indicadores, clique em Relatório Consolidado (PDF) (3).',
    ],
    obs: [
      'As exportações em Excel valem sempre para a unidade ativa. Para outra unidade, troque a unidade no topo da tela.',
      'A opção Relatório geral (todas as unidades) gera um único PDF com uma seção por unidade e o consolidado ao final; por percorrer todas as unidades, leva mais tempo e exibe o progresso na tela.',
      'A prévia dos gráficos na parte de baixo da tela mostra exatamente o que entrará no PDF.',
    ],
  },
  painel: {
    titulo: 'Acompanhar os indicadores no Painel de Monitoramento',
    passos: [
      'Clique em Início. O painel abre com os números da unidade ativa.',
      'Escolha o Período de análise: Este mês, Últimos 3 meses, Este ano, Tudo ou Personalizado, com datas de início e fim.',
      'Quem tem acesso a mais de uma unidade pode usar o seletor Unidade e escolher Todas as unidades para comparar.',
      'Acompanhe os cartões de total de usuários, frequência do período e registros lançados, e os gráficos de evolução, comparativo entre unidades, status de frequência, distribuição por turma e por período.',
    ],
    obs: [
      'Os números do painel refletem o que foi lançado nas listas de presença. Períodos sem lançamento aparecem vazios.',
      'O painel é apenas de consulta: nenhuma alteração de cadastro é feita por ele.',
    ],
  },
  funcionarios: {
    titulo: 'Cadastrar e manter funcionários',
    passos: [
      'Vá em Funcionários. A opção aparece somente para os perfis Administrador e Equipe Sede.',
      'Clique em Novo Funcionário e preencha Nome Completo, E-mail corporativo e Senha de acesso.',
      'Escolha o Tipo de Perfil: Coordenador, Técnico, Assistente, Equipe da Sede ou Administrador Geral.',
      'Marque as Unidades Autorizadas às quais o funcionário terá acesso.',
      'Confirme a opção Funcionário Ativo e salve.',
      'Para alterar um cadastro, clique em Editar na linha correspondente. Ao editar, deixe a senha em branco para mantê-la como está.',
    ],
    obs: [
      'Somente o perfil Administrador cadastra, edita e exclui funcionários; a Equipe Sede apenas consulta.',
      'Um funcionário de unidade precisa de pelo menos uma unidade autorizada, senão não consegue entrar.',
      'Ao desmarcar Funcionário Ativo, o acesso é bloqueado no próximo login. Se a pessoa já estiver com o sistema aberto, a sessão em andamento continua válida até expirar.',
    ],
  },
};

const FAQ = [
  ['O sistema chama os assistidos de "usuários". Isso não confunde com os funcionários?',
   'No menu, Usuários são as pessoas atendidas pela instituição — crianças, adolescentes e idosos. Os profissionais que operam o sistema ficam em Funcionários, opção visível apenas para a sede e a administração.'],
  ['Esqueci minha senha. Como recupero?',
   'O sistema não tem recuperação automática de senha. Solicite uma nova à secretaria administrativa da sede, que cadastra a senha e a repassa a você.'],
  ['Preciso preencher o cadastro inteiro de uma vez?',
   'Não. Apenas o nome completo é obrigatório. O restante pode ser preenchido depois, conforme a família apresenta os documentos: basta abrir o cadastro em Editar e completar.'],
  ['Por que não consigo escolher a turma no formulário de cadastro?',
   'O vínculo com a turma é feito na tela Turmas, depois que o cadastro existir. Selecione a turma, procure a pessoa no quadro da direita e clique em Adicionar.'],
  ['Marquei a presença errada e já salvei. Dá para corrigir?',
   'Sim. Abra Lista de Presença, vá na aba Histórico de Listas de Presença, localize a lista pela data e turma, clique em Visualizar e depois em Editar.'],
  ['Salvei a lista de presença duas vezes. Vai duplicar?',
   'Não. Para a mesma turma, data e período existe uma única lista: o novo lançamento atualiza a que já estava gravada.'],
  ['Como lanço a presença de um dia que já passou?',
   'A aba de lançamento trabalha sempre com a data de hoje. Para datas anteriores, use o histórico: se a lista existir, edite-a; se não existir, registre a ocorrência com a coordenação, pois não há lançamento retroativo pela tela.'],
  ['Qual a diferença entre desativar e excluir?',
   'Desativar preserva o cadastro e todo o histórico de frequência, e pode ser desfeito a qualquer momento — é a opção correta para quem deixou de frequentar. Excluir apaga tudo definitivamente e é restrito ao Administrador.'],
  ['Um usuário desativado atrapalha a lista de presença?',
   'Não. Ele deixa de aparecer nas novas listas e continua visível apenas nas listas antigas em que já tinha registro, com a etiqueta Inativo.'],
  ['O que significa a marcação "SISC divergente"?',
   'Que a turma registrada no SOS é diferente do grupo informado no SISC para aquela pessoa. Use o botão de mesmo nome na listagem para revisar todos os casos e acertar o cadastro ou o registro no SISC.'],
  ['Trabalho em mais de uma unidade. Como troco?',
   'Use o seletor Unidade ativa no topo da tela. Tudo o que você consulta, cadastra ou lança passa a valer para a unidade selecionada.'],
  ['Cadastrei um usuário na unidade errada. E agora?',
   'Abra o cadastro em Editar e altere a Unidade do Usuário na Etapa 2. Se o campo não aparecer, é porque seu perfil atende a uma única unidade: peça o ajuste à sede.'],
  ['Os relatórios saem de todas as unidades?',
   'As exportações em Excel valem para a unidade ativa. Para um documento com todas as unidades, use a opção Relatório geral (todas as unidades), que gera um PDF com uma seção por unidade e o consolidado ao final.'],
  ['O NIS aparece escondido. Isso é problema?',
   'Não. É proteção: dados sensíveis aparecem mascarados e só são revelados quando se clica no ícone de olho, evitando exposição acidental na tela.'],
  ['Posso usar o sistema no celular?',
   'Pode. A interface se adapta a telas pequenas. Para lançar presença funciona bem; para preencher cadastros longos, o computador é mais confortável.'],
  ['O sistema funciona sem internet?',
   'Não. É preciso conexão ativa durante todo o uso, porque os dados ficam guardados no servidor, e não no equipamento.'],
];

const PROBLEMAS = [
  ['A tela mostra "Credenciais inválidas" ao entrar.',
   'E-mail ou senha digitados incorretamente.',
   'Confira o e-mail completo, verifique a tecla Caps Lock e tente novamente. Persistindo, peça uma nova senha à secretaria administrativa.'],
  ['Aparece "Muitas tentativas de login. Aguarde alguns minutos".',
   'Proteção contra tentativas repetidas de senha.',
   'Aguarde cerca de quinze minutos e tente de novo, com a senha correta. Se não tiver certeza da senha, peça a redefinição antes de tentar outra vez.'],
  ['Aparece "Usuário inativo" ao entrar.',
   'O cadastro do funcionário foi desativado.',
   'Procure a sede: apenas o Administrador reativa o acesso, em Funcionários.'],
  ['Aparece "Usuário sem unidade vinculada".',
   'O funcionário não tem nenhuma unidade autorizada.',
   'Peça ao Administrador que vincule a unidade correta ao seu cadastro, em Funcionários.'],
  ['O sistema devolveu à tela de login sozinho.',
   'A sessão expirou ou o acesso foi alterado.',
   'Entre novamente. O que já havia sido salvo permanece; apenas um formulário aberto e não salvo se perde.'],
  ['A listagem de usuários está vazia.',
   'Unidade ativa diferente da esperada, ou filtros restritivos aplicados.',
   'Confira a unidade no topo da tela, limpe a busca e coloque o filtro de situação em Ativos e inativos.'],
  ['A pessoa não aparece na lista de presença.',
   'Não está vinculada à turma, ou está desativada.',
   'Verifique o vínculo na tela Turmas e a situação do cadastro em Usuários. Reative-a se for o caso.'],
  ['A lista de presença abre vazia.',
   'A turma escolhida não tem usuários vinculados.',
   'Confira a turma e o período selecionados e faça os vínculos na tela Turmas.'],
  ['Não consigo excluir uma turma.',
   'A turma ainda tem usuários vinculados ou listas de presença lançadas.',
   'Transfira os usuários para outra turma. Turmas com histórico de presença são mantidas para preservar os registros.'],
  ['A exportação não baixa nada.',
   'Download bloqueado pelo navegador, ou nenhum dado no filtro aplicado.',
   'Verifique o aviso de bloqueio na barra do navegador e autorize o download. Confirme também se os filtros retornam algum registro.'],
  ['O relatório em PDF demora ou parece travado.',
   'O documento é montado no próprio equipamento, gráfico por gráfico.',
   'Aguarde: a tela mostra o progresso. No relatório geral, que percorre todas as unidades, a espera é maior. Evite trocar de aba durante a geração.'],
  ['Alterei um dado e ele não apareceu.',
   'A tela estava aberta antes da alteração.',
   'Atualize a página com F5 ou saia e volte à tela.'],
  ['As páginas estão com aparência estranha após uma atualização do sistema.',
   'O navegador guardou uma versão antiga dos arquivos.',
   'Atualize com Ctrl + F5 para forçar o recarregamento.'],
  ['A tela indica falha de conexão com o servidor.',
   'Internet instável ou servidor indisponível.',
   'Confira sua conexão. Se outros sites abrem normalmente e o problema continua, comunique o suporte técnico informando o horário e a tela em que ocorreu.'],
];

const CONTATOS = [
  ['Dúvida sobre o uso do sistema', 'Coordenação da sua unidade', '[preencher]'],
  ['Senha, cadastro de funcionário e permissões', 'Secretaria administrativa da sede', '[preencher]'],
  ['Falha técnica, erro persistente ou indisponibilidade', 'Responsável técnico pelo SIGU', '[preencher]'],
  ['Endereço de acesso ao sistema', 'Informado pela sede', '[preencher]'],
];

const GLOSSARIO = [
  ['Unidade ativa', 'Unidade sobre a qual você está trabalhando no momento, indicada no topo da tela. Determina o que aparece e onde os dados são gravados.'],
  ['Usuário', 'No menu do sistema, é a pessoa atendida pela instituição — o assistido.'],
  ['Funcionário', 'Profissional com acesso ao sistema.'],
  ['Turma', 'Grupo de convivência da unidade, com nome, período, dias da semana e faixa etária.'],
  ['Lista de presença', 'Registro de presenças e faltas de uma turma em uma data e período.'],
  ['NIS', 'Número de Identificação Social. Aparece mascarado nas telas.'],
  ['SCFV', 'Serviço de Convivência e Fortalecimento de Vínculos.'],
  ['SISC', 'Sistema do Governo Federal em que a vinculação ao SCFV é registrada.'],
  ['CRAS / CREAS', 'Centros de referência da assistência social que encaminham as famílias.'],
  ['Inativo', 'Situação de quem não frequenta mais a unidade. O cadastro e o histórico são preservados.'],
];

module.exports = {
  BENEFICIOS,
  PERFIS,
  REQUISITOS,
  PROCEDIMENTOS,
  FAQ,
  PROBLEMAS,
  CONTATOS,
  GLOSSARIO,
};
