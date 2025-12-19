-- =====================================================
-- SISTEMA DE AUDITORIA COMPLETO
-- Triggers automáticos para tabelas críticas
-- =====================================================

-- Adicionar colunas extras na audit_log se não existirem
DO $$
BEGIN
  -- Adicionar coluna changes para diff
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audit_log' AND column_name = 'changes') THEN
    ALTER TABLE public.audit_log ADD COLUMN changes JSONB;
  END IF;
  
  -- Adicionar coluna session_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'audit_log' AND column_name = 'session_id') THEN
    ALTER TABLE public.audit_log ADD COLUMN session_id TEXT;
  END IF;
END $$;

-- Criar tabela de backups se não existir
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, manual
  file_path TEXT,
  file_size_bytes BIGINT,
  tables_included TEXT[],
  records_count JSONB, -- {"patients": 100, "appointments": 500, ...}
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, restored
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  restored_by UUID,
  error_message TEXT,
  created_by UUID,
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para backup_logs
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver backups" ON public.backup_logs
  FOR SELECT USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins podem criar backups" ON public.backup_logs
  FOR INSERT WITH CHECK (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar backups" ON public.backup_logs
  FOR UPDATE USING (public.user_is_admin(auth.uid()));

-- =====================================================
-- FUNÇÃO DE AUDITORIA GENÉRICA
-- =====================================================
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_data JSONB;
  _new_data JSONB;
  _changes JSONB;
  _record_id TEXT;
  _action TEXT;
BEGIN
  -- Determinar a ação
  IF TG_OP = 'DELETE' THEN
    _action := 'DELETE';
    _old_data := to_jsonb(OLD);
    _new_data := NULL;
    _record_id := OLD.id::TEXT;
    _changes := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'UPDATE';
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    _record_id := NEW.id::TEXT;
    -- Calcular diferenças
    SELECT jsonb_object_agg(key, jsonb_build_object('old', _old_data->key, 'new', value))
    INTO _changes
    FROM jsonb_each(_new_data)
    WHERE _old_data->key IS DISTINCT FROM value;
  ELSIF TG_OP = 'INSERT' THEN
    _action := 'INSERT';
    _old_data := NULL;
    _new_data := to_jsonb(NEW);
    _record_id := NEW.id::TEXT;
    _changes := NULL;
  END IF;

  -- Inserir no log
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    changes,
    timestamp
  ) VALUES (
    auth.uid(),
    _action,
    TG_TABLE_NAME,
    _record_id,
    _old_data,
    _new_data,
    _changes,
    now()
  );

  -- Retornar o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- TRIGGERS PARA TABELAS CRÍTICAS
-- =====================================================

-- Patients
DROP TRIGGER IF EXISTS audit_patients_changes ON public.patients;
CREATE TRIGGER audit_patients_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Appointments
DROP TRIGGER IF EXISTS audit_appointments_changes ON public.appointments;
CREATE TRIGGER audit_appointments_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Contas Financeiras (Transactions)
DROP TRIGGER IF EXISTS audit_contas_financeiras_changes ON public.contas_financeiras;
CREATE TRIGGER audit_contas_financeiras_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Profiles (Users)
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- User Roles
DROP TRIGGER IF EXISTS audit_user_roles_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Session Packages
DROP TRIGGER IF EXISTS audit_session_packages_changes ON public.session_packages;
CREATE TRIGGER audit_session_packages_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.session_packages
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Eventos
DROP TRIGGER IF EXISTS audit_eventos_changes ON public.eventos;
CREATE TRIGGER audit_eventos_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Leads
DROP TRIGGER IF EXISTS audit_leads_changes ON public.leads;
CREATE TRIGGER audit_leads_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Exercises
DROP TRIGGER IF EXISTS audit_exercises_changes ON public.exercises;
CREATE TRIGGER audit_exercises_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- Vouchers
DROP TRIGGER IF EXISTS audit_vouchers_changes ON public.vouchers;
CREATE TRIGGER audit_vouchers_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- =====================================================
-- FUNÇÃO PARA LIMPAR LOGS ANTIGOS (30 dias)
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar logs de auditoria com mais de 90 dias
  DELETE FROM public.audit_log
  WHERE timestamp < now() - interval '90 days';
  
  -- Deletar backups com mais de 30 dias (manter referência apenas)
  UPDATE public.backup_logs
  SET status = 'expired'
  WHERE created_at < now() - interval '30 days'
    AND status = 'completed';
END;
$$;

-- Índice para busca rápida nos logs
CREATE INDEX IF NOT EXISTS idx_audit_log_action_table 
ON public.audit_log (action, table_name);

CREATE INDEX IF NOT EXISTS idx_audit_log_record 
ON public.audit_log (record_id);

CREATE INDEX IF NOT EXISTS idx_backup_logs_status 
ON public.backup_logs (status, created_at DESC);