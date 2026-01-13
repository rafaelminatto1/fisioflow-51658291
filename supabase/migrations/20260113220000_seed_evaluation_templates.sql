-- =====================================================
-- Seed 20+ Physiotherapy Evaluation Templates
-- Based on gold-standard scientific assessment scales
-- =====================================================

DO $$
DECLARE
    v_form_id uuid;
BEGIN

-- =====================================================
-- TEMPLATE 1: Avaliação Padrão (Default Template)
-- =====================================================
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação Fisioterapêutica Padrão',
    'Template base com campos essenciais para avaliação fisioterapêutica completa',
    'padrao',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Queixa Principal (QP)', 'texto_longo', 'Descreva a queixa principal do paciente', NULL, 1, true),
(v_form_id, 'História da Doença Atual (HDA)', 'texto_longo', 'Início, evolução, fatores de melhora/piora...', NULL, 2, true),
(v_form_id, 'Histórico Médico Pregresso', 'texto_longo', 'Doenças pré-existentes, tratamentos anteriores...', NULL, 3, false),
(v_form_id, 'Histórico Familiar', 'texto_longo', 'Doenças familiares relevantes', NULL, 4, false),
(v_form_id, 'Medicamentos em Uso', 'texto_longo', 'Liste os medicamentos atuais', NULL, 5, false),
(v_form_id, 'Alergias', 'texto_curto', 'Liste alergias conhecidas', NULL, 6, false),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 7, true),
(v_form_id, 'Localização da Dor', 'texto_curto', 'Região anatômica afetada', NULL, 8, true),
(v_form_id, 'Característica da Dor', 'selecao', NULL, '["Pontada", "Queimação", "Latejante", "Contínua", "Intermitente", "Irradiada"]', 9, false),
(v_form_id, 'Atividade Física', 'selecao', NULL, '["Sedentário", "Leve", "Moderado", "Intenso", "Atleta"]', 10, false),
(v_form_id, 'Tabagismo', 'checkbox', 'Fumante', NULL, 11, false),
(v_form_id, 'Etilismo', 'checkbox', 'Consumo de álcool regular', NULL, 12, false),
(v_form_id, 'Objetivos do Tratamento', 'texto_longo', 'Quais são as expectativas do paciente?', NULL, 13, false);

-- =====================================================
-- FISIOTERAPIA ESPORTIVA (10 Templates)
-- =====================================================

-- Template 2: Lesão Muscular
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Lesão Muscular',
    'Avaliação baseada na classificação de Munich (Grau I-III) para lesões musculares',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Mecanismo de Lesão', 'selecao', NULL, '["Trauma direto", "Estiramento", "Contração excêntrica", "Fadiga muscular"]', 1, true),
(v_form_id, 'Músculo Afetado', 'texto_curto', 'Ex: Bíceps femoral, Quadríceps', NULL, 2, true),
(v_form_id, 'Momento da Lesão', 'selecao', NULL, '["Durante treino", "Durante jogo", "Aquecimento", "Recuperação"]', 3, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 4, true),
(v_form_id, 'Edema/Hematoma', 'selecao', NULL, '["Ausente", "Leve", "Moderado", "Intenso"]', 5, true),
(v_form_id, 'Perda de Força', 'selecao', NULL, '["0-25%", "25-50%", "50-75%", ">75%"]', 6, true),
(v_form_id, 'Classificação (Munich)', 'selecao', NULL, '["Grau I - Leve", "Grau II - Moderada", "Grau III - Severa", "Grau IV - Ruptura completa"]', 7, true),
(v_form_id, 'Teste de Contração Resistida', 'opcao_unica', NULL, '["Negativo", "Positivo com dor leve", "Positivo com dor intensa", "Incapaz"]', 8, true),
(v_form_id, 'Imagem (USG/RNM)', 'texto_longo', 'Achados de exame de imagem', NULL, 9, false),
(v_form_id, 'Tempo Estimado de Retorno', 'selecao', NULL, '["1-2 semanas", "2-4 semanas", "4-8 semanas", "8-12 semanas", ">12 semanas"]', 10, false);

-- Template 3: Entorse de Tornozelo
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Entorse de Tornozelo',
    'Avaliação baseada nas Ottawa Ankle Rules para entorses de tornozelo',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Mecanismo de Lesão', 'selecao', NULL, '["Inversão", "Eversão", "Rotação", "Misto"]', 1, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 2, true),
(v_form_id, 'Edema', 'selecao', NULL, '["Ausente", "Leve", "Moderado", "Intenso"]', 3, true),
(v_form_id, 'Equimose', 'checkbox', 'Presença de equimose', NULL, 4, false),
(v_form_id, 'Capacidade de Apoio', 'selecao', NULL, '["Marcha normal", "Marcha antálgica", "Apoio parcial", "Sem apoio"]', 5, true),
(v_form_id, 'Dor Maléolo Lateral (Ottawa)', 'checkbox', 'Dor à palpação nos 6cm posteriores do maléolo lateral', NULL, 6, true),
(v_form_id, 'Dor Maléolo Medial (Ottawa)', 'checkbox', 'Dor à palpação nos 6cm posteriores do maléolo medial', NULL, 7, true),
(v_form_id, 'Dor Base 5º Metatarso (Ottawa)', 'checkbox', 'Dor à palpação da base do 5º metatarso', NULL, 8, true),
(v_form_id, 'Teste da Gaveta Anterior', 'opcao_unica', NULL, '["Negativo", "Positivo leve", "Positivo moderado", "Positivo grave"]', 9, true),
(v_form_id, 'Classificação', 'selecao', NULL, '["Grau I - Estiramento", "Grau II - Ruptura parcial", "Grau III - Ruptura completa"]', 10, true),
(v_form_id, 'Indicação de RX (Ottawa Rules)', 'opcao_unica', NULL, '["Não indicado", "Indicado"]', 11, true);

-- Template 4: Lesão de LCA
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Lesão de LCA',
    'Avaliação para lesão do Ligamento Cruzado Anterior com testes especiais',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Mecanismo de Lesão', 'selecao', NULL, '["Pivot/Rotação", "Hiperextensão", "Trauma direto", "Desaceleração brusca"]', 1, true),
(v_form_id, 'Sensação de Estalo', 'checkbox', 'Paciente relatou ouvir/sentir estalo', NULL, 2, true),
(v_form_id, 'Derrame Articular', 'selecao', NULL, '["Ausente", "Leve", "Moderado", "Intenso"]', 3, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 4, true),
(v_form_id, 'Teste de Lachman', 'selecao', NULL, '["Negativo", "Grau I (3-5mm)", "Grau II (5-10mm)", "Grau III (>10mm)"]', 5, true),
(v_form_id, 'Teste Pivot Shift', 'opcao_unica', NULL, '["Negativo", "Positivo leve", "Positivo moderado", "Positivo grave"]', 6, true),
(v_form_id, 'Teste Gaveta Anterior', 'selecao', NULL, '["Negativo", "Grau I", "Grau II", "Grau III"]', 7, true),
(v_form_id, 'Lesões Associadas', 'lista', NULL, '["Menisco medial", "Menisco lateral", "LCM", "LCL", "Cartilagem"]', 8, false),
(v_form_id, 'KT-1000 (se disponível)', 'numero', 'Diferença em mm', NULL, 9, false),
(v_form_id, 'IKDC Score', 'numero', 'Pontuação 0-100', NULL, 10, false);

-- Template 5: Tendinopatia Patelar (VISA-P)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Tendinopatia Patelar (VISA-P)',
    'Avaliação baseada no questionário VISA-P validado para tendinopatia patelar',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Lado Afetado', 'selecao', NULL, '["Direito", "Esquerdo", "Bilateral"]', 1, true),
(v_form_id, 'Duração dos Sintomas', 'selecao', NULL, '["<6 semanas", "6-12 semanas", "3-6 meses", "6-12 meses", ">12 meses"]', 2, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 3, true),
(v_form_id, 'Dor ao Sentar 10min', 'escala', NULL, NULL, 4, true),
(v_form_id, 'Dor ao Descer Escadas', 'escala', NULL, NULL, 5, true),
(v_form_id, 'Dor ao Agachar', 'escala', NULL, NULL, 6, true),
(v_form_id, 'Dor ao Saltar', 'escala', NULL, NULL, 7, true),
(v_form_id, 'Capacidade Funcional Esportiva', 'selecao', NULL, '["Pratica sem dor", "Pratica com dor leve", "Pratica com dor moderada", "Pratica com limitações", "Incapaz de praticar"]', 8, true),
(v_form_id, 'VISA-P Score Total', 'numero', 'Pontuação 0-100', NULL, 9, true),
(v_form_id, 'Achados Ultrassonográficos', 'texto_longo', 'Espessamento, neovascularização, etc.', NULL, 10, false);

-- Template 6: Síndrome do Trato Iliotibial
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Síndrome do Trato Iliotibial',
    'Avaliação específica para síndrome do trato iliotibial em corredores',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Volume de Treino Semanal (km)', 'numero', 'Quilometragem semanal', NULL, 1, true),
(v_form_id, 'Tipo de Terreno', 'selecao', NULL, '["Asfalto", "Trilha", "Esteira", "Misto"]', 2, true),
(v_form_id, 'Calçado (idade em km)', 'numero', 'Quilometragem do tênis atual', NULL, 3, false),
(v_form_id, 'Início dos Sintomas', 'selecao', NULL, '["Durante corrida", "Após corrida", "Descendo ladeiras", "Subindo escadas"]', 4, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 5, true),
(v_form_id, 'Teste de Ober', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 6, true),
(v_form_id, 'Teste de Noble', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 7, true),
(v_form_id, 'Encurtamento de Tensor da Fáscia Lata', 'opcao_unica', NULL, '["Ausente", "Leve", "Moderado", "Severo"]', 8, true),
(v_form_id, 'Fraqueza de Glúteo Médio', 'opcao_unica', NULL, '["Ausente", "Leve", "Moderada", "Severa"]', 9, true),
(v_form_id, 'Análise de Pisada', 'selecao', NULL, '["Neutra", "Pronada", "Supinada"]', 10, false);

-- Template 7: Lesão de Ombro no Atleta (ASES)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Ombro no Atleta (ASES)',
    'Avaliação baseada no ASES Score para lesões de ombro em atletas',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Esporte Praticado', 'texto_curto', 'Ex: Natação, Vôlei, Tênis', NULL, 1, true),
(v_form_id, 'Posição/Função', 'texto_curto', 'Posição no esporte', NULL, 2, false),
(v_form_id, 'Mecanismo de Lesão', 'selecao', NULL, '["Overuse", "Trauma direto", "Queda", "Arremesso", "Desconhecido"]', 3, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 4, true),
(v_form_id, 'Dor Noturna', 'opcao_unica', NULL, '["Ausente", "Ocasional", "Frequente", "Constante"]', 5, true),
(v_form_id, 'Teste de Neer (Impacto)', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 6, true),
(v_form_id, 'Teste de Hawkins', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 7, true),
(v_form_id, 'Teste de Jobe (Supraespinhal)', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 8, true),
(v_form_id, 'Teste de Apreensão', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 9, true),
(v_form_id, 'ASES Score', 'numero', 'Pontuação 0-100', NULL, 10, true);

-- Template 8: Concussão Esportiva (SCAT5)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Concussão Esportiva (SCAT5)',
    'Avaliação baseada no Sport Concussion Assessment Tool 5',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Mecanismo de Lesão', 'texto_longo', 'Descreva como ocorreu o trauma', NULL, 1, true),
(v_form_id, 'Perda de Consciência', 'selecao', NULL, '["Não", "Sim - <1 min", "Sim - 1-5 min", "Sim - >5 min"]', 2, true),
(v_form_id, 'Amnésia Anterógrada', 'checkbox', 'Dificuldade de formar novas memórias', NULL, 3, true),
(v_form_id, 'Amnésia Retrógrada', 'checkbox', 'Não lembra eventos antes do trauma', NULL, 4, true),
(v_form_id, 'Cefaleia', 'escala', NULL, NULL, 5, true),
(v_form_id, 'Tontura', 'escala', NULL, NULL, 6, true),
(v_form_id, 'Náusea', 'escala', NULL, NULL, 7, true),
(v_form_id, 'Sensibilidade à Luz', 'escala', NULL, NULL, 8, true),
(v_form_id, 'Confusão Mental', 'escala', NULL, NULL, 9, true),
(v_form_id, 'Teste de Equilíbrio (BESS)', 'numero', 'Número de erros', NULL, 10, true),
(v_form_id, 'Orientação (GCS)', 'numero', 'Pontuação 3-15', NULL, 11, true),
(v_form_id, 'Red Flags', 'lista', NULL, '["Convulsão", "Vômitos repetidos", "Deterioração neurológica", "Alteração pupilar", "Déficit motor"]', 12, true);

-- Template 9: Overtraining Syndrome
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Síndrome de Overtraining',
    'Avaliação para identificação de overtraining em atletas',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Carga de Treino Semanal (horas)', 'numero', 'Horas totais de treino', NULL, 1, true),
(v_form_id, 'Aumento Recente de Volume', 'selecao', NULL, '["Não", "Sim - 10-20%", "Sim - 20-40%", "Sim - >40%"]', 2, true),
(v_form_id, 'Qualidade do Sono', 'escala', NULL, NULL, 3, true),
(v_form_id, 'Fadiga Persistente', 'escala', NULL, NULL, 4, true),
(v_form_id, 'Queda de Performance', 'selecao', NULL, '["Não percebida", "Leve", "Moderada", "Severa"]', 5, true),
(v_form_id, 'Alterações de Humor', 'lista', NULL, '["Irritabilidade", "Depressão", "Ansiedade", "Apatia", "Nenhuma"]', 6, true),
(v_form_id, 'Lesões Recorrentes', 'checkbox', 'Histórico de lesões frequentes recentes', NULL, 7, true),
(v_form_id, 'Frequência Cardíaca de Repouso', 'numero', 'bpm', NULL, 8, true),
(v_form_id, 'Variabilidade FC (se disponível)', 'numero', 'HRV', NULL, 9, false),
(v_form_id, 'RESTQ Score', 'numero', 'Pontuação do questionário', NULL, 10, false);

-- Template 10: Return-to-Play
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Return-to-Play',
    'Protocolo de clearance para retorno ao esporte após lesão',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Lesão Original', 'texto_curto', 'Tipo de lesão tratada', NULL, 1, true),
(v_form_id, 'Tempo de Afastamento', 'texto_curto', 'Duração do afastamento', NULL, 2, true),
(v_form_id, 'Dor em Repouso (EVA)', 'escala', NULL, NULL, 3, true),
(v_form_id, 'Dor Durante Atividade (EVA)', 'escala', NULL, NULL, 4, true),
(v_form_id, 'ADM Completa', 'opcao_unica', NULL, '["Sim", "Não - Déficit leve", "Não - Déficit moderado"]', 5, true),
(v_form_id, 'Força Comparativa (%)', 'numero', 'Comparado ao membro contralateral', NULL, 6, true),
(v_form_id, 'Testes Funcionais', 'lista', NULL, '["Hop Test aprovado", "Y Balance aprovado", "Agilidade aprovada", "Sprints aprovados"]', 7, true),
(v_form_id, 'Confiança Psicológica', 'escala', NULL, NULL, 8, true),
(v_form_id, 'Fase do Protocolo', 'selecao', NULL, '["Fase 1 - Reabilitação", "Fase 2 - Retorno gradual", "Fase 3 - Treino completo", "Fase 4 - Jogo/Competição"]', 9, true),
(v_form_id, 'Liberação para Return-to-Play', 'opcao_unica', NULL, '["Sim - Liberado", "Parcial - Com restrições", "Não - Continuar reabilitação"]', 10, true);

-- Template 11: FMS (Functional Movement Screen)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Functional Movement Screen (FMS)',
    'Avaliação funcional padronizada de 7 movimentos fundamentais',
    'esportiva',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Deep Squat', 'selecao', NULL, '["0 - Dor", "1 - Incapaz", "2 - Compensação", "3 - Perfeito"]', 1, true),
(v_form_id, 'Hurdle Step - Esquerdo', 'selecao', NULL, '["0", "1", "2", "3"]', 2, true),
(v_form_id, 'Hurdle Step - Direito', 'selecao', NULL, '["0", "1", "2", "3"]', 3, true),
(v_form_id, 'Inline Lunge - Esquerdo', 'selecao', NULL, '["0", "1", "2", "3"]', 4, true),
(v_form_id, 'Inline Lunge - Direito', 'selecao', NULL, '["0", "1", "2", "3"]', 5, true),
(v_form_id, 'Shoulder Mobility - Esquerdo', 'selecao', NULL, '["0", "1", "2", "3"]', 6, true),
(v_form_id, 'Shoulder Mobility - Direito', 'selecao', NULL, '["0", "1", "2", "3"]', 7, true),
(v_form_id, 'Active Straight Leg Raise - Esquerdo', 'selecao', NULL, '["0", "1", "2", "3"]', 8, true),
(v_form_id, 'Active Straight Leg Raise - Direito', 'selecao', NULL, '["0", "1", "2", "3"]', 9, true),
(v_form_id, 'Trunk Stability Push-Up', 'selecao', NULL, '["0", "1", "2", "3"]', 10, true),
(v_form_id, 'Rotary Stability - Esquerdo', 'selecao', NULL, '["0", "1", "2", "3"]', 11, true),
(v_form_id, 'Rotary Stability - Direito', 'selecao', NULL, '["0", "1", "2", "3"]', 12, true),
(v_form_id, 'FMS Score Total', 'numero', 'Pontuação 0-21', NULL, 13, true);

-- =====================================================
-- FISIOTERAPIA ORTOPÉDICA (10 Templates)
-- =====================================================

-- Template 12: Lombalgia Crônica (Oswestry)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Lombalgia (Oswestry)',
    'Avaliação baseada no Oswestry Disability Index para lombalgia',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Duração da Dor', 'selecao', NULL, '["<6 semanas (aguda)", "6-12 semanas (subaguda)", ">12 semanas (crônica)"]', 1, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 2, true),
(v_form_id, 'Irradiação para MMII', 'selecao', NULL, '["Ausente", "Até joelho", "Abaixo do joelho", "Até o pé"]', 3, true),
(v_form_id, 'Red Flags', 'lista', NULL, '["Trauma recente", "Perda de peso inexplicada", "Febre", "Incontinência", "Déficit neurológico progressivo", "Nenhum"]', 4, true),
(v_form_id, 'Teste de Lasègue', 'selecao', NULL, '["Negativo", "Positivo <30°", "Positivo 30-60°", "Positivo >60°"]', 5, true),
(v_form_id, 'Força de Dorsiflexão', 'selecao', NULL, '["5 - Normal", "4 - Leve fraqueza", "3 - Moderada", "2 - Grave", "0-1 - Ausente"]', 6, true),
(v_form_id, 'Reflexo Aquileu', 'selecao', NULL, '["Normal", "Diminuído", "Ausente"]', 7, true),
(v_form_id, 'Oswestry Score (%)', 'numero', 'Porcentagem de incapacidade', NULL, 8, true),
(v_form_id, 'Fear-Avoidance (FABQ)', 'numero', 'Pontuação', NULL, 9, false),
(v_form_id, 'Classificação', 'selecao', NULL, '["Lombalgia mecânica", "Dor radicular", "Claudicação neurogênica", "Dor referida"]', 10, true);

-- Template 13: Cervicalgia (NDI)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Cervicalgia (NDI)',
    'Avaliação baseada no Neck Disability Index para cervicalgia',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 1, true),
(v_form_id, 'Irradiação para MMSS', 'selecao', NULL, '["Ausente", "Ombro", "Até cotovelo", "Até mão"]', 2, true),
(v_form_id, 'Cefaleia Associada', 'checkbox', 'Presença de cefaleia cervicogênica', NULL, 3, true),
(v_form_id, 'Parestesias', 'texto_curto', 'Dermátomo afetado', NULL, 4, false),
(v_form_id, 'ADM Flexão', 'numero', 'Graus', NULL, 5, true),
(v_form_id, 'ADM Extensão', 'numero', 'Graus', NULL, 6, true),
(v_form_id, 'ADM Rotação D', 'numero', 'Graus', NULL, 7, true),
(v_form_id, 'ADM Rotação E', 'numero', 'Graus', NULL, 8, true),
(v_form_id, 'Teste de Spurling', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 9, true),
(v_form_id, 'NDI Score (%)', 'numero', 'Porcentagem de incapacidade', NULL, 10, true);

-- Template 14: Avaliação de Ombro (DASH)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Ombro (DASH)',
    'Avaliação baseada no DASH Score para disfunções de ombro',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Lado Afetado', 'selecao', NULL, '["Direito", "Esquerdo", "Bilateral"]', 1, true),
(v_form_id, 'Membro Dominante', 'selecao', NULL, '["Direito", "Esquerdo"]', 2, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 3, true),
(v_form_id, 'Dor Noturna', 'opcao_unica', NULL, '["Ausente", "Ocasional", "Frequente", "Constante"]', 4, true),
(v_form_id, 'ADM Flexão', 'numero', 'Graus', NULL, 5, true),
(v_form_id, 'ADM Abdução', 'numero', 'Graus', NULL, 6, true),
(v_form_id, 'ADM Rotação Externa', 'numero', 'Graus', NULL, 7, true),
(v_form_id, 'ADM Rotação Interna', 'numero', 'Graus', NULL, 8, true),
(v_form_id, 'Cápsula Posterior Encurtada', 'checkbox', 'Teste de Cross-body positivo', NULL, 9, false),
(v_form_id, 'DASH Score', 'numero', 'Pontuação 0-100', NULL, 10, true);

-- Template 15: Avaliação de Joelho (KOOS)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Joelho (KOOS)',
    'Avaliação baseada no Knee Injury and Osteoarthritis Outcome Score',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Lado Afetado', 'selecao', NULL, '["Direito", "Esquerdo", "Bilateral"]', 1, true),
(v_form_id, 'Diagnóstico', 'selecao', NULL, '["Lesão meniscal", "Lesão ligamentar", "Condromalácia", "Artrose", "Tendinopatia", "Outro"]', 2, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 3, true),
(v_form_id, 'Derrame Articular', 'selecao', NULL, '["Ausente", "Discreto", "Moderado", "Importante"]', 4, true),
(v_form_id, 'ADM Flexão', 'numero', 'Graus', NULL, 5, true),
(v_form_id, 'ADM Extensão', 'numero', 'Graus (déficit)', NULL, 6, true),
(v_form_id, 'Teste de McMurray', 'opcao_unica', NULL, '["Negativo", "Positivo medial", "Positivo lateral"]', 7, true),
(v_form_id, 'Crepitação', 'selecao', NULL, '["Ausente", "Leve", "Moderada", "Severa"]', 8, false),
(v_form_id, 'KOOS - Dor', 'numero', '0-100', NULL, 9, true),
(v_form_id, 'KOOS - Sintomas', 'numero', '0-100', NULL, 10, true),
(v_form_id, 'KOOS - AVD', 'numero', '0-100', NULL, 11, true),
(v_form_id, 'KOOS - Esporte', 'numero', '0-100', NULL, 12, false),
(v_form_id, 'KOOS - QV', 'numero', '0-100', NULL, 13, true);

-- Template 16: Avaliação de Quadril (HOOS)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Quadril (HOOS)',
    'Avaliação baseada no Hip Disability and Osteoarthritis Outcome Score',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Lado Afetado', 'selecao', NULL, '["Direito", "Esquerdo", "Bilateral"]', 1, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 2, true),
(v_form_id, 'Localização da Dor', 'lista', NULL, '["Anterior/Inguinal", "Lateral", "Posterior/Glútea", "Irradiada para coxa"]', 3, true),
(v_form_id, 'ADM Flexão', 'numero', 'Graus', NULL, 4, true),
(v_form_id, 'ADM Rotação Interna', 'numero', 'Graus', NULL, 5, true),
(v_form_id, 'ADM Rotação Externa', 'numero', 'Graus', NULL, 6, true),
(v_form_id, 'Teste FADIR', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 7, true),
(v_form_id, 'Teste FABER', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 8, true),
(v_form_id, 'Trendelenburg', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 9, true),
(v_form_id, 'HOOS Score Total', 'numero', '0-100', NULL, 10, true);

-- Template 17: Avaliação de Punho/Mão (PRWE)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Punho e Mão (PRWE)',
    'Avaliação baseada no Patient-Rated Wrist Evaluation',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Lado Afetado', 'selecao', NULL, '["Direito", "Esquerdo", "Bilateral"]', 1, true),
(v_form_id, 'Membro Dominante', 'selecao', NULL, '["Direito", "Esquerdo"]', 2, true),
(v_form_id, 'Diagnóstico', 'selecao', NULL, '["Fratura", "Tendinite", "Síndrome do túnel do carpo", "Artrose", "Entorse", "Outro"]', 3, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 4, true),
(v_form_id, 'Dor em Repouso', 'escala', NULL, NULL, 5, true),
(v_form_id, 'Dor ao Segurar Objetos', 'escala', NULL, NULL, 6, true),
(v_form_id, 'Força de Preensão (%)', 'numero', 'Comparado ao contralateral', NULL, 7, true),
(v_form_id, 'Teste de Phalen', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 8, false),
(v_form_id, 'Teste de Finkelstein', 'opcao_unica', NULL, '["Negativo", "Positivo"]', 9, false),
(v_form_id, 'PRWE Score', 'numero', '0-100', NULL, 10, true);

-- Template 18: Avaliação de Pé/Tornozelo (FAAM)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Pé e Tornozelo (FAAM)',
    'Avaliação baseada no Foot and Ankle Ability Measure',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Lado Afetado', 'selecao', NULL, '["Direito", "Esquerdo", "Bilateral"]', 1, true),
(v_form_id, 'Diagnóstico', 'selecao', NULL, '["Entorse", "Tendinopatia", "Fasciíte plantar", "Fratura", "Artrose", "Outro"]', 2, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 3, true),
(v_form_id, 'Edema', 'selecao', NULL, '["Ausente", "Leve", "Moderado", "Severo"]', 4, true),
(v_form_id, 'ADM Dorsiflexão', 'numero', 'Graus', NULL, 5, true),
(v_form_id, 'ADM Flexão Plantar', 'numero', 'Graus', NULL, 6, true),
(v_form_id, 'Força de Panturrilha (Heel Rise)', 'numero', 'Repetições', NULL, 7, true),
(v_form_id, 'Estabilidade Funcional', 'selecao', NULL, '["Estável", "Instabilidade leve", "Instabilidade moderada", "Instabilidade grave"]', 8, true),
(v_form_id, 'FAAM - AVD (%)', 'numero', '0-100', NULL, 9, true),
(v_form_id, 'FAAM - Esporte (%)', 'numero', '0-100', NULL, 10, false);

-- Template 19: Avaliação de Artrose (WOMAC)
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Artrose (WOMAC)',
    'Avaliação baseada no Western Ontario and McMaster Universities Index',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Articulação Afetada', 'selecao', NULL, '["Joelho D", "Joelho E", "Quadril D", "Quadril E", "Ambos joelhos", "Ambos quadris"]', 1, true),
(v_form_id, 'Grau Radiológico (K-L)', 'selecao', NULL, '["Grau I", "Grau II", "Grau III", "Grau IV"]', 2, false),
(v_form_id, 'WOMAC - Dor (caminhando)', 'escala', NULL, NULL, 3, true),
(v_form_id, 'WOMAC - Dor (escadas)', 'escala', NULL, NULL, 4, true),
(v_form_id, 'WOMAC - Dor (noturna)', 'escala', NULL, NULL, 5, true),
(v_form_id, 'WOMAC - Dor (repouso)', 'escala', NULL, NULL, 6, true),
(v_form_id, 'WOMAC - Dor (apoio)', 'escala', NULL, NULL, 7, true),
(v_form_id, 'WOMAC - Rigidez Matinal', 'escala', NULL, NULL, 8, true),
(v_form_id, 'WOMAC - Rigidez Diária', 'escala', NULL, NULL, 9, true),
(v_form_id, 'WOMAC - Função (total)', 'numero', 'Pontuação', NULL, 10, true),
(v_form_id, 'Dispositivo Auxiliar', 'selecao', NULL, '["Nenhum", "Bengala", "Muleta", "Andador"]', 11, false);

-- Template 20: Avaliação Postural Completa
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação Postural Completa',
    'Avaliação postural sistemática nos planos sagital, frontal e transverso',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Cabeça - Vista Anterior', 'selecao', NULL, '["Alinhada", "Inclinação D", "Inclinação E", "Rotação D", "Rotação E"]', 1, true),
(v_form_id, 'Ombros - Vista Anterior', 'selecao', NULL, '["Nivelados", "Elevação D", "Elevação E", "Protrusão"]', 2, true),
(v_form_id, 'Pelve - Vista Anterior', 'selecao', NULL, '["Nivelada", "Elevação D", "Elevação E"]', 3, true),
(v_form_id, 'Joelhos - Vista Anterior', 'selecao', NULL, '["Alinhados", "Valgo", "Varo"]', 4, true),
(v_form_id, 'Pés - Vista Anterior', 'selecao', NULL, '["Neutros", "Pronados", "Supinados"]', 5, true),
(v_form_id, 'Cervical - Vista Lateral', 'selecao', NULL, '["Lordose normal", "Hiperlordose", "Retificação", "Anteriorização"]', 6, true),
(v_form_id, 'Torácica - Vista Lateral', 'selecao', NULL, '["Cifose normal", "Hipercifose", "Retificação"]', 7, true),
(v_form_id, 'Lombar - Vista Lateral', 'selecao', NULL, '["Lordose normal", "Hiperlordose", "Retificação"]', 8, true),
(v_form_id, 'Escápulas - Vista Posterior', 'selecao', NULL, '["Alinhadas", "Aladas", "Abduzidas", "Aduzidas"]', 9, true),
(v_form_id, 'Escoliose', 'selecao', NULL, '["Ausente", "Funcional", "Estrutural - leve", "Estrutural - moderada", "Estrutural - severa"]', 10, true),
(v_form_id, 'Teste de Adams', 'opcao_unica', NULL, '["Negativo", "Gibosidade D", "Gibosidade E"]', 11, true);

-- Template 21: Síndrome Dolorosa Miofascial
INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
VALUES (
    'Avaliação de Síndrome Miofascial',
    'Avaliação específica para síndrome dolorosa miofascial com mapeamento de trigger points',
    'ortopedica',
    true
) RETURNING id INTO v_form_id;

INSERT INTO public.evaluation_form_fields (form_id, label, tipo_campo, placeholder, opcoes, ordem, obrigatorio) VALUES
(v_form_id, 'Região Principal', 'selecao', NULL, '["Cervical", "Ombro", "Lombar", "Quadril", "Membros superiores", "Membros inferiores"]', 1, true),
(v_form_id, 'Duração dos Sintomas', 'selecao', NULL, '["<4 semanas", "1-3 meses", "3-6 meses", ">6 meses"]', 2, true),
(v_form_id, 'Intensidade da Dor (EVA)', 'escala', NULL, NULL, 3, true),
(v_form_id, 'Dor Referida', 'checkbox', 'Presença de padrão de dor referida', NULL, 4, true),
(v_form_id, 'Twitch Response', 'checkbox', 'Contração visível à palpação', NULL, 5, true),
(v_form_id, 'Banda Tensa Palpável', 'checkbox', 'Presença de banda muscular tensa', NULL, 6, true),
(v_form_id, 'Músculos Afetados', 'texto_longo', 'Liste os músculos com trigger points ativos', NULL, 7, true),
(v_form_id, 'Fatores Perpetuadores', 'lista', NULL, '["Postura inadequada", "Estresse", "Sono inadequado", "Deficiências nutricionais", "Disfunção articular"]', 8, true),
(v_form_id, 'Limitação Funcional', 'texto_longo', 'Atividades limitadas pela dor', NULL, 9, false),
(v_form_id, 'Mapa de Trigger Points', 'texto_longo', 'Descreva localização e intensidade', NULL, 10, true);

RAISE NOTICE 'All 21 evaluation templates seeded successfully!';

END $$;
