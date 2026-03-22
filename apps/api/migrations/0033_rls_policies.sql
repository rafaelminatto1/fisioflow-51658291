-- Migration 0033: Row Level Security policies for multi-org isolation
-- Aplica RLS nas tabelas principais para isolamento por organização

-- Habilitar RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE standardized_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_plans ENABLE ROW LEVEL SECURITY;

-- Políticas: organization_id do JWT == organization_id da linha
-- O worker define app.org_id via SET LOCAL antes de cada query com RLS

CREATE POLICY "org_isolation_patients" ON patients
  USING (organization_id::text = current_setting('app.org_id', true));

CREATE POLICY "org_isolation_appointments" ON appointments
  USING (organization_id::text = current_setting('app.org_id', true));

CREATE POLICY "org_isolation_sessions" ON sessions
  USING (organization_id::text = current_setting('app.org_id', true));

CREATE POLICY "org_isolation_standardized_tests" ON standardized_test_results
  USING (organization_id::text = current_setting('app.org_id', true));

CREATE POLICY "org_isolation_exercise_plans" ON exercise_plans
  USING (organization_id::text = current_setting('app.org_id', true));

-- Permissão para o role neondb_owner continuar operando sem RLS bloqueio
-- (worker usa este role via Hyperdrive)
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE standardized_test_results FORCE ROW LEVEL SECURITY;
ALTER TABLE exercise_plans FORCE ROW LEVEL SECURITY;
