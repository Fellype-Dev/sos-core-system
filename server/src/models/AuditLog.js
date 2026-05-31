const { supabase } = require('../config/database');

class AuditLog {
  static async log({ userId, action, details }) {
    try {
      // Registrar no console como padrão de depuração/fallback
      console.log(`[Audit Log] User: ${userId || 'SYSTEM'}, Action: ${action}, Details:`, details || {});

      // Tentar salvar no banco de dados Supabase
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId || null,
          action,
          details: details || null,
        });

      if (error) {
        // Se der erro porque a tabela não existe ou outro motivo, logar no console e não estourar erro
        console.warn(`[Audit Log Warning] Falha ao persistir no banco (tabela audit_logs pode não estar criada): ${error.message}`);
      }
    } catch (err) {
      console.warn(`[Audit Log Error] Erro ao salvar log de auditoria: ${err.message}`);
    }
  }
}

module.exports = AuditLog;
