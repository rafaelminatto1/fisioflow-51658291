-- Create DICOM tables for metadata caching and indexing
-- These tables mirror the structure needed for navigation but do not store the pixel data (which stays in Orthanc/ObjectStorage)

CREATE TABLE public.dicom_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    patient_id UUID REFERENCES public.patients(id),
    
    study_instance_uid TEXT NOT NULL,
    study_date DATE,
    study_time TEXT,
    accession_number TEXT,
    description TEXT,
    modalities_in_study TEXT[], -- Array of modalities e.g. ['CT', 'MR']
    referring_physician TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(organization_id, study_instance_uid)
);

CREATE TABLE public.dicom_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    study_id UUID NOT NULL REFERENCES public.dicom_studies(id) ON DELETE CASCADE,
    
    series_instance_uid TEXT NOT NULL,
    modality TEXT,
    series_number INTEGER,
    series_description TEXT,
    body_part_examined TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(organization_id, series_instance_uid)
);

CREATE TABLE public.dicom_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    series_id UUID NOT NULL REFERENCES public.dicom_series(id) ON DELETE CASCADE,
    
    sop_instance_uid TEXT NOT NULL,
    instance_number INTEGER,
    
    transfer_syntax_uid TEXT,
    
    -- Metadata useful for frontend
    rows INTEGER,
    columns INTEGER,
    number_of_frames INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    UNIQUE(organization_id, sop_instance_uid)
);

-- RLS Policies
ALTER TABLE public.dicom_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dicom_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dicom_instances ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Users can view dicom_studies from their organization"
    ON public.dicom_studies FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view dicom_series from their organization"
    ON public.dicom_series FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view dicom_instances from their organization"
    ON public.dicom_instances FOR SELECT
    USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Insert/Update policies (Assuming automated jobs or admin users, for now allow authenticated users to ingest for MVP)
CREATE POLICY "Users can insert dicom_studies for their organization"
    ON public.dicom_studies FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert dicom_series for their organization"
    ON public.dicom_series FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert dicom_instances for their organization"
    ON public.dicom_instances FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_dicom_studies_org ON public.dicom_studies(organization_id);
CREATE INDEX idx_dicom_studies_patient ON public.dicom_studies(patient_id);
CREATE INDEX idx_dicom_studies_uid ON public.dicom_studies(study_instance_uid);

CREATE INDEX idx_dicom_series_study ON public.dicom_series(study_id);
CREATE INDEX idx_dicom_instances_series ON public.dicom_instances(series_id);
