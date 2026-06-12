-- Migration 0108: Add timezone to timestamp columns in transactions table
-- Ensures consistent time handling across organizations in different time zones.

DO $$
BEGIN
  -- transactions.timestamps
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'created_at'
    AND datetime_interval_type IS DISTINCT FROM 'TIMESTAMP WITH TIME ZONE'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN created_at TYPE timestamp with time zone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN updated_at TYPE timestamp with time zone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN deleted_at TYPE timestamp with time zone;
  END IF;
END $$;
