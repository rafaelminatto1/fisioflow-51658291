-- Rollback: 0056_roles_rls_security
-- Remove role app_runtime e revoga grants
-- ATENÇÃO: Só executar se o Worker não estiver usando este role.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_runtime;
DROP ROLE IF EXISTS app_runtime;
