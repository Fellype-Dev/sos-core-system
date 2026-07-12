const ClassGroup = require('../models/ClassGroup');
const ApiResponse = require('../utils/ApiResponse');
const { isUuid } = require('../utils/programContext');
const { slugify } = require('../utils/slugify');
const { normalizeWeekdays } = require('../utils/classGroup');

function normalizeAgeRange(value) {
  if (value === undefined) return undefined;
  const s = String(value || '').trim();
  return s ? s.slice(0, 40) : null;
}

function validateProgramAccess(req, programId) {
  if (!programId) {
    return { ok: false, message: 'Informe a unidade (program_id)' };
  }

  if (req.userRole === 'admin') {
    return { ok: true };
  }

  const allowed = Array.isArray(req.allowedProgramIds) ? req.allowedProgramIds : [];
  const ok = allowed.some((id) => String(id) === String(programId));
  if (!ok) {
    return { ok: false, message: 'Unidade nao autorizada para este usuario' };
  }

  return { ok: true };
}

class ClassGroupController {
  async index(req, res, next) {
    try {
      const programId = req.query.program_id;
      if (!programId || !isUuid(programId)) {
        return ApiResponse.error(res, 'Parametro obrigatorio: program_id (uuid)', 400);
      }

      const access = validateProgramAccess(req, programId);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const rows = await ClassGroup.findByProgram(programId);
      return ApiResponse.success(res, rows, 'Turmas listadas com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { program_id, name, slug: requestedSlug, sort_order = 0, period, weekdays, age_range } = req.body;

      if (!program_id || !isUuid(program_id)) {
        return ApiResponse.error(res, 'Campo obrigatorio: program_id', 400);
      }
      if (!name || !String(name).trim()) {
        return ApiResponse.error(res, 'Campo obrigatorio: name', 400);
      }

      const access = validateProgramAccess(req, program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const baseSlug = requestedSlug && String(requestedSlug).trim()
        ? String(requestedSlug).trim().toLowerCase().slice(0, 32)
        : slugify(name);

      const slug = await ClassGroup.uniqueSlugForProgram(program_id, baseSlug);

      const created = await ClassGroup.create({
        program_id,
        slug,
        name: String(name).trim(),
        sort_order: Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
        period,
        weekdays: normalizeWeekdays(weekdays) || [],
        age_range: normalizeAgeRange(age_range) ?? null,
      });

      return ApiResponse.success(res, created, 'Turma criada com sucesso', 201);
    } catch (error) {
      return next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      if (!isUuid(id)) {
        return ApiResponse.error(res, 'Identificador invalido', 400);
      }

      const row = await ClassGroup.findById(id);
      if (!row) {
        return ApiResponse.notFound(res, 'Turma nao encontrada');
      }

      const access = validateProgramAccess(req, row.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const { name, sort_order, period, weekdays, age_range } = req.body;
      const updated = await ClassGroup.update(id, {
        name: name !== undefined ? name : undefined,
        sort_order: sort_order !== undefined ? sort_order : undefined,
        period: period !== undefined ? period : undefined,
        weekdays: normalizeWeekdays(weekdays),
        age_range: normalizeAgeRange(age_range),
      });

      return ApiResponse.success(res, updated, 'Turma atualizada com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async destroy(req, res, next) {
    try {
      const { id } = req.params;
      if (!isUuid(id)) {
        return ApiResponse.error(res, 'Identificador invalido', 400);
      }

      const row = await ClassGroup.findById(id);
      if (!row) {
        return ApiResponse.notFound(res, 'Turma nao encontrada');
      }

      const access = validateProgramAccess(req, row.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      const [studentCount, sessionCount] = await Promise.all([
        ClassGroup.countStudentsUsingSlug(row.program_id, row.slug),
        ClassGroup.countSessionsUsingSlug(row.program_id, row.slug),
      ]);

      if (studentCount > 0 || sessionCount > 0) {
        return ApiResponse.error(
          res,
          'Nao e possivel excluir: existem usuarios ou registros de chamada usando esta turma',
          409
        );
      }

      await ClassGroup.delete(id);
      return ApiResponse.success(res, null, 'Turma removida com sucesso');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ClassGroupController();
