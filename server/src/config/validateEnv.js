// Valida as variáveis de ambiente na inicialização e falha cedo (fail fast)
// quando algo crítico está ausente, evitando que o servidor suba num estado
// que só quebraria no primeiro login/consulta.

function validateEnv() {
  const errors = [];
  const warnings = [];
  const isProd = process.env.NODE_ENV === 'production';

  // JWT_SECRET é crítico em qualquer ambiente: sem ele a autenticação quebra.
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET não definido — obrigatório para assinar/validar tokens de autenticação.');
  } else if (process.env.JWT_SECRET.length < 16 || /your_jwt_secret/i.test(process.env.JWT_SECRET)) {
    warnings.push('JWT_SECRET fraco ou padrão — use um valor aleatório longo (>= 32 caracteres) em produção.');
  }

  // Supabase: obrigatório em produção; em desenvolvimento apenas avisa.
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!hasSupabase) {
    const msg = 'SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY não definidos — o banco ficará indisponível.';
    if (isProd) errors.push(msg);
    else warnings.push(msg);
  }

  // CORS aberto em produção é um risco de segurança.
  if (isProd && !process.env.CORS_ORIGIN) {
    warnings.push('CORS_ORIGIN não definido em produção — todas as origens serão liberadas.');
  }

  warnings.forEach((w) => console.warn(`[env] Aviso: ${w}`));

  if (errors.length > 0) {
    console.error('[env] Configuração inválida:');
    errors.forEach((e) => console.error(`  - ${e}`));
    throw new Error('Variáveis de ambiente obrigatórias ausentes. Verifique o arquivo .env (use .env.example como base).');
  }

  console.log('[env] Variáveis de ambiente validadas com sucesso.');
}

module.exports = validateEnv;
