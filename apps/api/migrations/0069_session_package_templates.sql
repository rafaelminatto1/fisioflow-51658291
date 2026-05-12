-- Migration: Session Package Templates
-- Description: Inserts standard clinical package templates for Mooca Fisio organization to drive adoption.

INSERT INTO session_packages (organization_id, name, total_sessions, price, valid_days, description, is_active)
VALUES 
('00000000-0000-0000-0000-000000000001', '10 Sessões - Fisioterapia Traumato-Ortopédica', 10, 1500, 180, 'Pacote focado em reabilitação ortopédica (Lombar, Joelho, Ombro). Validade 6 meses.', true),
('00000000-0000-0000-0000-000000000001', '20 Sessões - Reabilitação Funcional / Pilates', 20, 2600, 365, 'Tratamento de longo prazo ou manutenção. Melhor custo-benefício. Validade 1 ano.', true),
('00000000-0000-0000-0000-000000000001', 'Avaliação + 5 Sessões - Pacote Inicial', 6, 950, 90, 'Ideal para novos pacientes. Inclui a primeira avaliação técnica. Validade 3 meses.', true)
ON CONFLICT DO NOTHING;
