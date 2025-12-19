-- Tabela para armazenar configurações de integração com calendários externos
CREATE TABLE public.calendar_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_email TEXT,
  default_calendar_id TEXT,
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_send_events BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  events_synced_count INTEGER NOT NULL DEFAULT 0,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Tabela para armazenar logs de sincronização
CREATE TABLE public.calendar_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.calendar_integrations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'sync', 'create', 'update', 'delete'
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  event_type TEXT, -- 'appointment', 'event'
  event_id UUID,
  external_event_id TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies para calendar_integrations
CREATE POLICY "Users can view their own calendar integrations"
  ON public.calendar_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar integrations"
  ON public.calendar_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar integrations"
  ON public.calendar_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar integrations"
  ON public.calendar_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para calendar_sync_logs (via integration)
CREATE POLICY "Users can view their own sync logs"
  ON public.calendar_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_integrations ci
      WHERE ci.id = integration_id AND ci.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own sync logs"
  ON public.calendar_sync_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_integrations ci
      WHERE ci.id = integration_id AND ci.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_calendar_integrations_updated_at
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_calendar_integrations_user_id ON public.calendar_integrations(user_id);
CREATE INDEX idx_calendar_sync_logs_integration_id ON public.calendar_sync_logs(integration_id);
CREATE INDEX idx_calendar_sync_logs_created_at ON public.calendar_sync_logs(created_at DESC);