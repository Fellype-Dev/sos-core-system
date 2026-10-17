-- Nome social e observação do técnico de referência.
--
-- O nome social é o nome pelo qual a pessoa se identifica e deve ser usado no
-- tratamento diário; o nome civil continua registrado para os documentos.
--
-- A observação do técnico é distinta das observações do orientador
-- (advisor_notes): são profissionais diferentes, cada um com o seu registro.

alter table students add column if not exists social_name text;
alter table students add column if not exists technician_notes text;
