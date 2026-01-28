-- Migration: Add birth_date column to profiles table
-- Date: 2026-01-28
-- Description: Add missing birth_date column for user profiles

BEGIN;

-- Add birth_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'birth_date'
    ) THEN
        ALTER TABLE profiles ADD COLUMN birth_date DATE;
        RAISE NOTICE 'Column birth_date added to profiles table';
    ELSE
        RAISE NOTICE 'Column birth_date already exists in profiles table';
    END IF;
END $$;

COMMIT;

-- Verification query
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'birth_date';
