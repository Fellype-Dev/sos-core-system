-- Remove o valor padrao de turma para novos alunos.
alter table students alter column class_group drop default;
alter table students alter column class_group drop not null;
