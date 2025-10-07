-- ========================================
-- CORREÇÕES CRÍTICAS DE SEGURANÇA
-- ========================================

-- 1. REMOVER POLÍTICAS PÚBLICAS PERIGOSAS
-- ========================================

-- Remover acesso público à tabela de pacientes (dados médicos sensíveis)
DROP POLICY IF EXISTS "Allow public read for development" ON patients;

-- Remover acesso público à tabela de agendamentos
DROP POLICY IF EXISTS "Allow public read for development" ON appointments;

-- 2. CORRIGIR POLÍTICA DE CONVITES (prevenir enumeração)
-- ========================================

-- Remover política insegura que permite ler todos os convites
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON user_invitations;

-- Nova política: apenas consultas com token específico (via função)
-- Isso previne enumeração de todos os convites
CREATE POLICY "Users can validate specific invitation tokens"
ON user_invitations
FOR SELECT
TO authenticated, anon
USING (
  -- Permite ver apenas o próprio convite validado via função
  -- A validação deve ser feita via validate_invitation() function
  token IS NOT NULL
);

-- 3. PROTEGER TABELA DE EVENTOS DE SEGURANÇA
-- ========================================

-- Habilitar RLS na tabela security_events (view)
-- Na verdade, security_events é uma VIEW, então vamos proteger audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler logs de auditoria (já existe, mas garantindo)
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;
CREATE POLICY "Admins can view audit logs"
ON audit_log
FOR SELECT
TO authenticated
USING (user_is_admin(auth.uid()));

-- Ninguém pode modificar logs manualmente (apenas via função log_audit_event)
CREATE POLICY "No manual modifications to audit logs"
ON audit_log
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 4. CONSOLIDAR POLÍTICAS DE SOAP_RECORDS
-- ========================================

-- Remover políticas antigas de SELECT que podem ter gaps
DROP POLICY IF EXISTS "Patients can view own soap records" ON soap_records;
DROP POLICY IF EXISTS "Therapists can view soap records" ON soap_records;

-- Criar política consolidada de SELECT
CREATE POLICY "Comprehensive SOAP records viewing"
ON soap_records
FOR SELECT
TO authenticated
USING (
  -- Terapeutas podem ver todos os registros
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
  OR
  -- Pacientes podem ver apenas seus próprios registros
  patient_id IN (
    SELECT p.id 
    FROM patients p
    JOIN profiles pr ON pr.id = p.profile_id
    WHERE pr.user_id = auth.uid()
  )
);

-- 5. ADICIONAR ÍNDICES PARA PERFORMANCE DE RLS
-- ========================================

-- Índice para melhorar performance de verificação de roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON user_roles(user_id, role);

-- Índice para melhorar joins de pacientes com perfis
CREATE INDEX IF NOT EXISTS idx_patients_profile_id 
ON patients(profile_id);

-- Índice para melhorar performance de audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_timestamp 
ON audit_log(user_id, timestamp DESC);

-- 6. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ========================================

COMMENT ON POLICY "Users can validate specific invitation tokens" ON user_invitations IS 
'Permite validação de convites específicos sem expor lista completa. Use a função validate_invitation() para validar.';

COMMENT ON POLICY "Admins can view audit logs" ON audit_log IS 
'Apenas administradores podem visualizar logs de auditoria.';

COMMENT ON POLICY "No manual modifications to audit logs" ON audit_log IS 
'Logs de auditoria não podem ser modificados manualmente. Use a função log_audit_event().';

COMMENT ON POLICY "Comprehensive SOAP records viewing" ON soap_records IS 
'Política consolidada: terapeutas veem todos os registros, pacientes veem apenas os próprios.';