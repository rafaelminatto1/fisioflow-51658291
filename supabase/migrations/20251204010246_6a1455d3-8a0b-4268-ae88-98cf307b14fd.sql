-- Tabela: Horários de Funcionamento da Clínica
CREATE TABLE IF NOT EXISTS public.schedule_business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME NOT NULL DEFAULT '07:00',
  close_time TIME NOT NULL DEFAULT '21:00',
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, day_of_week)
);

-- Tabela: Regras de Cancelamento
CREATE TABLE IF NOT EXISTS public.schedule_cancellation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE,
  min_hours_before INTEGER NOT NULL DEFAULT 24,
  allow_patient_cancellation BOOLEAN NOT NULL DEFAULT true,
  max_cancellations_month INTEGER DEFAULT 3,
  charge_late_cancellation BOOLEAN NOT NULL DEFAULT false,
  late_cancellation_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Configurações de Notificação
CREATE TABLE IF NOT EXISTS public.schedule_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE,
  send_confirmation_email BOOLEAN NOT NULL DEFAULT true,
  send_confirmation_whatsapp BOOLEAN NOT NULL DEFAULT true,
  send_reminder_24h BOOLEAN NOT NULL DEFAULT true,
  send_reminder_2h BOOLEAN NOT NULL DEFAULT true,
  send_cancellation_notice BOOLEAN NOT NULL DEFAULT true,
  custom_confirmation_message TEXT,
  custom_reminder_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Bloqueios de Horários
CREATE TABLE IF NOT EXISTS public.schedule_blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  therapist_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  reason TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_days INTEGER[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para schedule_business_hours
ALTER TABLE public.schedule_business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem horários da org" ON schedule_business_hours
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins gerenciam horários" ON schedule_business_hours
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- RLS para schedule_cancellation_rules
ALTER TABLE public.schedule_cancellation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem regras da org" ON schedule_cancellation_rules
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins gerenciam regras" ON schedule_cancellation_rules
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- RLS para schedule_notification_settings
ALTER TABLE public.schedule_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem config notificações" ON schedule_notification_settings
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins gerenciam notificações" ON schedule_notification_settings
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- RLS para schedule_blocked_times
ALTER TABLE public.schedule_blocked_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem bloqueios" ON schedule_blocked_times
  FOR SELECT USING (
    organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id)
  );

CREATE POLICY "Admins gerenciam bloqueios" ON schedule_blocked_times
  FOR ALL USING (
    user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
    AND (organization_id IS NULL OR user_belongs_to_organization(auth.uid(), organization_id))
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_schedule_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_business_hours_updated_at
  BEFORE UPDATE ON schedule_business_hours
  FOR EACH ROW EXECUTE FUNCTION update_schedule_settings_updated_at();

CREATE TRIGGER update_schedule_cancellation_rules_updated_at
  BEFORE UPDATE ON schedule_cancellation_rules
  FOR EACH ROW EXECUTE FUNCTION update_schedule_settings_updated_at();

CREATE TRIGGER update_schedule_notification_settings_updated_at
  BEFORE UPDATE ON schedule_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_schedule_settings_updated_at();

CREATE TRIGGER update_schedule_blocked_times_updated_at
  BEFORE UPDATE ON schedule_blocked_times
  FOR EACH ROW EXECUTE FUNCTION update_schedule_settings_updated_at();