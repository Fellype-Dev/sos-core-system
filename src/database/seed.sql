-- Execute este script no SQL Editor do Supabase apos rodar schema.sql

with inserted_admin as (
  insert into users (full_name, email, password_hash, role, is_active)
  values (
    'Administrador SOS',
    'admin@sos.local',
    crypt('Admin@123', gen_salt('bf')),
    'admin',
    true
  )
  on conflict (email) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        is_active = true
  returning id
)
insert into user_programs (user_id, program_id)
select inserted_admin.id, programs.id
from inserted_admin
cross join programs
on conflict (user_id, program_id) do nothing;
