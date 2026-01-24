-- ============================================================
-- MIGRATION: Rename Portuguese Tables to English
-- ============================================================
-- This migration standardizes table names to English.
--
-- IMPORTANT: This requires codebase updates!
-- Update all references after applying this migration.
-- ============================================================

-- ============================================================
-- STEP 1: Rename tables
-- ============================================================

ALTER TABLE eventos RENAME TO events;
ALTER TABLE feriados RENAME TO holidays;
ALTER TABLE participantes RENAME TO participants;
ALTER TABLE centros_custo RENAME TO cost_centers;
ALTER TABLE salas RENAME TO rooms;

-- ============================================================
-- STEP 2: Update foreign key references
-- ============================================================

-- Update foreign keys in checklist_items (references events)
ALTER TABLE checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_evento_id_fkey;

ALTER TABLE checklist_items
  ADD CONSTRAINT checklist_items_event_id_fkey
  FOREIGN KEY (evento_id) REFERENCES events(id) ON DELETE CASCADE;

-- Update foreign keys in other tables that reference renamed tables
-- (Add similar blocks for each foreign key)

-- ============================================================
-- STEP 3: Update RLS policy references
-- ============================================================

-- Policies referencing eventos -> events
DROP POLICY IF EXISTS "Membros veem eventos da org" ON events;
CREATE POLICY "Members can view events"
ON events FOR SELECT
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = events.organization_id
  )
);

DROP POLICY IF EXISTS "Membros podem atualizar eventos da org" ON events;
CREATE POLICY "Members can update events"
ON events FOR UPDATE
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = events.organization_id
      AND role IN ('admin', 'fisioterapeuta')
  )
);

DROP POLICY IF EXISTS "Membros podem criar eventos da org" ON events;
CREATE POLICY "Members can create events"
ON events FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = events.organization_id
      AND role IN ('admin', 'fisioterapeuta')
  )
);

DROP POLICY IF EXISTS "Apenas admins podem deletar eventos" ON events;
CREATE POLICY "Admins can delete events"
ON events FOR DELETE
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);

-- Policies referencing feriados -> holidays
DROP POLICY IF EXISTS "consolidated_select_feriados_policy" ON holidays;
CREATE POLICY "consolidated_select_holidays_policy"
ON holidays FOR SELECT
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = holidays.organization_id
      AND role IN ('admin', 'fisioterapeuta', 'estagiario')
  )
);

-- ============================================================
-- STEP 4: Update views (if any reference renamed tables)
-- ============================================================

-- Drop and recreate views with new table names
-- (Add view updates here)

-- ============================================================
-- STEP 5: Update function definitions
-- ============================================================

-- Update functions that reference the old table names
-- (Add function updates here)

-- ============================================================
-- STEP 6: Create compatibility views (temporary)
-- ============================================================

-- Create views for backward compatibility during transition
CREATE VIEW eventos AS SELECT * FROM events;
CREATE VIEW feriados AS SELECT * FROM holidays;
CREATE VIEW participantes AS SELECT * FROM participants;
CREATE VIEW centros_custo AS SELECT * FROM cost_centers;
CREATE VIEW salas AS SELECT * FROM rooms;

-- ============================================================
-- CODEBASE UPDATES REQUIRED
-- ============================================================

-- After applying this migration, update all code references:

-- TypeScript/JavaScript:
-- - src/lib/database/schema.ts
-- - src/integrations/supabase/queries/*.ts
-- - All components using these tables

-- Find references:
-- grep -r "eventos" src/ --include="*.ts" --include="*.tsx"
-- grep -r "feriados" src/ --include="*.ts" --include="*.tsx"
-- grep -r "participantes" src/ --include="*.ts" --include="*.tsx"
-- grep -r "centros_custo" src/ --include="*.ts" --include="*.tsx"
-- grep -r "salas" src/ --include="*.ts" --include="*.tsx"

-- Replace with:
-- eventos -> events
-- feriados -> holidays
-- participantes -> participants
-- centros_custo -> cost_centers
-- salas -> rooms

-- ============================================================
-- STEP 7: Remove compatibility views (after 2 weeks)
-- ============================================================

-- Once code is updated, drop the compatibility views:
-- DROP VIEW IF EXISTS eventos;
-- DROP VIEW IF EXISTS feriados;
-- DROP VIEW IF EXISTS participantes;
-- DROP VIEW IF EXISTS centros_custo;
-- DROP VIEW IF EXISTS salas;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify tables were renamed:
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'holidays', 'participants', 'cost_centers', 'rooms');

-- Expected: All 5 tables should exist

-- ============================================================
-- NOTES
-- ============================================================

-- 1. Test thoroughly after renaming
-- 2. Update all TypeScript types
-- 3. Run full test suite
-- 4. Deploy backend and frontend together
-- 5. Keep compatibility views for 2 weeks
-- 6. Remove views after verification
