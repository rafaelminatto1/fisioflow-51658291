"use strict";
/**
 * API Functions: Doctors
 * Cloud Functions para gestão de médicos via Cloud SQL
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
exports.syncDoctorToSqlHandler = exports.searchDoctorsHttp = exports.listDoctorsHttp = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var patients_1 = require("./patients"); // Reusing helpers
var cors_1 = require("../lib/cors");
var logger_1 = require("../lib/logger");
/**
 * Lista médicos da organização (Cloud SQL)
 */
exports.listDoctorsHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, _a, search, _b, limit, _c, offset, pool, queryText, params, paramCount, result, countResult, error_1, statusCode;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'POST') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                _d.label = 1;
            case 1:
                _d.trys.push([1, 6, , 7]);
                return [4 /*yield*/, (0, patients_1.verifyAuthHeader)(req)];
            case 2:
                uid = (_d.sent()).uid;
                return [4 /*yield*/, (0, patients_1.getOrganizationId)(uid)];
            case 3:
                organizationId = _d.sent();
                _a = req.body || {}, search = _a.search, _b = _a.limit, limit = _b === void 0 ? 50 : _b, _c = _a.offset, offset = _c === void 0 ? 0 : _c;
                pool = (0, init_1.getPool)();
                queryText = "\n        SELECT * FROM doctors\n        WHERE organization_id = $1 AND is_active = true\n      ";
                params = [organizationId];
                paramCount = 1;
                if (search) {
                    paramCount++;
                    // Using ILIKE for search, but ideally we'd use the trigram indexes for better performance
                    // if the search term is long enough. For simple listing, ILIKE is fine.
                    queryText += " AND (name ILIKE $".concat(paramCount, " OR specialty ILIKE $").concat(paramCount, " OR clinic_name ILIKE $").concat(paramCount, ")");
                    params.push("%".concat(search, "%"));
                }
                queryText += " ORDER BY name ASC LIMIT $".concat(paramCount + 1, " OFFSET $").concat(paramCount + 2);
                params.push(limit, offset);
                return [4 /*yield*/, pool.query(queryText, params)];
            case 4:
                result = _d.sent();
                return [4 /*yield*/, pool.query("SELECT COUNT(*) FROM doctors WHERE organization_id = $1 AND is_active = true ".concat(search ? "AND (name ILIKE $2 OR specialty ILIKE $2 OR clinic_name ILIKE $2)" : ''), search ? [organizationId, "%".concat(search, "%")] : [organizationId])];
            case 5:
                countResult = _d.sent();
                res.json({
                    data: result.rows,
                    total: parseInt(countResult.rows[0].count, 10),
                    page: Math.floor(offset / limit) + 1,
                    perPage: limit,
                });
                return [3 /*break*/, 7];
            case 6:
                error_1 = _d.sent();
                logger_1.logger.error('Error in listDoctorsHttp:', error_1);
                statusCode = error_1 instanceof https_1.HttpsError && error_1.code === 'unauthenticated' ? 401 : 500;
                res.status(statusCode).json({ error: error_1 instanceof Error ? error_1.message : 'Erro ao listar médicos' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
/**
 * Busca médicos para autocomplete (Cloud SQL - High Performance)
 */
exports.searchDoctorsHttp = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
    invoker: 'public',
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, organizationId, _a, searchTerm, _b, limit, pool, result, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                (0, cors_1.setCorsHeaders)(res, req);
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, patients_1.verifyAuthHeader)(req)];
            case 2:
                uid = (_c.sent()).uid;
                return [4 /*yield*/, (0, patients_1.getOrganizationId)(uid)];
            case 3:
                organizationId = _c.sent();
                _a = req.body || {}, searchTerm = _a.searchTerm, _b = _a.limit, limit = _b === void 0 ? 10 : _b;
                if (!searchTerm || searchTerm.trim().length < 2) {
                    res.json({ data: [] });
                    return [2 /*return*/];
                }
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query("SELECT *, similarity(name, $1) as score\n         FROM doctors\n         WHERE organization_id = $2 \n           AND is_active = true \n           AND (name % $1 OR specialty % $1 OR clinic_name % $1)\n         ORDER BY score DESC\n         LIMIT $3", [searchTerm, organizationId, limit])];
            case 4:
                result = _c.sent();
                res.json({ data: result.rows });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _c.sent();
                logger_1.logger.error('Error in searchDoctorsHttp:', error_2);
                res.status(500).json({ error: 'Erro ao buscar médicos' });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Sincroniza médico do Firestore para o SQL (Trigged by Firestore doc write)
 */
var syncDoctorToSqlHandler = function (doctorId, doctorData) { return __awaiter(void 0, void 0, void 0, function () {
    var pool, organization_id, created_by, name_1, specialty, crm, crm_state, phone, email, clinic_name, clinic_address, clinic_phone, notes, _a, is_active, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                pool = (0, init_1.getPool)();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                organization_id = doctorData.organization_id, created_by = doctorData.created_by, name_1 = doctorData.name, specialty = doctorData.specialty, crm = doctorData.crm, crm_state = doctorData.crm_state, phone = doctorData.phone, email = doctorData.email, clinic_name = doctorData.clinic_name, clinic_address = doctorData.clinic_address, clinic_phone = doctorData.clinic_phone, notes = doctorData.notes, _a = doctorData.is_active, is_active = _a === void 0 ? true : _a;
                return [4 /*yield*/, pool.query("INSERT INTO doctors (\n        id, organization_id, created_by, name, specialty, crm, crm_state,\n        phone, email, clinic_name, clinic_address, clinic_phone, notes, is_active\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)\n      ON CONFLICT (id) DO UPDATE SET\n        name = EXCLUDED.name,\n        specialty = EXCLUDED.specialty,\n        crm = EXCLUDED.crm,\n        crm_state = EXCLUDED.crm_state,\n        phone = EXCLUDED.phone,\n        email = EXCLUDED.email,\n        clinic_name = EXCLUDED.clinic_name,\n        clinic_address = EXCLUDED.clinic_address,\n        clinic_phone = EXCLUDED.clinic_phone,\n        notes = EXCLUDED.notes,\n        is_active = EXCLUDED.is_active,\n        updated_at = NOW()", [
                        doctorId, organization_id, created_by, name_1, specialty, crm, crm_state,
                        phone, email, clinic_name, clinic_address, clinic_phone, notes, is_active
                    ])];
            case 2:
                _b.sent();
                logger_1.logger.info("[syncDoctorToSql] Successfully synced doctor ".concat(doctorId));
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                logger_1.logger.error("[syncDoctorToSql] Error syncing doctor ".concat(doctorId, ":"), error_3);
                throw error_3;
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.syncDoctorToSqlHandler = syncDoctorToSqlHandler;
