const { supabase } = require('../config/database');

const SELECT = 'id, program_id, slug, name, sort_order, period, created_at';

class ClassGroup {
  static async findByProgram(programId) {
    const { data, error } = await supabase
      .from('class_groups')
      .select(SELECT)
      .eq('program_id', programId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async findById(id) {
    const { data, error } = await supabase.from('class_groups').select(SELECT).eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async findByProgramAndSlug(programId, slug) {
    const { data, error } = await supabase
      .from('class_groups')
      .select(SELECT)
      .eq('program_id', programId)
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  static async countStudentsUsingSlug(programId, slug) {
    const { count, error } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('class_group', slug);

    if (error) throw error;
    return count || 0;
  }

  static async countSessionsUsingSlug(programId, slug) {
    const { count, error } = await supabase
      .from('attendance_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('class_group', slug);

    if (error) throw error;
    return count || 0;
  }

  static async create({ program_id, slug, name, sort_order = 0, period }) {
    const { data, error } = await supabase
      .from('class_groups')
      .insert({ program_id, slug, name, sort_order, period })
      .select('id')
      .single();

    if (error) throw error;
    return this.findById(data.id);
  }

  static async update(id, { name, sort_order, period }) {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (period !== undefined) updates.period = period;
    if (Object.keys(updates).length === 0) return this.findById(id);

    const { error } = await supabase.from('class_groups').update(updates).eq('id', id);
    if (error) throw error;
    return this.findById(id);
  }

  static async delete(id) {
    const { error } = await supabase.from('class_groups').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  /** Garante slug único por programa (sufixo -2, -3…). */
  static async uniqueSlugForProgram(programId, baseSlug) {
    const base = String(baseSlug || 'turma').slice(0, 32);
    let slug = base;
    for (let n = 0; n < 48; n += 1) {
      const existing = await this.findByProgramAndSlug(programId, slug);
      if (!existing) return slug;
      const suffix = `-${n + 2}`;
      slug = `${base.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
    }
    throw new Error('Nao foi possivel gerar slug unico para a turma');
  }
}

module.exports = ClassGroup;
