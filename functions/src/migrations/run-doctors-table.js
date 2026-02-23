"use strict";
/**
 * HTTP endpoint to create doctors table
 *
 * Usage: curl -X POST "https://REGION-PROJECT.cloudfunctions.net/runDoctorsTable?key=YOUR_API_KEY"
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
exports.runDoctorsTable = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
exports.runDoctorsTable = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 60,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, pool, client, checkResult, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                apiKey = req.query.key || req.headers['x-migration-key'];
                if (apiKey !== 'fisioflow-migration-2026') {
                    res.status(403).json({ error: 'Forbidden - Invalid API key' });
                    return [2 /*return*/];
                }
                // Only allow POST
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed - use POST' });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.connect()];
            case 1:
                client = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 14, 15, 16]);
                console.log('🔄 Starting Doctors Table Migration...');
                // Enable pg_trgm extension if not exists
                return [4 /*yield*/, client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm")];
            case 3:
                // Enable pg_trgm extension if not exists
                _a.sent();
                console.log('✅ pg_trgm extension enabled');
                // Create doctors table
                return [4 /*yield*/, client.query("\n      CREATE TABLE IF NOT EXISTS doctors (\n        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n        name TEXT NOT NULL,\n        specialty TEXT,\n        crm TEXT,\n        crm_state TEXT,\n        phone TEXT,\n        email TEXT,\n        clinic_name TEXT,\n        clinic_address TEXT,\n        clinic_phone TEXT,\n        notes TEXT,\n        is_active BOOLEAN DEFAULT true,\n        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,\n        created_by TEXT REFERENCES profiles(user_id),\n        created_at TIMESTAMPTZ DEFAULT NOW(),\n        updated_at TIMESTAMPTZ DEFAULT NOW()\n      )\n    ")];
            case 4:
                // Create doctors table
                _a.sent();
                console.log('✅ doctors table created');
                // Create indexes
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_doctors_org_active ON doctors(organization_id, is_active)")];
            case 5:
                // Create indexes
                _a.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON doctors(specialty) WHERE specialty IS NOT NULL")];
            case 6:
                _a.sent();
                return [4 /*yield*/, client.query("CREATE INDEX IF NOT EXISTS idx_doctors_name_trgm ON doctors USING GIN (name gin_trgm_ops)")];
            case 7:
                _a.sent();
                console.log('✅ doctors indexes created');
                // Create trigger for updated_at
                return [4 /*yield*/, client.query("\n      DROP TRIGGER IF EXISTS update_doctors_updated_at ON doctors\n    ")];
            case 8:
                // Create trigger for updated_at
                _a.sent();
                return [4 /*yield*/, client.query("\n      CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors\n          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()\n    ")];
            case 9:
                _a.sent();
                console.log('✅ doctors trigger created');
                // Enable RLS
                return [4 /*yield*/, client.query("ALTER TABLE doctors ENABLE ROW LEVEL SECURITY")];
            case 10:
                // Enable RLS
                _a.sent();
                // Create RLS policy
                return [4 /*yield*/, client.query("\n      DROP POLICY IF EXISTS doctors_org_policy ON doctors\n    ")];
            case 11:
                // Create RLS policy
                _a.sent();
                return [4 /*yield*/, client.query("\n      CREATE POLICY doctors_org_policy ON doctors\n        FOR ALL\n        USING (organization_id = current_setting('app.organization_id', true)::uuid)\n    ")];
            case 12:
                _a.sent();
                console.log('✅ doctors RLS policy created');
                return [4 /*yield*/, client.query("\n      SELECT COUNT(*) as count FROM doctors\n    ")];
            case 13:
                checkResult = _a.sent();
                console.log('✅ Doctors Table Migration completed successfully!');
                console.log("\uD83D\uDCCA Current doctors count: ".concat(checkResult.rows[0].count));
                res.json({
                    success: true,
                    message: 'Doctors table migration completed successfully',
                    timestamp: new Date().toISOString(),
                });
                return [3 /*break*/, 16];
            case 14:
                error_1 = _a.sent();
                console.error('❌ Migration failed:', error_1);
                res.status(500).json({
                    success: false,
                    error: (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1),
                });
                return [3 /*break*/, 16];
            case 15:
                client.release();
                return [7 /*endfinally*/];
            case 16: return [2 /*return*/];
        }
    });
}); });
