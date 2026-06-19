-- Down migration: remove the PRIMARY KEY constraint (reverses 0122)
-- WARNING: this will allow duplicate IDs. Only use for rollback purposes.
ALTER TABLE appointment_types
  DROP CONSTRAINT IF EXISTS appointment_types_pkey;
