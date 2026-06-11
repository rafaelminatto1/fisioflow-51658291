-- Migration: Add HNSW index for clinical embeddings
-- Description: Optimizes semantic search for clinical notes using Hierarchical Navigable Small World index.

CREATE INDEX IF NOT EXISTS clinical_embeddings_vector_idx 
ON clinical_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
