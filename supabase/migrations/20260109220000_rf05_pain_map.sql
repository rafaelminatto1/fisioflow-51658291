-- Create pain_maps table
CREATE TABLE IF NOT EXISTS public.pain_maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    global_pain_level INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create pain_map_points table
CREATE TABLE IF NOT EXISTS public.pain_map_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pain_map_id UUID REFERENCES public.pain_maps(id) ON DELETE CASCADE,
    region_code TEXT NOT NULL,
    region TEXT NOT NULL,
    intensity INTEGER NOT NULL,
    pain_type TEXT,
    notes TEXT,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pain_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_map_points ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view pain maps of their organization"
    ON public.pain_maps FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create pain maps for their organization"
    ON public.pain_maps FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update pain maps of their organization"
    ON public.pain_maps FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete pain maps of their organization"
    ON public.pain_maps FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policies for pain_map_points (inherit access via pain_map_id usually, but simple policy for now)
CREATE POLICY "Users can view pain points via map"
    ON public.pain_map_points FOR SELECT
    USING (
        pain_map_id IN (
            SELECT id FROM public.pain_maps 
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert pain points via map"
    ON public.pain_map_points FOR INSERT
    WITH CHECK (
        pain_map_id IN (
            SELECT id FROM public.pain_maps 
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete pain points via map"
    ON public.pain_map_points FOR DELETE
    USING (
        pain_map_id IN (
            SELECT id FROM public.pain_maps 
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pain_maps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pain_map_points;
