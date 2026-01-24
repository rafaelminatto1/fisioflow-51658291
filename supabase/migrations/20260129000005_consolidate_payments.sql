-- ============================================================
-- MIGRATION: Consolidate Payment Tables
-- ============================================================
-- This migration consolidates 3 payment tables with mixed naming:
-- - formas_pagamento (Portuguese - payment methods)
-- - pagamentos (Portuguese - payments)
-- - payments (English - target table)
--
-- Strategy:
-- 1. Migrate data from pagamentos to payments
-- 2. Create views for backward compatibility
-- 3. Update foreign key references
-- 4. Drop old tables after verification
-- ============================================================

-- ============================================================
-- STEP 1: Analyze current table structures
-- ============================================================

-- First, let's understand the column mappings:
-- pagamentos columns might include:
-- - id, patient_uuid, valor, status, metodo_pagamento, data_pagamento
-- payments columns include:
-- - id, patient_id, appointment_id, amount, status, payment_method, payment_date

-- ============================================================
-- STEP 2: Migrate data from pagamentos to payments
-- ============================================================

-- Insert data from pagamentos to payments
-- Note: Column mappings may need adjustment based on actual schema
INSERT INTO payments (
  id,
  patient_id,
  appointment_id,
  amount,
  status,
  payment_method,
  payment_date,
  paid_at,
  notes,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,  -- Generate new UUID
  COALESCE(patient_id, patient_uuid) as patient_id,
  NULL as appointment_id,  -- Will need to be mapped separately if exists
  COALESCE(valor, amount, 0) as amount,
  COALESCE(status, 'pending') as status,
  COALESCE(payment_method, metodo_pagamento, forma_pagamento) as payment_method,
  COALESCE(payment_date, data_pagamento) as payment_date,
  paid_at,
  COALESCE(notes, observacoes) as notes,
  created_at,
  COALESCE(updated_at, now()) as updated_at
FROM pagamentos
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 3: Create backward compatibility views
-- ============================================================

-- View for pagamentos (most widely used Portuguese name)
CREATE OR REPLACE VIEW pagamentos AS
SELECT
  id,
  patient_id as patient_uuid,
  appointment_id,
  amount as valor,
  status,
  payment_method as metodo_pagamento,
  payment_date as data_pagamento,
  paid_at,
  notes as observacoes,
  created_at,
  updated_at
FROM payments;

-- View for formas_pagamento (distinct payment methods)
CREATE OR REPLACE VIEW formas_pagamento AS
SELECT DISTINCT
  payment_method as forma_pagamento,
  CASE
    WHEN payment_method LIKE '%credit%' OR payment_method LIKE '%crédito%' THEN 'credit_card'
    WHEN payment_method LIKE '%debit%' OR payment_method LIKE '%débito%' THEN 'debit_card'
    WHEN payment_method LIKE '%cash%' OR payment_method LIKE '%dinheiro%' THEN 'cash'
    WHEN payment_method LIKE '%pix%' THEN 'pix'
    WHEN payment_method LIKE '%boleto%' THEN 'boleto'
    ELSE 'other'
  END as categoria
FROM payments
WHERE payment_method IS NOT NULL
ORDER BY payment_method;

-- ============================================================
-- STEP 4: Update foreign key references
-- ============================================================

-- Check for tables referencing pagamentos
-- These will need to be updated to reference payments instead

-- Example (DO NOT RUN without verification):
-- ALTER TABLE some_table DROP CONSTRAINT some_table_pagamentos_fkey;
-- ALTER TABLE some_table ADD CONSTRAINT some_table_payments_fkey
--   FOREIGN KEY (payment_id) REFERENCES payments(id);

-- ============================================================
-- STEP 5: Add comments for future cleanup
-- ============================================================

COMMENT ON VIEW pagamentos IS
'Backward compatibility view. Data migrated to payments table. Can be dropped after verification period.';

COMMENT ON VIEW formas_pagamento IS
'Backward compatibility view. Lists distinct payment methods. Can be dropped after verification period.';

-- ============================================================
-- STEP 6: Cleanup (run after verification period)
-- ============================================================
-- DO NOT RUN THIS IN PRODUCTION IMMEDIATELY
-- Run these commands after verifying everything works:

-- -- First, update all foreign key references
-- -- (This needs to be done carefully for each table)

-- -- Then drop old tables
-- DROP TABLE IF EXISTS pagamentos CASCADE;
-- DROP TABLE IF EXISTS formas_pagamento CASCADE;

-- -- Drop views (they will no longer be needed)
-- DROP VIEW IF EXISTS pagamentos;
-- DROP VIEW IF EXISTS formas_pagamento;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Verify data was migrated correctly:

-- -- Compare row counts
-- SELECT 'pagamentos' as source, COUNT(*) as count FROM pagamentos
-- UNION ALL
-- SELECT 'payments (target)', COUNT(*) FROM payments;

-- -- Verify views work
-- SELECT COUNT(*) FROM pagamentos;
-- SELECT COUNT(*) FROM formas_pagamento;

-- -- Check for duplicate records
-- SELECT COUNT(*) - COUNT(DISTINCT id) as duplicates
-- FROM payments;

-- -- Verify data integrity
-- SELECT
--   COUNT(*) as total_payments,
--   COUNT(CASE WHEN amount > 0 THEN 1 END) as positive_amounts,
--   COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments,
--   SUM(amount) as total_amount
-- FROM payments;
