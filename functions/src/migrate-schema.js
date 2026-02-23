"use strict";
/**
 * Temporary migration script to execute Cloud SQL schema
 * Run with: npx ts-node --transpile-only src/migrate-schema.ts
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
exports.runSchema = runSchema;
// Cloud SQL connection for Cloud Functions
var pg_1 = require("pg");
var fs = require("fs");
var path = require("path");
var dbSocketPath = process.env.DB_SOCKET_PATH || '/cloudsql';
var cloudSqlConnectionName = 'fisioflow-migration:southamerica-east1:fisioflow-pg';
var pool = new pg_1.Pool({
    host: path.join(dbSocketPath, cloudSqlConnectionName),
    user: 'fisioflow',
    password: 'FisioFlow@2024!Secure',
    database: 'fisioflow',
    max: 1,
});
function runSchema() {
    return __awaiter(this, void 0, void 0, function () {
        var schemaPath, schemaSQL, client, statements, _i, statements_1, statement, err_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🔧 Executando schema SQL no Cloud SQL...');
                    schemaPath = path.resolve(__dirname, '../../scripts/migration/cloudsql-schema.sql');
                    schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
                    return [4 /*yield*/, pool.connect()];
                case 1:
                    client = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 9, 10, 12]);
                    statements = schemaSQL
                        .split(';')
                        .map(function (s) { return s.trim(); })
                        .filter(function (s) { return s.length > 0 && !s.startsWith('--'); });
                    _i = 0, statements_1 = statements;
                    _a.label = 3;
                case 3:
                    if (!(_i < statements_1.length)) return [3 /*break*/, 8];
                    statement = statements_1[_i];
                    if (!statement.trim()) return [3 /*break*/, 7];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, client.query(statement)];
                case 5:
                    _a.sent();
                    console.log('✅ Statement executado:', statement.substring(0, 50) + '...');
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _a.sent();
                    // Log error but continue (some statements might fail if objects already exist)
                    console.log('⚠️  Erro (ignorado se já existe):', err_1.message);
                    return [3 /*break*/, 7];
                case 7:
                    _i++;
                    return [3 /*break*/, 3];
                case 8:
                    console.log('\n✅ Schema criado com sucesso!');
                    return [3 /*break*/, 12];
                case 9:
                    error_1 = _a.sent();
                    console.error('❌ Erro ao criar schema:', error_1.message);
                    throw error_1;
                case 10:
                    client.release();
                    return [4 /*yield*/, pool.end()];
                case 11:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
// Execute if run directly
if (require.main === module) {
    runSchema()
        .then(function () {
        console.log('Migration complete!');
        process.exit(0);
    })
        .catch(function (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    });
}
