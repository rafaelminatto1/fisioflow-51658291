-- 0150_clinical_extractions.sql
-- Camada derivada das evoluções em texto livre, com trilha de origem.
--
-- Why: o dado clínico da clínica vive em `sessions.observacao` (11.346 registros,
-- 98,6% com conduta identificável pelo léxico). Esta tabela torna esse texto
-- consultável sem alterá-lo.
--
-- Contrato das camadas:
--   Camada 0 (bruto)     sessions.observacao — IMUTÁVEL, nunca escrito por jobs
--   Camada 1 (derivado)  esta tabela com method='parser' — descartável e reconstruível
--   Camada 2 (inferido)  esta tabela com method='ai' — exige confidence e revisão
--
-- Consequência: `TRUNCATE clinical_extractions` é seguro. Se o léxico melhorar,
-- sobe LEXICON_VERSION, roda o backfill de novo e sobrescreve. Errar sai barato.

CREATE TABLE IF NOT EXISTS clinical_extractions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id      UUID NOT NULL,

  -- Origem do dado bruto. Genérico para cobrir sessions e avaliações ZenFisio.
  source_table    TEXT NOT NULL,
  source_id       UUID NOT NULL,

  -- O que foi extraído.
  category        TEXT NOT NULL,          -- conduta | regiao | equipamento | posicao | dosagem | carga | eva
  code            TEXT NOT NULL,          -- código estável do léxico, ou 'value' para numéricos
  value_numeric   NUMERIC,                -- dosagem/carga/EVA; NULL para categóricos
  value_unit      TEXT,                   -- kg | reps | sets | pontos

  -- Trilha de origem: o trecho literal e sua posição no texto original.
  -- É isso que permite a UI destacar o que gerou o campo, em vez de pedir fé.
  source_text     TEXT NOT NULL,
  source_start    INTEGER,
  source_end      INTEGER,

  -- Proveniência: separa fato de inferência.
  method          TEXT NOT NULL DEFAULT 'parser',  -- parser | ai
  lexicon_version TEXT,                            -- preenchido quando method='parser'
  model           TEXT,                            -- preenchido quando method='ai'
  confidence      NUMERIC(4,3),                    -- obrigatório quando method='ai'

  -- Curadoria humana. NULL = ainda não revisado.
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  rejected        BOOLEAN NOT NULL DEFAULT false,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT clinical_extractions_method_chk
    CHECK (method IN ('parser', 'ai')),
  CONSTRAINT clinical_extractions_category_chk
    CHECK (category IN ('conduta', 'regiao', 'equipamento', 'posicao', 'dosagem', 'carga', 'eva')),
  -- Inferência de IA sem confiança declarada não entra: seria indistinguível de fato.
  CONSTRAINT clinical_extractions_ai_needs_confidence
    CHECK (method <> 'ai' OR confidence IS NOT NULL),
  CONSTRAINT clinical_extractions_parser_needs_version
    CHECK (method <> 'parser' OR lexicon_version IS NOT NULL)
);

-- Idempotência do backfill: reprocessar a mesma origem não duplica.
-- source_start entra na chave porque a mesma conduta pode aparecer em dois
-- trechos distintos da mesma evolução, e ambas as ocorrências são reais.
CREATE UNIQUE INDEX IF NOT EXISTS clinical_extractions_unique_occurrence
  ON clinical_extractions (source_table, source_id, category, code, COALESCE(source_start, -1));

CREATE INDEX IF NOT EXISTS idx_clinical_extractions_patient
  ON clinical_extractions (organization_id, patient_id, category);

CREATE INDEX IF NOT EXISTS idx_clinical_extractions_code
  ON clinical_extractions (organization_id, category, code)
  WHERE rejected = false;

CREATE INDEX IF NOT EXISTS idx_clinical_extractions_source
  ON clinical_extractions (source_table, source_id);

-- Stale detection: quais origens foram processadas por um léxico antigo.
CREATE INDEX IF NOT EXISTS idx_clinical_extractions_lexicon
  ON clinical_extractions (lexicon_version)
  WHERE method = 'parser';

ALTER TABLE clinical_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinical_extractions_org_isolation ON clinical_extractions;
CREATE POLICY clinical_extractions_org_isolation ON clinical_extractions
  USING (organization_id::text = current_setting('app.org_id', true));

COMMENT ON TABLE clinical_extractions IS
  'Camada derivada de sessions.observacao e avaliações. Reconstruível: pode ser truncada e regerada pelo parser. O texto bruto nunca é alterado.';
COMMENT ON COLUMN clinical_extractions.source_start IS
  'Offset no texto original — permite destacar na UI o trecho que gerou a extração.';
COMMENT ON COLUMN clinical_extractions.method IS
  'parser = determinístico e auditável; ai = inferido, exige confidence e nunca alimenta indicador agregado sem revisão.';
