# Guia de Início Rápido

## Instalação Rápida

### 1. Clonar o repositório
```bash
git clone <repo-url>
cd sos-core-system
```

### 2. Instalar todas as dependências
```bash
npm run install:all
```

Ou instalar manualmente:
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Configurar o banco no Supabase

1. Crie um projeto em https://supabase.com
2. Em **Project Settings > API**, copie:
	- Project URL
	- anon public key
	- service_role key
3. No **SQL Editor** do Supabase, execute todo o arquivo:
```sql
src/database/schema.sql
```
4. Execute tambem o seed inicial:
```sql
src/database/seed.sql
```

### 4. Configurar variáveis de ambiente

Na raiz (`.env`):
```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
JWT_SECRET=um_segredo_forte
JWT_EXPIRES_IN=7d
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

No frontend (`client/.env`):
```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

### 5. Iniciar os servidores

**Opção 1: Iniciar separadamente**

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

**Opção 2: Usar os scripts da raiz**
```bash
# Terminal 1
npm run dev:server

# Terminal 2
npm run dev:client
```

### 6. Acessar a aplicação

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health
- Documentação da API: http://localhost:3000/api

## Checklist de Instalação

- [ ] Node.js instalado (v18+)
- [ ] PostgreSQL instalado e rodando
- [ ] Banco de dados `sos_core_db` criado
- [ ] Tabelas criadas com o script schema.sql
- [ ] Arquivo `.env` configurado
- [ ] Dependências do backend instaladas
- [ ] Dependências do frontend instaladas
- [ ] Servidor backend rodando na porta 3000
- [ ] Servidor frontend rodando na porta 5173

## Problemas Comuns

### Erro de conexão com o Supabase
- Verifique `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- Confira se o schema SQL foi executado no projeto correto
- Valide no painel do Supabase se as tabelas `programs`, `users` e `user_programs` existem

### Porta já em uso
- Backend: Altere a variável `PORT` no arquivo `.env`
- Frontend: Altere a porta no `client/vite.config.js`

### Módulos não encontrados
- Execute `npm install` novamente
- Limpe o cache: `npm cache clean --force`

## Próximos Passos

1. Leia a documentação completa no [README.md](README.md)
2. Faça login com um usuário admin criado no Supabase
3. Cadastre usuários por perfil (`admin`, `sede`, `coordenador`)
4. Avance para CRUD completo de alunos e persistência de chamada

## Precisa de ajuda?

Abra uma issue no repositório ou entre em contato com a equipe.
