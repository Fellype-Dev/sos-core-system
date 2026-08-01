-- Dados do SISC (sistema externo). O grupo do SISC usa o mesmo slug das turmas
-- em class_groups, para permitir comparar com students.class_group e apontar divergencias.

alter table students add column if not exists sisc_link_date date;
alter table students add column if not exists sisc_group text;
