-- Migration 0107: Normalize monetary field precision to (10,2)
-- Standardizes all financial fields to the same precision to avoid rounding inconsistencies.
-- numeric(10,2) supports values up to 99,999,999.99 which is sufficient for clinic finances.

DO $$
BEGIN
  -- Only alter if current precision differs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'amount'
    AND numeric_precision != 10
  ) THEN
    ALTER TABLE transactions ALTER COLUMN amount TYPE numeric(10,2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_accounts' AND column_name = 'amount'
    AND numeric_precision != 10
  ) THEN
    ALTER TABLE financial_accounts ALTER COLUMN amount TYPE numeric(10,2);
  END IF;
END $$;
