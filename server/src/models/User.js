const bcrypt = require('bcrypt');
const { supabase } = require('../config/database');

const BASE_USER_SELECT =
  'id, full_name, email, role, is_active, created_at, updated_at, user_programs(program_id, programs(id, name, code, location))';

class User {
  static async findAll({ programId } = {}) {
    let query = supabase.from('users').select(BASE_USER_SELECT).order('full_name', { ascending: true });

    if (programId) {
      query = query.eq('user_programs.program_id', programId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select(BASE_USER_SELECT)
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

  static async findByEmail(email, { includePassword = false } = {}) {
    const selection = includePassword ? `${BASE_USER_SELECT}, password_hash` : BASE_USER_SELECT;

    const { data, error } = await supabase
      .from('users')
      .select(selection)
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  static async create({ full_name, email, password, role, program_ids = [] }) {
    const password_hash = await bcrypt.hash(password, 10);

    const { data: insertedUser, error: userError } = await supabase
      .from('users')
      .insert({
        full_name,
        email: email.toLowerCase(),
        password_hash,
        role,
        is_active: true,
      })
      .select('id')
      .single();

    if (userError) {
      throw userError;
    }

    if (program_ids.length > 0) {
      const links = program_ids.map((program_id) => ({
        user_id: insertedUser.id,
        program_id,
      }));

      const { error: linkError } = await supabase.from('user_programs').insert(links);
      if (linkError) {
        throw linkError;
      }
    }

    return this.findById(insertedUser.id);
  }

  static async update(id, payload) {
    const updates = {};
    if (payload.full_name !== undefined) updates.full_name = payload.full_name;
    if (payload.email !== undefined) updates.email = payload.email.toLowerCase();
    if (payload.role !== undefined) updates.role = payload.role;
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;
    if (payload.password) {
      updates.password_hash = await bcrypt.hash(payload.password, 10);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from('users').update(updates).eq('id', id);
      if (updateError) {
        throw updateError;
      }
    }

    if (Array.isArray(payload.program_ids)) {
      const { error: deleteError } = await supabase.from('user_programs').delete().eq('user_id', id);
      if (deleteError) {
        throw deleteError;
      }

      if (payload.program_ids.length > 0) {
        const links = payload.program_ids.map((program_id) => ({ user_id: id, program_id }));
        const { error: insertError } = await supabase.from('user_programs').insert(links);
        if (insertError) {
          throw insertError;
        }
      }
    }

    return this.findById(id);
  }

  static async delete(id) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      throw error;
    }
    return true;
  }
}

module.exports = User;
