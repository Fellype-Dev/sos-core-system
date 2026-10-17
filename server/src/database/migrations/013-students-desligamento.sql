-- Ficha de desligamento.
--
-- Expande a desativação que já existia: além de marcar o cadastro como inativo,
-- passa a registrar quando, por quê e com qual observação o usuário foi
-- desligado do serviço. É o que permite os relatórios de desligados por mês.
--
-- Guarda o último desligamento. Se um usuário for reativado e desligado de
-- novo, os campos são sobrescritos pelo registro mais recente.

alter table students add column if not exists deactivated_at date;
alter table students add column if not exists deactivation_reason text;
alter table students add column if not exists deactivation_notes text;

-- Facilita os relatórios por período.
create index if not exists idx_students_deactivated_at
  on students (program_id, deactivated_at)
  where deactivated_at is not null;
