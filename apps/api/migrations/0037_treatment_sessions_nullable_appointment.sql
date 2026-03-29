-- Migration 0037: Make appointment_id nullable in treatment_sessions
-- The standalone evolution flow (without appointment) requires this column to be optional.

ALTER TABLE treatment_sessions ALTER COLUMN appointment_id DROP NOT NULL;

-- Also fix any potential issues with therapist_id if it was NOT NULL
ALTER TABLE treatment_sessions ALTER COLUMN therapist_id DROP NOT NULL;
