-- Rollback de 0152.
DELETE FROM clinical_extractions WHERE category IN ('linha_base', 'alta');

ALTER TABLE clinical_extractions
  DROP CONSTRAINT IF EXISTS clinical_extractions_category_chk;

ALTER TABLE clinical_extractions
  ADD CONSTRAINT clinical_extractions_category_chk
  CHECK (category IN ('conduta', 'regiao', 'equipamento', 'posicao', 'exercicio', 'plano',
                      'dosagem', 'carga', 'eva'));
