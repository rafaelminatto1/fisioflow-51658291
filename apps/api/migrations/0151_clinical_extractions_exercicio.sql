-- 0151_clinical_extractions_exercicio.sql
-- Adiciona a categoria 'exercicio' a clinical_extractions.
--
-- Why: exercício é um eixo distinto de conduta. "EENM em lombar realizando PQD"
-- traz recurso (eletroestimulação) e exercício (paraquedista) na mesma frase, e
-- os dois precisam ser consultáveis separadamente — "quais pacientes fizeram
-- TENS" e "quais fizeram agachamento" são perguntas diferentes.
--
-- O gatilho foi `PQD`, confirmado pela fisioterapeuta como paraquedista (extensão
-- de tronco em decúbito ventral). Ele não cabia em nenhuma categoria existente:
-- não é conduta, não é região, não é equipamento.

ALTER TABLE clinical_extractions
  DROP CONSTRAINT IF EXISTS clinical_extractions_category_chk;

ALTER TABLE clinical_extractions
  ADD CONSTRAINT clinical_extractions_category_chk
  CHECK (category IN ('conduta', 'regiao', 'equipamento', 'posicao', 'exercicio', 'plano', 'dosagem', 'carga', 'eva'));
