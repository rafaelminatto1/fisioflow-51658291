-- ============================================================
-- MIGRATION: Add Full-Text Search Capabilities
-- ============================================================
-- This migration adds full-text search for patients and exercises.
--
-- Impact: Fast, relevant text search across multiple fields
-- ============================================================

-- ============================================================
-- Ensure pg_trgm extension is installed
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- Table: patients - Full-text search setup
-- ============================================================

-- Add tsvector column for full-text search
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tsv tsvector;

-- Create function to update tsv column
CREATE OR REPLACE FUNCTION patients_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.observations, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.address, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.city, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update tsv
DROP TRIGGER IF EXISTS patients_tsv_update ON patients;
CREATE TRIGGER patients_tsv_update
BEFORE INSERT OR UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION patients_tsv_trigger();

-- Create GIN index for fast full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_tsv ON patients USING GIN(tsv);

-- Create additional trigram index for fuzzy search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_full_name_trgm
ON patients USING GIN (full_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_email_trgm
ON patients USING GIN (email gin_trgm_ops);

-- Initialize tsv for existing records
UPDATE patients SET tsv = '' WHERE tsv IS NULL;

-- ============================================================
-- Table: exercises - Full-text search setup
-- ============================================================

-- Add tsvector column
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tsv tsvector;

-- Create function to update tsv column
CREATE OR REPLACE FUNCTION exercises_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.instructions, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.muscle_groups, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.equipment, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS exercises_tsv_update ON exercises;
CREATE TRIGGER exercises_tsv_update
BEFORE INSERT OR UPDATE ON exercises
FOR EACH ROW EXECUTE FUNCTION exercises_tsv_trigger();

-- Create indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_tsv ON exercises USING GIN(tsv);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_name_trgm
ON exercises USING GIN (name gin_trgm_ops);

-- Initialize tsv for existing records
UPDATE exercises SET tsv = '' WHERE tsv IS NULL;

-- ============================================================
-- Table: soap_records - Full-text search setup
-- ============================================================

-- Add tsvector column for SOAP notes
ALTER TABLE soap_records ADD COLUMN IF NOT EXISTS tsv tsvector;

-- Create function
CREATE OR REPLACE FUNCTION soap_records_tsv_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.subjective, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.objective, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.assessment, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.plan, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS soap_records_tsv_update ON soap_records;
CREATE TRIGGER soap_records_tsv_update
BEFORE INSERT OR UPDATE ON soap_records
FOR EACH ROW EXECUTE FUNCTION soap_records_tsv_trigger();

-- Create index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_soap_records_tsv ON soap_records USING GIN(tsv);

-- Initialize tsv for existing records
UPDATE soap_records SET tsv = '' WHERE tsv IS NULL;

-- ============================================================
-- SEARCH FUNCTIONS
-- ============================================================

-- Function: Search patients
CREATE OR REPLACE FUNCTION search_patients(
  search_query TEXT,
  search_organization_id UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.phone,
    ts_rank(p.tsv, plainto_tsquery('portuguese', search_query)) as rank
  FROM patients p
  WHERE
    p.tsv @@ plainto_tsquery('portuguese', search_query)
    AND (search_organization_id IS NULL OR p.organization_id = search_organization_id)
    AND p.status = 'active'
  ORDER BY rank DESC, p.full_name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- Function: Fuzzy search patients (using trigram)
CREATE OR REPLACE FUNCTION fuzzy_search_patients(
  search_query TEXT,
  search_organization_id UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    GREATEST(
      similarity(p.full_name, search_query),
      COALESCE(similarity(p.email, search_query), 0),
      COALESCE(similarity(p.phone, search_query), 0)
    ) as similarity_score
  FROM patients p
  WHERE
    (search_organization_id IS NULL OR p.organization_id = search_organization_id)
    AND p.status = 'active'
    AND (
      p.full_name % search_query OR
      p.email % search_query OR
      p.phone % search_query
    )
  ORDER BY similarity_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- Function: Search exercises
CREATE OR REPLACE FUNCTION search_exercises(
  search_query TEXT,
  search_organization_id UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.description,
    ts_rank(e.tsv, plainto_tsquery('portuguese', search_query)) as rank
  FROM exercises e
  WHERE
    e.tsv @@ plainto_tsquery('portuguese', search_query)
    AND (search_organization_id IS NULL OR e.organization_id = search_organization_id)
  ORDER BY rank DESC, e.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- Function: Search SOAP records
CREATE OR REPLACE FUNCTION search_soap_records(
  search_query TEXT,
  search_patient_id UUID DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  patient_name TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.patient_id,
    p.full_name as patient_name,
    s.created_at,
    ts_rank(s.tsv, plainto_tsquery('portuguese', search_query)) as rank
  FROM soap_records s
  JOIN patients p ON s.patient_id = p.id
  WHERE
    s.tsv @@ plainto_tsquery('portuguese', search_query)
    AND (search_patient_id IS NULL OR s.patient_id = search_patient_id)
    AND p.status = 'active'
  ORDER BY rank DESC, s.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- ============================================================
-- RLS POLICIES FOR SEARCH FUNCTIONS
-- ============================================================

-- Grant execute on search functions to authenticated users
GRANT EXECUTE ON FUNCTION search_patients TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_search_patients TO authenticated;
GRANT EXECUTE ON FUNCTION search_exercises TO authenticated;
GRANT EXECUTE ON FUNCTION search_soap_records TO authenticated;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Test patient search
-- SELECT * FROM search_patients('joão');

-- Test fuzzy search
-- SELECT * FROM fuzzy_search_patients('joao');

-- Test exercise search
-- SELECT * FROM search_exercises('coluna');

-- Test SOAP search
-- SELECT * FROM search_soap_records('dor');

-- ============================================================
-- PERFORMANCE NOTES
-- ============================================================

-- 1. GIN indexes are larger but faster for full-text search
-- 2. Trigram indexes enable fuzzy/partial matching
-- 3. Consider running:
--    - VACUUM ANALYZE patients;
--    - REINDEX TABLE patients;
-- 4. Monitor index size with:
--    SELECT pg_size_pretty(pg_relation_size('idx_patients_tsv'));

-- ============================================================
-- USAGE EXAMPLES
-- ============================================================

-- Find patients by name or email
-- SELECT * FROM search_patients('silva@gmail.com');

-- Find patients with typos (fuzzy search)
-- SELECT * FROM fuzzy_search_patients('joao');  -- finds "João", "Jonas", etc.

-- Find exercises by muscle group or description
-- SELECT * FROM search_exercises('quadril');

-- Find SOAP notes containing specific terms
-- SELECT * FROM search_soap_records('lombar');
