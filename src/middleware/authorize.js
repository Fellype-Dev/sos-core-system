const ApiResponse = require('../utils/ApiResponse');

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.userRole) {
    return ApiResponse.unauthorized(res, 'Usuario nao autenticado');
  }

  if (!allowedRoles.includes(req.userRole)) {
    return ApiResponse.error(res, 'Acesso negado para esta operacao', 403);
  }

  return next();
};

module.exports = authorizeRoles;
