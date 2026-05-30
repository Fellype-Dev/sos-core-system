const Attendance = require('../models/Attendance');
const ApiResponse = require('../utils/ApiResponse');
const { resolveScopedProgramId, isUuid } = require('../utils/programContext');

class AttendanceController {
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

  async show(req, res, next) {
    try {
      const { attendance_date, class_group = '', period = '' } = req.query;
      if (!attendance_date) {
        return ApiResponse.error(res, 'Parametro obrigatorio: attendance_date', 400);
      }

      const programId = this.resolveProgramId(req);
      const access = this.validateProgramAccess(req, programId);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      if (programId && !isUuid(programId)) {
        return ApiResponse.error(res, 'Identificador de unidade invalido', 400);
      }

      const session = await Attendance.findSession({
        programId,
        attendanceDate: attendance_date,
        classGroup: class_group,
        period,
      });

      if (!session) {
        return ApiResponse.success(
          res,
          {
            session: null,
            records: [],
          },
          'Sessao de chamada ainda nao criada'
        );
      }

      const records = await Attendance.listRecords(session.id);
      return ApiResponse.success(res, { session, records }, 'Chamada carregada com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async store(req, res, next) {
    try {
      const { attendance_date, class_group = '', period = '', records = [] } = req.body;

      if (!attendance_date) {
        return ApiResponse.error(res, 'Campo obrigatorio: attendance_date', 400);
      }

      if (!Array.isArray(records)) {
        return ApiResponse.error(res, 'Campo records deve ser um array', 400);
      }

      const invalidRecord = records.find(
        (record) => !record.student_id || !['present', 'absent'].includes(record.status)
      );

      if (invalidRecord) {
        return ApiResponse.error(
          res,
          'Cada registro precisa de student_id e status (present/absent)',
          400
        );
      }

      const programId = this.resolveProgramId(req);
      const access = this.validateProgramAccess(req, programId);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      if (programId && !isUuid(programId)) {
        return ApiResponse.error(res, 'Identificador de unidade invalido', 400);
      }

      const session = await Attendance.getOrCreateSession({
        programId,
        attendanceDate: attendance_date,
        classGroup: class_group,
        period,
        createdBy: req.userId,
      });

      const savedRecords = await Attendance.replaceRecords({
        sessionId: session.id,
        records,
      });

      return ApiResponse.success(
        res,
        {
          session,
          records: savedRecords,
        },
        'Chamada salva com sucesso'
      );
    } catch (error) {
      return next(error);
    }
  }

  async listSessions(req, res, next) {
    try {
      const { attendance_date, class_group, period } = req.query;

      const programId = this.resolveProgramId(req);
      const access = this.validateProgramAccess(req, programId);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      if (programId && !isUuid(programId)) {
        return ApiResponse.error(res, 'Identificador de unidade invalido', 400);
      }

      const sessions = await Attendance.listSessions({
        programId,
        attendanceDate: attendance_date,
        classGroup: class_group,
        period,
      });

      return ApiResponse.success(res, { data: sessions }, 'Sessoes de chamada listadas com sucesso');
    } catch (error) {
      return next(error);
    }
  }

  async sessionDetail(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return ApiResponse.error(res, 'Parametro obrigatorio: id', 400);
      }

      const detail = await Attendance.getSessionDetail(id);
      if (!detail) {
        return ApiResponse.notFound(res, 'Sessao de chamada nao encontrada');
      }

      const access = this.validateProgramAccess(req, detail.session.program_id);
      if (!access.ok) {
        return ApiResponse.error(res, access.message, 403);
      }

      return ApiResponse.success(res, detail, 'Detalhe da chamada carregado com sucesso');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AttendanceController();
