const errorHandler = (err, req, res, next) => {
  // Log completo fica apenas no servidor; nunca é enviado ao cliente em produção.
  console.error('Error:', err);

  const isDev = process.env.NODE_ENV === 'development';

  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Registro duplicado',
      error: isDev ? err.detail : undefined,
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Violação de chave estrangeira',
      error: isDev ? err.detail : undefined,
    });
  }

  if (err.code && err.code.startsWith('42')) {
    return res.status(500).json({
      success: false,
      message: 'Erro na query do banco de dados',
      error: isDev ? err.message : 'Erro interno',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    message,
    error: isDev ? err.stack : undefined,
  });
};

module.exports = errorHandler;
