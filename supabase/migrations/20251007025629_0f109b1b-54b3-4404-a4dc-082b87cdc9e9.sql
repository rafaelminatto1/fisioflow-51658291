-- Adicionar mais agendamentos para MVP completo
-- Usando pacientes existentes e distribuídos ao longo de 4 semanas

DO $$
DECLARE
  pacientes uuid[];
  p1 uuid;
  p2 uuid;
  p3 uuid;
  p4 uuid;
  p5 uuid;
  p6 uuid;
BEGIN
  -- Buscar IDs dos primeiros 6 pacientes
  SELECT ARRAY_AGG(id) INTO pacientes FROM (SELECT id FROM patients LIMIT 6) sub;
  
  p1 := pacientes[1];
  p2 := pacientes[2];
  p3 := pacientes[3];
  p4 := pacientes[4];
  p5 := pacientes[5];
  p6 := pacientes[6];

  -- Semana atual - agendamentos adicionais
  INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration, type, status, notes) VALUES
  (p2, CURRENT_DATE, '08:00', 60, 'Fisioterapia Ortopédica', 'agendado', 'Sessão de fortalecimento'),
  (p3, CURRENT_DATE, '10:30', 45, 'Fisioterapia Respiratória', 'agendado', 'Exercícios respiratórios'),
  (p5, CURRENT_DATE, '14:00', 60, 'RPG', 'agendado', 'Avaliação postural'),
  (p6, CURRENT_DATE, '16:30', 45, 'Pilates', 'agendado', 'Aula em grupo'),
  
  (p1, CURRENT_DATE + 1, '07:30', 60, 'Fisioterapia Ortopédica', 'confirmado', 'Continuação do tratamento'),
  (p4, CURRENT_DATE + 1, '09:00', 45, 'Fisioterapia Esportiva', 'agendado', 'Preparação para competição'),
  (p2, CURRENT_DATE + 1, '11:00', 60, 'Acupuntura', 'confirmado', 'Tratamento de dor crônica'),
  (p5, CURRENT_DATE + 1, '15:30', 45, 'Drenagem Linfática', 'agendado', 'Pós-operatório'),
  
  (p3, CURRENT_DATE + 2, '08:30', 60, 'Fisioterapia Neurológica', 'agendado', 'Reabilitação neurológica'),
  (p6, CURRENT_DATE + 2, '10:00', 45, 'Pilates', 'confirmado', 'Fortalecimento core'),
  (p1, CURRENT_DATE + 2, '13:30', 60, 'RPG', 'agendado', 'Correção postural'),
  (p4, CURRENT_DATE + 2, '16:00', 45, 'Fisioterapia Ortopédica', 'agendado', 'Mobilização articular'),
  
  (p2, CURRENT_DATE + 3, '09:00', 60, 'Fisioterapia Esportiva', 'agendado', 'Treino funcional'),
  (p5, CURRENT_DATE + 3, '11:00', 45, 'Acupuntura', 'confirmado', 'Tratamento complementar'),
  (p3, CURRENT_DATE + 3, '14:00', 60, 'Pilates', 'agendado', 'Fortalecimento muscular'),
  (p1, CURRENT_DATE + 3, '16:30', 45, 'Fisioterapia Respiratória', 'agendado', 'Exercícios de expansão');

  -- Semana +1 (próxima semana)
  INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration, type, status, notes) VALUES
  (p1, CURRENT_DATE + 7, '08:00', 60, 'Consulta Inicial', 'agendado', 'Primeira consulta'),
  (p2, CURRENT_DATE + 7, '10:00', 45, 'Fisioterapia Ortopédica', 'agendado', 'Tratamento de joelho'),
  (p3, CURRENT_DATE + 7, '14:30', 60, 'Fisioterapia Esportiva', 'agendado', 'Recuperação muscular'),
  (p4, CURRENT_DATE + 7, '16:00', 45, 'Pilates', 'confirmado', 'Exercícios de equilíbrio'),
  
  (p5, CURRENT_DATE + 8, '09:00', 60, 'RPG', 'agendado', 'Tratamento de escoliose'),
  (p6, CURRENT_DATE + 8, '11:30', 45, 'Acupuntura', 'confirmado', 'Alívio de tensão'),
  (p2, CURRENT_DATE + 8, '15:00', 60, 'Fisioterapia Respiratória', 'agendado', 'Exercícios de expansão'),
  (p3, CURRENT_DATE + 8, '17:00', 45, 'Drenagem Linfática', 'agendado', 'Redução de edema'),
  
  (p1, CURRENT_DATE + 9, '08:30', 60, 'Fisioterapia Neurológica', 'agendado', 'Treino de marcha'),
  (p4, CURRENT_DATE + 9, '10:30', 45, 'Fisioterapia Ortopédica', 'confirmado', 'Fortalecimento lombar'),
  (p5, CURRENT_DATE + 9, '14:00', 60, 'Pilates', 'agendado', 'Aula avançada'),
  (p6, CURRENT_DATE + 9, '16:30', 45, 'Fisioterapia Esportiva', 'agendado', 'Prevenção de lesões'),
  
  (p2, CURRENT_DATE + 10, '09:00', 60, 'Acupuntura', 'agendado', 'Relaxamento'),
  (p4, CURRENT_DATE + 10, '11:00', 45, 'RPG', 'confirmado', 'Correção postural'),
  (p6, CURRENT_DATE + 10, '15:00', 60, 'Fisioterapia Ortopédica', 'agendado', 'Mobilização');

  -- Semana +2
  INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration, type, status, notes) VALUES
  (p2, CURRENT_DATE + 14, '07:30', 60, 'Fisioterapia Ortopédica', 'agendado', 'Mobilização articular'),
  (p3, CURRENT_DATE + 14, '09:30', 45, 'RPG', 'agendado', 'Correção de desvios'),
  (p4, CURRENT_DATE + 14, '13:00', 60, 'Acupuntura', 'agendado', 'Tratamento complementar'),
  (p1, CURRENT_DATE + 14, '15:30', 45, 'Pilates', 'agendado', 'Fortalecimento'),
  
  (p5, CURRENT_DATE + 15, '08:00', 60, 'Fisioterapia Respiratória', 'agendado', 'Técnicas de respiração'),
  (p6, CURRENT_DATE + 15, '10:00', 45, 'Fisioterapia Esportiva', 'agendado', 'Condicionamento'),
  (p1, CURRENT_DATE + 15, '14:00', 60, 'Drenagem Linfática', 'agendado', 'Tratamento estético'),
  (p2, CURRENT_DATE + 15, '16:00', 45, 'Fisioterapia Neurológica', 'agendado', 'Coordenação motora'),
  
  (p3, CURRENT_DATE + 16, '09:00', 60, 'Fisioterapia Ortopédica', 'agendado', 'Ombro congelado'),
  (p4, CURRENT_DATE + 16, '11:00', 45, 'Pilates', 'agendado', 'Exercícios terapêuticos'),
  (p5, CURRENT_DATE + 16, '15:00', 60, 'RPG', 'agendado', 'Manutenção postural'),
  (p6, CURRENT_DATE + 16, '17:00', 45, 'Acupuntura', 'agendado', 'Relaxamento muscular'),
  
  (p1, CURRENT_DATE + 17, '08:00', 60, 'Fisioterapia Esportiva', 'agendado', 'Treino de resistência'),
  (p3, CURRENT_DATE + 17, '10:30', 45, 'Fisioterapia Respiratória', 'agendado', 'Técnicas avançadas'),
  (p5, CURRENT_DATE + 17, '14:30', 60, 'Pilates', 'agendado', 'Core stability');

  -- Semana +3
  INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration, type, status, notes) VALUES
  (p1, CURRENT_DATE + 21, '08:00', 60, 'Fisioterapia Esportiva', 'agendado', 'Retorno ao esporte'),
  (p2, CURRENT_DATE + 21, '10:30', 45, 'Fisioterapia Ortopédica', 'agendado', 'Alta prevista'),
  (p3, CURRENT_DATE + 21, '14:00', 60, 'Pilates', 'agendado', 'Manutenção'),
  (p4, CURRENT_DATE + 21, '16:00', 45, 'Fisioterapia Respiratória', 'agendado', 'Avaliação final'),
  
  (p5, CURRENT_DATE + 22, '09:00', 60, 'RPG', 'agendado', 'Sessão de reforço'),
  (p6, CURRENT_DATE + 22, '11:00', 45, 'Drenagem Linfática', 'agendado', 'Tratamento contínuo'),
  (p1, CURRENT_DATE + 22, '15:00', 60, 'Acupuntura', 'agendado', 'Bem-estar'),
  (p2, CURRENT_DATE + 22, '17:00', 45, 'Fisioterapia Neurológica', 'agendado', 'Continuidade'),
  
  (p3, CURRENT_DATE + 23, '08:30', 60, 'Fisioterapia Ortopédica', 'agendado', 'Avaliação de progresso'),
  (p4, CURRENT_DATE + 23, '10:00', 45, 'Pilates', 'agendado', 'Fortalecimento global'),
  (p6, CURRENT_DATE + 23, '14:00', 60, 'Fisioterapia Esportiva', 'agendado', 'Performance'),
  (p5, CURRENT_DATE + 23, '16:00', 45, 'Acupuntura', 'agendado', 'Equilíbrio energético');

  -- Alguns agendamentos passados com diferentes status
  INSERT INTO appointments (patient_id, appointment_date, appointment_time, duration, type, status, notes) VALUES
  (p1, CURRENT_DATE - 14, '09:00', 60, 'Consulta Inicial', 'concluido', 'Avaliação inicial realizada'),
  (p2, CURRENT_DATE - 13, '10:00', 45, 'Fisioterapia Ortopédica', 'concluido', 'Progresso satisfatório'),
  (p3, CURRENT_DATE - 12, '14:00', 60, 'Pilates', 'falta', 'Paciente não compareceu'),
  (p4, CURRENT_DATE - 11, '16:00', 45, 'RPG', 'concluido', 'Boa evolução'),
  (p5, CURRENT_DATE - 10, '08:00', 60, 'Acupuntura', 'cancelado', 'Paciente solicitou cancelamento'),
  (p6, CURRENT_DATE - 9, '11:00', 45, 'Fisioterapia Esportiva', 'concluido', 'Recuperação em andamento'),
  (p1, CURRENT_DATE - 8, '15:00', 60, 'Fisioterapia Respiratória', 'concluido', 'Técnicas aplicadas'),
  (p2, CURRENT_DATE - 7, '09:30', 45, 'Pilates', 'concluido', 'Fortalecimento realizado'),
  (p3, CURRENT_DATE - 6, '11:00', 60, 'Fisioterapia Neurológica', 'concluido', 'Evolução positiva'),
  (p4, CURRENT_DATE - 5, '14:00', 45, 'Acupuntura', 'falta', 'Não compareceu'),
  (p5, CURRENT_DATE - 4, '16:00', 60, 'Fisioterapia Ortopédica', 'concluido', 'Mobilização realizada'),
  (p6, CURRENT_DATE - 3, '08:00', 45, 'RPG', 'concluido', 'Postura corrigida'),
  (p1, CURRENT_DATE - 2, '10:00', 60, 'Drenagem Linfática', 'concluido', 'Redução de edema'),
  (p2, CURRENT_DATE - 1, '15:00', 45, 'Fisioterapia Esportiva', 'concluido', 'Treino completado');

END $$;