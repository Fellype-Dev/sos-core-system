const rateLimit = require('express-rate-limit');

// Limite específico para login: protege contra força bruta de senha.
// Só conta tentativas malsucedidas (skipSuccessfulRequests), então usuários
// legítimos não são penalizados por logins válidos repetidos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
  },
});

// Limite geral para a API, como defesa em profundidade contra abuso.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições em pouco tempo. Aguarde e tente novamente.',
  },
});

module.exports = { loginLimiter, apiLimiter };
