const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Token mal formatado'
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({
        success: false,
        message: 'Token mal formatado'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }

      req.userId = decoded.id;
      req.userEmail = decoded.email;
      req.userRole = decoded.role;

      const rawSel = decoded.selectedProgramId;
      req.selectedProgramId =
        rawSel === undefined || rawSel === null || rawSel === ''
          ? null
          : String(rawSel).trim() || null;

      const rawAllowed = decoded.allowedProgramIds;
      req.allowedProgramIds = Array.isArray(rawAllowed) ? rawAllowed.map((id) => String(id)) : [];

      return next();
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Erro na autenticação',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
