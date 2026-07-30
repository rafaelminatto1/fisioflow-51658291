-- Persistência opaca para o snapshot compactado do documento Yjs. Não há
-- índice: o conteúdo não é pesquisável e sempre é obtido pela chave da nota.
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "yjs_state" bytea;
--> statement-breakpoint

-- Uma concessão não revogada por principal é a fonte de verdade da ACL. O
-- NULLS NOT DISTINCT também impede duplicidade para tipos de principal cujo
-- subject_id é nulo (por exemplo, uma concessão para toda a organização).
-- Expiração é avaliada em tempo de autorização; índices parciais não podem
-- depender de now(), portanto a linha permanece única até ser revogada ou
-- atualizada.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_note_permissions_active_subject_unique"
  ON "note_permissions" USING btree ("note_id", "subject_type", "subject_id") NULLS NOT DISTINCT
  WHERE "revoked_at" IS NULL;
