const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const envPath = fs.existsSync(path.join(__dirname, '../../../.env'))
  ? path.join(__dirname, '../../../.env')
  : path.join(__dirname, '../../../../.env');

require('dotenv').config({ path: envPath });

const { supabase } = require('../../config/database');

async function seed() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    // 0. Limpar dados antigos
    console.log('🗑️  Limpando dados antigos...');
    try {
      // Tenta deletar com try/catch para ignora RLS
      await supabase.from('user_programs').delete().gt('created_at', '2000-01-01');
      await supabase.from('users').delete().gt('created_at', '2000-01-01');
      await supabase.from('programs').delete().gt('created_at', '2000-01-01');
    } catch (e) {
      console.log('  (RLS pode estar bloqueando deletes, continuando...)');
    }
    console.log('✅ Limpeza completada\n');

    // 1. Criar programas
    console.log('📋 Criando programas...');
    const programsData = [
      {
        code: 'SEMEAR',
        name: 'Semear',
        age_range: '0-5',
        location: 'Centro',
      },
      {
        code: 'VIVER',
        name: 'Viver',
        age_range: '6-12',
        location: 'Centro',
      },
      {
        code: 'SONHAR',
        name: 'Sonhar',
        age_range: '13-18',
        location: 'Centro',
      },
    ];

    const { data: programs, error: programError } = await supabase
      .from('programs')
      .insert(programsData)
      .select();

    if (programError) throw new Error(`Erro ao criar programas: ${programError.message}`);
    console.log(`✅ ${programs.length} programas criados\n`);

    // 2. Criar usuários
    console.log('👥 Criando usuários...');
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const coordPassword = await bcrypt.hash('coord123', 10);

    const usersData = [
      {
        full_name: 'Admin Sistema',
        email: 'admin@sos.com',
        password_hash: adminPassword,
        role: 'admin',
        is_active: true,
      },
      {
        full_name: 'Coordenacao Semear',
        email: 'semear@sos.com',
        password_hash: coordPassword,
        role: 'coordenador',
        is_active: true,
      },
      {
        full_name: 'Coordenacao Viver',
        email: 'viver@sos.com',
        password_hash: coordPassword,
        role: 'coordenador',
        is_active: true,
      },
      {
        full_name: 'Coordenacao Sonhar',
        email: 'sonhar@sos.com',
        password_hash: coordPassword,
        role: 'coordenador',
        is_active: true,
      },
    ];

    const { data: users, error: userError } = await supabase
      .from('users')
      .insert(usersData)
      .select();

    if (userError) throw new Error(`Erro ao criar usuários: ${userError.message}`);
    console.log(`✅ ${users.length} usuários criados\n`);

    console.log('🔗 Relacionando coordenadores com programas...');

    const relationships = [
      { user_email: 'semear@sos.com', program_code: 'SEMEAR' },
      { user_email: 'viver@sos.com', program_code: 'VIVER' },
      { user_email: 'sonhar@sos.com', program_code: 'SONHAR' },
    ];

    for (const rel of relationships) {
      const linkedUser = users.find((u) => u.email === rel.user_email);
      const linkedProgram = programs.find((p) => p.code === rel.program_code);

      if (linkedUser && linkedProgram) {
        const { error: relError } = await supabase.from('user_programs').insert({
          user_id: linkedUser.id,
          program_id: linkedProgram.id,
        });

        if (relError) {
          throw new Error(`Erro ao relacionar ${rel.user_email} com ${rel.program_code}: ${relError.message}`);
        }
      }
    }

    console.log('✅ Relacionamentos criados\n');

    console.log('═'.repeat(50));
    console.log('🎉 Seed concluído com sucesso!\n');
    console.log('📝 Credenciais de teste:\n');
    console.log('Admin:');
    console.log('  Email: admin@sos.com');
    console.log('  Senha: admin123\n');
    console.log('Coordenadores por unidade:');
    console.log('  Semear: semear@sos.com / coord123');
    console.log('  Viver: viver@sos.com / coord123');
    console.log('  Sonhar: sonhar@sos.com / coord123\n');
    console.log('═'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante seed:', error.message);
    process.exit(1);
  }
}

seed();
