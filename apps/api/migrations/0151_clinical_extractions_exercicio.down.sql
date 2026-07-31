-- Rollback de 0151. Remove as extrações de exercício antes de restringir o CHECK,
-- senão o ALTER falha com linhas existentes.

DELETE FROM clinical_extractions WHERE category IN ('exercicio', 'plano');

ALTER TABLE clinical_extractions
  DROP CONSTRAINT IF EXISTS clinical_extractions_category_chk;

ALTER TABLE clinical_extractions
  ADD CONSTRAINT clinical_extractions_category_chk
  CHECK (category IN ('conduta', 'regiao', 'equipamento', 'posicao', 'dosagem', 'carga', 'eva'));
