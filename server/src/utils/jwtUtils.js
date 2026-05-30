const jwt = require('jsonwebtoken');

class JwtUtils {
  static generateToken(payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }

  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = JwtUtils;
