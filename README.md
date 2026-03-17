# SOS Core System

Sistema de gerenciamento desenvolvido com Node.js, Express, React e PostgreSQL seguindo o padrão MVC.

## Tecnologias

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT para autenticação
- Bcrypt para hash de senhas

### Frontend
- React 18
- React Router DOM
- Axios
- Vite

## Estrutura do Projeto

```
sos-core-system/
├── client/                 # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── services/      # Serviços de API
│   │   ├── contexts/      # Context API
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Funções auxiliares
│   │   └── styles/        # Estilos CSS
│   └── package.json
├── src/                   # Backend
│   ├── config/           # Configurações (database, etc)
│   ├── controllers/      # Controllers (lógica de requisição/resposta)
│   ├── models/           # Models (interação com banco de dados)
│   ├── routes/           # Rotas da API
│   ├── middleware/       # Middlewares personalizados
│   ├── services/         # Lógica de negócio
│   ├── utils/            # Funções auxiliares
│   └── database/         # Migrations e seeders
├── tests/                # Testes
├── .env                  # Variáveis de ambiente
├── .env.example          # Exemplo de variáveis de ambiente
├── index.js              # Arquivo principal do servidor
└── package.json
```

## Instalação

### Pré-requisitos
- Node.js (v18 ou superior)
- PostgreSQL (v14 ou superior)
- npm ou yarn

### Backend

1. Instale as dependências:
```bash
cd server
npm install
```

2. Configure o banco de dados PostgreSQL:
```sql
CREATE DATABASE sos_core_db;
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Crie a tabela de usuários:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

5. Inicie o servidor:
```bash
npm run dev    # Desenvolvimento com nodemon
# ou
npm start      # Produção
```

O servidor estará rodando em `http://localhost:3000`

### Frontend

1. Instale as dependências:
```bash
cd client
npm install
```

2. Configure as variáveis de ambiente:
```bash
# O arquivo .env já está criado com as configurações padrão
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:5173`

## API Endpoints

### Health Check
- `GET /health` - Verifica status do servidor

### Usuários
- `GET /api/users` - Lista todos os usuários
- `GET /api/users/:id` - Busca usuário por ID
- `POST /api/users` - Cria novo usuário
- `PUT /api/users/:id` - Atualiza usuário
- `DELETE /api/users/:id` - Deleta usuário

### Exemplo de Requisição

**Criar Usuário:**
```bash
POST /api/users
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "data": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "created_at": "2026-03-09T22:35:00.000Z"
  }
}
```

## Testes

```bash
# Backend
cd server
npm test

# Frontend
cd client
npm test
```

## Segurança

- Senhas são criptografadas com bcrypt
- Autenticação via JWT
- Headers de segurança com Helmet
- CORS configurado
- Validação de dados nas requisições

## Variáveis de Ambiente

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=sos_core_db
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## Contribuindo

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença ISC.

## Autor

Fellype

---

Se este projeto te ajudou, considere dar uma estrela!

## Esse projeto vai ser foda
