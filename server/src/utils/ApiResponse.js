class ApiResponse {
  static success(res, data, message = 'Sucesso', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static error(res, message = 'Erro', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors
    });
  }

  static notFound(res, message = 'Recurso não encontrado') {
    return res.status(404).json({
      success: false,
      message
    });
  }

  static unauthorized(res, message = 'Não autorizado') {
    return res.status(401).json({
      success: false,
      message
    });
  }
}

module.exports = ApiResponse;
