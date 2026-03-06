-- Enable the pgvector extension to work with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding column to protocols
ALTER TABLE exercise_protocols ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW indexes for faster similarity search
CREATE INDEX IF NOT EXISTS exercises_embedding_idx ON exercises USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS exercise_protocols_embedding_idx ON exercise_protocols USING hnsw (embedding vector_cosine_ops);
