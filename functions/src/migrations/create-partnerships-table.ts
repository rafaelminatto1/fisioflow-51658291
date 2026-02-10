/**
 * Migration: Create partnerships and patient financial records tables
 *
 * This migration creates tables for:
 * 1. partnerships - Manages partnerships with external organizations
 * 2. patient_financial_records - Tracks individual session payments for patients
 */

import { getPool } from '../init';

export async function up() {
  const pool = getPool();

  // Create partnerships table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS partnerships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      cnpj VARCHAR(20),
      contact_person VARCHAR(255),
      contact_phone VARCHAR(20),
      contact_email VARCHAR(255),
      address TEXT,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
      discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
      allows_barter BOOLEAN DEFAULT false,
      barter_description TEXT,
      barter_sessions_limit INTEGER,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create index for partnerships
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_partnerships_organization_id
    ON partnerships(organization_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_partnerships_active
    ON partnerships(organization_id, is_active)
  `);

  // Create patient_financial_records table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patient_financial_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
      session_date DATE NOT NULL,
      session_value NUMERIC(10, 2) NOT NULL,
      discount_value NUMERIC(10, 2) DEFAULT 0,
      discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'partnership')),
      partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,
      final_value NUMERIC(10, 2) NOT NULL,
      payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix', 'transfer', 'barter', 'other')),
      payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled', 'refunded')),
      paid_amount NUMERIC(10, 2) DEFAULT 0,
      paid_date DATE,
      notes TEXT,
      is_barter BOOLEAN DEFAULT false,
      barter_notes TEXT,
      created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create indexes for patient_financial_records
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_patient_financial_organization
    ON patient_financial_records(organization_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_patient_financial_patient
    ON patient_financial_records(patient_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_patient_financial_appointment
    ON patient_financial_records(appointment_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_patient_financial_partnership
    ON patient_financial_records(partnership_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_patient_financial_status
    ON patient_financial_records(payment_status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_patient_financial_date
    ON patient_financial_records(session_date)
  `);

  // Add partnership_id column to patients table
  await pool.query(`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL
  `);

  // Create index for patient partnership
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_patients_partnership
    ON patients(partnership_id)
  `);

  // Create updated_at trigger function for partnerships
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_partnerships_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS trigger_update_partnerships_updated_at ON partnerships
  `);

  await pool.query(`
    CREATE TRIGGER trigger_update_partnerships_updated_at
    BEFORE UPDATE ON partnerships
    FOR EACH ROW
    EXECUTE FUNCTION update_partnerships_updated_at()
  `);

  // Create updated_at trigger function for patient_financial_records
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_patient_financial_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS trigger_update_patient_financial_updated_at ON patient_financial_records
  `);

  await pool.query(`
    CREATE TRIGGER trigger_update_patient_financial_updated_at
    BEFORE UPDATE ON patient_financial_records
    FOR EACH ROW
    EXECUTE FUNCTION update_patient_financial_updated_at()
  `);

  console.log('✅ Migration completed: partnerships and patient_financial_records tables created');
}

export async function down() {
  const pool = getPool();

  // Drop triggers
  await pool.query(`DROP TRIGGER IF EXISTS trigger_update_patient_financial_updated_at ON patient_financial_records`);
  await pool.query(`DROP TRIGGER IF EXISTS trigger_update_partnerships_updated_at ON partnerships`);

  // Drop functions
  await pool.query(`DROP FUNCTION IF EXISTS update_patient_financial_updated_at`);
  await pool.query(`DROP FUNCTION IF EXISTS update_partnerships_updated_at`);

  // Drop tables
  await pool.query(`DROP TABLE IF EXISTS patient_financial_records CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS partnerships CASCADE`);

  // Remove partnership_id from patients
  await pool.query(`
    ALTER TABLE patients
    DROP COLUMN IF EXISTS partnership_id
  `);

  console.log('✅ Rollback completed: partnerships and patient_financial_records tables dropped');
}
