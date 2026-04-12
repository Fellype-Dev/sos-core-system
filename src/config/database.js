const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL
  ? process.env.SUPABASE_URL.startsWith('http')
    ? process.env.SUPABASE_URL
    : `https://${process.env.SUPABASE_URL}`
  : '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseServiceRoleKey);

if (!hasSupabaseConfig) {
  console.warn(
    'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados. Defina no arquivo .env para habilitar o banco.'
  );
}

const createUnavailableClient = () => ({
  from() {
    throw new Error('Supabase nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  },
});

const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : createUnavailableClient();

module.exports = {
  supabase,
};
