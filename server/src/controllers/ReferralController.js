const Referral = require('../models/Referral');
const Student = require('../models/Student');
const ApiResponse = require('../utils/ApiResponse');
const { resolveScopedProgramId, isUuid } = require('../utils/programContext');

class ReferralController {
  resolveProgramId(req) {
    return resolveScopedProgramId(req);
  }

  validateProgramAccess(req, targetProgramId) {
    if (!targetProgramId) {
      return { ok: false, message: 'Selecione uma unidade para continuar' };
    }

    if (req.userRole === 'admin') return { ok: true };

    const allowed = Array.isArray(req.allowedProgramIds) ? req.allowedProgramIds : [];
    const ok = allowed.some((id) => String(id) === String(targetProgramId));
    if (!ok) return { ok: false, message: 'Unidade nao autorizada para este usuario' };

    return { ok: true };
  }

  async index(req, res, next) {
    try {
      const programId = this.resolveProgramId(req);
      if (programId && !isUuid(programId)) return ApiResponse.error(res, 'Identificador de unidade invalido', 400);

      const studentId = req.query.student_id || null;

      const referrals = await Referral.findAll({ studentId, programId });
      return ApiResponse.success(res, referrals, 'Encaminhamentos listados com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async show(req, res, next) {
    try {
      const row = await Referral.findById(req.params.id);
      if (!row) return ApiResponse.notFound(res, 'Encaminhamento nao encontrado');

      const access = this.validateProgramAccess(req, row.program_id);
      if (!access.ok) return ApiResponse.error(res, access.message, 403);

      return ApiResponse.success(res, row, 'Encaminhamento encontrado');
    } catch (error) {
      return next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { student_id } = req.body;
      if (!student_id) return ApiResponse.error(res, 'Campo obrigatorio: student_id', 400);

      const student = await Student.findById(student_id);
      if (!student) return ApiResponse.notFound(res, 'Usuario nao encontrado');

      const programId = this.resolveProgramId(req) || student.program_id;
      const access = this.validateProgramAccess(req, programId);
      if (!access.ok) return ApiResponse.error(res, access.message, 403);

      const payload = { student_id, program_id: programId, created_by: req.userId };
      const allowed = [
        'referral_age_range',
        'referral_scfv_programs',
        'referral_spontaneous_demand',
        'referral_family_member_in_scfv',
        'referral_family_followup',
        'referral_pcd_responsible_name',
        'referral_pcd_responsible_phone',
        'referral_priority_conditions',
        'referral_priority_axes',
        'notes',
      ];

      allowed.forEach((f) => {
        if (req.body[f] !== undefined) payload[f] = req.body[f];
      });

      const created = await Referral.create(payload);
      return ApiResponse.success(res, created, 'Encaminhamento criado', 201);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const current = await Referral.findById(id);
      if (!current) return ApiResponse.notFound(res, 'Encaminhamento nao encontrado');

      const access = this.validateProgramAccess(req, current.program_id);
      if (!access.ok) return ApiResponse.error(res, access.message, 403);

      const updates = {};
      const allowed = [
        'referral_age_range',
        'referral_scfv_programs',
        'referral_spontaneous_demand',
        'referral_family_member_in_scfv',
        'referral_family_followup',
        'referral_pcd_responsible_name',
        'referral_pcd_responsible_phone',
        'referral_priority_conditions',
        'referral_priority_axes',
        'notes',
      ];
      allowed.forEach((f) => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });

      const updated = await Referral.update(id, updates);
      return ApiResponse.success(res, updated, 'Encaminhamento atualizado');
    } catch (error) {
      return next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      const current = await Referral.findById(id);
      if (!current) return ApiResponse.notFound(res, 'Encaminhamento nao encontrado');

      const access = this.validateProgramAccess(req, current.program_id);
      if (!access.ok) return ApiResponse.error(res, access.message, 403);

      await Referral.delete(id);
      return ApiResponse.success(res, null, 'Encaminhamento removido com sucesso');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ReferralController();
