-- Script para resetar todas as tabelas
DELETE FROM user_programs;
DELETE FROM users;
DELETE FROM programs;

-- Resetar sequence se necessário
ALTER SEQUENCE IF EXISTS programs_id_seq RESTART;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART;
