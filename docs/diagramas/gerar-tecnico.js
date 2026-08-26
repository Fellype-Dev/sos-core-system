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

// ---- Auxiliares -------------------------------------------------------------
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

/** Bloco de comandos, em fonte monoespaçada sobre fundo claro. */
function codigo(linhas) {
  return new Table({
    width: { size: LARGURA_UTIL, type: WidthType.DXA },
    columnWidths: [LARGURA_UTIL],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      left: { style: BorderStyle.SINGLE, size: 12, color: '94A3B8' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: LARGURA_UTIL, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: 'F8FAFC', color: 'auto' },
        margins: { top: 110, bottom: 110, left: 160, right: 120 },
        children: linhas.map((l, i) => new Paragraph({
          spacing: { after: i === linhas.length - 1 ? 0 : 40, line: 240 },
          children: [new TextRun({
            text: l,
            font: 'Consolas',
            size: 18,
            color: l.startsWith('#') ? '64748B' : '0F172A',
          })],
        })),
      })],
    })],
  });
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

const quebra = () => new Paragraph({ children: [new PageBreak()] });
const espaco = (n = 140) => new Paragraph({ spacing: { after: n }, children: [] });

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
    children: [new TextRun({ text: 'MANUAL TÉCNICO E GUIA DE IMPLANTAÇÃO', bold: true, size: 26, color: NAVY })] }),
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Versão 1.0', size: 22, color: CINZA })] }),
  new Paragraph({ spacing: { before: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), size: 22, color: CINZA })] }),
  quebra(),
);

filhos.push(h1('Sumário'), new TableOfContents('Sumário', { hyperlink: true, headingStyleRange: '1-3' }), quebra());

// 1. Visão geral
filhos.push(h1('1. Visão geral'));
filhos.push(p('Este documento reúne as informações necessárias para instalar, publicar e manter o SIGU — Sistema Integrado de Gerenciamento de Usuários do Serviço de Obras Sociais (SOS). Destina-se a desenvolvedores e à equipe de TI responsável pelo ambiente.'));
filhos.push(p('O SIGU é composto por três partes independentes: uma interface web em React, publicada como arquivos estáticos; uma API em Node.js com Express, executada como processo contínuo; e um banco PostgreSQL gerenciado pela plataforma Supabase. A arquitetura e as decisões de projeto estão detalhadas no Documento de Arquitetura e Design; aqui trata-se apenas da operação.'));
filhos.push(...imagem('arq-implantacao.png', 430, 296, 'Figura 1 — Distribuição dos componentes em produção.'));

// 2. Requisitos
filhos.push(h1('2. Requisitos de ambiente'));

filhos.push(h2('2.1. Software'));
filhos.push(tabela(['Item', 'Versão / observação'], [
  ['Node.js', '18 LTS ou superior (validado em Node 24). Exigido para desenvolvimento e para o contêiner da API.'],
  ['npm', '9 ou superior, distribuído com o Node.js.'],
  ['Git', 'Qualquer versão recente, para clonar e publicar.'],
  ['PostgreSQL', 'Fornecido pela Supabase; não é instalado localmente. Requer a extensão pgcrypto, habilitada pelo próprio script de esquema.'],
  ['Navegador', 'Chrome, Edge, Firefox ou Safari atualizados, para uso e verificação.'],
  ['Sistema operacional', 'Indiferente. O desenvolvimento é feito em Windows; a API executa em contêiner Linux no provedor.'],
], [2200, LARGURA_UTIL - 2200]));

filhos.push(h2('2.2. Serviços externos'));
filhos.push(tabela(['Serviço', 'Função', 'Plano em uso'], [
  ['Supabase', 'Banco PostgreSQL gerenciado, com backups do provedor.', 'Uma instância, compartilhada por desenvolvimento e produção.'],
  ['Render', 'Hospedagem da API em contêiner Node.js.', 'Serviço web único, porta atribuída pelo provedor.'],
  ['Vercel', 'Hospedagem estática da interface, com CDN.', 'Projeto ligado ao repositório.'],
  ['GitHub', 'Repositório e gatilho de publicação.', 'Integração na branch main dispara Vercel e Render.'],
], [1500, 4000, LARGURA_UTIL - 1500 - 4000]));

filhos.push(h2('2.3. Hardware e rede'));
filhos.push(bullet('Estação de desenvolvimento: qualquer equipamento capaz de executar Node.js e um navegador; 8 GB de memória são confortáveis. Não há requisito de servidor local — toda a infraestrutura de produção é gerenciada pelos provedores.'));
filhos.push(bullet('Saída HTTPS na porta 443 para os domínios dos três provedores. Nenhuma porta de entrada precisa ser aberta na rede da instituição.'));
filhos.push(bullet('Portas locais em desenvolvimento: 3000 (API) e 5173 (interface).'));
filhos.push(bullet('As origens autorizadas a consumir a API são declaradas na variável CORS_ORIGIN; nenhum outro domínio é aceito.'));

filhos.push(quebra());

// 3. Instalação
filhos.push(h1('3. Instalação e configuração'));

filhos.push(h2('3.1. Ambiente de desenvolvimento'));
filhos.push(p('Clone o repositório e instale as dependências da raiz, do servidor e da interface:'));
filhos.push(codigo([
  'git clone <url-do-repositorio> sos-core-system',
  'cd sos-core-system',
  'npm run install:all',
]));
filhos.push(espaco());
filhos.push(p('Crie os arquivos de ambiente a partir dos modelos versionados e preencha os valores:'));
filhos.push(codigo([
  '# na raiz do projeto (usado pela API)',
  'copy .env.example .env',
  '',
  '# na pasta client (usado pela interface)',
  'copy client\\.env.example client\\.env',
]));
filhos.push(espaco());
filhos.push(p('Suba os dois processos, em terminais separados:'));
filhos.push(codigo([
  'npm run dev:server    # API em http://localhost:3000',
  'npm run dev:client    # interface em http://localhost:5173',
]));
filhos.push(espaco());
filhos.push(p('Em desenvolvimento, o empacotador encaminha as chamadas iniciadas por /api ao servidor local, o que dispensa configuração adicional de CORS.'));

filhos.push(h2('3.2. Variáveis de ambiente da API'));
filhos.push(tabela(['Variável', 'Obrigatória', 'Descrição'], [
  ['JWT_SECRET', 'Sim', 'Segredo de assinatura dos tokens. Sem ele o servidor não inicia. Use valor aleatório de 32 caracteres ou mais em produção.'],
  ['JWT_EXPIRES_IN', 'Não', 'Validade do token. Padrão: 7d.'],
  ['SUPABASE_URL', 'Em produção', 'Endereço da instância do banco.'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'Em produção', 'Credencial de serviço do banco. Restrita ao servidor.'],
  ['CORS_ORIGIN', 'Recomendada', 'Origens autorizadas, separadas por vírgula. Sem valor, todas as origens são aceitas — apenas para desenvolvimento.'],
  ['TRUST_PROXY', 'Em produção', 'Habilita a leitura do IP real atrás do proxy do provedor; sem ela os limitadores de requisição enxergam um único IP.'],
  ['PORT', 'Não', 'Porta de escuta. Em produção é atribuída pelo provedor.'],
  ['NODE_ENV', 'Recomendada', 'Defina production para suprimir detalhes técnicos nas mensagens de erro.'],
], [3000, 1400, LARGURA_UTIL - 3000 - 1400]));

filhos.push(h2('3.3. Variáveis de ambiente da interface'));
filhos.push(tabela(['Variável', 'Descrição'], [
  ['VITE_API_URL', 'Endereço base da API, incluindo o sufixo /api. Padrão em desenvolvimento: http://localhost:3000/api. Em produção, o endereço público do serviço no Render.'],
], [2600, LARGURA_UTIL - 2600]));
filhos.push(p('Variáveis iniciadas por VITE_ são incorporadas ao pacote gerado e ficam visíveis no navegador. Nunca coloque segredos nelas — em particular, a credencial de serviço do banco.', { bold: true }));

filhos.push(quebra());

filhos.push(h2('3.4. Banco de dados'));
filhos.push(p('Os scripts ficam em server/src/database e são aplicados manualmente pelo editor SQL da Supabase, nesta ordem:'));
filhos.push(tabela(['Ordem', 'Arquivo', 'Quando aplicar'], [
  ['1', 'schema.sql', 'Ambiente novo. Cria tabelas, índices, gatilhos e a carga inicial de unidades e das 38 turmas do cronograma do SCFV.'],
  ['2', 'seed.sql', 'Ambiente novo. Cria o usuário administrador inicial e o vincula a todas as unidades. Troque a senha padrão logo após o primeiro acesso.'],
  ['3', 'migrations/002 … 011', 'Banco já existente. Aplicar em ordem numérica, uma vez cada; os scripts são idempotentes e podem ser reexecutados sem efeito colateral.'],
], [800, 2600, LARGURA_UTIL - 800 - 2600]));
filhos.push(espaco());
filhos.push(p('Não há controle automático de versão do esquema: registre em algum lugar as migrações já aplicadas. Toda migração nova deve seguir o mesmo padrão idempotente (if not exists, on conflict do nothing).'));

filhos.push(h2('3.5. Publicação da API (Render)'));
filhos.push(tabela(['Configuração', 'Valor'], [
  ['Root Directory', 'server'],
  ['Build Command', 'npm install'],
  ['Start Command', 'npm start'],
  ['Health Check Path', '/health'],
  ['Variáveis de ambiente', 'Todas as da seção 3.2, definidas no painel do serviço.'],
], [2600, LARGURA_UTIL - 2600]));
filhos.push(espaco());
filhos.push(p('O diretório-raiz apontado para server é obrigatório: sem ele, a instalação de dependências e a execução ocorrem na raiz do repositório e o processo não encontra o ponto de entrada. Essa falha já ocorreu na implantação inicial.'));

filhos.push(h2('3.6. Publicação da interface (Vercel)'));
filhos.push(tabela(['Configuração', 'Valor'], [
  ['Root Directory', 'client'],
  ['Framework Preset', 'Vite'],
  ['Build Command', 'npm run build'],
  ['Output Directory', 'dist'],
  ['Variáveis de ambiente', 'VITE_API_URL apontando para o endereço público da API.'],
], [2600, LARGURA_UTIL - 2600]));
filhos.push(espaco());
filhos.push(p('O arquivo vercel.json, na raiz do repositório, reescreve todas as rotas para a raiz — necessário para que o roteamento no cliente funcione em recarregamentos de página. Se o projeto na Vercel apontar o diretório-raiz para client, replique esse arquivo dentro de client, senão a reescrita não é aplicada.'));
filhos.push(p('Depois de publicar, acrescente o domínio da interface à variável CORS_ORIGIN da API e reinicie o serviço.'));

filhos.push(quebra());

// 4. Estrutura do código
filhos.push(h1('4. Estrutura do código'));
filhos.push(p('O repositório reúne as duas aplicações, cada uma com o seu próprio package.json e ciclo de publicação.'));
filhos.push(codigo([
  'sos-core-system/',
  '├── client/                  interface React + Vite',
  '│   └── src/',
  '│       ├── components/      componentes reutilizáveis e primitivos de UI',
  '│       ├── contexts/        AuthContext (sessão, perfil, unidade ativa)',
  '│       ├── hooks/           ganchos compartilhados',
  '│       ├── lib/             exportações PDF/XLSX, identidade visual, análises',
  '│       ├── pages/           telas do sistema',
  '│       └── services/        fachadas de acesso à API (Axios)',
  '├── server/                  API Node.js + Express',
  '│   ├── index.js             ponto de entrada',
  '│   ├── src/',
  '│   │   ├── app.js           cadeia de middlewares e roteador raiz',
  '│   │   ├── config/          cliente Supabase e validação de ambiente',
  '│   │   ├── controllers/     regras de negócio',
  '│   │   ├── database/        schema.sql, seed.sql e migrations/',
  '│   │   ├── middleware/      auth, authorize, rateLimiter, errorHandler',
  '│   │   ├── models/          acesso a dados',
  '│   │   ├── routes/          contratos da API',
  '│   │   └── utils/           ApiResponse, jwtUtils, programContext, roles',
  '│   └── tests/               testes automatizados (Jest + Supertest)',
  '├── docs/                    documentação do projeto',
  '└── vercel.json              reescrita de rotas da interface',
]));
filhos.push(espaco());
filhos.push(p('A dependência entre as camadas do servidor flui em uma única direção — rotas, controladores, modelos — e nenhuma consulta ao banco é escrita fora dos modelos. Ao acrescentar um domínio novo, crie o arquivo correspondente em cada uma das três pastas e registre o roteador em src/routes/index.js.'));

filhos.push(h2('4.1. Arquivos de referência'));
filhos.push(tabela(['Arquivo', 'Por que importa'], [
  ['server/src/app.js', 'Ordem da cadeia de middlewares. Qualquer proteção nova entra aqui.'],
  ['server/src/utils/roles.js', 'Definição única dos perfis de acesso, usada por rotas e controladores.'],
  ['server/src/utils/programContext.js', 'Resolução da unidade efetiva da requisição — ponto central do isolamento por unidade.'],
  ['server/src/config/validateEnv.js', 'Variáveis obrigatórias verificadas na inicialização.'],
  ['client/src/services/api.js', 'Instância Axios, injeção do token e tratamento global de 401.'],
  ['client/src/contexts/AuthContext.jsx', 'Estado de sessão, perfil e unidade ativa no navegador.'],
], [3400, LARGURA_UTIL - 3400]));

filhos.push(quebra());

// 5. Scripts
filhos.push(h1('5. Scripts de build e implantação'));
filhos.push(tabela(['Comando', 'Onde', 'Efeito'], [
  ['npm run install:all', 'raiz', 'Instala as dependências da raiz, do servidor e da interface.'],
  ['npm run dev:server', 'raiz', 'Sobe a API com recarga automática (nodemon).'],
  ['npm run dev:client', 'raiz', 'Sobe a interface em modo de desenvolvimento.'],
  ['npm run build:client', 'raiz', 'Gera os arquivos estáticos da interface em client/dist.'],
  ['npm test', 'raiz ou server', 'Executa a suíte de testes com relatório de cobertura.'],
  ['npm run seed', 'raiz ou server', 'Carga inicial programática. Apaga usuários, unidades e vínculos antes de recriar — não usar em produção.'],
  ['npm start', 'server', 'Executa a API em modo de produção. Comando usado pelo provedor.'],
], [2600, 1400, LARGURA_UTIL - 2600 - 1400]));

filhos.push(h2('5.1. Fluxo de publicação'));
filhos.push(bullet('Trabalhe em branch própria e abra pull request para main.'));
filhos.push(bullet('Antes de integrar, execute npm test e npm run build:client localmente.'));
filhos.push(bullet('Se a alteração exigir mudança de esquema, aplique a migração no banco antes de integrar o código — a mesma instância atende aos dois ambientes.'));
filhos.push(bullet('A integração em main dispara automaticamente a publicação na Vercel e no Render, de forma independente.'));
filhos.push(bullet('Depois da publicação, confirme /health na API e faça um login de verificação na interface.'));

filhos.push(quebra());

// 6. Manutenção
filhos.push(h1('6. Manutenção e suporte'));

filhos.push(h2('6.1. Monitoramento e logs'));
filhos.push(tabela(['Recurso', 'Onde consultar', 'O que mostra'], [
  ['GET /health', 'Navegador ou monitor externo', 'Confirma que o processo está no ar; responde status, mensagem e horário.'],
  ['Log da API', 'Painel do Render', 'Requisições registradas pelo morgan, erros capturados pelo errorHandler e eventos de auditoria (LOGIN, SWITCH_PROGRAM, gravação de presença).'],
  ['Log de build', 'Painel do Render e da Vercel', 'Falhas de instalação de dependências ou de empacotamento.'],
  ['Banco', 'Painel da Supabase', 'Consultas, uso de espaço e backups.'],
], [1900, 2500, LARGURA_UTIL - 1900 - 2500]));
filhos.push(espaco());
filhos.push(p('A trilha de auditoria tenta gravar na tabela audit_logs e, na falta dela, registra apenas no log do servidor, com aviso. Criar essa tabela é a melhoria recomendada para tornar a trilha consultável.'));

filhos.push(h2('6.2. Rotina de atualização'));
filhos.push(bullet('Aplique a migração de banco, quando houver, antes de publicar o código que depende dela.'));
filhos.push(bullet('Publique pela integração em main e acompanhe os logs até o serviço responder em /health.'));
filhos.push(bullet('Verifique o login, o lançamento de uma lista de presença e uma exportação — é o caminho mínimo que exercita as três camadas.'));
filhos.push(bullet('Para reverter, republique o commit anterior no provedor. Alterações de banco não são revertidas automaticamente: escreva o script de reversão quando a migração for destrutiva.'));

filhos.push(h2('6.3. Falhas mais comuns'));
filhos.push(tabela(['Sintoma', 'Causa provável', 'Correção'], [
  ['API não inicia; log indica módulo não encontrado.', 'Diretório-raiz do serviço não aponta para server.', 'Ajuste Root Directory para server no painel do Render.'],
  ['Servidor encerra na inicialização com erro de configuração.', 'Variável obrigatória ausente.', 'Confira JWT_SECRET e, em produção, as credenciais da Supabase.'],
  ['Interface abre, mas nenhuma requisição funciona.', 'CORS_ORIGIN sem o domínio da interface, ou VITE_API_URL incorreta.', 'Acerte as duas variáveis e reinicie o serviço.'],
  ['Dados novos não aparecem em produção.', 'Migração não aplicada no banco.', 'Aplique o script pendente no editor SQL da Supabase.'],
  ['Usuários deslogados com frequência.', 'Token expirado ou JWT_SECRET alterado.', 'Ajuste JWT_EXPIRES_IN; lembre que trocar o segredo invalida todas as sessões.'],
  ['Recarregar uma rota interna devolve 404.', 'Reescrita de rotas ausente na Vercel.', 'Garanta o vercel.json no diretório-raiz configurado no projeto.'],
], [2500, 2400, LARGURA_UTIL - 2500 - 2400]));

filhos.push(quebra());

// 7. Segurança
filhos.push(h1('7. Considerações de segurança'));

filhos.push(h2('7.1. Proteções implementadas'));
filhos.push(tabela(['Proteção', 'Como funciona'], [
  ['Senhas', 'Armazenadas apenas como hash bcrypt; nunca trafegam nem são gravadas em texto puro.'],
  ['Autenticação', 'Token assinado (JWT) com validade padrão de sete dias, verificado a cada requisição.'],
  ['Autorização', 'Perfil verificado no servidor em toda rota; a ocultação de itens na interface é apenas conveniência.'],
  ['Isolamento por unidade', 'Unidade ativa e unidades permitidas viajam no token; valores enviados pelo cliente são sempre confrontados com essa relação.'],
  ['Limitação de requisições', 'Dez tentativas malsucedidas de login por origem a cada quinze minutos; quinhentas requisições no mesmo intervalo para a API.'],
  ['Cabeçalhos e origens', 'helmet aplica cabeçalhos de segurança; cors aceita apenas as origens declaradas.'],
  ['Mensagens de erro', 'Fora do ambiente de desenvolvimento, detalhes técnicos não são devolvidos ao cliente.'],
  ['Dados sensíveis em tela', 'NIS e documentos são exibidos mascarados, com revelação sob ação explícita.'],
  ['Exclusão de assistidos', 'Restrita ao perfil Administrador, por apagar o histórico de frequência em cascata.'],
], [2400, LARGURA_UTIL - 2400]));

filhos.push(h2('7.2. Cuidados operacionais'));
filhos.push(bullet('A credencial de serviço da Supabase dá acesso irrestrito ao banco. Mantenha-a apenas nas variáveis do servidor, nunca no repositório nem em variáveis VITE_.'));
filhos.push(bullet('Não há segunda barreira no banco: a autorização é garantida somente pelo código da aplicação. Alterações em rotas ou controladores devem ser acompanhadas dos testes de segregação por unidade.'));
filhos.push(bullet('Defina TRUST_PROXY em produção; sem ela, os limitadores enxergam um único IP e perdem eficácia.'));
filhos.push(bullet('Rotacione JWT_SECRET em caso de suspeita de vazamento, ciente de que isso encerra todas as sessões ativas.'));
filhos.push(bullet('A desativação de um funcionário passa a valer no próximo login: o token já emitido continua válido até expirar. Em caso de desligamento imediato, troque o segredo.'));
filhos.push(bullet('Arquivos .env nunca são versionados; apenas os modelos .env.example.'));
filhos.push(bullet('O sistema trata dados pessoais sensíveis de crianças, adolescentes e idosos. Fichas e planilhas exportadas devem ser tratadas como documento sigiloso, e o acesso de cada funcionário limitado à sua unidade.'));
filhos.push(bullet('Separar as instâncias de banco de desenvolvimento e produção é a principal melhoria pendente: hoje qualquer teste local escreve na base real.'));

const doc = new Document({
  creator: 'Serviço de Obras Sociais',
  title: 'SIGU — Manual Técnico e Guia de Implantação',
  description: 'Instalação, publicação, manutenção e segurança do SIGU',
  numbering: {
    config: [{
      reference: 'marcadores',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 460, hanging: 240 } } },
      }],
    }],
  },
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: MARGEM, right: MARGEM, bottom: MARGEM, left: MARGEM } } },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT, spacing: { after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 6 } },
          children: [new TextRun({ text: 'SIGU — Manual Técnico e Guia de Implantação', size: 16, color: CINZA })],
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
  const destino = path.join(__dirname, 'Manual-Tecnico-SIGU.docx');
  fs.writeFileSync(destino, buffer);
  console.log('gerado:', destino, '|', (buffer.length / 1024).toFixed(0), 'KB');
});
