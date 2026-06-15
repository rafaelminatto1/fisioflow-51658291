-- 0117_exercises_embedding_1024.down.sql
ALTER TABLE exercises DROP COLUMN IF EXISTS embedding;
ALTER TABLE exercises ADD COLUMN embedding vector(768);
