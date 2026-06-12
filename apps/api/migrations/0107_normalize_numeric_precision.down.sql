-- Down migration for 0107_normalize_numeric_precision
-- Reverter para precision original (12,2) — cuidado: pode truncar valores > 99999999.99
ALTER TABLE transactions ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE financial_accounts ALTER COLUMN amount TYPE numeric(12,2);
