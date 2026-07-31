-- Migration: corrige a dimensão de clinical_embeddings.embedding
--
-- Problema: a coluna foi criada como vector(1536) ("compatível com OpenAI/Gemini"),
-- mas o writer (apps/api/src/lib/ai/embeddings.ts) usa @cf/baai/bge-m3, que devolve
-- 1024 dimensões. Todo INSERT falhava com erro de dimensão e era engolido por um
-- catch que só chamava console.error — a tabela ficou com 0 linhas, sem alerta.
--
-- Seguro: verificado em produção (purple-union-72678311) que a tabela está vazia.
-- O ALTER TYPE abaixo aborta se houver qualquer linha, para nunca destruir vetor real.

DO $$
DECLARE
  linhas bigint;
  dim_atual integer;
BEGIN
  SELECT count(*) INTO linhas FROM clinical_embeddings;
  IF linhas > 0 THEN
    RAISE EXCEPTION
      'clinical_embeddings tem % linha(s). Reembedar antes de trocar a dimensão.', linhas;
  END IF;

  SELECT atttypmod INTO dim_atual
  FROM pg_attribute
  WHERE attrelid = 'clinical_embeddings'::regclass AND attname = 'embedding';

  IF dim_atual = 1024 THEN
    RAISE NOTICE 'clinical_embeddings.embedding já é vector(1024); nada a fazer.';
    RETURN;
  END IF;

  DROP INDEX IF EXISTS clinical_embeddings_vector_idx;

  ALTER TABLE clinical_embeddings
    ALTER COLUMN embedding TYPE vector(1024);

  CREATE INDEX clinical_embeddings_vector_idx
    ON clinical_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
END $$;

COMMENT ON COLUMN clinical_embeddings.embedding IS
  'Vetor bge-m3 (1024d). Dimensão vem de CLINICAL_EMBEDDING_DIM em apps/api/src/lib/workersAi.ts — não hardcodar.';
