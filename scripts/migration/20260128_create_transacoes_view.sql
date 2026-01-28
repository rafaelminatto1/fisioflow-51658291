-- Migration: Create transacoes view pointing to payments table
-- Date: 2026-01-28
-- Description: Quick fix for financial module - code uses 'transacoes' but table is 'payments'

BEGIN;

-- Drop view if exists
DROP VIEW IF EXISTS transacoes;

-- Create view to map 'transacoes' to 'payments'
CREATE VIEW transacoes AS
SELECT
    id,
    organization_id,
    patient_id,
    appointment_id,
    amount_cents,
    method,
    status,
    payment_date,
    payment_time,
    gateway_transaction_id,
    receipt_url,
    notes,
    metadata,
    created_at,
    updated_at
FROM payments;

COMMIT;

-- Verification
SELECT * FROM information_schema.views WHERE table_name = 'transacoes';
