-- ============================================================================
-- Enable PGroonga for Multilingual Full-Text Search
-- ============================================================================
-- This migration enables PGroonga, a fast full-text search extension
-- that provides superior multilingual support for Portuguese and other languages.
--
-- Benefits:
-- - Fast full-text search (10x faster than pg_trgm)
-- - Excellent multilingual support (Portuguese, CJK, etc.)
-- - Automatic tokenizer and normalizer
-- - Supports complex queries with AND/OR/NOT
-- - Better relevance scoring
-- ============================================================================

-- Enable PGroonga extension (already available in Supabase Pro)
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- ============================================================================
-- CREATE PGROONGA INDEX FOR EXERCISES
-- ============================================================================

-- Create a full-text search index on exercises table
-- This indexes name, description, instructions, and other text fields
CREATE INDEX IF NOT EXISTS idx_exercises_search_pgroonga
ON exercises
USING pgroonga (
  -- Searchable text columns
  (COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(instructions, '')),
  -- Category and difficulty for filtering
  category,
  difficulty,
  -- Muscle groups for filtering
  muscle_groups,
  -- Equipment for filtering
  equipment
)
WITH (
  tokenizer = 'TokenBigram',           -- Bigram tokenizer for better multilingual support
  normalizer = 'NormalizerAuto'         -- Automatic normalizer for case/diacritic-insensitive search
);

-- ============================================================================
-- CREATE SEARCH FUNCTION
-- ============================================================================

-- Function to search exercises using PGroonga
CREATE OR REPLACE FUNCTION search_exercises_pgroonga(
  search_query TEXT DEFAULT '',
  category_filter TEXT DEFAULT NULL,
  difficulty_filter TEXT DEFAULT NULL,
  muscle_group_filter TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  difficulty TEXT,
  muscle_groups TEXT[],
  equipment TEXT[],
  image_url TEXT,
  video_url TEXT,
  instructions TEXT,
  relevance_score REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_where TEXT := '';
BEGIN
  -- Build WHERE clause based on filters
  IF search_query IS NOT NULL AND search_query != '' THEN
    query_where := query_where || format('
      & @query %% %L
      & @query *^ %L
      & @query ^@ %L
      & @query *~ %L
    ', search_query, search_query, search_query, search_query);
  END IF;

  IF category_filter IS NOT NULL THEN
    query_where := query_where || format(' & category == %L', category_filter);
  END IF;

  IF difficulty_filter IS NOT NULL THEN
    query_where := query_where || format(' & difficulty == %L', difficulty_filter);
  END IF;

  IF muscle_group_filter IS NOT NULL THEN
    query_where := query_where || format(' & muscle_groups @ %L', ARRAY[muscle_group_filter]::text[]);
  END IF;

  -- Remove leading ' & ' if exists
  IF query_where LIKE ' & %' THEN
    query_where := substring(query_where FROM 4);
  END IF;

  -- Build and execute the query
  RETURN QUERY EXECUTE format('
    SELECT
      e.id,
      e.name,
      e.description,
      e.category,
      e.difficulty,
      e.muscle_groups,
      e.equipment,
      e.image_url,
      e.video_url,
      e.instructions,
      pgroonga_score(e.id) AS relevance_score
    FROM exercises AS e
    WHERE e.is_active = true
      AND e.deleted_at IS NULL
      AND %L
    ORDER BY pgroonga_score(e.id) DESC, e.name ASC
    LIMIT %s
    OFFSET %s
  ', query_where, max_results, offset_count);

  RETURN;
END;
$$;

-- ============================================================================
-- CREATE FUZZY SEARCH FUNCTION
-- ============================================================================

-- Function for fuzzy search (tolerates typos)
CREATE OR REPLACE FUNCTION search_exercises_fuzzy(
  search_query TEXT,
  max_distance INTEGER DEFAULT 2,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  difficulty TEXT,
  muscle_groups TEXT[],
  similarity_score REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.description,
    e.category,
    e.difficulty,
    e.muscle_groups,
    pgroonga_score(e.id) * 1.0 AS similarity_score
  FROM exercises AS e
  WHERE e.is_active = true
    AND e.deleted_at IS NULL
    AND e.name % search_query  -- Fuzzy match on name
  ORDER BY pgroonga_score(e.id) DESC
  LIMIT max_results;
END;
$$;

-- ============================================================================
-- CREATE SIMILAR EXERCISES FUNCTION
-- ============================================================================

-- Function to find similar exercises based on text similarity
CREATE OR REPLACE FUNCTION find_similar_exercises(
  exercise_id UUID,
  max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  ref_exercise TEXT;
BEGIN
  -- Get the reference exercise text
  SELECT (COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(instructions, ''))
  INTO ref_exercise
  FROM exercises
  WHERE id = exercise_id;

  -- Find similar exercises
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.description,
    e.category,
    pgroonga_score(e.id) * 1.0 AS similarity_score
  FROM exercises AS e
  WHERE e.id != exercise_id
    AND e.is_active = true
    AND e.deleted_at IS NULL
    AND to_tsvector('portuguese', COALESCE(e.name, '') || ' ' || COALESCE(e.description, ''))
      @@ to_tsquery('portuguese', replace(trim(ref_exercise), ' ', ' | '))
  ORDER BY pgroonga_score(e.id) DESC
  LIMIT max_results;

  RETURN;
END;
$$;

-- ============================================================================
-- CREATE SEARCH SUGGESTIONS FUNCTION
-- ============================================================================

-- Function to get search suggestions as user types
CREATE OR REPLACE FUNCTION get_exercise_suggestions(
  partial_query TEXT,
  max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
  name TEXT,
  category TEXT,
  suggestion_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.name,
    e.category,
    COUNT(*) OVER() AS suggestion_count
  FROM exercises AS e
  WHERE e.is_active = true
    AND e.deleted_at IS NULL
    AND e.name &^~ partial_query  -- Prefix search with fuzzy matching
  GROUP BY e.id, e.name, e.category
  ORDER BY e.name ASC
  LIMIT max_results;
END;
$$;

-- ============================================================================
-- CREATE ADVANCED SEARCH FUNCTION
-- ============================================================================

-- Advanced search with multiple filters and scoring
CREATE OR REPLACE FUNCTION search_exercises_advanced(
  search_query TEXT DEFAULT '',
  categories TEXT[] DEFAULT NULL,
  difficulties TEXT[] DEFAULT NULL,
  muscle_groups TEXT[] DEFAULT NULL,
  equipment_filter TEXT[] DEFAULT NULL,
  min_duration_seconds INTEGER DEFAULT NULL,
  max_duration_seconds INTEGER DEFAULT NULL,
  max_results INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  difficulty TEXT,
  muscle_groups TEXT[],
  equipment TEXT[],
  duration_seconds INTEGER,
  image_url TEXT,
  video_url TEXT,
  instructions TEXT,
  relevance_score REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_parts TEXT[] := '{}';
  sql_query TEXT;
BEGIN
  -- Build query parts
  IF search_query IS NOT NULL AND search_query != '' THEN
    query_parts := array_append(query_parts,
      format('score &@ (%L | %L* | %L^-)',
        search_query, search_query, search_query));
  END IF;

  -- Category filter
  IF categories IS NOT NULL AND array_length(categories, 1) > 0 THEN
    query_parts := array_append(query_parts,
      format('category IN %L', categories));
  END IF;

  -- Difficulty filter
  IF difficulties IS NOT NULL AND array_length(difficulties, 1) > 0 THEN
    query_parts := array_append(query_parts,
      format('difficulty IN %L', difficulties));
  END IF;

  -- Muscle groups filter (overlap)
  IF muscle_groups IS NOT NULL AND array_length(muscle_groups, 1) > 0 THEN
    query_parts := array_append(query_parts,
      format('muscle_groups && %L', muscle_groups));
  END IF;

  -- Equipment filter (has any)
  IF equipment_filter IS NOT NULL AND array_length(equipment_filter, 1) > 0 THEN
    query_parts := array_append(query_parts,
      format('equipment && %L', equipment_filter));
  END IF;

  -- Duration filters
  IF min_duration_seconds IS NOT NULL THEN
    query_parts := array_append(query_parts,
      format('duration_seconds >= %s', min_duration_seconds));
  END IF;

  IF max_duration_seconds IS NOT NULL THEN
    query_parts := array_append(query_parts,
      format('duration_seconds <= %s', max_duration_seconds));
  END IF;

  -- Always filter active exercises
  query_parts := array_append(query_parts, 'is_active = true');
  query_parts := array_append(query_parts, 'deleted_at IS NULL');

  -- Combine all parts
  sql_query := array_to_string(query_parts, ' AND ');

  -- Execute query
  RETURN QUERY EXECUTE format('
    SELECT
      e.id,
      e.name,
      e.description,
      e.category,
      e.difficulty,
      e.muscle_groups,
      e.equipment,
      e.duration_seconds,
      e.image_url,
      e.video_url,
      e.instructions,
      COALESCE(pgroonga_score(e.id), 0) * 1.0 AS relevance_score
    FROM exercises AS e
    WHERE %s
    ORDER BY pgroonga_score(e.id) DESC, e.name ASC
    LIMIT %s OFFSET %s
  ', sql_query, max_results, offset_count);

  RETURN;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION search_exercises_pgroonga TO authenticated;
GRANT EXECUTE ON FUNCTION search_exercises_fuzzy TO authenticated;
GRANT EXECUTE ON FUNCTION find_similar_exercises TO authenticated;
GRANT EXECUTE ON FUNCTION get_exercise_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION search_exercises_advanced TO authenticated;

-- ============================================================================
-- CREATE HELPER VIEW FOR EXERCISE SEARCH STATS
-- ============================================================================

-- View to see search statistics and popular categories
CREATE OR REPLACE VIEW exercise_search_stats AS
SELECT
  category,
  difficulty,
  COUNT(*) as exercise_count,
  array_agg(DISTINCT unnest(muscle_groups)) as unique_muscle_groups,
  array_agg(DISTINCT unnest(equipment)) as unique_equipment
FROM exercises
WHERE is_active = true
  AND deleted_at IS NULL
GROUP BY category, difficulty
ORDER BY category, difficulty;

GRANT SELECT ON exercise_search_stats TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'PGroonga full-text search enabled successfully!';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  - search_exercises_pgroonga(query, category, difficulty, muscle_group, limit, offset)';
  RAISE NOTICE '  - search_exercises_fuzzy(query, max_distance, limit)';
  RAISE NOTICE '  - find_similar_exercises(exercise_id, limit)';
  RAISE NOTICE '  - get_exercise_suggestions(partial_query, limit)';
  RAISE NOTICE '  - search_exercises_advanced(query, categories[], difficulties[], muscle_groups[], equipment[], min_duration, max_duration, limit, offset)';
END $$;
