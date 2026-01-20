-- Migration para adicionar entries em auth.identities para usuários criados via SQL
-- NOTA: Esta migration deve ser executada com permissões de service role

DO $$
DECLARE
  v_instance_id uuid;
  admin_user_id uuid;
  fisio_user_id uuid;
  estagiario_user_id uuid;
  rafael_user_id uuid;
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
  SELECT id INTO rafael_user_id FROM auth.users WHERE email = 'rafael.minatto@yahoo.com.br' LIMIT 1;

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

  -- Criar identity para rafael (se não existir)
  IF rafael_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = rafael_user_id AND provider = 'email'
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
      rafael_user_id,
      jsonb_build_object('email', 'rafael.minatto@yahoo.com.br', 'email_verified', true, 'sub', rafael_user_id::text),
      'email',
      now(),
      now(),
      now()
    );
    RAISE NOTICE 'Identity criada para rafael';
  END IF;

  RAISE NOTICE 'Identities processadas';
END $$;
