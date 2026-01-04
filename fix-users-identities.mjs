// Script para corrigir usuários criados via SQL adicionando entries em auth.identities
// NOTA: Esta é uma solução alternativa. O ideal é usar Admin API para criar usuários.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ycvbtjfrchcyvmkvuocu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmJ0amZyY2hjeXZta3Z1b2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTA5OTQsImV4cCI6MjA3NTE2Njk5NH0.L5maWG2hc3LVHEUMOzfTRTjYwIAJFXx3zan3G-Y1zAA";

console.log('⚠️  ATENÇÃO: Este script tenta corrigir usuários criados via SQL.');
console.log('   A solução RECOMENDADA é usar Admin API para criar usuários.\n');
console.log('   Este script requer permissões de service role para criar identities.\n');
console.log('   Se não tiver service role key, use create-test-users-admin.mjs\n');

// Este script não pode criar identities diretamente sem service role
// Vamos criar uma migration SQL para isso
console.log('📝 Criando migration SQL para adicionar identities...\n');

const migrationSQL = `-- Migration para adicionar entries em auth.identities para usuários criados via SQL
-- NOTA: Esta migration deve ser executada com permissões de service role

DO $$
DECLARE
  v_instance_id uuid;
  admin_user_id uuid;
  fisio_user_id uuid;
  estagiario_user_id uuid;
BEGIN
  -- Obter instance_id
  SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  IF v_instance_id IS NULL THEN
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Obter IDs dos usuários
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@activityfisio.com' LIMIT 1;
  SELECT id INTO fisio_user_id FROM auth.users WHERE email = 'fisio@activityfisio.com' LIMIT 1;
  SELECT id INTO estagiario_user_id FROM auth.users WHERE email = 'estagiario@activityfisio.com' LIMIT 1;

  -- Criar identity para admin (se não existir)
  IF admin_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = admin_user_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object('email', 'admin@activityfisio.com', 'email_verified', true, 'sub', admin_user_id::text),
      'email',
      now(),
      now(),
      now()
    );
    RAISE NOTICE 'Identity criada para admin';
  END IF;

  -- Criar identity para fisio (se não existir)
  IF fisio_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = fisio_user_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      fisio_user_id,
      jsonb_build_object('email', 'fisio@activityfisio.com', 'email_verified', true, 'sub', fisio_user_id::text),
      'email',
      now(),
      now(),
      now()
    );
    RAISE NOTICE 'Identity criada para fisio';
  END IF;

  -- Criar identity para estagiario (se não existir)
  IF estagiario_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = estagiario_user_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      estagiario_user_id,
      jsonb_build_object('email', 'estagiario@activityfisio.com', 'email_verified', true, 'sub', estagiario_user_id::text),
      'email',
      now(),
      now(),
      now()
    );
    RAISE NOTICE 'Identity criada para estagiario';
  END IF;

  RAISE NOTICE 'Identities processadas';
END $$;
`;

import { writeFileSync } from 'fs';
writeFileSync('supabase/migrations/20260104000000_fix_users_identities.sql', migrationSQL);

console.log('✅ Migration criada: supabase/migrations/20260104000000_fix_users_identities.sql\n');
console.log('📋 Próximos passos:');
console.log('   1. Execute: supabase db push');
console.log('   2. Ou aplique a migration via MCP do Supabase');
console.log('   3. Teste login novamente\n');
console.log('💡 Alternativa: Use create-test-users-admin.mjs com service role key\n');

