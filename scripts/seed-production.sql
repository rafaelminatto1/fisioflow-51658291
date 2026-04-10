-- Seed Script: 10 Pacientes, 100 Agendamentos, 100 Evoluções
-- Clínica: moocafisio.com.br
-- Executar via Cloudflare API

BEGIN;

-- ============================================
-- FASE 1: PACIENTES (10 pacientes)
-- ============================================

INSERT INTO patients (id, organization_id, full_name, cpf, email, phone, birth_date, gender, main_condition, status, progress, is_active)
VALUES 
  -- Paciente 1: João Silva - Lombalgia
  ('11111111-0000-0000-0000-000000000001', 'ORG-MOOCAFISIO', 'João Silva', '123.456.789-00', 'joao.silva@email.com', '+5511999990001', '1985-03-15', 'M', 'Lombalgia', 'Em Tratamento', 30, true),
  
  -- Paciente 2: Maria Santos - Pós-op joelho
  ('22222222-0000-0000-0000-000000000002', 'ORG-MOOCAFISIO', 'Maria Santos', '234.567.891-00', 'maria.santos@email.com', '+5511999990002', '1990-07-22', 'F', 'Pós-operatório de artroplastia de joelho', 'Em Tratamento', 45, true),
  
  -- Paciente 3: Pedro Oliveira - Cervicalgia
  ('33333333-0000-0000-0000-000000000003', 'ORG-MOOCAFISIO', 'Pedro Oliveira', '345.678.912-00', 'pedro.oliveira@email.com', '+5511999990003', '1978-11-08', 'M', 'Cervicalgia crônica', 'Em Tratamento', 25, true),
  
  -- Paciente 4: Ana Costa - Artrose
  ('44444444-0000-0000-0000-000000000004', 'ORG-MOOCAFISIO', 'Ana Costa', '456.789.123-00', 'ana.costa@email.com', '+5511999990004', '1965-02-28', 'F', 'Artrose em joelho direito', 'Em Tratamento', 50, true),
  
  -- Paciente 5: Carlos Ferreira - Escoliose
  ('55555555-0000-0000-0000-000000000005', 'ORG-MOOCAFISIO', 'Carlos Ferreira', '567.891.234-00', 'carlos.ferreira@email.com', '+5511999990005', '2010-09-12', 'M', 'Escoliose idiopática', 'Em Tratamento', 15, true),
  
  -- Paciente 6: Beatriz Lima - Tendinite
  ('66666666-0000-0000-0000-000000000006', 'ORG-MOOCAFISIO', 'Beatriz Lima', '678.912.345-00', 'beatriz.lima@email.com', '+5511999990006', '1995-05-03', 'F', 'Tendinite de ombro direito', 'Em Tratamento', 35, true),
  
  -- Paciente 7: Ricardo Souza - Lesão esportiva
  ('77777777-0000-0000-0000-000000000007', 'ORG-MOOCAFISIO', 'Ricardo Souza', '789.123.456-00', 'ricardo.souza@email.com', '+5511999990007', '1988-12-20', 'M', 'Lesão ligamentar em tornozelo', 'Em Tratamento', 40, true),
  
  -- Paciente 8: Juliana Alves - Fibromialgia
  ('88888888-0000-0000-0000-000000000008', 'ORG-MOOCAFISIO', ' Juliana Alves', '891.234.567-00', 'juliana.alves@email.com', '+5511999990008', '1972-08-14', 'F', 'Fibromialgia', 'Em Tratamento', 20, true),
  
  -- Paciente 9: Marcos Pereira - Hérnia de disco
  ('99999999-0000-0000-0000-000000000009', 'ORG-MOOCAFISIO', 'Marcos Pereira', '912.345.678-00', 'marcos.pereira@email.com', '+5511999990009', '1980-01-30', 'M', 'Hérnia de disco L4-L5', 'Em Tratamento', 55, true),
  
  -- Paciente 10: Fernanda Rodrigues - Parkinson
  ('aaaaaaaa-0000-0000-0000-000000000010', 'ORG-MOOCAFISIO', 'Fernanda Rodrigues', '023.456.789-00', 'fernanda.rodrigues@email.com', '+5511999990010', '1958-04-18', 'F', 'Doença de Parkinson', 'Em Tratamento', 60, true)
ON CONFLICT (id) DO NOTHING;

COMMIT;