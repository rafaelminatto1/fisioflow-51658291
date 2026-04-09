-- Migration 0039: Sistema de Pacotes de Sessão
-- Permite vender blocos de sessões com desconto e debitar créditos a cada atendimento

CREATE TABLE IF NOT EXISTS session_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name            VARCHAR(120) NOT NULL,           -- "Pacote 10 Sessões"
  description     TEXT,
  total_sessions  INT NOT NULL CHECK (total_sessions > 0),
  price           NUMERIC(10, 2) NOT NULL,
  price_per_session NUMERIC(10, 2) GENERATED ALWAYS AS (price / total_sessions) STORED,
  valid_days      INT DEFAULT 365,                 -- validade em dias
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  patient_id      UUID NOT NULL,
  package_id      UUID NOT NULL REFERENCES session_packages(id),
  total_sessions  INT NOT NULL,
  used_sessions   INT NOT NULL DEFAULT 0,
  remaining_sessions INT GENERATED ALWAYS AS (total_sessions - used_sessions) STORED,
  amount_paid     NUMERIC(10, 2) NOT NULL,
  payment_method  VARCHAR(60),
  purchase_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     DATE,                            -- calculado no insert
  status          VARCHAR(20) NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo', 'esgotado', 'expirado', 'cancelado')),
  notes           TEXT,
  financial_record_id UUID,                        -- FK para tabela financeira se existir
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_session_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_package_id UUID NOT NULL REFERENCES patient_packages(id),
  appointment_id  UUID,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_session_packages_org ON session_packages(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_patient_packages_patient ON patient_packages(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_packages_org ON patient_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_package_session_log_pkg ON package_session_log(patient_package_id);
