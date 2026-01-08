-- Migration: Fix prom_snapshots patient_id foreign key
-- Description: Change patient_id FK from auth.users to patients table
-- Date: 2026-01-08

DO $$
BEGIN
    -- Only run if the table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'prom_snapshots') THEN
        RAISE NOTICE 'Table prom_snapshots exists, applying fixes...';

        -- STEP 1: DROP DEPENDENT VIEWS
        EXECUTE 'DROP VIEW IF EXISTS public.prom_snapshots_summary CASCADE';

        -- STEP 2: REMOVE OLD FOREIGN KEY CONSTRAINT
        EXECUTE 'ALTER TABLE public.prom_snapshots DROP CONSTRAINT IF EXISTS prom_snapshots_patient_id_fkey';

        -- STEP 3: ADD CORRECT FOREIGN KEY CONSTRAINT
        EXECUTE 'ALTER TABLE public.prom_snapshots ADD CONSTRAINT prom_snapshots_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE';

        -- STEP 4: UPDATE TABLE COMMENT
        EXECUTE 'COMMENT ON TABLE public.prom_snapshots IS ''PROM (Patient-Reported Outcomes Measures) snapshots''';
        EXECUTE 'COMMENT ON COLUMN public.prom_snapshots.patient_id IS ''Reference to patient who provided the PROM data''';

        -- STEP 5: RECREATE ANY DEPENDENT VIEWS
        EXECUTE 'CREATE OR REPLACE VIEW public.prom_snapshots_summary AS
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
        GROUP BY ps.patient_id, p.full_name, ps.source, ps.collected_by';

        RAISE NOTICE 'Migration completed: prom_snapshots.patient_id FK corrected to reference patients table';
    ELSE
        RAISE NOTICE 'Table prom_snapshots does not exist, skipping migration';
    END IF;
END $$;
