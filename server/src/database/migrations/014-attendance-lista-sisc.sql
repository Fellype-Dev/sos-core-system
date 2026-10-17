-- Segunda lista de presença: a do SISC.
--
-- A lista do SISC é igual à do SOS, mas montada pelo grupo informado no SISC
-- (students.sisc_group) em vez do grupo da unidade (students.class_group).
-- As duas convivem: no mesmo dia pode haver uma lista de cada.
--
-- Por isso a unicidade precisa incluir o tipo da lista — sem isso, lançar a
-- lista do SISC sobrescreveria a do SOS do mesmo dia e período.

alter table attendance_sessions
  add column if not exists list_type text not null default 'sos';

do $$
declare
  nome_constraint text;
begin
  -- Remove a unicidade antiga (sem o tipo de lista). O nome é gerado pelo
  -- Postgres, então é localizado pelas colunas em vez de pelo nome.
  select con.conname into nome_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'attendance_sessions'
    and con.contype = 'u'
    and (
      select array_agg(att.attname::text order by att.attname)
      from unnest(con.conkey) as k
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k
    ) = array['attendance_date', 'class_group', 'period', 'program_id'];

  if nome_constraint is not null then
    execute format('alter table attendance_sessions drop constraint %I', nome_constraint);
  end if;

  -- Só aceita os dois tipos previstos.
  if not exists (
    select 1 from pg_constraint
    where conname = 'attendance_sessions_list_type_check'
  ) then
    alter table attendance_sessions
      add constraint attendance_sessions_list_type_check
      check (list_type in ('sos', 'sisc'));
  end if;
end $$;

create unique index if not exists uq_attendance_sessions_lista
  on attendance_sessions (program_id, attendance_date, class_group, period, list_type);

create index if not exists idx_attendance_sessions_tipo
  on attendance_sessions (program_id, list_type, attendance_date);
