-- Create wearable_data table
CREATE TABLE IF NOT EXISTS public.wearable_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    source TEXT NOT NULL, -- 'apple_health', 'google_fit', 'manual', etc
    data_type TEXT NOT NULL, -- 'steps', 'heart_rate', 'sleep', etc
    value NUMERIC NOT NULL,
    unit TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wearable_data_patient_id ON public.wearable_data(patient_id);
CREATE INDEX IF NOT EXISTS idx_wearable_data_timestamp ON public.wearable_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_data_type ON public.wearable_data(data_type);

-- RLS
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view wearable data for their organization" ON public.wearable_data
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert wearable data for their organization" ON public.wearable_data
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Trigger for updated_at
CREATE TRIGGER update_wearable_data_updated_at
    BEFORE UPDATE ON public.wearable_data
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
