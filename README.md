# SIGU — Sistema Integrado de Gerenciamento de Usuários

Sistema web do **SOS — Serviço de Obras Sociais** para a gestão do Serviço de Convivência e Fortalecimento de Vínculos (SCFV) nas unidades Semear, Viver e Sonhar.

Reúne o cadastro dos assistidos, a organização das turmas, o lançamento diário da lista de presença e a emissão de fichas e relatórios — com os dados de cada unidade isolados por perfil de acesso.

## Stack

**Frontend:** React 18 · Vite · React Router · Tailwind CSS · Axios · Recharts · jsPDF · SheetJS
**Backend:** Node.js · Express 5 · Supabase (PostgreSQL) · JWT · bcrypt · helmet · express-rate-limit

## Estrutura do projeto

```
sos-core-system/
├── client/              # Frontend React (Vite)
│   └── src/
│       ├── components/  # Componentes reutilizáveis
│       ├── contexts/    # Sessão, perfil e unidade ativa
│       ├── lib/         # Exportações PDF/XLSX e análises
│       ├── pages/       # Telas do sistema
│       └── services/    # Acesso à API (Axios)
├── server/              # Backend Node.js + Express
│   ├── index.js         # Entrada da API
│   ├── src/
│   │   ├── controllers/ # Regras de negócio
│   │   ├── database/    # schema.sql, seed.sql e migrations/
│   │   ├── middleware/  # Autenticação, permissões e limites
│   │   ├── models/      # Acesso a dados
│   │   └── routes/      # Rotas da API
│   └── tests/           # Testes (Jest + Supertest)
└── docs/                # Documentação do projeto
```

## Ambiente de desenvolvimento

### 1. Instalar dependências

Na raiz do projeto (instala raiz, `server` e `client` de uma vez):

```bash
npm run install:all
```

### 2. Configurar as variáveis de ambiente

Copie os modelos versionados e preencha os valores:

```bash
cp .env.example .env
cp client/.env.example client/.env
```

`.env` (backend):

```
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
JWT_SECRET=troque_por_um_valor_aleatorio_longo
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

`client/.env` (frontend):

```
VITE_API_URL=http://localhost:3000/api
```

> `JWT_SECRET` é obrigatório: sem ele o servidor não inicia. A `SERVICE_ROLE_KEY` dá acesso total ao banco — nunca a coloque em variáveis `VITE_`, que vão para o navegador.

### 3. Preparar o banco

No editor SQL do Supabase, execute nesta ordem:

1. `server/src/database/schema.sql` — cria tabelas, índices e cadastra as unidades e as 38 turmas do SCFV
2. `server/src/database/seed.sql` — cria o usuário administrador inicial
3. `server/src/database/migrations/` — apenas em bancos já existentes, na ordem numérica

## Rodando localmente

Em dois terminais, a partir da raiz:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

A API sobe em `http://localhost:3000` e a interface em `http://localhost:5173`.

### Outros comandos

| Comando | O que faz |
| --- | --- |
| `npm test` | Roda os testes com relatório de cobertura |
| `npm run build:client` | Gera os arquivos estáticos em `client/dist` |
| `npm run seed` | Carga inicial programática — **apaga** usuários, unidades e vínculos antes de recriar |

## Deploy

A interface é publicada na Vercel e a API no Render, ambas a partir da branch `main`. O passo a passo está em [`docs/Manual-Tecnico-SIGU.docx`](docs/).

## Documentação

A pasta [`docs/`](docs/) reúne a especificação de requisitos, o documento de arquitetura, o manual do usuário, o manual técnico e o plano de implantação.

## Créditos

Projeto desenvolvido para a disciplina de Extensão do Centro Universitário Campo Real por **Fellype Kekis**, **Pablo Gabriel Lara Chodoma** e **Luis Henryque Novakoski**.
