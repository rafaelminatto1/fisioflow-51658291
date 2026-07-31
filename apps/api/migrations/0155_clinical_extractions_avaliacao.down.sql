-- Reverte 0155: volta o CHECK ao vocabulário de 0152.
--
-- Destrutivo: as linhas das categorias novas violariam o CHECK restaurado, então
-- precisam sair antes. É seguro apagá-las — a camada derivada é reconstruível a
-- partir de `patient_evaluation_responses`, que nunca é alterada. Linhas
-- revisadas por humano (`reviewed_by IS NOT NULL`) seriam perda real de
-- curadoria, por isso o DELETE as preserva e o rollback falha se existirem.

DELETE FROM clinical_extractions
WHERE category IN ('hipotese_diagnostica', 'anamnese', 'antecedente',
                   'exame_fisico', 'plano_terapeutico')
  AND reviewed_by IS NULL;

ALTER TABLE clinical_extractions
  DROP CONSTRAINT IF EXISTS clinical_extractions_category_chk;

ALTER TABLE clinical_extractions
  ADD CONSTRAINT clinical_extractions_category_chk
  CHECK (category IN ('conduta', 'regiao', 'equipamento', 'posicao', 'exercicio', 'plano',
                      'dosagem', 'carga', 'eva', 'linha_base', 'alta'));
