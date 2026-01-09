-- Fix migration: Use user_id for transacoes policies (table exists without organization_id)

-- Drop policies that may have failed or not been created
DROP POLICY IF EXISTS "Users can view transactions of their organization" ON public.transacoes;
DROP POLICY IF EXISTS "Users can insert transactions for their organization" ON public.transacoes;
DROP POLICY IF EXISTS "Users can update transactions of their organization" ON public.transacoes;
DROP POLICY IF EXISTS "Users can delete transactions of their organization" ON public.transacoes;

-- Create user_id based policies for transacoes
CREATE POLICY "Users can view their own transactions"
    ON public.transacoes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions"
    ON public.transacoes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions"
    ON public.transacoes FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions"
    ON public.transacoes FOR DELETE
    USING (user_id = auth.uid());

-- Create packages table if not exists (session_packages might already fulfill this need)
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    total_sessions INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    validity_days INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on packages if not already
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Drop and recreate packages policies
DROP POLICY IF EXISTS "Users can view packages of their organization" ON public.packages;
DROP POLICY IF EXISTS "Users can manage packages of their organization" ON public.packages;

CREATE POLICY "Users can view packages of their organization"
    ON public.packages FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage packages of their organization"
    ON public.packages FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Handle patient_packages
DROP POLICY IF EXISTS "Users can view patient packages of their organization" ON public.patient_packages;
DROP POLICY IF EXISTS "Users can manage patient packages of their organization" ON public.patient_packages;

-- Check if patient_packages has organization_id before creating org-based policies
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patient_packages' AND column_name = 'organization_id'
    ) THEN
        CREATE POLICY "Users can view patient packages of their organization"
            ON public.patient_packages FOR SELECT
            USING (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members 
                    WHERE user_id = auth.uid()
                )
            );
        CREATE POLICY "Users can manage patient packages of their organization"
            ON public.patient_packages FOR ALL
            USING (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members 
                    WHERE user_id = auth.uid()
                )
            );
    ELSE
        -- Fall back to patient_id based access
        CREATE POLICY "Users can view patient packages"
            ON public.patient_packages FOR SELECT
            USING (
                patient_id IN (
                    SELECT id FROM public.patients 
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;
