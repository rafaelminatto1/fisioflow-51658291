-- Marketing Module Schema
-- Tracks generated social media content and enforces consent linkage

CREATE TABLE IF NOT EXISTS public.marketing_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID NOT NULL REFERENCES public.patients(id),
    consent_id UUID NOT NULL REFERENCES public.consent_records(id), -- Critical Linkage
    
    asset_a_id UUID REFERENCES public.media_assets(id),
    asset_b_id UUID REFERENCES public.media_assets(id),
    
    export_type TEXT NOT NULL CHECK (export_type IN ('video_comparison', 'story', 'post_image')),
    file_path TEXT NOT NULL, -- Storage path
    public_url TEXT,
    
    -- Compliance Metadata
    is_anonymized BOOLEAN DEFAULT FALSE,
    metrics_overlay JSONB, -- Array of metrics displayed
    watermark_applied BOOLEAN DEFAULT TRUE,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft delete for revocation
);

-- RLS
ALTER TABLE public.marketing_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view marketing exports for their org" ON public.marketing_exports
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users create marketing exports for their org" ON public.marketing_exports
    FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users soft delete marketing exports for their org" ON public.marketing_exports
    FOR UPDATE USING (organization_id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));

-- Audit Trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_function') THEN
        CREATE TRIGGER audit_marketing_exports
            AFTER INSERT OR UPDATE OR DELETE ON public.marketing_exports
            FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    END IF;
END $$;
