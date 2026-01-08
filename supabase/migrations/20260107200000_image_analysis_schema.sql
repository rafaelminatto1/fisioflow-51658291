-- Image Analysis Module Schema
-- Based on requirements: Biometrics, Posture, DICOM, Dynamics

-- 1. Consent Records (LGPD)
CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    type TEXT NOT NULL CHECK (type IN ('TRATAMENTO_CLINICO', 'USO_EDUCACIONAL', 'USO_MARKETING')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    scope TEXT, -- Description of what is allowed
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    evidence_file_url TEXT, -- URL to signed PDF/Image of consent
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Image Studies (Grouping)
CREATE TABLE IF NOT EXISTS public.image_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    title TEXT NOT NULL, -- e.g. "Avaliação Postural Inicial"
    description TEXT,
    study_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
    tags TEXT[], 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- 3. Media Assets
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID NOT NULL REFERENCES public.image_studies(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'pdf', 'dicom')),
    storage_path TEXT NOT NULL, -- S3/Supabase Storage Path
    file_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    file_hash TEXT, -- SHA-256 for integrity
    
    -- Metadata extracted
    width INTEGER,
    height INTEGER,
    duration_seconds DECIMAL,
    
    -- Clinical Logic
    body_region TEXT, -- 'full_body', 'knee_right', 'spine'
    view_plane TEXT, -- 'frontal', 'sagittal_left', 'sagittal_right', 'posterior'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- 4. Annotations
CREATE TABLE IF NOT EXISTS public.annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    
    type TEXT NOT NULL, -- 'keypoints', 'measurement', 'drawing', 'note'
    data JSONB NOT NULL, -- The actual coordinates/values
    
    version INTEGER DEFAULT 1,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Analysis Runs (AI/Processing History)
CREATE TABLE IF NOT EXISTS public.analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID REFERENCES public.image_studies(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    
    run_type TEXT NOT NULL CHECK (run_type IN ('POSTURE', 'EXAM', 'DYNAMIC_COMPARE', 'GENERIC')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    
    input_asset_ids UUID[], -- Array of asset IDs used
    output_json JSONB, -- Structured results (angles, deviations)
    output_markdown TEXT, -- Human readable report
    
    ai_model_version TEXT, -- e.g. "mediapipe-pose-v2", "gemini-1.5-pro"
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Dynamic Metrics (Comparison)
CREATE TABLE IF NOT EXISTS public.dynamic_compare_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    
    metric_name TEXT NOT NULL, -- e.g. "knee_flexion_diff"
    value_numeric DECIMAL,
    unit TEXT,
    qualitative_assessment TEXT, -- "Improved", "Worsened"
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consent_patient ON public.consent_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_studies_patient ON public.image_studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_assets_study ON public.media_assets(study_id);
CREATE INDEX IF NOT EXISTS idx_annotations_asset ON public.annotations(asset_id);
CREATE INDEX IF NOT EXISTS idx_analysis_study ON public.analysis_runs(study_id);

-- Enable RLS
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_compare_metrics ENABLE ROW LEVEL SECURITY;

-- Helper function for Organization RLS (Standard Pattern)
-- Assumes 'profiles' table has organization_id and linkage to auth.uid()
-- Reusing pattern from previous migrations

-- Policies: Consent Records
CREATE POLICY "Users view consents for their org" ON public.consent_records
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users manage consents for their org" ON public.consent_records
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Policies: Image Studies
CREATE POLICY "Users view studies for their org" ON public.image_studies
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users manage studies for their org" ON public.image_studies
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Policies: Media Assets
CREATE POLICY "Users view assets for their org" ON public.media_assets
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users manage assets for their org" ON public.media_assets
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Policies: Annotations
CREATE POLICY "Users view annotations for their org" ON public.annotations
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users manage annotations for their org" ON public.annotations
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Policies: Analysis Runs
CREATE POLICY "Users view analysis for their org" ON public.analysis_runs
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users manage analysis for their org" ON public.analysis_runs
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Audit Triggers (Using existing audit_trigger_function)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_function') THEN
        CREATE TRIGGER audit_consent_records
            AFTER INSERT OR UPDATE OR DELETE ON public.consent_records
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

        CREATE TRIGGER audit_image_studies
            AFTER INSERT OR UPDATE OR DELETE ON public.image_studies
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

        CREATE TRIGGER audit_media_assets
            AFTER INSERT OR UPDATE OR DELETE ON public.media_assets
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
            
        CREATE TRIGGER audit_analysis_runs
            AFTER INSERT OR UPDATE OR DELETE ON public.analysis_runs
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    END IF;
END $$;
