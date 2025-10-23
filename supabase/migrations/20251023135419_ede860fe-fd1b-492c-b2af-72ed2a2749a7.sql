-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar lembretes diários às 18h (horário de Brasília UTC-3)
-- Ajustar para 21h UTC para executar às 18h em Brasília
SELECT cron.schedule(
  'daily-appointment-reminders',
  '0 21 * * *', -- Todo dia às 21h UTC (18h Brasília)
  $$
  SELECT
    net.http_post(
        url:='https://ycvbtjfrchcyvmkvuocu.supabase.co/functions/v1/send-appointment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmJ0amZyY2hjeXZta3Z1b2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTA5OTQsImV4cCI6MjA3NTE2Njk5NH0.L5maWG2hc3LVHEUMOzfTRTjYwIAJFXx3zan3G-Y1zAA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);