-- ====================================================================
-- Migration: Enhance soap_records for complete SOAP functionality
-- RF01.3 - Evolução de Sessão (SOAP)
-- ====================================================================

-- Add status enum and column to soap_records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'soap_status_enum'
    ) THEN
        CREATE TYPE soap_status_enum AS ENUM ('draft', 'finalized', 'cancelled');
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soap_records' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.soap_records
        ADD COLUMN status soap_status_enum DEFAULT 'draft' NOT NULL;
    END IF;
END $$;

-- Add auto-save timestamp
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soap_records' AND column_name = 'last_auto_save_at'
    ) THEN
        ALTER TABLE public.soap_records
        ADD COLUMN last_auto_save_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add finalized tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soap_records' AND column_name = 'finalized_at'
    ) THEN
        ALTER TABLE public.soap_records
        ADD COLUMN finalized_at TIMESTAMPTZ,
        ADD COLUMN finalized_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add session tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soap_records' AND column_name = 'session_number'
    ) THEN
        ALTER TABLE public.soap_records
        ADD COLUMN session_number INTEGER,
        ADD COLUMN duration_minutes INTEGER;
    END IF;
END $$;

-- Add pain scale (EVA)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soap_records' AND column_name = 'pain_level'
    ) THEN
        ALTER TABLE public.soap_records
        ADD COLUMN pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
        ADD COLUMN pain_location TEXT,
        ADD COLUMN pain_character TEXT;
    END IF;
END $$;

-- Add session attachments support
CREATE TABLE IF NOT EXISTS public.session_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    soap_record_id UUID REFERENCES public.soap_records(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_type TEXT CHECK (file_type IN ('pdf', 'jpg', 'png', 'docx', 'other')) DEFAULT 'other',
    mime_type VARCHAR(100),
    category TEXT CHECK (category IN ('exam', 'imaging', 'document', 'before_after', 'other')) DEFAULT 'other',
    size_bytes INTEGER CHECK (size_bytes <= 10485760), -- Max 10MB
    description TEXT,
    uploaded_by UUID,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add session templates table
CREATE TABLE IF NOT EXISTS public.session_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID,
    therapist_id UUID REFERENCES auth.users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subjective TEXT,
    objective JSONB,
    assessment TEXT,
    plan JSONB,
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_soap_records_status ON public.soap_records(status);
CREATE INDEX IF NOT EXISTS idx_soap_records_patient_date ON public.soap_records(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_attachments_soap ON public.session_attachments(soap_record_id);
CREATE INDEX IF NOT EXISTS idx_session_attachments_patient ON public.session_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_therapist ON public.session_templates(therapist_id);
CREATE INDEX IF NOT EXISTS idx_session_templates_org ON public.session_templates(organization_id);

-- Enable RLS
ALTER TABLE public.session_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_attachments
CREATE POLICY "Authenticated users can view session attachments"
ON public.session_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create session attachments"
ON public.session_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update session attachments"
ON public.session_attachments FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete session attachments"
ON public.session_attachments FOR DELETE
TO authenticated
USING (true);

-- RLS Policies for session_templates
CREATE POLICY "Users can view their templates or global ones"
ON public.session_templates FOR SELECT
TO authenticated
USING (is_global = true OR therapist_id = auth.uid());

CREATE POLICY "Users can create own templates"
ON public.session_templates FOR INSERT
TO authenticated
WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Users can update own templates"
ON public.session_templates FOR UPDATE
TO authenticated
USING (therapist_id = auth.uid());

CREATE POLICY "Users can delete own templates"
ON public.session_templates FOR DELETE
TO authenticated
USING (therapist_id = auth.uid());

-- Update trigger for session_templates
DROP TRIGGER IF EXISTS update_session_templates_updated_at ON public.session_templates;
CREATE TRIGGER update_session_templates_updated_at
    BEFORE UPDATE ON public.session_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for session attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-attachments', 'session-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for session attachments
CREATE POLICY "Authenticated users can upload session attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'session-attachments');

CREATE POLICY "Authenticated users can view session attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'session-attachments');

CREATE POLICY "Authenticated users can update session attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'session-attachments');

CREATE POLICY "Authenticated users can delete session attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'session-attachments');

-- Function to auto-generate session number for patient
CREATE OR REPLACE FUNCTION generate_session_number(p_patient_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_max_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(session_number), 0)
    INTO v_max_number
    FROM public.soap_records
    WHERE patient_id = p_patient_id;

    RETURN v_max_number + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to set session number on insert
CREATE OR REPLACE FUNCTION set_session_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_number IS NULL AND NEW.patient_id IS NOT NULL THEN
        NEW.session_number := generate_session_number(NEW.patient_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set session number
DROP TRIGGER IF EXISTS set_soap_session_number ON public.soap_records;
CREATE TRIGGER set_soap_session_number
    BEFORE INSERT ON public.soap_records
    FOR EACH ROW EXECUTE FUNCTION set_session_number();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.session_attachments TO authenticated;
GRANT ALL ON TABLE public.session_templates TO authenticated;
GRANT EXECUTE ON FUNCTION generate_session_number(UUID) TO authenticated;
