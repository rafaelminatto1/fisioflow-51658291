-- Migration: Clinical Evolution Templates
-- Description: Inserts standard SOAP evolution templates for ACL, Lumbar, and Pilates to drive efficiency.

INSERT INTO evolution_templates (organization_id, nome, descricao, conteudo, ativo)
VALUES 
('00000000-0000-0000-0000-000000000001', 'Evolução LCA (Pós-Op)', 'Foco em ADM de joelho, força de quadríceps e controle de edema.', '<h2>Subjetivo</h2><p>Paciente relata dor nível [X] na escala VAS. Refere estabilidade durante a marcha.</p><h2>Objetivo</h2><p>ADM Flexão: [X]°. Extensão: [X]°. Circunferência patelar: [X]cm.</p><h2>Avaliação</h2><p>Quadro compatível com [X] semanas de pós-operatório. Evolução satisfatória.</p><h2>Plano</h2><p>Manter protocolo de ganho de ADM e iniciar isometria leve.</p>', true),
('00000000-0000-0000-0000-000000000001', 'Coluna Lombar (Aguda)', 'Protocolo de analgesia e controle de mobilidade segmentar.', '<h2>Subjetivo</h2><p>Dor irradiada para [X]. Piora ao [sentar/levantar].</p><h2>Objetivo</h2><p>Teste de Lasègue: [Positivo/Negativo]. Mobilidade segmentar reduzida em [X].</p><h2>Avaliação</h2><p>Disfunção biomecânica lombar com possível compressão radicular.</p><h2>Plano</h2><p>Analgesia via TENS e liberação miofascial profunda.</p>', true),
('00000000-0000-0000-0000-000000000001', 'Pilates Clínico (Manutenção)', 'Foco em controle motor, core e flexibilidade geral.', '<h2>Subjetivo</h2><p>Paciente sente-se disposto e sem queixas álgicas importantes.</p><h2>Objetivo</h2><p>Realizou exercícios de Powerhouse com bom controle. Flexibilidade de cadeia posterior: [Boa/Média].</p><h2>Avaliação</h2><p>Manutenção de força e consciência corporal.</p><h2>Plano</h2><p>Progredir para exercícios de nível intermediário na próxima sessão.</p>', true)
ON CONFLICT DO NOTHING;
