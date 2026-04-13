const { supabase } = require('../config/database');

class Attendance {
  static async findSession({ programId, attendanceDate, classGroup, period }) {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('id, program_id, attendance_date, class_group, period, created_by, created_at')
      .eq('program_id', programId)
      .eq('attendance_date', attendanceDate)
      .eq('class_group', classGroup || '')
      .eq('period', period || '')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  static async createSession({ programId, attendanceDate, classGroup, period, createdBy }) {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({
        program_id: programId,
        attendance_date: attendanceDate,
        class_group: classGroup || '',
        period: period || '',
        created_by: createdBy,
      })
      .select('id, program_id, attendance_date, class_group, period, created_by, created_at')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  static async getOrCreateSession({ programId, attendanceDate, classGroup, period, createdBy }) {
    const existing = await this.findSession({ programId, attendanceDate, classGroup, period });
    if (existing) {
      return existing;
    }

    return this.createSession({ programId, attendanceDate, classGroup, period, createdBy });
  }

  static async replaceRecords({ sessionId, records }) {
    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      throw deleteError;
    }

    if (!records.length) {
      return [];
    }

    const payload = records.map((record) => ({
      session_id: sessionId,
      student_id: record.student_id,
      status: record.status,
      note: record.note || null,
    }));

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(payload)
      .select('session_id, student_id, status, note, created_at');

    if (error) {
      throw error;
    }

    return data || [];
  }

  static async listRecords(sessionId) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('session_id, student_id, status, note, created_at')
      .eq('session_id', sessionId);

    if (error) {
      throw error;
    }

    return data || [];
  }
}

module.exports = Attendance;
