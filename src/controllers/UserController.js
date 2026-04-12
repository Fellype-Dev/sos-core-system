const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');

class UserController {
  async index(req, res, next) {
    try {
      const users = await User.findAll({ programId: req.query.program_id });
      return ApiResponse.success(res, users, 'Usuarios listados com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async show(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return ApiResponse.notFound(res, 'Usuario nao encontrado');
      }

      return ApiResponse.success(res, user, 'Usuario encontrado');
    } catch (error) {
      return next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { full_name, email, password, role, program_ids = [] } = req.body;

      if (!full_name || !email || !password || !role) {
        return ApiResponse.error(res, 'Campos obrigatorios: full_name, email, password, role', 400);
      }

      const createdUser = await User.create({
        full_name,
        email,
        password,
        role,
        program_ids,
      });

      return ApiResponse.success(res, createdUser, 'Usuario criado com sucesso', 201);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const current = await User.findById(id);
      if (!current) {
        return ApiResponse.notFound(res, 'Usuario nao encontrado');
      }

      const updatedUser = await User.update(id, req.body);
      return ApiResponse.success(res, updatedUser, 'Usuario atualizado com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const current = await User.findById(id);
      if (!current) {
        return ApiResponse.notFound(res, 'Usuario nao encontrado');
      }

      await User.delete(id);
      return ApiResponse.success(res, null, 'Usuario removido com sucesso');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new UserController();
