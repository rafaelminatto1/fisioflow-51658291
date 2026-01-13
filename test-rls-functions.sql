-- Script para testar funções RLS e políticas
-- Executar via: supabase db execute (ou via SQL Editor)

-- 1. Verificar se o agendamento existe e seu organization_id
SELECT 
  id,
  patient_id,
  organization_id,
  status,
  appointment_date,
  appointment_time
FROM appointments
WHERE id = 'bafc8096-eba2-446c-952c-fe73b05c7933';

-- 2. Verificar usuário e sua organização
SELECT 
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.organization_id as user_org_id,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = 'rafael.minatto@yahoo.com.br'
LIMIT 1;

-- 3. Testar função get_user_role() para o usuário
-- (Precisa ser executado como o usuário autenticado, mas podemos simular)
SELECT 
  get_user_role() as current_role,
  get_current_user_org_id() as current_org_id;

-- 4. Verificar todas as políticas RLS na tabela appointments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- 5. Verificar se RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'appointments';

-- 6. Comparar organization_id do agendamento com organization_id do usuário
SELECT 
  a.id as appointment_id,
  a.organization_id as appointment_org,
  p.organization_id as user_org,
  CASE 
    WHEN a.organization_id IS NULL THEN 'Agendamento sem org (deve ser permitido)'
    WHEN a.organization_id = p.organization_id THEN '✅ Organizações coincidem'
    ELSE '❌ Organizações diferentes - RLS vai bloquear!'
  END as status
FROM appointments a
CROSS JOIN (
  SELECT organization_id 
  FROM profiles 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rafael.minatto@yahoo.com.br' LIMIT 1)
  LIMIT 1
) p
WHERE a.id = 'bafc8096-eba2-446c-952c-fe73b05c7933';
