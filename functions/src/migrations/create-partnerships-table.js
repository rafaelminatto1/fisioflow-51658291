"use strict";
/**
 * Migration: Create partnerships and patient financial records tables
 *
 * This migration creates tables for:
 * 1. partnerships - Manages partnerships with external organizations
 * 2. patient_financial_records - Tracks individual session payments for patients
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
var init_1 = require("../init");
function up() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    // Create partnerships table
                    return [4 /*yield*/, pool.query("\n    CREATE TABLE IF NOT EXISTS partnerships (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,\n      name VARCHAR(255) NOT NULL,\n      cnpj VARCHAR(20),\n      contact_person VARCHAR(255),\n      contact_phone VARCHAR(20),\n      contact_email VARCHAR(255),\n      address TEXT,\n      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),\n      discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,\n      allows_barter BOOLEAN DEFAULT false,\n      barter_description TEXT,\n      barter_sessions_limit INTEGER,\n      notes TEXT,\n      is_active BOOLEAN DEFAULT true,\n      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n    )\n  ")];
                case 1:
                    // Create partnerships table
                    _a.sent();
                    // Create index for partnerships
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_partnerships_organization_id\n    ON partnerships(organization_id)\n  ")];
                case 2:
                    // Create index for partnerships
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_partnerships_active\n    ON partnerships(organization_id, is_active)\n  ")];
                case 3:
                    _a.sent();
                    // Create patient_financial_records table
                    return [4 /*yield*/, pool.query("\n    CREATE TABLE IF NOT EXISTS patient_financial_records (\n      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,\n      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,\n      appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,\n      session_date DATE NOT NULL,\n      session_value NUMERIC(10, 2) NOT NULL,\n      discount_value NUMERIC(10, 2) DEFAULT 0,\n      discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'partnership')),\n      partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL,\n      final_value NUMERIC(10, 2) NOT NULL,\n      payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix', 'transfer', 'barter', 'other')),\n      payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled', 'refunded')),\n      paid_amount NUMERIC(10, 2) DEFAULT 0,\n      paid_date DATE,\n      notes TEXT,\n      is_barter BOOLEAN DEFAULT false,\n      barter_notes TEXT,\n      created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,\n      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n    )\n  ")];
                case 4:
                    // Create patient_financial_records table
                    _a.sent();
                    // Create indexes for patient_financial_records
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_patient_financial_organization\n    ON patient_financial_records(organization_id)\n  ")];
                case 5:
                    // Create indexes for patient_financial_records
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_patient_financial_patient\n    ON patient_financial_records(patient_id)\n  ")];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_patient_financial_appointment\n    ON patient_financial_records(appointment_id)\n  ")];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_patient_financial_partnership\n    ON patient_financial_records(partnership_id)\n  ")];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_patient_financial_status\n    ON patient_financial_records(payment_status)\n  ")];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_patient_financial_date\n    ON patient_financial_records(session_date)\n  ")];
                case 10:
                    _a.sent();
                    // Add partnership_id column to patients table
                    return [4 /*yield*/, pool.query("\n    ALTER TABLE patients\n    ADD COLUMN IF NOT EXISTS partnership_id UUID REFERENCES partnerships(id) ON DELETE SET NULL\n  ")];
                case 11:
                    // Add partnership_id column to patients table
                    _a.sent();
                    // Create index for patient partnership
                    return [4 /*yield*/, pool.query("\n    CREATE INDEX IF NOT EXISTS idx_patients_partnership\n    ON patients(partnership_id)\n  ")];
                case 12:
                    // Create index for patient partnership
                    _a.sent();
                    // Create updated_at trigger function for partnerships
                    return [4 /*yield*/, pool.query("\n    CREATE OR REPLACE FUNCTION update_partnerships_updated_at()\n    RETURNS TRIGGER AS $$\n    BEGIN\n      NEW.updated_at = NOW();\n      RETURN NEW;\n    END;\n    $$ LANGUAGE plpgsql\n  ")];
                case 13:
                    // Create updated_at trigger function for partnerships
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    DROP TRIGGER IF EXISTS trigger_update_partnerships_updated_at ON partnerships\n  ")];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE TRIGGER trigger_update_partnerships_updated_at\n    BEFORE UPDATE ON partnerships\n    FOR EACH ROW\n    EXECUTE FUNCTION update_partnerships_updated_at()\n  ")];
                case 15:
                    _a.sent();
                    // Create updated_at trigger function for patient_financial_records
                    return [4 /*yield*/, pool.query("\n    CREATE OR REPLACE FUNCTION update_patient_financial_updated_at()\n    RETURNS TRIGGER AS $$\n    BEGIN\n      NEW.updated_at = NOW();\n      RETURN NEW;\n    END;\n    $$ LANGUAGE plpgsql\n  ")];
                case 16:
                    // Create updated_at trigger function for patient_financial_records
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    DROP TRIGGER IF EXISTS trigger_update_patient_financial_updated_at ON patient_financial_records\n  ")];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, pool.query("\n    CREATE TRIGGER trigger_update_patient_financial_updated_at\n    BEFORE UPDATE ON patient_financial_records\n    FOR EACH ROW\n    EXECUTE FUNCTION update_patient_financial_updated_at()\n  ")];
                case 18:
                    _a.sent();
                    console.log('✅ Migration completed: partnerships and patient_financial_records tables created');
                    return [2 /*return*/];
            }
        });
    });
}
function down() {
    return __awaiter(this, void 0, void 0, function () {
        var pool;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pool = (0, init_1.getPool)();
                    // Drop triggers
                    return [4 /*yield*/, pool.query("DROP TRIGGER IF EXISTS trigger_update_patient_financial_updated_at ON patient_financial_records")];
                case 1:
                    // Drop triggers
                    _a.sent();
                    return [4 /*yield*/, pool.query("DROP TRIGGER IF EXISTS trigger_update_partnerships_updated_at ON partnerships")];
                case 2:
                    _a.sent();
                    // Drop functions
                    return [4 /*yield*/, pool.query("DROP FUNCTION IF EXISTS update_patient_financial_updated_at")];
                case 3:
                    // Drop functions
                    _a.sent();
                    return [4 /*yield*/, pool.query("DROP FUNCTION IF EXISTS update_partnerships_updated_at")];
                case 4:
                    _a.sent();
                    // Drop tables
                    return [4 /*yield*/, pool.query("DROP TABLE IF EXISTS patient_financial_records CASCADE")];
                case 5:
                    // Drop tables
                    _a.sent();
                    return [4 /*yield*/, pool.query("DROP TABLE IF EXISTS partnerships CASCADE")];
                case 6:
                    _a.sent();
                    // Remove partnership_id from patients
                    return [4 /*yield*/, pool.query("\n    ALTER TABLE patients\n    DROP COLUMN IF EXISTS partnership_id\n  ")];
                case 7:
                    // Remove partnership_id from patients
                    _a.sent();
                    console.log('✅ Rollback completed: partnerships and patient_financial_records tables dropped');
                    return [2 /*return*/];
            }
        });
    });
}
