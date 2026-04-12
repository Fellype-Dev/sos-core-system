const { supabase } = require('../config/database');
const ApiResponse = require('../utils/ApiResponse');

class ProgramController {
  async index(req, res, next) {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, code, name, age_range, location')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return ApiResponse.success(res, data || [], 'Programas listados com sucesso');
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ProgramController();
