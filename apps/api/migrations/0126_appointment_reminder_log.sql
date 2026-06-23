-- Log de lembretes enviados (dedup do scheduler de 15 min).
-- Garante envio único por (agendamento, tipo) mesmo com o cron rodando a cada 15min.
CREATE TABLE IF NOT EXISTS appointment_reminder_log (
  appointment_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'session',
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (appointment_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_appt_reminder_log_sent_at
  ON appointment_reminder_log (sent_at);
