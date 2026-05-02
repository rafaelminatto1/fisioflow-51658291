ALTER TABLE appointment_status_settings DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS appointment_status_settings;

ALTER TABLE appointments
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE appointments
  ALTER COLUMN status TYPE appointment_status
  USING CASE
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
