-- Pessoas autorizadas a retirar o assistido da unidade.
-- Não necessariamente familiares (ex.: vizinha, madrinha, motorista da van).
-- Formato: [{ name, document, phone, relationship, notes }]

alter table students add column if not exists authorized_pickups jsonb;
