-- ============================================
-- FASE 6: FUNCIONALIDADES CRÍTICAS
-- 1. Confirmações WhatsApp
-- 2. Mapa de Dor Corporal (melhorado)
-- 3. Lista de Espera Inteligente
-- ============================================

-- ============================================
-- 1. CONFIRMAÇÕES WHATSAPP
-- ============================================

-- Campos adicionais na tabela appointments para confirmações
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'cancelled', 'rescheduled')),
ADD COLUMN IF NOT EXISTS reminder_sent_24h TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_sent_2h TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmation_method TEXT CHECK (confirmation_method IN ('whatsapp', 'phone', 'email', 'manual'));

-- Tabela de mensagens WhatsApp enviadas
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('reminder_24h', 'reminder_2h', 'confirmation', 'cancellation', 'rescheduling')),
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  response_received_at TIMESTAMP WITH TIME ZONE,
  response_content TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'responded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_appointment ON whatsapp_messages(appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_patient ON whatsapp_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent ON whatsapp_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_status ON appointments(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_appointments_reminders ON appointments(reminder_sent_24h, reminder_sent_2h);

-- ============================================
-- 3. LISTA DE ESPERA INTELIGENTE
-- ============================================

-- Tabela de lista de espera
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Preferências
  preferred_therapist_ids UUID[], -- Array de IDs de fisioterapeutas preferidos
  preferred_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], -- Dias da semana
  preferred_time_slots TEXT[] DEFAULT ARRAY['morning', 'afternoon'], -- morning, afternoon, evening
  
  -- Prioridade
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  priority_reason TEXT, -- Motivo da prioridade alta/urgente
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed', 'scheduled')),
  
  -- Notificações
  last_notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_count INTEGER DEFAULT 0,
  last_offer_rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_count INTEGER DEFAULT 0,
  
  -- Observações
  notes TEXT,
  
  -- Timestamps
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de ofertas de vagas
CREATE TABLE IF NOT EXISTS waitlist_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_id UUID NOT NULL REFERENCES waitlist(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  
  -- Status da oferta
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  
  -- Detalhes da vaga
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  therapist_id UUID REFERENCES profiles(id),
  
  -- Notificação
  notification_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiration_time TIMESTAMP WITH TIME ZONE NOT NULL, -- 2 horas após notificação
  
  -- Resposta
  responded_at TIMESTAMP WITH TIME ZONE,
  response_method TEXT CHECK (response_method IN ('whatsapp', 'phone', 'email', 'manual')),
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para lista de espera
CREATE INDEX IF NOT EXISTS idx_waitlist_patient ON waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_organization ON waitlist(organization_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON waitlist(priority, added_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_offers_status ON waitlist_offers(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_offers_expiration ON waitlist_offers(expiration_time) WHERE status = 'pending';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waitlist_updated_at
BEFORE UPDATE ON waitlist
FOR EACH ROW
EXECUTE FUNCTION update_waitlist_updated_at();

CREATE TRIGGER trigger_update_waitlist_offers_updated_at
BEFORE UPDATE ON waitlist_offers
FOR EACH ROW
EXECUTE FUNCTION update_waitlist_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

-- WhatsApp Messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Terapeutas veem mensagens da org"
ON whatsapp_messages FOR SELECT
USING (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  AND appointment_id IN (
    SELECT id FROM appointments WHERE organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND active = true
    )
  )
);

CREATE POLICY "Sistema cria mensagens"
ON whatsapp_messages FOR INSERT
WITH CHECK (true);

-- Waitlist
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da org veem lista de espera"
ON waitlist FOR SELECT
USING (
  (organization_id IS NULL) 
  OR user_belongs_to_organization(auth.uid(), organization_id)
);

CREATE POLICY "Terapeutas gerenciam lista de espera"
ON waitlist FOR ALL
USING (
  user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
  AND ((organization_id IS NULL) OR user_belongs_to_organization(auth.uid(), organization_id))
);

-- Waitlist Offers
ALTER TABLE waitlist_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da org veem ofertas"
ON waitlist_offers FOR SELECT
USING (
  appointment_id IN (
    SELECT id FROM appointments WHERE organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND active = true
    )
  )
);

CREATE POLICY "Sistema gerencia ofertas"
ON waitlist_offers FOR ALL
USING (true);