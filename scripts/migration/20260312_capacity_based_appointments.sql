-- Replace therapist overlap constraint with capacity-based checks in the API.
-- This must be applied together with the Worker deployment that enforces capacity on create/update.

ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS no_overlapping_therapist_appointments;

CREATE INDEX IF NOT EXISTS idx_appointments_time_conflict
ON appointments (therapist_id, date, start_time, end_time)
WHERE status NOT IN (
  'cancelled',
  'no_show',
  'rescheduled'
);
