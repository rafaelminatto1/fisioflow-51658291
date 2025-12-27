-- =====================================================
-- FisioFlow v3.0 - Sistema de Audit Logs
-- Criado em: 25/12/2025
-- =====================================================

-- Tabela de audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Função para criar audit log
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_organization_id UUID,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    organization_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função genérica para trigger de audit
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_organization_id UUID;
BEGIN
  -- Tentar obter user_id do contexto
  v_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
  
  -- Obter organization_id do registro se disponível
  IF TG_OP = 'UPDATE' THEN
    v_organization_id := COALESCE(NEW.organization_id, OLD.organization_id);
  ELSIF TG_OP = 'INSERT' THEN
    v_organization_id := NEW.organization_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_organization_id := OLD.organization_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      v_user_id,
      v_organization_id,
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM create_audit_log(
      v_user_id,
      v_organization_id,
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      v_user_id,
      v_organization_id,
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD)::jsonb,
      NULL
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers para tabelas críticas
-- Patients
DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Appointments
DROP TRIGGER IF EXISTS audit_appointments ON appointments;
CREATE TRIGGER audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Sessions
DROP TRIGGER IF EXISTS audit_sessions ON sessions;
CREATE TRIGGER audit_sessions
  AFTER INSERT OR UPDATE OR DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Payments
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Medical Records
DROP TRIGGER IF EXISTS audit_medical_records ON medical_records;
CREATE TRIGGER audit_medical_records
  AFTER INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Exercise Prescriptions
DROP TRIGGER IF EXISTS audit_exercise_prescriptions ON exercise_prescriptions;
CREATE TRIGGER audit_exercise_prescriptions
  AFTER INSERT OR UPDATE OR DELETE ON exercise_prescriptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Pain Maps
DROP TRIGGER IF EXISTS audit_pain_maps ON pain_maps;
CREATE TRIGGER audit_pain_maps
  AFTER INSERT OR UPDATE OR DELETE ON pain_maps
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem ver audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.organization_id = audit_logs.organization_id
    )
  );

-- Policy: Service role pode inserir logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE audit_logs IS 'Registra todas as alterações em tabelas críticas para compliance LGPD';
COMMENT ON COLUMN audit_logs.action IS 'Ação: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN audit_logs.old_data IS 'Dados antigos (UPDATE/DELETE)';
COMMENT ON COLUMN audit_logs.new_data IS 'Dados novos (INSERT/UPDATE)';

