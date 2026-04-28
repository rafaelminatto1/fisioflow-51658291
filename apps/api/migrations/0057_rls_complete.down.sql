-- Rollback: 0057_rls_complete
-- Desabilita RLS e remove todas as políticas criadas pela migration.
-- ATENÇÃO: Executar APENAS em emergência — remover RLS expõe dados multi-tenant.

-- Para cada tabela com RLS habilitado pela migration, executar:
-- ALTER TABLE <tabela> DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS org_isolation_<tabela> ON <tabela>;

-- Exemplo para tabelas críticas:
ALTER TABLE patients    DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents   DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals       DISABLE ROW LEVEL SECURITY;
-- Adicione todas as tabelas modificadas pela migration 0057 conforme necessário.
