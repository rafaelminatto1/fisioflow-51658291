-- Resize vector columns from 1536 (OpenAI) to 768 (Google Gemini text-embedding-004)

-- 1. Drop existing indexes (they depend on the column type)
DROP INDEX IF EXISTS exercises_embedding_idx;
DROP INDEX IF EXISTS exercise_protocols_embedding_idx;
DROP INDEX IF EXISTS patients_clinical_embedding_idx;
DROP INDEX IF EXISTS medical_records_embedding_idx;

-- 2. Drop existing functions (they depend on the vector size in arguments)
DROP FUNCTION IF EXISTS search_exercises_semantic;
DROP FUNCTION IF EXISTS search_protocols_semantic;
DROP FUNCTION IF EXISTS find_similar_patients;

-- 3. Alter table columns
-- We have to drop and recreate or alter type. Alter type with USING is cleaner if supported for vector, 
-- but since we are changing providers, the old data is garbage anyway. We can just clear it.

-- Exercises
ALTER TABLE exercises 
ALTER COLUMN embedding TYPE vector(768) 
USING NULL::vector(768); -- Clear old data as it is incompatible

-- Protocols
ALTER TABLE exercise_protocols 
ALTER COLUMN embedding TYPE vector(768) 
USING NULL::vector(768);

-- Patients
ALTER TABLE patients 
ALTER COLUMN clinical_history_embedding TYPE vector(768) 
USING NULL::vector(768);

-- Medical Records
ALTER TABLE medical_records 
ALTER COLUMN embedding TYPE vector(768) 
USING NULL::vector(768);

-- 4. Recreate Indexes (HNSW)
CREATE INDEX exercises_embedding_idx ON exercises USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX exercise_protocols_embedding_idx ON exercise_protocols USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX patients_clinical_embedding_idx ON patients USING hnsw (clinical_history_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX medical_records_embedding_idx ON medical_records USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 5. Recreate Functions with new 768 dimension

-- Search Exercises
CREATE OR REPLACE FUNCTION search_exercises_semantic(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6, -- Querying Gemini embeddings might need tuning
  match_count int DEFAULT 10,
  organization_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  difficulty text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.description,
    e.category,
    e.difficulty,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM exercises e
  WHERE
    e.embedding IS NOT NULL AND
    (organization_id_param IS NULL OR e.organization_id = organization_id_param) AND
    (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Search Protocols
CREATE OR REPLACE FUNCTION search_protocols_semantic(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 10,
  organization_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  condition_name text,
  protocol_type text,
  duration_weeks int,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.condition_name,
    p.protocol_type,
    p.weeks_total as duration_weeks,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM exercise_protocols p
  WHERE
    p.embedding IS NOT NULL AND
    (organization_id_param IS NULL OR p.organization_id = organization_id_param) AND
    (1 - (p.embedding <=> query_embedding)) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Similar Patients
CREATE OR REPLACE FUNCTION find_similar_patients(
  clinical_embedding vector(768),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5,
  organization_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  age int,
  primary_diagnosis text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth))::int as age,
    p.primary_diagnosis,
    1 - (p.clinical_history_embedding <=> clinical_embedding) as similarity
  FROM patients p
  WHERE
    p.clinical_history_embedding IS NOT NULL AND
    (organization_id_param IS NULL OR p.organization_id = organization_id_param) AND
    (1 - (p.clinical_history_embedding <=> clinical_embedding)) > match_threshold
  ORDER BY p.clinical_history_embedding <=> clinical_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
