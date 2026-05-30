const { supabase } = require('../config/database');

const BASE_STUDENT_SELECT =
  'id, full_name, birth_date, nis_user, color, cpf_cns, is_allergic, allergy_details, shoe_size, clothing_size, has_health_issues, health_issues_details, has_disability, disability_details, school_name, school_grade, school_shift, address_street, address_neighborhood, address_reference, address_extra, guardian_name, guardian_cpf, guardian_nis, guardian_phone, guardian_relationship, guardian_workplace, family_benefit, family_benefit_details, family_members, cras_status, cras_link_reason, cras_referral_agency, cras_technician, scfv_insertion_date, scfv_update_date, scfv_frequency_days, scfv_shift, scfv_group, scfv_instructor, scfv_boarding, scfv_disembarkation, advisor_notes, enrollment_code, is_active, created_at, updated_at, program_id, class_group, programs(id, code, name, location)';

class Student {
  static async findAll({ programId, classGroup } = {}) {
    let query = supabase.from('students').select(BASE_STUDENT_SELECT).order('full_name', { ascending: true });

    if (programId) {
      query = query.eq('program_id', programId);
    }

    if (classGroup) {
      query = query.eq('class_group', classGroup);
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
