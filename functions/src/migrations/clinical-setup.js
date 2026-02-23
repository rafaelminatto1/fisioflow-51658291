"use strict";
/**
 * Migration: Create clinical tables (goals, pathologies)
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
exports.migrateClinicalSchema = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var cors_1 = require("../lib/cors");
var logger_1 = require("../lib/logger");
exports.migrateClinicalSchema = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var pool, client, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.connect()];
            case 1:
                client = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 11, 13, 14]);
                logger_1.logger.info('🔄 Starting clinical tables migration...');
                return [4 /*yield*/, client.query('BEGIN')];
            case 3:
                _a.sent();
                // 1. Patient Goals Table
                return [4 /*yield*/, client.query("\n      CREATE TABLE IF NOT EXISTS patient_goals (\n        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,\n        organization_id UUID NOT NULL,\n        description TEXT NOT NULL,\n        target_date TIMESTAMP WITH TIME ZONE,\n        status TEXT NOT NULL DEFAULT 'em_andamento',\n        priority TEXT DEFAULT 'media',\n        achieved_at TIMESTAMP WITH TIME ZONE,\n        metadata JSONB,\n        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n      );\n    ")];
            case 4:
                // 1. Patient Goals Table
                _a.sent();
                logger_1.logger.info('✅ patient_goals table created');
                // 2. Patient Pathologies Table
                return [4 /*yield*/, client.query("\n      CREATE TABLE IF NOT EXISTS patient_pathologies (\n        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,\n        organization_id UUID NOT NULL,\n        name TEXT NOT NULL,\n        description TEXT,\n        diagnosed_at TIMESTAMP WITH TIME ZONE,\n        status TEXT NOT NULL DEFAULT 'ativo',\n        is_primary BOOLEAN DEFAULT false,\n        icd_code TEXT,\n        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n      );\n    ")];
            case 5:
                // 2. Patient Pathologies Table
                _a.sent();
                logger_1.logger.info('✅ patient_pathologies table created');
                // Create Indexes
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_patient_goals_patient ON patient_goals(patient_id);")];
            case 6:
                // Create Indexes
                _a.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_patient_pathologies_patient ON patient_pathologies(patient_id);")];
            case 7:
                _a.sent();
                // 3. BI Views for Looker Studio
                return [4 /*yield*/, client.query("\n      CREATE OR REPLACE VIEW view_bi_revenue AS\n      SELECT \n        date_trunc('day', created_at) as day,\n        tipo,\n        status,\n        SUM(valor) as total_amount,\n        COUNT(*) as transaction_count\n      FROM transacoes\n      GROUP BY 1, 2, 3;\n    ")];
            case 8:
                // 3. BI Views for Looker Studio
                _a.sent();
                return [4 /*yield*/, client.query("\n      CREATE OR REPLACE VIEW view_bi_therapist_productivity AS\n      SELECT \n        p.full_name as therapist_name,\n        date_trunc('month', a.date) as month,\n        a.status,\n        COUNT(*) as appointment_count\n      FROM appointments a\n      JOIN profiles p ON a.therapist_id = p.user_id\n      GROUP BY 1, 2, 3;\n    ")];
            case 9:
                _a.sent();
                return [4 /*yield*/, client.query('COMMIT')];
            case 10:
                _a.sent();
                logger_1.logger.info('✅ Clinical migration completed successfully!');
                return [2 /*return*/, { success: true, message: 'Clinical tables created successfully' }];
            case 11:
                error_1 = _a.sent();
                return [4 /*yield*/, client.query('ROLLBACK')];
            case 12:
                _a.sent();
                logger_1.logger.error('❌ Clinical migration failed:', error_1);
                throw new Error("Migration failed: ".concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1)));
            case 13:
                client.release();
                return [7 /*endfinally*/];
            case 14: return [2 /*return*/];
        }
    });
}); });
