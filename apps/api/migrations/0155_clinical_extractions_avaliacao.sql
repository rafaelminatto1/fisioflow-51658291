-- 0155_clinical_extractions_avaliacao.sql
-- Abre `clinical_extractions` para as avaliações iniciais importadas do ZenFisio
-- (`patient_evaluation_responses`, 531 registros do formulário
-- "ZenFisio - Avaliação completa importada").
--
-- Por que categorias novas e não reaproveitar as existentes: as categorias
-- atuais descrevem o que foi FEITO numa sessão (conduta, região, exercício,
-- dosagem). A avaliação inicial descreve outra coisa — o que o paciente TEM e o
-- que se pretende fazer. Empilhar as duas no mesmo vocabulário tornaria
-- impossível responder "qual a hipótese diagnóstica deste paciente?" sem
-- adivinhar a origem da linha.
--
-- As cinco categorias saíram do que o corpus realmente tem, medido sobre as 271
-- avaliações em texto livre:
--   hipotese_diagnostica — "Diagnóstico médico:" em 218; "HD:" em 5. Mesmo campo,
--                          duas grafias que convivem.
--   anamnese             — "HMA:" em 240, "Esporte" em 216, "AVD´s" em 109.
--   antecedente          — "Remédios controlados" 231, "Diabetes/hipertensão" 230,
--                          "Cirurgias prévias" 214, "Exames complementares" 226.
--   exame_fisico         — "AVALIAÇÃO FÍSICA" 246, com as subseções Inspeção 241,
--                          Palpação 245, ADM 241, CCA 220, CCF 227, Força 238,
--                          Propriocepção 234, Alongamento 224, Testes especiais 228,
--                          Pliometria 223.
--   plano_terapeutico    — "PLANO TERAPÊUTICO" 245, "Conduta" 47, "Frequência" 25.
--
-- Fora de escopo deliberadamente: `alta`. Uma avaliação INICIAL não registra
-- encerramento de tratamento; qualquer menção a alta ali é expectativa ou
-- prognóstico. O parser de avaliações descarta essas menções em vez de gerar
-- indício falso.

ALTER TABLE clinical_extractions
  DROP CONSTRAINT IF EXISTS clinical_extractions_category_chk;

ALTER TABLE clinical_extractions
  ADD CONSTRAINT clinical_extractions_category_chk
  CHECK (category IN ('conduta', 'regiao', 'equipamento', 'posicao', 'exercicio', 'plano',
                      'dosagem', 'carga', 'eva', 'linha_base', 'alta',
                      'hipotese_diagnostica', 'anamnese', 'antecedente',
                      'exame_fisico', 'plano_terapeutico'));
