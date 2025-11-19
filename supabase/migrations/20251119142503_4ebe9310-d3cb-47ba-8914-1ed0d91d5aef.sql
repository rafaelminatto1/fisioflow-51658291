-- Tabela de configuração de capacidade de horários
CREATE TABLE IF NOT EXISTS schedule_capacity_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_patients INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_schedule_capacity UNIQUE (organization_id, day_of_week, start_time, end_time)
);

-- RLS policies
ALTER TABLE schedule_capacity_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e fisios gerenciam capacidade"
  ON schedule_capacity_config
  FOR ALL
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

CREATE POLICY "Todos veem capacidade da org"
  ON schedule_capacity_config
  FOR SELECT
  USING (
    organization_id IS NULL 
    OR user_belongs_to_organization(auth.uid(), organization_id)
  );

-- Adicionar campos de pagamento aos agendamentos
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'package', 'free')),
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS session_package_id UUID REFERENCES session_packages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_until DATE;

-- Comentários
COMMENT ON COLUMN appointments.payment_status IS 'Status do pagamento: pending (pendente), paid (pago avulso), package (pago via pacote), free (gratuito)';
COMMENT ON COLUMN appointments.payment_amount IS 'Valor pago pela sessão (se avulso)';
COMMENT ON COLUMN appointments.session_package_id IS 'Referência ao pacote de sessões usado';
COMMENT ON COLUMN appointments.is_recurring IS 'Se é um agendamento recorrente';
COMMENT ON COLUMN appointments.recurring_until IS 'Data final da recorrência';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_schedule_capacity_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_capacity_config_updated_at
  BEFORE UPDATE ON schedule_capacity_config
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_capacity_config_updated_at();