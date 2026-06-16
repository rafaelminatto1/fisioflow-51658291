-- 0117_exercises_embedding_1024.sql
-- Padroniza exercises.embedding em 1024d (bge-m3), alinhando com evidence_articles.
ALTER TABLE exercises DROP COLUMN IF EXISTS embedding;
ALTER TABLE exercises ADD COLUMN embedding vector(1024);
