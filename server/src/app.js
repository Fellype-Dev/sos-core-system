const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Necessário quando atrás de proxy reverso (nginx, Render, Railway) para que o
// rate limiter identifique o IP real do cliente. Opt-in via env por segurança.
if (process.env.TRUST_PROXY) {
  const value = process.env.TRUST_PROXY;
  app.set('trust proxy', value === 'true' ? 1 : Number.isNaN(Number(value)) ? value : Number(value));
}

// Origens permitidas para CORS (lista separada por vírgula em CORS_ORIGIN).
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    'CORS_ORIGIN nao configurado: liberando todas as origens (apenas para desenvolvimento). Defina CORS_ORIGIN em producao.'
  );
}

const corsOptions = {
  origin(origin, callback) {
    // Permite requisicoes sem Origin (curl, apps mobile, health checks) e as origens da allowlist.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem nao permitida pelo CORS'));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiLimiter, routes);

app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

app.use(errorHandler);

module.exports = app;
