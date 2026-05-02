ALTER TABLE appointment_status_settings DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS appointment_status_settings;

DROP INDEX IF EXISTS idx_appointments_stats;
DROP INDEX IF EXISTS idx_appointments_time_conflict;

ALTER TABLE appointments
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE appointments
  ALTER COLUMN status TYPE appointment_status
  USING CASE
    WHEN status = 'cancelado' THEN 'cancelled'::appointment_status
    WHEN status = 'remarcado' THEN 'rescheduled'::appointment_status
    WHEN status IN (
      'agendado',
      'atendido',
      'avaliacao',
      'cancelado',
      'faltou',
      'faltou_com_aviso',
      'faltou_sem_aviso',
      'nao_atendido',
      'nao_atendido_sem_cobranca',
      'presenca_confirmada',
      'remarcar'
    ) THEN status::appointment_status
    ELSE 'agendado'::appointment_status
  END;

ALTER TABLE appointments
  ALTER COLUMN status SET DEFAULT 'agendado';

CREATE INDEX IF NOT EXISTS idx_appointments_stats
  ON appointments (organization_id, patient_id, date DESC, status)
  WHERE ((status = ANY (ARRAY['completed'::appointment_status, 'scheduled'::appointment_status, 'confirmed'::appointment_status])) OR (status IS NULL));

CREATE INDEX IF NOT EXISTS idx_appointments_time_conflict
  ON appointments (therapist_id, date, start_time, end_time)
  WHERE (status <> ALL (ARRAY['cancelled'::appointment_status, 'no_show'::appointment_status, 'rescheduled'::appointment_status]));
