-- Novos cargos com o mesmo nivel de acesso do coordenador (escopo de unidade).
-- A distincao e apenas de cargo; as permissoes sao identicas.

alter table users drop constraint if exists users_role_check;

alter table users
    add constraint users_role_check
    check (role in ('admin', 'sede', 'coordenador', 'tecnico', 'assistente'));
