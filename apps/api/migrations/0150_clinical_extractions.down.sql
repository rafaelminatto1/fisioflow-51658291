-- Rollback de 0150.
-- Seguro por construção: clinical_extractions é camada derivada e reconstruível
-- pelo parser a partir de sessions.observacao, que não é tocado por esta migration.

DROP TABLE IF EXISTS clinical_extractions;
