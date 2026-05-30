const Student = require('../models/Student');
const ClassGroup = require('../models/ClassGroup');
const ApiResponse = require('../utils/ApiResponse');
const { resolveScopedProgramId, isUuid } = require('../utils/programContext');
const { normalizeClassGroup, parseClassGroupFilter } = require('../utils/classGroup');

class StudentController {
  resolveProgramId(req) {
    return resolveScopedProgramId(req);
  }

  validateProgramAccess(req, targetProgramId) {
    if (!targetProgramId) {
      return { ok: false, message: 'Selecione uma unidade para continuar' };
    }

    if (req.userRole === 'admin') {
      return { ok: true };
    }

    const allowed = Array.isArray(req.allowedProgramIds) ? req.allowedProgramIds : [];
    const ok = allowed.some((id) => String(id) === String(targetProgramId));
    if (!ok) {
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

      if (programId && !isUuid(programId)) {
        return ApiResponse.error(res, 'Identificador de unidade invalido', 400);
      }

      const classGroupFilter = parseClassGroupFilter(req.query.class_group);

      const students = await Student.findAll({ programId, classGroup: classGroupFilter });
      return ApiResponse.success(res, students, 'Usuarios listados com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async show(req, res, next) {
    try {
      const student = await Student.findById(req.params.id);
      if (!student) {
        return ApiResponse.notFound(res, 'Usuario nao encontrado');
      }

      const access = this.validateProgramAccess(req, student.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      return ApiResponse.success(res, student, 'Usuario encontrado');
    } catch (error) {
      return next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { full_name } = req.body;

      if (!full_name) {
        return ApiResponse.error(res, 'Campo obrigatorio: full_name', 400);
      }

      const programId = this.resolveProgramId(req);
      const access = this.validateProgramAccess(req, programId);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      if (!programId || !isUuid(programId)) {
        return ApiResponse.error(res, 'Unidade invalida ou nao informada', 400);
      }

      const allowedFields = [
        'full_name',
        'birth_date',
        'nis_user',
        'color',
        'cpf_cns',
        'is_allergic',
        'allergy_details',
        'shoe_size',
        'clothing_size',
        'has_health_issues',
        'health_issues_details',
        'has_disability',
        'disability_details',
        'school_name',
        'school_grade',
        'school_shift',
        'address_street',
        'address_neighborhood',
        'address_reference',
        'address_extra',
        'guardian_name',
        'guardian_cpf',
        'guardian_nis',
        'guardian_phone',
        'guardian_relationship',
        'guardian_workplace',
        'family_benefit',
        'family_benefit_details',
        'family_members',
        'cras_status',
        'cras_link_reason',
        'cras_referral_agency',
        'cras_technician',
        'scfv_insertion_date',
        'scfv_update_date',
        'scfv_frequency_days',
        'scfv_shift',
        'scfv_group',
        'scfv_instructor',
        'scfv_boarding',
        'scfv_disembarkation',
        'advisor_notes',
        'enrollment_code',
      ];

      const payload = { program_id: programId, is_active: true };
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          payload[field] = req.body[field];
        }
      });

      const created = await Student.create(payload);

      return ApiResponse.success(res, created, 'Usuario criado com sucesso', 201);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const current = await Student.findById(id);
      if (!current) {
        return ApiResponse.notFound(res, 'Usuario nao encontrado');
      }

      const access = this.validateProgramAccess(req, current.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const updates = {};
      const allowedFields = [
        'full_name',
        'birth_date',
        'nis_user',
        'color',
        'cpf_cns',
        'is_allergic',
        'allergy_details',
        'shoe_size',
        'clothing_size',
        'has_health_issues',
        'health_issues_details',
        'has_disability',
        'disability_details',
        'school_name',
        'school_grade',
        'school_shift',
        'address_street',
        'address_neighborhood',
        'address_reference',
        'address_extra',
        'guardian_name',
        'guardian_cpf',
        'guardian_nis',
        'guardian_phone',
        'guardian_relationship',
        'guardian_workplace',
        'family_benefit',
        'family_benefit_details',
        'family_members',
        'cras_status',
        'cras_link_reason',
        'cras_referral_agency',
        'cras_technician',
        'scfv_insertion_date',
        'scfv_update_date',
        'scfv_frequency_days',
        'scfv_shift',
        'scfv_group',
        'scfv_instructor',
        'scfv_boarding',
        'scfv_disembarkation',
        'advisor_notes',
        'enrollment_code',
        'is_active',
      ];

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (req.body.class_group !== undefined) {
        updates.class_group = normalizeClassGroup(req.body.class_group);
      }

      if (req.userRole === 'admin' && req.body.program_id) {
        updates.program_id = req.body.program_id;
      }

      if (updates.class_group !== undefined && updates.class_group !== null) {
        const nextProgramId = updates.program_id !== undefined ? updates.program_id : current.program_id;
        const turmaRow = await ClassGroup.findByProgramAndSlug(nextProgramId, updates.class_group);
        if (!turmaRow) {
          return ApiResponse.error(
            res,
            'Turma invalida para a unidade do usuario. Cadastre a turma na unidade ou ajuste a turma/unidade.',
            400
          );
        }
      }

      const updated = await Student.update(id, updates);
      return ApiResponse.success(res, updated, 'Usuario atualizado com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const current = await Student.findById(id);
      if (!current) {
        return ApiResponse.notFound(res, 'Usuario nao encontrado');
      }

      const access = this.validateProgramAccess(req, current.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      await Student.delete(id);
      return ApiResponse.success(res, null, 'Usuario removido com sucesso');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new StudentController();
