-- Rollback de 0153. Descarta registros de alta declarados pelos profissionais —
-- não são reconstruíveis a partir de outra fonte, ao contrário de
-- clinical_extractions. Exporte antes se houver linhas com origin='profissional'.
DROP TABLE IF EXISTS discharge_events;
