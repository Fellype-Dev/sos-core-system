const { supabase } = require('../config/database');

class Attendance {
  static async findSessionById(sessionId) {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('id, program_id, attendance_date, class_group, period, created_by, created_at, creator:users!created_by(full_name)')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  static async findSession({ programId, attendanceDate, classGroup, period }) {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select('id, program_id, attendance_date, class_group, period, created_by, created_at, creator:users!created_by(full_name)')
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

  static async getSessionDetail(sessionId) {
    const session = await this.findSessionById(sessionId);
    if (!session) {
      return null;
    }

    const records = await this.listRecords(sessionId);
    const studentIds = [...new Set(records.map((record) => record.student_id).filter(Boolean))];

    let studentsById = new Map();
    if (studentIds.length > 0) {
      const { data: students, error } = await supabase
        .from('students')
        .select('id, full_name, nis_user, enrollment_code, class_group')
        .in('id', studentIds);

      if (error) {
        throw error;
      }

      studentsById = new Map((students || []).map((student) => [student.id, student]));
    }

    const mergedRecords = records.map((record) => ({
      ...record,
      student: studentsById.get(record.student_id) || null,
    }));

    return { session, records: mergedRecords };
  }

  static async listSessions({ programId, attendanceDate, classGroup, period } = {}) {
    let query = supabase
      .from('attendance_sessions')
      .select('id, program_id, attendance_date, class_group, period, created_by, created_at, creator:users!created_by(full_name)')
      .order('attendance_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (programId) {
      query = query.eq('program_id', programId);
    }

    if (attendanceDate) {
      query = query.eq('attendance_date', attendanceDate);
    }

    if (classGroup !== undefined && classGroup !== null && classGroup !== '') {
      query = query.eq('class_group', classGroup);
    } else if (classGroup === '') {
      query = query.eq('class_group', '');
    }

    if (period !== undefined) {
      query = query.eq('period', period || '');
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const sessions = data || [];
    if (sessions.length === 0) {
      return sessions;
    }

    const sessionIds = sessions.map((session) => session.id).filter(Boolean);
    if (sessionIds.length === 0) {
      return sessions;
    }

    const { data: records, error: recordsError } = await supabase
      .from('attendance_records')
      .select('session_id, status')
      .in('session_id', sessionIds);

    if (recordsError) {
      throw recordsError;
    }

    const countsBySession = new Map();
    (records || []).forEach((record) => {
      const current = countsBySession.get(record.session_id) || { present: 0, absent: 0 };
      if (record.status === 'present') {
        current.present += 1;
      } else if (record.status === 'absent') {
        current.absent += 1;
      }
      countsBySession.set(record.session_id, current);
    });

    return sessions.map((session) => {
      const counts = countsBySession.get(session.id) || { present: 0, absent: 0 };
      return {
        ...session,
        present_count: counts.present,
        absent_count: counts.absent,
      };
    });
  }

  static async getBulkSessionDetails({ programId, attendanceDate, startDate, endDate, classGroup, period }) {
    let query = supabase
      .from('attendance_sessions')
      .select('id, program_id, attendance_date, class_group, period, created_by, created_at, creator:users!created_by(full_name)');

    if (programId) {
      query = query.eq('program_id', programId);
    }

    if (attendanceDate) {
      query = query.eq('attendance_date', attendanceDate);
    }

    if (startDate) {
      query = query.gte('attendance_date', startDate);
    }

    if (endDate) {
      query = query.lte('attendance_date', endDate);
    }

    if (classGroup !== undefined && classGroup !== null && classGroup !== '') {
      query = query.eq('class_group', classGroup);
    } else if (classGroup === '') {
      query = query.eq('class_group', '');
    }

    if (period !== undefined && period !== null && period !== '') {
      query = query.eq('period', period);
    }

    const { data: sessions, error: sessionsError } = await query;
    if (sessionsError) {
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.id).filter(Boolean);
    if (sessionIds.length === 0) {
      return sessions.map((session) => ({ session, records: [] }));
    }

    const { data: records, error: recordsError } = await supabase
      .from('attendance_records')
      .select('session_id, student_id, status, note, created_at')
      .in('session_id', sessionIds);

    if (recordsError) {
      throw recordsError;
    }

    const studentIds = [...new Set((records || []).map((record) => record.student_id).filter(Boolean))];
    let studentsById = new Map();
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name, nis_user, enrollment_code, class_group')
        .in('id', studentIds);

      if (studentsError) {
        throw studentsError;
      }
      studentsById = new Map((students || []).map((student) => [student.id, student]));
    }

    const recordsBySession = new Map();
    (records || []).forEach((record) => {
      const merged = {
        ...record,
        student: studentsById.get(record.student_id) || null,
      };
      if (!recordsBySession.has(record.session_id)) {
        recordsBySession.set(record.session_id, []);
      }
      recordsBySession.get(record.session_id).push(merged);
    });

    return sessions.map((session) => ({
      session,
      records: recordsBySession.get(session.id) || [],
    }));
  }
}

module.exports = Attendance;
