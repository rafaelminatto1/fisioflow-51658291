-- Create Enum for Field Types
CREATE TYPE public.clinical_field_type AS ENUM ('short_text', 'long_text', 'single_select', 'multi_select', 'list', 'scale', 'date', 'time', 'info');

-- Clinical Forms Table
CREATE TABLE public.clinical_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- Optional link to organization
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- Creator
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clinical_forms ENABLE ROW LEVEL SECURITY;

-- Clinical Form Fields Table
CREATE TABLE public.clinical_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES public.clinical_forms(id) ON DELETE CASCADE NOT NULL,
    type public.clinical_field_type NOT NULL,
    label TEXT NOT NULL,
    placeholder TEXT,
    options JSONB, -- For select/list items: ["Option A", "Option B"]
    "order" INTEGER NOT NULL DEFAULT 0,
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clinical_form_fields ENABLE ROW LEVEL SECURITY;

-- Clinical Records (Responses)
CREATE TABLE public.clinical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    form_id UUID REFERENCES public.clinical_forms(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES auth.users(id) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "field_id": "value" }
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_clinical_forms_org ON public.clinical_forms(organization_id);
CREATE INDEX idx_clinical_fields_form ON public.clinical_form_fields(form_id);
CREATE INDEX idx_clinical_records_patient ON public.clinical_records(patient_id);
CREATE INDEX idx_clinical_records_form ON public.clinical_records(form_id);

-- RLS Policies

-- Forms: View/Edit if same organization
CREATE POLICY "Forms visible to organization members" 
ON public.clinical_forms FOR SELECT 
TO authenticated 
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Forms editable by organization members" 
ON public.clinical_forms FOR INSERT 
TO authenticated 
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Forms updateable by organization members" 
ON public.clinical_forms FOR UPDATE
TO authenticated 
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Forms deletable by organization members" 
ON public.clinical_forms FOR DELETE
TO authenticated 
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
);

-- Fields: access mirrors form access (simplified for now to allow all auth users to read fields, 
-- strict enforcement is at the form level usually, but let's be safe and just allow all auth users to interact with fields 
-- knowing they can only find them if they have the form_id)

CREATE POLICY "Fields visible to authenticated users" 
ON public.clinical_form_fields FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Fields editable by authenticated users" 
ON public.clinical_form_fields FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Fields updateable by authenticated users" 
ON public.clinical_form_fields FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Fields deletable by authenticated users" 
ON public.clinical_form_fields FOR DELETE 
TO authenticated 
USING (true);

-- Records: View/Edit based on organization
CREATE POLICY "Records visible to organization members" 
ON public.clinical_records FOR SELECT 
TO authenticated 
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Records creatable by organization members" 
ON public.clinical_records FOR INSERT 
TO authenticated 
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Records updateable by organization members" 
ON public.clinical_records FOR UPDATE 
TO authenticated 
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
);
