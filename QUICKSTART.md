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

### 3. Configurar o Banco de Dados

**Criar banco de dados:**
```bash
psql -U postgres
CREATE DATABASE sos_core_db;
\q
```

**Executar script de criação das tabelas:**
```bash
psql -U postgres -d sos_core_db -f src/database/schema.sql
```

### 4. Configurar variáveis de ambiente

O arquivo `.env` já foi criado. Edite-o com suas configurações:
```bash
# Edite o arquivo .env na raiz do projeto
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

### Erro de conexão com o banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`
- Teste a conexão: `psql -U postgres -d sos_core_db`

### Porta já em uso
- Backend: Altere a variável `PORT` no arquivo `.env`
- Frontend: Altere a porta no `client/vite.config.js`

### Módulos não encontrados
- Execute `npm install` novamente
- Limpe o cache: `npm cache clean --force`

## Próximos Passos

1. Leia a documentação completa no [README.md](README.md)
2. Explore os endpoints da API em http://localhost:3000/api
3. Teste a criação de usuários
4. Implemente novas funcionalidades

## Precisa de ajuda?

Abra uma issue no repositório ou entre em contato com a equipe.
