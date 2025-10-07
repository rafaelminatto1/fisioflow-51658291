-- ========================================
-- CORREÇÕES FINAIS DE SEGURANÇA
-- Proteger dados sensíveis em profiles e patients
-- ========================================

-- 1. CORRIGIR POLÍTICAS DA TABELA PROFILES
-- ========================================
-- Problema: emails e phones estão expostos publicamente

-- Remover políticas antigas que podem estar muito permissivas
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Política: Usuários veem apenas o próprio perfil completo
-- (já existe, mas garantindo)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política: Terapeutas podem ver perfis básicos de pacientes (sem dados sensíveis na query)
-- Nota: Terapeutas veem perfis através da relação com patients
CREATE POLICY "Therapists can view patient profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role, 'estagiario'::app_role])
);

-- 2. REFORÇAR POLÍTICAS DA TABELA PATIENTS
-- ========================================
-- Garantir que já não há acesso público

-- Verificar se RLS está habilitado
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Remover qualquer política pública residual
DROP POLICY IF EXISTS "Public patients are viewable by everyone" ON patients;
DROP POLICY IF EXISTS "Allow public access to patients" ON patients;
DROP POLICY IF EXISTS "Enable read access for all users" ON patients;

-- 3. ADICIONAR ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índice para acelerar verificação de user_id em profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

-- Índice para acelerar consultas de pacientes por status
CREATE INDEX IF NOT EXISTS idx_patients_status 
ON patients(status) WHERE status = 'active';

-- 4. DOCUMENTAÇÃO DAS POLÍTICAS
-- ========================================

COMMENT ON POLICY "Users can view own profile" ON profiles IS 
'Usuários autenticados podem visualizar apenas seu próprio perfil completo.';

COMMENT ON POLICY "Therapists can view patient profiles" ON profiles IS 
'Terapeutas (admin, fisio, estagiário) podem visualizar perfis de usuários para fins clínicos.';

-- 5. VERIFICAÇÃO FINAL DE SEGURANÇA
-- ========================================

-- Garantir que todas as tabelas críticas têm RLS habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE soap_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;