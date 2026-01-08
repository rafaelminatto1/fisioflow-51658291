-- Seed Data for Image Analysis

DO $$
DECLARE
    v_org_id UUID;
    v_patient_id UUID;
    v_user_id UUID;
BEGIN
    -- Get first organization and user
    SELECT organization_id, id INTO v_org_id, v_user_id FROM profiles LIMIT 1;
    
    -- Get or create a patient
    SELECT id INTO v_patient_id FROM patients WHERE organization_id = v_org_id LIMIT 1;
    
    IF v_patient_id IS NOT NULL THEN
        -- 1. Create Consent Record
        INSERT INTO public.consent_records (
            patient_id, organization_id, type, status, scope, created_by
        ) VALUES (
            v_patient_id, v_org_id, 'USO_EDUCACIONAL', 'active', 'Permite uso de imagem para fins de pesquisa interna.', v_user_id
        );

        -- 2. Create Image Study
        INSERT INTO public.image_studies (
            patient_id, organization_id, title, description, status, tags
        ) VALUES (
            v_patient_id, v_org_id, 'Avaliação Postural Inicial - Seed', 'Gerado via Seed para testes.', 'completed', ARRAY['postura', 'teste']
        );
    END IF;
END $$;
