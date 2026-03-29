-- Migration 0046: Make appointment_id and therapist_id nullable in treatment_sessions
-- Standalone evolutions do not always have an appointment_id or therapist_id.

ALTER TABLE treatment_sessions ALTER COLUMN appointment_id DROP NOT NULL;
ALTER TABLE treatment_sessions ALTER COLUMN therapist_id DROP NOT NULL;
