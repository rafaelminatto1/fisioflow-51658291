-- =====================================================================
-- AGENDAMENTOS RECURRENTES
-- =====================================================================
-- Criação de tabelas para suporte a agendamentos recorrentes
-- Migration: 20260120000001_recurring_appointments.sql

-- Tabela principal de séries recorrentes
CREATE TABLE IF NOT EXISTS recurring_appointment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,

  -- Configuração de recorrência
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval INTEGER NOT NULL DEFAULT 1 CHECK (recurrence_interval > 0),
  recurrence_days_of_week INTEGER[] CHECK (array_length(recurrence_days_of_week, 1) > 0),
  recurrence_day_of_month INTEGER CHECK (recurrence_day_of_month BETWEEN 1 AND 31),
  recurrence_week_of_month INTEGER CHECK (recurrence_week_of_month BETWEEN 1 AND 5),

  -- Condição de fim
  recurrence_end_type TEXT NOT NULL DEFAULT 'never' CHECK (recurrence_end_type IN ('never', 'date', 'occurrences')),
  recurrence_end_date DATE,
  recurrence_max_occurrences INTEGER CHECK (recurrence_max_occurrences > 0),

  -- Configuração do appointment
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL CHECK (appointment_time ~ '^[0-9]{2}:[0-9]{2}$'),
  duration INTEGER NOT NULL DEFAULT 60 CHECK (duration > 0),
  appointment_type TEXT NOT NULL DEFAULT 'sessao',
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  auto_confirm BOOLEAN DEFAULT false,

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  canceled_at TIMESTAMPTZ,
  canceled_by UUID REFERENCES profiles(id),
  cancel_reason TEXT,

  -- Restrições
  CONSTRAINT valid_end_date CHECK (
    recurrence_end_type != 'date' OR recurrence_end_date IS NOT NULL
  ),
  CONSTRAINT valid_occurrences CHECK (
    recurrence_end_type != 'occurrences' OR recurrence_max_occurrences IS NOT NULL
  )
);

-- Tabela de ocorrências individuais
CREATE TABLE IF NOT EXISTS recurring_appointment_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamentos
  series_id UUID NOT NULL REFERENCES recurring_appointment_series(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- Data/hora da ocorrência
  occurrence_date DATE NOT NULL,
  occurrence_time TEXT NOT NULL,

  -- Status individual da ocorrência
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'completed',
    'cancelled', 'no_show', 'rescheduled', 'skipped'
  )),

  -- Modificações individuais
  modified_duration INTEGER,
  modified_notes TEXT,
  modified_time TEXT,
  modified_room_id UUID REFERENCES rooms(id),

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  canceled_by UUID REFERENCES profiles(id),

  -- Restrição de unicidade
  UNIQUE(series_id, occurrence_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recurring_series_org ON recurring_appointment_series(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_series_patient ON recurring_appointment_series(patient_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_series_therapist ON recurring_appointment_series(therapist_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_series_dates ON recurring_appointment_series(appointment_date, recurrence_end_date) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_series ON recurring_appointment_occurrences(series_id);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_date ON recurring_appointment_occurrences(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_status ON recurring_appointment_occurrences(status);
CREATE INDEX IF NOT EXISTS idx_recurring_occurrences_appointment ON recurring_appointment_occurrences(appointment_id);

-- Comentários
COMMENT ON TABLE recurring_appointment_series IS 'Séries de agendamentos recorrentes';
COMMENT ON TABLE recurring_appointment_occurrences IS 'Ocorrências individuais de séries recorrentes';

COMMENT ON COLUMN recurring_appointment_series.recurrence_type IS 'Tipo de recorrência: daily, weekly, monthly, yearly';
COMMENT ON COLUMN recurring_appointment_series.recurrence_interval IS 'Intervalo de recorrência (ex: 2 para "a cada 2 semanas")';
COMMENT ON COLUMN recurring_appointment_series.recurrence_days_of_week IS 'Dias da semana para recorrência weekly (0=dom, 1=seg, ..., 6=sáb)';
COMMENT ON COLUMN recurring_appointment_series.recurrence_end_type IS 'Quando a série termina: never, date, occurrences';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_recurring_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_series_updated_at
  BEFORE UPDATE ON recurring_appointment_series
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_series_updated_at();

CREATE TRIGGER recurring_occurrences_updated_at
  BEFORE UPDATE ON recurring_appointment_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_series_updated_at();

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

ALTER TABLE recurring_appointment_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_appointment_occurrences ENABLE ROW LEVEL SECURITY;

-- Policy para recurring_appointment_series
CREATE POLICY "Users can view recurring series in their org"
  ON recurring_appointment_series FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring series in their org"
  ON recurring_appointment_series FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recurring series in their org"
  ON recurring_appointment_series FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recurring series in their org"
  ON recurring_appointment_series FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organization_roles
      WHERE user_id = auth.uid()
    )
  );

-- Policy para recurring_appointment_occurrences (herda da série)
CREATE POLICY "Users can view occurrences of their series"
  ON recurring_appointment_occurrences FOR SELECT
  USING (
    series_id IN (
      SELECT id FROM recurring_appointment_series
      WHERE organization_id IN (
        SELECT organization_id FROM user_organization_roles
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage occurrences of their series"
  ON recurring_appointment_occurrences FOR ALL
  USING (
    series_id IN (
      SELECT id FROM recurring_appointment_series
      WHERE organization_id IN (
        SELECT organization_id FROM user_organization_roles
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================================
-- FUNÇÕES AUXILIARES
-- =====================================================================

-- Função para gerar ocorrências de uma série recorrente
CREATE OR REPLACE FUNCTION generate_recurring_occurrences(series_id UUID)
RETURNS TABLE (
  id UUID,
  occurrence_date DATE,
  occurrence_time TEXT
) AS $$
DECLARE
  v_series RECORD;
  v_current_date DATE;
  v_occurrence_count INTEGER;
  v_end_date DATE;
  v_max_occurrences INTEGER;
BEGIN
  -- Buscar dados da série
  SELECT * INTO v_series
  FROM recurring_appointment_series
  WHERE id = series_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determinar data limite
  v_end_date := COALESCE(
    v_series.recurrence_end_date,
    CASE
      WHEN v_series.recurrence_end_type = 'occurrences' THEN
        v_series.appointment_date + (v_series.recurrence_max_occurrences || 52) * INTERVAL '1 day'
      ELSE
        v_series.appointment_date + INTERVAL '2 years'
    END
  );

  v_max_occurrences := COALESCE(v_series.recurrence_max_occurrences, 1000);
  v_occurrence_count := 0;
  v_current_date := v_series.appointment_date;

  -- Gerar ocorrências
  WHILE v_current_date <= v_end_date AND v_occurrence_count < v_max_occurrences LOOP
    -- Verificar se a data atende aos critérios de recorrência
    IF meets_recurrence_criteria(v_current_date, v_series) THEN
      -- Verificar se não existe ocorrência para esta data
      IF NOT EXISTS (
        SELECT 1 FROM recurring_appointment_occurrences
        WHERE series_id = series_id AND occurrence_date = v_current_date
      ) THEN
        RETURN QUERY SELECT
          gen_random_uuid(),
          v_current_date,
          v_series.appointment_time;

        v_occurrence_count := v_occurrence_count + 1;
      END IF;
    END IF;

    -- Avançar para próxima data
    v_current_date := calculate_next_occurrence_date(
      v_current_date,
      v_series.recurrence_type,
      v_series.recurrence_interval
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para verificar se data atende aos critérios
CREATE OR REPLACE FUNCTION meets_recurrence_criteria(
  target_date DATE,
  series recurring_appointment_series
) RETURNS BOOLEAN AS $$
BEGIN
  -- Para recorrência semanal, verificar se o dia da semana está incluído
  IF series.recurrence_type = 'weekly' THEN
    IF series.recurrence_days_of_week IS NOT NULL THEN
      RETURN EXTRACT(DOW FROM target_date) = ANY(series.recurrence_days_of_week);
    END IF;
  END IF;

  -- Para recorrência mensal, verificar dia do mês ou semana do mês
  IF series.recurrence_type = 'monthly' THEN
    IF series.recurrence_day_of_month IS NOT NULL THEN
      RETURN DATE_PART('day', target_date)::INTEGER = series.recurrence_day_of_month;
    END IF;

    IF series.recurrence_week_of_month IS NOT NULL AND series.recurrence_days_of_week IS NOT NULL THEN
      -- Implementar lógica para "primeira segunda do mês", etc.
      RETURN TRUE; -- Placeholder
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar para calcular próxima data de ocorrência
CREATE OR REPLACE FUNCTION calculate_next_occurrence_date(
  current_date DATE,
  recurrence_type TEXT,
  recurrence_interval INTEGER
) RETURNS DATE AS $$
BEGIN
  CASE recurrence_type
    WHEN 'daily' THEN
      RETURN current_date + (recurrence_interval || ' days')::INTERVAL;
    WHEN 'weekly' THEN
      RETURN current_date + (recurrence_interval || ' weeks')::INTERVAL;
    WHEN 'monthly' THEN
      RETURN current_date + (recurrence_interval || ' months')::INTERVAL;
    WHEN 'yearly' THEN
      RETURN current_date + (recurrence_interval || ' years')::INTERVAL;
    ELSE
      RETURN current_date + INTERVAL '1 day';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- VIEWS
-- =====================================================================

-- View para séries ativas com contagem de ocorrências
CREATE OR REPLACE VIEW active_recurring_series AS
SELECT
  s.*,
  COUNT(o.id) as occurrence_count,
  MIN(o.occurrence_date) as first_occurrence,
  MAX(o.occurrence_date) as last_occurrence,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_count,
  COUNT(CASE WHEN o.status = 'no_show' THEN 1 END) as no_show_count
FROM recurring_appointment_series s
LEFT JOIN recurring_appointment_occurrences o ON o.series_id = s.id
WHERE s.is_active = true
GROUP BY s.id;

COMMENT ON VIEW active_recurring_series IS 'View de séries recorrentes ativas com estatísticas';

-- =====================================================================
-- DADOS DE EXEMPLO (opcional - descomentar para testar)
-- =====================================================================

-- INSERT INTO recurring_appointment_series (
--   organization_id,
--   patient_id,
--   therapist_id,
--   recurrence_type,
--   recurrence_interval,
--   recurrence_days_of_week,
--   recurrence_end_type,
--   recurrence_max_occurrences,
--   appointment_date,
--   appointment_time,
--   duration,
--   appointment_type,
--   notes,
--   created_by
-- ) VALUES (
--   (SELECT id FROM organizations LIMIT 1),
--   (SELECT id FROM patients LIMIT 1),
--   (SELECT id FROM profiles LIMIT 1),
--   'weekly',
--   1,
--   ARRAY[1, 3, 5], -- Segunda, Quarta, Sexta
--   'occurrences',
--   12,
--   '2026-01-20',
--   '10:00',
--   60,
--   'sessao',
--   'Fisioterapia semanal',
--   (SELECT id FROM profiles LIMIT 1)
-- );
