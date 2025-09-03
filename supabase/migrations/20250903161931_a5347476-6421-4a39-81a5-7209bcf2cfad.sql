-- Inserir um usuário admin demo na tabela profiles
INSERT INTO public.profiles (
  id,
  user_id,
  full_name,
  role,
  onboarding_completed,
  is_active,
  phone,
  created_at,
  updated_at
) VALUES (
  'demo-admin-id',
  'demo-admin-user-id',
  'Admin Demo',
  'admin',
  true,
  true,
  '(11) 99999-9999',
  now(),
  now()
);

-- Inserir um fisioterapeuta demo
INSERT INTO public.profiles (
  id,
  user_id,
  full_name,
  role,
  onboarding_completed,
  is_active,
  phone,
  crefito,
  specialties,
  created_at,
  updated_at
) VALUES (
  'demo-fisio-id',
  'demo-fisio-user-id',
  'Dr. Fisioterapeuta Demo',
  'fisioterapeuta',
  true,
  true,
  '(11) 88888-8888',
  'CREFITO-3/123456',
  ARRAY['Ortopedia', 'Neurologia'],
  now(),
  now()
);

-- Inserir um paciente demo
INSERT INTO public.profiles (
  id,
  user_id,
  full_name,
  role,
  onboarding_completed,
  is_active,
  phone,
  birth_date,
  created_at,
  updated_at
) VALUES (
  'demo-paciente-id',
  'demo-paciente-user-id',
  'Paciente Demo',
  'paciente',
  true,
  true,
  '(11) 77777-7777',
  '1990-01-01',
  now(),
  now()
);