const Student = require('../models/Student');
const ApiResponse = require('../utils/ApiResponse');

class StudentController {
  resolveProgramId(req) {
    if (req.userRole === 'admin') {
      return req.query.program_id || req.body.program_id || req.selectedProgramId || null;
    }

    return req.selectedProgramId || null;
  }

  validateProgramAccess(req, targetProgramId) {
    if (!targetProgramId) {
      return { ok: false, message: 'Selecione uma unidade para continuar' };
    }

    if (req.userRole === 'admin') {
      return { ok: true };
    }

    if (!req.allowedProgramIds.includes(targetProgramId)) {
      return { ok: false, message: 'Unidade nao autorizada para este usuario' };
    }

    return { ok: true };
  }

  async index(req, res, next) {
    try {
      const programId = this.resolveProgramId(req);
      const access = this.validateProgramAccess(req, programId);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const students = await Student.findAll({ programId });
      return ApiResponse.success(res, students, 'Alunos listados com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async show(req, res, next) {
    try {
      const student = await Student.findById(req.params.id);
      if (!student) {
        return ApiResponse.notFound(res, 'Aluno nao encontrado');
      }

      const access = this.validateProgramAccess(req, student.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      return ApiResponse.success(res, student, 'Aluno encontrado');
    } catch (error) {
      return next(error);
    }
  }

  async store(req, res, next) {
    try {
      const {
        full_name,
        birth_date,
        enrollment_code,
        contact_phone,
        guardian_name,
        guardian_phone,
        allergies,
        medical_notes,
      } = req.body;

      if (!full_name) {
        return ApiResponse.error(res, 'Campo obrigatorio: full_name', 400);
      }

      const programId = this.resolveProgramId(req);
      const access = this.validateProgramAccess(req, programId);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const created = await Student.create({
        full_name,
        birth_date: birth_date || null,
        enrollment_code: enrollment_code || null,
        contact_phone: contact_phone || null,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
        allergies: allergies || null,
        medical_notes: medical_notes || null,
        program_id: programId,
        is_active: true,
      });

      return ApiResponse.success(res, created, 'Aluno criado com sucesso', 201);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const current = await Student.findById(id);
      if (!current) {
        return ApiResponse.notFound(res, 'Aluno nao encontrado');
      }

      const access = this.validateProgramAccess(req, current.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const updates = {};
      const allowedFields = [
        'full_name',
        'birth_date',
        'enrollment_code',
        'contact_phone',
        'guardian_name',
        'guardian_phone',
        'allergies',
        'medical_notes',
        'is_active',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (req.userRole === 'admin' && req.body.program_id) {
        updates.program_id = req.body.program_id;
      }

      const updated = await Student.update(id, updates);
      return ApiResponse.success(res, updated, 'Aluno atualizado com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const current = await Student.findById(id);
      if (!current) {
        return ApiResponse.notFound(res, 'Aluno nao encontrado');
      }

      const access = this.validateProgramAccess(req, current.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      await Student.delete(id);
      return ApiResponse.success(res, null, 'Aluno removido com sucesso');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new StudentController();
