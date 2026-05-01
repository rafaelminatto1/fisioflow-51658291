-- Rollback 0051: Remove min_colaboradores and participantes_previstos from eventos
ALTER TABLE eventos DROP COLUMN IF EXISTS participantes_previstos;
ALTER TABLE eventos DROP COLUMN IF EXISTS minimo_colaboradores;
