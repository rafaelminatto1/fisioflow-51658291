-- Inserir usuários de teste no banco
-- Primeiro, vamos simular a criação de perfis de usuários para teste

-- Admin de teste
INSERT INTO profiles (
  user_id, 
  full_name, 
  role, 
  email, 
  phone, 
  cpf,
  is_active,
  onboarding_completed
) VALUES (
  gen_random_uuid(),
  'Administrador Teste',
  'admin',
  'admin@fisioflow.com.br',
  '(11) 99999-0001',
  '12345678901',
  true,
  true
);

-- Fisioterapeuta de teste
INSERT INTO profiles (
  user_id,
  full_name,
  role,
  email,
  phone,
  cpf,
  crefito,
  specialties,
  experience_years,
  consultation_fee,
  is_active,
  onboarding_completed
) VALUES (
  gen_random_uuid(),
  'Dr. João Silva',
  'fisioterapeuta',
  'joao@fisioflow.com.br',
  '(11) 99999-0002',
  '98765432101',
  '12345-F',
  ARRAY['Ortopedia', 'Neurologia'],
  8,
  150.00,
  true,
  true
);

-- Estagiário de teste
INSERT INTO profiles (
  user_id,
  full_name,
  role,
  email,
  phone,
  cpf,
  is_active,
  onboarding_completed
) VALUES (
  gen_random_uuid(),
  'Maria Santos',
  'estagiario',
  'maria@fisioflow.com.br',
  '(11) 99999-0003',
  '11122233301',
  true,
  true
);

-- Paciente de teste
INSERT INTO profiles (
  user_id,
  full_name,
  role,
  email,
  phone,
  cpf,
  birth_date,
  is_active,
  onboarding_completed
) VALUES (
  gen_random_uuid(),
  'Ana Costa',
  'paciente',
  'ana@email.com',
  '(11) 99999-0004',
  '44455566601',
  '1990-05-15',
  true,
  true
);

-- Parceiro de teste
INSERT INTO profiles (
  user_id,
  full_name,
  role,
  email,
  phone,
  cpf,
  partner_bio,
  partner_specialties,
  partner_pix_key,
  is_active,
  onboarding_completed
) VALUES (
  gen_random_uuid(),
  'Carlos Oliveira',
  'parceiro',
  'carlos@parceiro.com',
  '(11) 99999-0005',
  '77788899901',
  'Fisioterapeuta especialista em reabilitação esportiva com 10 anos de experiência.',
  ARRAY['Fisioterapia Esportiva', 'RPG'],
  'carlos@parceiro.com',
  true,
  true
);