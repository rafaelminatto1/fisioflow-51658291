-- Rollback de 0149: volta clinical_embeddings.embedding para vector(1536).
-- Aborta se houver vetores gravados — voltar a 1536 tornaria os embeddings bge-m3
-- (1024d) irrecuperáveis. Nesse caso, esvazie a tabela deliberadamente antes.

DO $$
DECLARE
  linhas bigint;
BEGIN
  SELECT count(*) INTO linhas FROM clinical_embeddings;
  IF linhas > 0 THEN
    RAISE EXCEPTION
      'clinical_embeddings tem % linha(s) em 1024d. Esvazie antes de reverter para 1536.', linhas;
  END IF;

  DROP INDEX IF EXISTS clinical_embeddings_vector_idx;

  ALTER TABLE clinical_embeddings
    ALTER COLUMN embedding TYPE vector(1536);

  CREATE INDEX clinical_embeddings_vector_idx
    ON clinical_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
END $$;
