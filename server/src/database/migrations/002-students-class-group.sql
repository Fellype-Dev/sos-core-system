-- Turma do aluno (mesmo conceito de class_group na chamada).
alter table students add column if not exists class_group text;

create index if not exists idx_students_program_class on students (program_id, class_group);

comment on column students.class_group is 'Turma dentro da unidade (ex.: A, B); usada na chamada e listagens.';
