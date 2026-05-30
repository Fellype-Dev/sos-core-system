const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Registro duplicado',
      error: err.detail
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Violação de chave estrangeira',
      error: err.detail
    });
  }

  if (err.code && err.code.startsWith('42')) {
    return res.status(500).json({
      success: false,
      message: 'Erro na query do banco de dados',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
