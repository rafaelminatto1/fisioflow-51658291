-- 0083_backfill_exercise_media.down.sql
-- O backfill apenas copia dados que já existiam, então não há revert seguro.
-- Para desfazer manualmente:
--   - Remover attachments criados nessa migration filtrando por caption IS NULL
--     e order_index baixo (não é confiável; não revertemos aqui).
SELECT 1;
