const { supabase } = require('../config/database');

const BASE_REFERRAL_SELECT =
  'id, student_id, program_id, referral_age_range, referral_scfv_programs, referral_spontaneous_demand, referral_family_member_in_scfv, referral_family_followup, referral_pcd_responsible_name, referral_pcd_responsible_phone, referral_priority_conditions, referral_priority_axes, notes, created_by, created_at, updated_at, students(id, full_name), programs(id, name)';

class Referral {
  static async findAll({ studentId, programId } = {}) {
    let query = supabase.from('referrals').select(BASE_REFERRAL_SELECT).order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);
    if (programId) query = query.eq('program_id', programId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async findById(id) {
    const { data, error } = await supabase.from('referrals').select(BASE_REFERRAL_SELECT).eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async create(payload) {
    const { data, error } = await supabase.from('referrals').insert(payload).select('id').single();
    if (error) throw error;
    return this.findById(data.id);
  }

  static async update(id, payload) {
    const { error } = await supabase.from('referrals').update(payload).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }

  static async delete(id) {
    const { error } = await supabase.from('referrals').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}

module.exports = Referral;
