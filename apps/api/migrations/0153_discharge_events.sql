-- 0153_discharge_events.sql
-- Registro formal de encerramento de tratamento.
--
-- Why EVENTO e não status no paciente: no corpus há alta por região com o
-- tratamento seguindo ("está de alta do ombro. Próximas sessões serão para
-- fortalecimento de MMSS e tto de lombar"). Um campo `patients.status='alta'`
-- encerraria um caso que continua ativo. Além disso, o paciente pode ter alta,
-- voltar meses depois e ter alta de novo — e é esse histórico que permite medir
-- recidiva.
--
-- Why a taxonomia: ter apenas "alta" e "abandono" é o erro que impede a clínica
-- de se enxergar. Hoje 146 pacientes ativos estão sem próxima sessão e não há
-- como saber se receberam alta ou sumiram. O estudo de reabilitação de LCA
-- (Tuckerman et al.) encontrou, ligando para quem "faltou", que os dois motivos
-- mais comuns eram "achei que tinha recebido alta" e "estou satisfeito".
--
-- `abandono` NÃO existe nesta tabela: é sempre inferido por inatividade, nunca
-- declarado. Registrar abandono como evento daria a ele a mesma confiabilidade
-- de um desfecho observado, o que seria falso.

CREATE TABLE IF NOT EXISTS discharge_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL,
  patient_id       UUID NOT NULL,

  -- Sessão em que a alta foi registrada. Nulo quando lançada retroativamente.
  session_id       UUID,

  discharged_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  reason           TEXT NOT NULL,

  -- Alta por região/queixa: quando preenchido, o tratamento do paciente
  -- continua para outras áreas.
  scope            TEXT,

  -- Estado final e comparação com a linha de base. A literatura é explícita:
  -- o paciente subestima a própria melhora porque ela foi gradual, e ver
  -- "entrou com EVA 8, saiu com 1" é parte do encerramento clínico.
  baseline_summary TEXT,
  final_summary    TEXT,
  pain_initial     SMALLINT,
  pain_final       SMALLINT,

  -- "Alta sem registro de encerramento não é alta, é interrupção sem data."
  maintenance_plan TEXT,
  -- Critério concreto de retorno. "Se piorar, me ligue" não é critério.
  return_criteria  TEXT,
  review_date      DATE,

  -- Proveniência: distingue o que o profissional declarou do que foi extraído
  -- do texto por parser (22 menções históricas) ou confirmado por telefone.
  origin           TEXT NOT NULL DEFAULT 'profissional',
  confirmed_by     UUID,
  notes            TEXT,

  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT discharge_events_reason_chk CHECK (reason IN (
    'alta_objetivo_atingido',
    'alta_maximo_funcional',
    'alta_transicao_autonomia',
    'alta_medica',
    'encaminhado',
    'interrompido_paciente'
  )),
  CONSTRAINT discharge_events_origin_chk CHECK (origin IN (
    'profissional',   -- declarada na finalização da evolução
    'texto',          -- extraída do histórico pelo parser; exige confirmação
    'retroativo'      -- confirmada pela recepção junto ao paciente
  )),
  -- Nota: alta com origin='texto' é INDÍCIO, não desfecho. Só conta como alta
  -- depois de `confirmed_by` preenchido. Isso não é constraint porque a linha
  -- precisa existir para entrar na fila de confirmação — é filtro de consulta,
  -- e está encapsulado em `dischargeService.listConfirmed()`.
  CONSTRAINT discharge_events_pain_range CHECK (
    (pain_initial IS NULL OR pain_initial BETWEEN 0 AND 10) AND
    (pain_final   IS NULL OR pain_final   BETWEEN 0 AND 10)
  )
);

-- Um paciente pode ter várias altas ao longo do tempo (recidiva), mas não duas
-- no mesmo dia para o mesmo escopo.
CREATE UNIQUE INDEX IF NOT EXISTS discharge_events_unique_dia_escopo
  ON discharge_events (patient_id, discharged_at, COALESCE(scope, ''));

CREATE INDEX IF NOT EXISTS idx_discharge_events_org_data
  ON discharge_events (organization_id, discharged_at DESC);

CREATE INDEX IF NOT EXISTS idx_discharge_events_patient
  ON discharge_events (patient_id, discharged_at DESC);

-- Fila de confirmação: altas extraídas do texto que ninguém validou ainda.
CREATE INDEX IF NOT EXISTS idx_discharge_events_pendentes
  ON discharge_events (organization_id)
  WHERE origin = 'texto' AND confirmed_by IS NULL;

ALTER TABLE discharge_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discharge_events_org_isolation ON discharge_events;
CREATE POLICY discharge_events_org_isolation ON discharge_events
  USING (organization_id::text = current_setting('app.org_id', true));

COMMENT ON TABLE discharge_events IS
  'Alta como evento datado, não status. Abandono nunca é gravado aqui — é sempre inferido por inatividade.';
COMMENT ON COLUMN discharge_events.scope IS
  'Região/queixa quando a alta é parcial. Preenchido = o tratamento do paciente continua.';
COMMENT ON COLUMN discharge_events.origin IS
  'profissional = declarada; texto = extraída do histórico, exige confirmação; retroativo = confirmada pela recepção.';
