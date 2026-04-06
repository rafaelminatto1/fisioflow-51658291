
-- =========================================================================
-- Neon Database Migration: Enable pgvector and Add Embeddings
-- =========================================================================

-- 1. Enable the pgvector extension (Required for Neon RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Update existing protocols table to 768 dimensions (if it existed as 1536)
ALTER TABLE exercise_protocols
ALTER COLUMN embedding TYPE vector(768);

-- 3. Add embedding column to wiki_pages for RAG Search
ALTER TABLE wiki_pages
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 4. Create HNSW indexes for ultra-fast similarity search (Cosine Distance)
-- Note: Adjust lists/m depending on the size of your dataset. Default values work well.

CREATE INDEX IF NOT EXISTS exercise_protocols_embedding_idx ON exercise_protocols USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS wiki_pages_embedding_idx ON wiki_pages USING hnsw (embedding vector_cosine_ops);

-- Migration successful!
