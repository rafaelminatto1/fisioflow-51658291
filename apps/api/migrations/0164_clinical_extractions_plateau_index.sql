-- 0164 — índice para a detecção de platô
--
-- A assinatura de conduta por sessão (`plateauDetection.ts`, o predicado
-- `platoConfirmado` dos filtros de paciente e o badge da agenda) faz sempre o
-- mesmo recorte: conduta e região não rejeitadas, vindas de sessions.
--
-- Sem índice o planner faz Seq Scan nas 363.858 linhas de clinical_extractions
-- para ficar com 163 mil, e o sort seguinte vai a disco (external merge,
-- 10 MB). Medido em produção: 510 ms só nesse trecho — pago a cada abertura da
-- lista de pacientes, porque o painel de pendências conta platô junto.
--
-- `code` entra no índice para o string_agg da assinatura sair por index-only
-- scan, sem voltar à heap.
--
-- Aditivo e reversível: ver .down.sql.

CREATE INDEX IF NOT EXISTS idx_clinical_extractions_plateau
  ON clinical_extractions (source_id, code)
  WHERE source_table = 'sessions'
    AND rejected = false
    AND category IN ('conduta', 'regiao');

-- Segundo trecho: carga e dor por sequência, para confirmar o platô. Com só o
-- índice acima o gargalo migrou para cá (175 subplans a ~1,5 ms cada). Cobre
-- `value_numeric` para o count(DISTINCT) e o max−min saírem do índice.
--
-- Os predicados deste índice só são aproveitados porque os subselects passaram
-- a filtrar `source_table` e `rejected` — que faltavam e faziam extração já
-- rejeitada na revisão contar como evidência de platô.
--
-- Medido em produção: 510 ms → 375 ms (primeiro índice) → 127 ms (os dois).

CREATE INDEX IF NOT EXISTS idx_clinical_extractions_metricas
  ON clinical_extractions (source_id, category, value_numeric)
  WHERE source_table = 'sessions'
    AND rejected = false
    AND category IN ('carga', 'eva');
