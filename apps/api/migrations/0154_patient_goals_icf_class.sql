-- 0154_patient_goals_icf_class.sql
-- Classe CIF do objetivo terapêutico.
--
-- Why: o estudo norueguês FYSIOPRIM (N=2.591, BMC Musculoskelet Disord) mostrou
-- que a CLASSE do objetivo prediz desfecho. Objetivos de atividade/participação
-- ("voltar a jogar futebol") tiveram OR 1,80 para melhora global frente a
-- objetivos de sintoma ("reduzir dor"), e objetivos não classificáveis — vagos —
-- foram associados a PIOR evolução da intensidade de dor.
--
-- Ou seja: como o objetivo é escrito não é detalhe de formulário, é fator
-- prognóstico. Guardar a classe permite sinalizar, no momento em que o objetivo
-- é definido, que ele está só no nível de sintoma — quando ainda dá para
-- renegociar com o paciente.
--
-- Contexto local: `patient_goals` existe e tem 0 linhas, e apenas 75 das 11.336
-- evoluções mencionam "objetivo". Esta coluna é para o que vier a partir de agora.

ALTER TABLE patient_goals
  ADD COLUMN IF NOT EXISTS icf_class TEXT;

ALTER TABLE patient_goals
  DROP CONSTRAINT IF EXISTS patient_goals_icf_class_chk;

ALTER TABLE patient_goals
  ADD CONSTRAINT patient_goals_icf_class_chk
  CHECK (icf_class IS NULL OR icf_class IN (
    'sintoma',                 -- "reduzir dor"
    'funcao_estrutura',        -- "ganhar 20° de flexão"
    'atividade_participacao',  -- "voltar a jogar futebol" — melhor prognóstico
    'nao_classificavel'        -- vago; pior prognóstico para dor
  ));

CREATE INDEX IF NOT EXISTS idx_patient_goals_icf
  ON patient_goals (organization_id, icf_class)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN patient_goals.icf_class IS
  'Classe CIF do objetivo. atividade_participacao prediz melhor desfecho (OR 1,80, FYSIOPRIM N=2591); nao_classificavel prediz pior.';
