-- Script para testar query de agendamento
-- Usar: supabase db execute --file test-appointment-query.sql

-- 1. Verificar se o agendamento existe
SELECT 
  id,
  patient_id,
  therapist_id,
  organization_id,
  status,
  appointment_date,
  appointment_time,
  created_at
FROM appointments
WHERE id = 'bafc8096-eba2-446c-952c-fe73b05c7933';

-- 2. Verificar políticas RLS na tabela appointments
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

-- 3. Verificar se RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'appointments';

-- 4. Testar query como usuário autenticado (simular)
-- Primeiro, vamos ver qual é o organization_id do agendamento
SELECT 
  a.id,
  a.organization_id as appointment_org,
  p.organization_id as patient_org,
  a.patient_id,
  a.status
FROM appointments a
LEFT JOIN patients p ON p.id = a.patient_id
WHERE a.id = 'bafc8096-eba2-446c-952c-fe73b05c7933';

-- 5. Verificar se há agendamentos com esse ID mas organização diferente
SELECT 
  id,
  organization_id,
  patient_id,
  status,
  appointment_date
FROM appointments
WHERE id = 'bafc8096-eba2-446c-952c-fe73b05c7933'
  OR patient_id IN (
    SELECT patient_id 
    FROM appointments 
    WHERE id = 'bafc8096-eba2-446c-952c-fe73b05c7933'
  );

-- 6. Verificar usuários e suas organizações
SELECT 
  p.id as profile_id,
  p.user_id,
  p.organization_id,
  p.role,
  u.email
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'rafael.minatto@yahoo.com.br'
LIMIT 1;
