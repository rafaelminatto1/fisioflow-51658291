-- Migration: Fix prom_snapshots patient_id foreign key
-- Description: Change patient_id FK from auth.users to patients table
-- Date: 2026-01-08

-- ============================================================
-- STEP 1: DROP DEPENDENT VIEWS
-- ============================================================

DROP VIEW IF EXISTS public.prom_snapshots_summary CASCADE;

-- ============================================================
-- STEP 2: REMOVE OLD FOREIGN KEY CONSTRAINT
-- ============================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE public.prom_snapshots DROP CONSTRAINT IF EXISTS prom_snapshots_patient_id_fkey;

-- ============================================================
-- STEP 3: ADD CORRECT FOREIGN KEY CONSTRAINT
-- ============================================================

-- Add the correct foreign key to patients table
ALTER TABLE public.prom_snapshots 
ADD CONSTRAINT prom_snapshots_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 4: UPDATE TABLE COMMENT
-- ============================================================

COMMENT ON TABLE public.prom_snapshots IS 'PROM (Patient-Reported Outcomes Measures) snapshots';
COMMENT ON COLUMN public.prom_snapshots.patient_id IS 'Reference to patient who provided the PROM data';

-- ============================================================
-- STEP 5: RECREATE ANY DEPENDENT VIEWS
-- ============================================================

-- Recreate prom_snapshots_summary view if it exists
CREATE OR REPLACE VIEW public.prom_snapshots_summary AS
SELECT 
    ps.patient_id,
    p.full_name as patient_name,
    COUNT(*) as snapshot_count,
    MIN(ps.captured_at) as first_capture,
    MAX(ps.captured_at) as last_capture,
    ps.source,
    ps.collected_by
FROM public.prom_snapshots ps
LEFT JOIN public.patients p ON ps.patient_id = p.id
GROUP BY ps.patient_id, p.full_name, ps.source, ps.collected_by;

-- Log completion
RAISE NOTICE 'Migration completed: prom_snapshots.patient_id FK corrected to reference patients table';
