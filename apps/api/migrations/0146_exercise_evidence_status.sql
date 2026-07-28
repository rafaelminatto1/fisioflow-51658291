-- 0146_exercise_evidence_status.sql
-- Add status column for clinical approval workflow (US-L3).

ALTER TABLE exercise_evidence ADD COLUMN status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));