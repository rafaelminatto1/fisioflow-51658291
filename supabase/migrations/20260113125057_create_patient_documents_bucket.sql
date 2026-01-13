-- Create patient_documents table for managing patient document uploads
CREATE TABLE IF NOT EXISTS public.patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    category TEXT CHECK (category IN ('laudo', 'exame', 'receita', 'termo', 'outro')),
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON public.patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_category ON public.patient_documents(category);
CREATE INDEX IF NOT EXISTS idx_patient_documents_created_at ON public.patient_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_documents_uploaded_by ON public.patient_documents(uploaded_by);

ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Users can delete documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Users can update document metadata" ON public.patient_documents;

-- Simple policy: Authenticated users can view all documents
-- (since authenticated users can already view all patients per existing policies)
CREATE POLICY "Users can view documents"
    ON public.patient_documents FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can upload documents
CREATE POLICY "Users can upload documents"
    ON public.patient_documents FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Only admins and fisioterapeutas can delete documents
CREATE POLICY "Admins and fisios can delete documents"
    ON public.patient_documents FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
        )
    );

-- Only admins and fisioterapeutas can update document metadata
CREATE POLICY "Admins and fisios can update documents"
    ON public.patient_documents FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'fisioterapeuta')
        )
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.patient_documents TO authenticated;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_patient_documents_updated_at ON public.patient_documents;
CREATE TRIGGER update_patient_documents_updated_at
    BEFORE UPDATE ON public.patient_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
