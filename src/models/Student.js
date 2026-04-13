const { supabase } = require('../config/database');

const BASE_STUDENT_SELECT =
  'id, full_name, birth_date, enrollment_code, contact_phone, guardian_name, guardian_phone, allergies, medical_notes, is_active, created_at, updated_at, program_id, programs(id, code, name, location)';

class Student {
  static async findAll({ programId } = {}) {
    let query = supabase.from('students').select(BASE_STUDENT_SELECT).order('full_name', { ascending: true });

    if (programId) {
      query = query.eq('program_id', programId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return data || [];
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('students')
      .select(BASE_STUDENT_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  static async create(payload) {
    const { data, error } = await supabase
      .from('students')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return this.findById(data.id);
  }

  static async update(id, payload) {
    const { error } = await supabase.from('students').update(payload).eq('id', id);
    if (error) {
      throw error;
    }

    return this.findById(id);
  }

  static async delete(id) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      throw error;
    }
    return true;
  }
}

module.exports = Student;
