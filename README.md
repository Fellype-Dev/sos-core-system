# SOS Core System

Sistema web com frontend React e backend Node.js/Express integrado ao Supabase.

## Stack

### Frontend
- React
- Vite
- Axios
- React Router

### Backend
- Node.js
- Express.js
- Supabase (PostgreSQL)
- JWT para autenticacao
- Bcrypt para hash de senhas

## Estrutura do Projeto

```
sos-core-system/
|- client/                 # Frontend React
|- src/                    # Backend
|- tests/                  # Testes
|- index.js                # Entrada da API
|- package.json            # Scripts raiz
```

## Como Rodar

### 1. Instalar dependencias

Na raiz do projeto:

```
npm install
```

No frontend:

```
cd client
npm install
```

### 2. Configurar ambiente

Arquivo .env na raiz (backend):

```
NODE_ENV=development
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

Arquivo client/.env (frontend):

```
VITE_API_URL=http://localhost:3000/api
```

### 3. Rodar backend e frontend

Na raiz:

```
npm run start:server
```

Em outro terminal:

```
npm run dev:client
```

### 4. Popular dados iniciais

```
npm run seed
```
