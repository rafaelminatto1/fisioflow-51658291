-- 0152_clinical_extractions_alta_linha_base.sql
-- Adiciona as categorias 'linha_base' e 'alta'.
--
-- linha_base: a clínica criou sozinha a convenção `LB:` (510 evoluções), que é
-- exatamente o "achado objetivo" que a literatura de alta descreve como base para
-- detectar platô e mostrar progresso ao paciente. Extrair torna o comparativo
-- antes/depois possível sem pedir nenhuma captura nova à equipe.
--
-- alta: apenas 21 menções reais em 11.336 evoluções. Estas linhas são INDÍCIO
-- para revisão humana, não registro de alta — o registro formal virá de um evento
-- datado com autor e motivo. Inferir alta por inatividade permanece proibido
-- (mesmo viés de seleção já descartado na atribuição de autoria).

ALTER TABLE clinical_extractions
  DROP CONSTRAINT IF EXISTS clinical_extractions_category_chk;

ALTER TABLE clinical_extractions
  ADD CONSTRAINT clinical_extractions_category_chk
  CHECK (category IN ('conduta', 'regiao', 'equipamento', 'posicao', 'exercicio', 'plano',
                      'dosagem', 'carga', 'eva', 'linha_base', 'alta'));
