const bcrypt = require('bcrypt');
const User = require('../models/User');
const { supabase } = require('../config/database');
const JwtUtils = require('../utils/jwtUtils');
const ApiResponse = require('../utils/ApiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const { full_name, email, password, role, program_ids = [] } = req.body;

      if (!full_name || !email || !password || !role) {
        return ApiResponse.error(res, 'Campos obrigatorios: full_name, email, password, role', 400);
      }

      const existing = await User.findByEmail(email);
      if (existing) {
        return ApiResponse.error(res, 'Ja existe usuario com este email', 400);
      }

      const createdUser = await User.create({
        full_name,
        email,
        password,
        role,
        program_ids,
      });

      return ApiResponse.success(res, createdUser, 'Usuario cadastrado com sucesso', 201);
    } catch (error) {
      return next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password, selected_program_id } = req.body;

      if (!email || !password) {
        return ApiResponse.error(res, 'Informe email e senha', 400);
      }

      const user = await User.findByEmail(email, { includePassword: true });
      if (!user) {
        return ApiResponse.error(res, 'Credenciais invalidas', 401);
      }

      if (!user.is_active) {
        return ApiResponse.error(res, 'Usuario inativo', 403);
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return ApiResponse.error(res, 'Credenciais invalidas', 401);
      }

      const assignedPrograms = (user.user_programs || []).map((relation) => relation.programs).filter(Boolean);
      let allowedPrograms = assignedPrograms;

      if (user.role === 'admin') {
        const { data: allPrograms, error: programsError } = await supabase
          .from('programs')
          .select('id, code, name, age_range, location')
          .order('name', { ascending: true });

        if (programsError) {
          throw programsError;
        }

        allowedPrograms = allPrograms || [];
      }

      const allowedProgramIds = allowedPrograms.map((program) => program.id);

      let activeProgramId = null;
      if (user.role === 'coordenador') {
        if (!selected_program_id) {
          return ApiResponse.error(
            res,
            'Selecione uma unidade para entrar como coordenador',
            400
          );
        }

        if (!allowedProgramIds.includes(selected_program_id)) {
          return ApiResponse.error(res, 'Unidade nao autorizada para este usuario', 403);
        }

        activeProgramId = selected_program_id;
      } else if (selected_program_id) {
        if (!allowedProgramIds.includes(selected_program_id)) {
          return ApiResponse.error(res, 'Unidade nao autorizada para este usuario', 403);
        }
        activeProgramId = selected_program_id;
      }

      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        selectedProgramId: activeProgramId,
        allowedProgramIds,
      };

      const token = JwtUtils.generateToken(tokenPayload);

      delete user.password_hash;

      return ApiResponse.success(
        res,
        {
          token,
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
          },
          selectedProgramId: activeProgramId,
          availablePrograms: allowedPrograms,
        },
        'Login realizado com sucesso'
      );
    } catch (error) {
      return next(error);
    }
  }

  async me(req, res, next) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return ApiResponse.notFound(res, 'Usuario nao encontrado');
      }

      return ApiResponse.success(res, {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        selectedProgramId: req.selectedProgramId || null,
        availablePrograms: (user.user_programs || []).map((relation) => relation.programs).filter(Boolean),
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuthController();
