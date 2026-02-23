"use strict";
/**
 * Migration: Create Doctors Table
 * Created: 2025-02-10
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
var types_1 = require("../lib/migrations/types");
exports.migration = {
    id: '005_create_doctors_table',
    name: 'Create doctors table for medical records',
    database: types_1.DatabaseType.POSTGRESQL,
    // UP: Apply the migration
    up: "\n    -- Create doctors table\n    CREATE TABLE IF NOT EXISTS doctors (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      name TEXT NOT NULL,\n      specialty TEXT,\n      crm TEXT,\n      crm_state TEXT,\n      phone TEXT,\n      email TEXT,\n      clinic_name TEXT,\n      clinic_address TEXT,\n      clinic_phone TEXT,\n      notes TEXT,\n      is_active BOOLEAN DEFAULT true,\n      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,\n      created_by TEXT REFERENCES profiles(user_id),\n      created_at TIMESTAMPTZ DEFAULT NOW(),\n      updated_at TIMESTAMPTZ DEFAULT NOW()\n    );\n\n    -- Indexes for performance\n    CREATE INDEX IF NOT EXISTS idx_doctors_org_active ON doctors(organization_id, is_active);\n    CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty) WHERE specialty IS NOT NULL;\n\n    -- Full-text search index using pg_trgm\n    CREATE INDEX IF NOT EXISTS idx_doctors_name_trgm ON doctors USING GIN (name gin_trgm_ops);\n\n    -- Trigger for updated_at\n    DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors;\n    CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors\n        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();\n\n    -- RLS Policy\n    ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;\n\n    CREATE POLICY doctors_org_policy ON doctors\n      FOR ALL\n      USING (organization_id = current_setting('app.organization_id', true)::uuid);\n  ",
    // DOWN: Rollback the migration
    down: "\n    DROP TABLE IF EXISTS doctors CASCADE;\n  ",
};
