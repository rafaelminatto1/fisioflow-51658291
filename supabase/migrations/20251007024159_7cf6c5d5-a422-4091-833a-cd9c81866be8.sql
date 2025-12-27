-- Populando sistema com dados demo

-- Habilitar extensão pgcrypto (necessária para triggers de hash de CPF)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Desabilitar temporariamente triggers para inserção de dados demo
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Desabilitar trigger de hash de CPF
    ALTER TABLE public.patients DISABLE TRIGGER encrypt_patient_cpf_trigger;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Trigger pode não existir ainda
END $$;

-- Desabilitar todos os triggers que usam encrypt_sensitive_data
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND (trigger_name LIKE '%encrypt%' OR trigger_name LIKE '%cpf%')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Desabilitar triggers de auditoria que podem ter colunas incompatíveis
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE '%audit%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DISABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Inserir pacientes demo
INSERT INTO public.patients (id, name, email, phone, birth_date, cpf, address, city, state, zip_code, health_insurance, insurance_number, emergency_contact, emergency_phone, observations, status)
VALUES
  (gen_random_uuid(), 'Ana Silva', 'ana.silva@email.com', '(11) 98765-4321', '1985-03-15', '123.456.789-00', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', 'Unimed', '123456789', 'João Silva', '(11) 91234-5678', 'Paciente com histórico de lesão no joelho', 'active'),
  (gen_random_uuid(), 'Carlos Oliveira', 'carlos.oliveira@email.com', '(11) 97654-3210', '1990-07-22', '234.567.890-11', 'Av. Paulista, 456', 'São Paulo', 'SP', '01310-100', 'Bradesco Saúde', '987654321', 'Maria Oliveira', '(11) 92345-6789', 'Tratamento de coluna lombar', 'active'),
  (gen_random_uuid(), 'Beatriz Santos', 'beatriz.santos@email.com', '(11) 96543-2109', '1978-11-30', '345.678.901-22', 'Rua Augusta, 789', 'São Paulo', 'SP', '01305-000', 'SulAmérica', '456789123', 'Pedro Santos', '(11) 93456-7890', 'Reabilitação pós-cirúrgica', 'active'),
  (gen_random_uuid(), 'Diego Ferreira', 'diego.ferreira@email.com', '(11) 95432-1098', '1995-05-18', '456.789.012-33', 'Rua Oscar Freire, 321', 'São Paulo', 'SP', '01426-001', 'Amil', '789123456', 'Laura Ferreira', '(11) 94567-8901', 'Fisioterapia esportiva', 'active'),
  (gen_random_uuid(), 'Elena Costa', 'elena.costa@email.com', '(11) 94321-0987', '1982-09-25', '567.890.123-44', 'Av. Rebouças, 654', 'São Paulo', 'SP', '05402-000', 'Particular', NULL, 'Roberto Costa', '(11) 95678-9012', 'Tratamento de ombro', 'active'),
  (gen_random_uuid(), 'Fernando Lima', 'fernando.lima@email.com', '(11) 93210-9876', '1988-12-10', '678.901.234-55', 'Rua Haddock Lobo, 987', 'São Paulo', 'SP', '01414-001', 'Porto Seguro', '321654987', 'Juliana Lima', '(11) 96789-0123', 'Lesão muscular', 'active');

-- Inserir exercícios demo (usando valores corretos: facil, moderado, dificil)
INSERT INTO public.exercises (id, name, description, category, difficulty, duration, sets, repetitions, instructions, image_url, video_url)
VALUES
  (gen_random_uuid(), 'Alongamento de Quadríceps', 'Exercício de alongamento para quadríceps', 'Alongamento', 'facil', 60, 3, 1, 'Fique em pé, segure o tornozelo e puxe em direção ao glúteo. Mantenha por 20 segundos.', NULL, NULL),
  (gen_random_uuid(), 'Fortalecimento de Glúteo', 'Ponte para fortalecimento de glúteos', 'Fortalecimento', 'moderado', 180, 3, 15, 'Deitado de costas, joelhos flexionados, eleve o quadril mantendo a contração.', NULL, NULL),
  (gen_random_uuid(), 'Mobilidade de Ombro', 'Exercício de mobilidade para ombro', 'Mobilidade', 'facil', 90, 2, 10, 'Com um bastão, realize movimentos circulares amplos com os ombros.', NULL, NULL),
  (gen_random_uuid(), 'Agachamento Livre', 'Agachamento para fortalecimento de membros inferiores', 'Fortalecimento', 'moderado', 120, 3, 12, 'Pés afastados na largura dos ombros, desça até 90 graus mantendo as costas retas.', NULL, NULL),
  (gen_random_uuid(), 'Prancha Abdominal', 'Exercício isométrico para core', 'Core', 'moderado', 180, 3, 1, 'Apoie antebraços e pontas dos pés, mantenha corpo alinhado por 30-60 segundos.', NULL, NULL),
  (gen_random_uuid(), 'Mobilidade de Coluna', 'Rotação de tronco sentado', 'Mobilidade', 'facil', 120, 2, 10, 'Sentado, gire o tronco para ambos os lados mantendo o quadril estável.', NULL, NULL),
  (gen_random_uuid(), 'Levantamento Terra', 'Exercício avançado de fortalecimento', 'Fortalecimento', 'dificil', 240, 4, 8, 'Com barra, mantenha costas retas e levante o peso até a posição ereta.', NULL, NULL);

-- Inserir agendamentos demo (próximos 7 dias)
DO $$
DECLARE
  patient_ids uuid[];
  patient_id uuid;
  day_offset int;
  hour_offset int;
BEGIN
  -- Buscar IDs dos pacientes criados
  SELECT array_agg(id) INTO patient_ids FROM public.patients WHERE email LIKE '%@email.com' LIMIT 6;
  
  IF array_length(patient_ids, 1) > 0 THEN
    -- Criar agendamentos para os próximos 7 dias
    FOR day_offset IN 0..6 LOOP
      FOR hour_offset IN 0..2 LOOP
        patient_id := patient_ids[(day_offset + hour_offset) % array_length(patient_ids, 1) + 1];
        
        INSERT INTO public.appointments (
          patient_id,
          appointment_date,
          appointment_time,
          duration,
          type,
          status,
          notes
        ) VALUES (
          patient_id,
          CURRENT_DATE + day_offset,
          (TIME '09:00:00' + (hour_offset * INTERVAL '2 hours'))::time,
          60,
          CASE (day_offset + hour_offset) % 3
            WHEN 0 THEN 'fisioterapia'
            WHEN 1 THEN 'avaliacao'
            ELSE 'retorno'
          END,
          CASE 
            WHEN day_offset = 0 AND hour_offset = 0 THEN 'confirmado'
            WHEN day_offset > 3 THEN 'agendado'
            ELSE 'confirmado'
          END,
          'Sessão de ' || (day_offset + 1)::text
        );
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- Inserir eventos demo
INSERT INTO public.eventos (id, nome, descricao, categoria, local, data_inicio, data_fim, status, gratuito, valor_padrao_prestador, link_whatsapp)
VALUES
  (gen_random_uuid(), 'Corrida São Silvestre 2025', 'Atendimento fisioterapêutico na Corrida de São Silvestre', 'corrida', 'Av. Paulista - São Paulo/SP', '2025-12-31', '2025-12-31', 'AGENDADO', false, 500.00, 'https://wa.me/5511987654321'),
  (gen_random_uuid(), 'Maratona de SP', 'Suporte fisioterapêutico para maratonistas', 'corrida', 'Parque Ibirapuera - São Paulo/SP', '2025-06-15', '2025-06-15', 'AGENDADO', false, 600.00, 'https://wa.me/5511987654321'),
  (gen_random_uuid(), 'Ação Corporativa Tech Corp', 'Atendimento na empresa Tech Corp', 'corporativo', 'Av. Faria Lima, 2500 - São Paulo/SP', '2025-03-20', '2025-03-21', 'AGENDADO', false, 800.00, NULL),
  (gen_random_uuid(), 'Circuito de Corrida Parque Villa-Lobos', 'Evento mensal de corrida', 'corrida', 'Parque Villa-Lobos - São Paulo/SP', '2025-02-28', '2025-02-28', 'EM_ANDAMENTO', true, 0, 'https://wa.me/5511987654321');

-- Inserir prestadores demo
DO $$
DECLARE
  evento_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO evento_ids FROM public.eventos WHERE nome LIKE 'Corrida%' OR nome LIKE 'Maratona%' OR nome LIKE 'Ação%' OR nome LIKE 'Circuito%' LIMIT 4;
  
  IF array_length(evento_ids, 1) >= 4 THEN
    INSERT INTO public.prestadores (evento_id, nome, contato, cpf_cnpj, valor_acordado, status_pagamento)
    VALUES
      (evento_ids[1], 'Dr. Ricardo Almeida', '(11) 99876-5432', '987.654.321-00', 500.00, 'PENDENTE'),
      (evento_ids[1], 'Dra. Juliana Rocha', '(11) 98765-4321', '876.543.210-11', 500.00, 'PAGO'),
      (evento_ids[2], 'Dr. Marcos Silva', '(11) 97654-3210', '765.432.109-22', 600.00, 'PENDENTE'),
      (evento_ids[3], 'Fisio Team LTDA', '(11) 96543-2109', '12.345.678/0001-90', 800.00, 'PAGO'),
      (evento_ids[4], 'Dr. Paulo Santos', '(11) 95432-1098', '654.321.098-33', 0, 'PAGO');
  END IF;
END $$;

-- Inserir participantes demo
DO $$
DECLARE
  evento_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO evento_ids FROM public.eventos WHERE nome LIKE 'Corrida%' OR nome LIKE 'Maratona%' OR nome LIKE 'Ação%' OR nome LIKE 'Circuito%' LIMIT 4;
  
  IF array_length(evento_ids, 1) >= 4 THEN
    INSERT INTO public.participantes (evento_id, nome, contato, instagram, segue_perfil, observacoes)
    VALUES
      (evento_ids[1], 'João Corredor', '(11) 91234-5678', '@joaocorredor', true, 'Primeira participação'),
      (evento_ids[1], 'Maria Atleta', '(11) 92345-6789', '@mariaatleta', true, 'Corredor experiente'),
      (evento_ids[1], 'Pedro Runner', '(11) 93456-7890', '@pedrorunner', false, NULL),
      (evento_ids[2], 'Laura Speed', '(11) 94567-8901', '@lauraspeed', true, 'Maratonista profissional'),
      (evento_ids[3], 'Carlos Tech', '(11) 95678-9012', NULL, false, 'Funcionário Tech Corp'),
      (evento_ids[4], 'Ana Fitness', '(11) 96789-0123', '@anafitness', true, 'Participante regular');
  END IF;
END $$;

-- Inserir itens de checklist demo
DO $$
DECLARE
  evento_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO evento_ids FROM public.eventos WHERE nome LIKE 'Corrida%' OR nome LIKE 'Maratona%' OR nome LIKE 'Ação%' OR nome LIKE 'Circuito%' LIMIT 4;
  
  IF array_length(evento_ids, 1) >= 4 THEN
    INSERT INTO public.checklist_items (evento_id, titulo, tipo, quantidade, custo_unitario, status)
    VALUES
      (evento_ids[1], 'Macas portáteis', 'alugar', 3, 150.00, 'OK'),
      (evento_ids[1], 'Gelo em saco', 'comprar', 20, 5.00, 'OK'),
      (evento_ids[1], 'Bandagens elásticas', 'levar', 15, 0, 'ABERTO'),
      (evento_ids[2], 'Tendas para atendimento', 'alugar', 2, 300.00, 'OK'),
      (evento_ids[2], 'Kit primeiros socorros', 'comprar', 5, 80.00, 'ABERTO'),
      (evento_ids[3], 'Cadeiras para atendimento', 'levar', 10, 0, 'OK'),
      (evento_ids[4], 'Água mineral', 'comprar', 50, 2.50, 'OK');
  END IF;
END $$;

-- Inserir pagamentos demo
DO $$
DECLARE
  evento_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO evento_ids FROM public.eventos WHERE nome LIKE 'Corrida%' OR nome LIKE 'Maratona%' OR nome LIKE 'Ação%' OR nome LIKE 'Circuito%' LIMIT 4;
  
  IF array_length(evento_ids, 1) >= 4 THEN
    INSERT INTO public.pagamentos (evento_id, tipo, descricao, valor, pago_em)
    VALUES
      (evento_ids[1], 'prestador', 'Pagamento Dr. Ricardo', 500.00, CURRENT_DATE - 5),
      (evento_ids[1], 'insumo', 'Compra de gelo', 100.00, CURRENT_DATE - 3),
      (evento_ids[2], 'prestador', 'Pagamento Dr. Marcos', 600.00, CURRENT_DATE - 2),
      (evento_ids[3], 'prestador', 'Pagamento Fisio Team', 800.00, CURRENT_DATE - 1);
  END IF;
END $$;

-- Reabilitar triggers de auditoria
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE '%audit%'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Reabilitar todos os triggers que usam encrypt_sensitive_data
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND (trigger_name LIKE '%encrypt%' OR trigger_name LIKE '%cpf%')
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE TRIGGER %I', 'public', r.event_object_table, r.trigger_name);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;