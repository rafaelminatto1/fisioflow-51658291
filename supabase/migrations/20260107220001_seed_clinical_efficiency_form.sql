-- Migration: Seed Clinical Efficiency Analysis Form (V2 - Customizations)
-- Description: Updates the 'Análise de Eficiência Clínica' template with expanded functional limitations and SOAP aligned fields.

DO $$
DECLARE
    v_form_id UUID;
    v_form_name TEXT := 'Análise de Eficiência Clínica';
    v_form_desc TEXT := 'Avaliação detalhada para análise de eficiência clínica, incluindo status funcional e métricas objetivas.';
BEGIN
    -- 1. Upsert Form
    -- Check if exists by name
    SELECT id INTO v_form_id FROM public.evaluation_forms WHERE nome = v_form_name LIMIT 1;

    IF v_form_id IS NULL THEN
        -- Create new
        INSERT INTO public.evaluation_forms (nome, descricao, tipo, ativo)
        VALUES (v_form_name, v_form_desc, 'custom', true)
        RETURNING id INTO v_form_id;
    ELSE
        -- Update existing
        UPDATE public.evaluation_forms 
        SET descricao = v_form_desc, updated_at = NOW()
        WHERE id = v_form_id;
    END IF;

    -- 2. Clear existing fields for this form (to ensure clean seed)
    DELETE FROM public.evaluation_form_fields WHERE form_id = v_form_id;

    -- 3. Insert Fields
    -- Identificação
    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio) VALUES
    (v_form_id, 'info', 'Identificação e Contexto Clínico', 0, false),
    (v_form_id, 'data', 'Data da Avaliação', 1, true),
    (v_form_id, 'texto_curto', 'Diagnóstico Principal (CID/Fisioterapêutico)', 2, true),
    (v_form_id, 'texto_longo', 'Histórico da Moléstia Atual (HMA)', 3, false);

    -- Subjetivo
    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio, opcoes) VALUES
    (v_form_id, 'info', 'Avaliação Subjetiva (S)', 4, false, NULL),
    (v_form_id, 'escala', 'Intensidade da Dor (EVA 0-10) - Repouso', 5, true, NULL),
    (v_form_id, 'escala', 'Intensidade da Dor (EVA 0-10) - Movimento', 6, true, NULL),
    (v_form_id, 'texto_curto', 'Localização da Dor (Principal)', 7, false, NULL),
    (v_form_id, 'selecao', 'Características da Dor', 8, false, '["Queimação", "Pontada", "Latejante", "Irradiada", "Formigamento", "Peso", "Cansaço"]'::jsonb);

    -- Objetivo
    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio, placeholder) VALUES
    (v_form_id, 'info', 'Exame Físico - Amplitude de Movimento (O)', 9, false, NULL),
    (v_form_id, 'numero', 'Flexão (Graus)', 10, false, 'Ex: 120'),
    (v_form_id, 'numero', 'Extensão (Graus)', 11, false, 'Ex: 0'),
    (v_form_id, 'numero', 'Rotação Interna (Graus)', 12, false, 'Ex: 45'),
    (v_form_id, 'numero', 'Rotação Externa (Graus)', 13, false, 'Ex: 45'),
    (v_form_id, 'info', 'Exame Físico - Força Muscular (0-5)', 14, false, NULL);

    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio) VALUES
    (v_form_id, 'escala', 'Força Flexores', 15, false),
    (v_form_id, 'escala', 'Força Extensores', 16, false);

    -- Análise
    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio, opcoes) VALUES
    (v_form_id, 'info', 'Análise Funcional e Eficiência (A)', 17, false, NULL),
    (v_form_id, 'selecao', 'Limitações Funcionais', 18, false, 
    '["Caminhada (>10min)", "Subir/Descer Escadas", "Agachar/Ajoelhar", "Levantar de Cadeira", "Alcance acima da cabeça", "Vestir-se/Calçar sapatos", "Higiene Pessoal", "Sono (Posição/Dor)", "Dirigir", "Trabalho (Computador/Sentado)", "Trabalho (Peso/Esforço)", "Atividade Esportiva"]'::jsonb);

    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio) VALUES
    (v_form_id, 'texto_longo', 'Análise de Padrão de Movimento (Qualitativa)', 19, false);

    -- Plano
    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio, opcoes) VALUES
    (v_form_id, 'info', 'Conclusão e Planejamento (P)', 20, false, NULL),
    (v_form_id, 'opcao_unica', 'Prognóstico', 21, true, '["Excelente", "Bom", "Regular", "Reservado"]'::jsonb);

    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio) VALUES
    (v_form_id, 'texto_longo', 'Objetivos Terapêuticos Imediatos', 22, true);

    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio, placeholder) VALUES
    (v_form_id, 'texto_longo', 'Sugestões de Conduta (IA/Protocolos)', 23, false, 'Sugestões geradas automaticamente');

    INSERT INTO public.evaluation_form_fields (form_id, tipo_campo, label, ordem, obrigatorio) VALUES
    (v_form_id, 'texto_longo', 'Plano de Tratamento Definido', 24, true);

    RAISE NOTICE 'Form "%" updated successfully with expanded options.', v_form_name;

END $$;
