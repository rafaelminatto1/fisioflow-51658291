"use strict";
/**
 * Cache Helpers - Otimizações de cache para queries frequentes
 *
 * Reduz carga no banco de dados e melhora tempo de resposta
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
exports.getOrganizationIdCached = getOrganizationIdCached;
exports.invalidateOrganizationCache = invalidateOrganizationCache;
exports.getPatientCached = getPatientCached;
exports.invalidatePatientCache = invalidatePatientCache;
exports.getAppointmentCountCached = getAppointmentCountCached;
exports.invalidateAppointmentCountCache = invalidateAppointmentCountCache;
exports.getDoctorsCached = getDoctorsCached;
exports.invalidateDoctorsCache = invalidateDoctorsCache;
exports.runCacheCleanup = runCacheCleanup;
var init_1 = require("../init");
var https_1 = require("firebase-functions/v2/https");
var function_config_1 = require("./function-config");
var logger_1 = require("./logger");
var admin = require("firebase-admin");
var uuid_1 = require("./uuid");
function resolveOrganizationIdFromProfile(profile) {
    var _a, _b;
    if (!profile)
        return null;
    return ((0, uuid_1.toValidUuid)(profile.organizationId)
        || (0, uuid_1.toValidUuid)(profile.activeOrganizationId)
        || (0, uuid_1.toValidUuid)(profile.organization_id)
        || (0, uuid_1.toValidUuid)((_a = profile.organizationIds) === null || _a === void 0 ? void 0 : _a[0])
        || (0, uuid_1.toValidUuid)((_b = profile.organization_ids) === null || _b === void 0 ? void 0 : _b[0]));
}
// ============================================================================
// ORGANIZATION ID CACHE
// ============================================================================
/**
 * Get organization ID from user ID with caching
 *
 * Tenta cache em memória primeiro, depois PostgreSQL, e por último Firestore
 * Cache expira em 5 minutos
 */
function getOrganizationIdCached(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, validCached, pool, result, orgId, error_1, profileDoc, profile, orgId, pool, _a, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    cacheKey = "org:".concat(userId);
                    cached = function_config_1.organizationCache.get(cacheKey);
                    if (cached) {
                        validCached = (0, uuid_1.toValidUuid)(cached);
                        if (!validCached) {
                            logger_1.logger.warn('Invalid cached organization ID, clearing cache entry', { userId: userId, cached: cached });
                            function_config_1.organizationCache.delete(cacheKey);
                        }
                        else {
                            return [2 /*return*/, validCached];
                        }
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT organization_id FROM profiles WHERE user_id = $1 LIMIT 1', [userId])];
                case 2:
                    result = _b.sent();
                    if (result.rows.length > 0) {
                        orgId = (0, uuid_1.toValidUuid)(result.rows[0].organization_id);
                        if (orgId) {
                            function_config_1.organizationCache.set(cacheKey, orgId);
                            return [2 /*return*/, orgId];
                        }
                        logger_1.logger.warn('Invalid organization_id found in PostgreSQL profile', {
                            userId: userId,
                            organizationId: result.rows[0].organization_id,
                        });
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _b.sent();
                    logger_1.logger.info('PostgreSQL query failed for organization ID, trying Firestore:', error_1);
                    return [3 /*break*/, 4];
                case 4:
                    _b.trys.push([4, 11, , 12]);
                    return [4 /*yield*/, admin.firestore().collection('profiles').doc(userId).get()];
                case 5:
                    profileDoc = _b.sent();
                    if (!profileDoc.exists) return [3 /*break*/, 10];
                    profile = profileDoc.data();
                    orgId = resolveOrganizationIdFromProfile(profile);
                    if (!orgId) {
                        throw new https_1.HttpsError('failed-precondition', 'Perfil sem organizationId válido');
                    }
                    // Cache the result
                    function_config_1.organizationCache.set(cacheKey, orgId);
                    _b.label = 6;
                case 6:
                    _b.trys.push([6, 8, , 9]);
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('INSERT INTO profiles (user_id, organization_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET organization_id = $2', [userId, orgId])];
                case 7:
                    _b.sent();
                    return [3 /*break*/, 9];
                case 8:
                    _a = _b.sent();
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/, orgId];
                case 10: return [3 /*break*/, 12];
                case 11:
                    error_2 = _b.sent();
                    if (error_2 instanceof https_1.HttpsError)
                        throw error_2;
                    logger_1.logger.info('Firestore query failed for organization ID:', error_2);
                    return [3 /*break*/, 12];
                case 12: throw new https_1.HttpsError('not-found', 'Perfil não encontrado');
            }
        });
    });
}
/**
 * Invalidate organization cache for a user
 * Call this when user's organization changes
 */
function invalidateOrganizationCache(userId) {
    function_config_1.organizationCache.delete("org:".concat(userId));
}
// ============================================================================
// PATIENT DATA CACHE
// ============================================================================
var patientCache = new function_config_1.SimpleCache(120000); // 2 minutos
function getPatientCached(patientId, organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, pool, result, patient, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "patient:".concat(organizationId, ":").concat(patientId);
                    cached = patientCache.get(cacheKey);
                    if (cached)
                        return [2 /*return*/, cached];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT id, name, email, phone, cpf, status FROM patients WHERE id = $1 AND organization_id = $2', [patientId, organizationId])];
                case 2:
                    result = _a.sent();
                    if (result.rows.length > 0) {
                        patient = result.rows[0];
                        patientCache.set(cacheKey, patient);
                        return [2 /*return*/, patient];
                    }
                    return [2 /*return*/, null];
                case 3:
                    error_3 = _a.sent();
                    logger_1.logger.error('Error fetching patient:', error_3);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function invalidatePatientCache(patientId, organizationId) {
    patientCache.delete("patient:".concat(organizationId, ":").concat(patientId));
}
// ============================================================================
// APPOINTMENT COUNT CACHE
// ============================================================================
var appointmentCountCache = new function_config_1.SimpleCache(30000); // 30 segundos
function getAppointmentCountCached(organizationId, date) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, pool, result, count, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "apptCount:".concat(organizationId, ":").concat(date);
                    cached = appointmentCountCache.get(cacheKey);
                    if (cached !== null)
                        return [2 /*return*/, cached];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT COUNT(*) as count FROM appointments WHERE organization_id = $1 AND DATE(date) = $2', [organizationId, date])];
                case 2:
                    result = _a.sent();
                    count = parseInt(result.rows[0].count, 10);
                    appointmentCountCache.set(cacheKey, count);
                    return [2 /*return*/, count];
                case 3:
                    error_4 = _a.sent();
                    logger_1.logger.error('Error fetching appointment count:', error_4);
                    return [2 /*return*/, 0];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function invalidateAppointmentCountCache(organizationId, date) {
    appointmentCountCache.delete("apptCount:".concat(organizationId, ":").concat(date));
}
// ============================================================================
// DOCTOR LIST CACHE
// ============================================================================
var doctorListCache = new function_config_1.SimpleCache(180000); // 3 minutos
function getDoctorsCached(organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, pool, result, doctors, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "doctors:".concat(organizationId);
                    cached = doctorListCache.get(cacheKey);
                    if (cached)
                        return [2 /*return*/, cached];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    pool = (0, init_1.getPool)();
                    return [4 /*yield*/, pool.query('SELECT user_id, full_name, specialties, is_active FROM profiles WHERE organization_id = $1 AND role IN ($2, $3) ORDER BY full_name', [organizationId, 'admin', 'therapist'])];
                case 2:
                    result = _a.sent();
                    doctors = result.rows;
                    doctorListCache.set(cacheKey, doctors);
                    return [2 /*return*/, doctors];
                case 3:
                    error_5 = _a.sent();
                    logger_1.logger.error('Error fetching doctors:', error_5);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function invalidateDoctorsCache(organizationId) {
    doctorListCache.delete("doctors:".concat(organizationId));
}
// ============================================================================
// CACHE CLEANUP TASK
// ============================================================================
/**
 * Run periodic cache cleanup
 * Call this from a scheduled function or on a timer
 */
function runCacheCleanup() {
    function_config_1.organizationCache.cleanup();
    patientCache.cleanup();
    appointmentCountCache.cleanup();
    doctorListCache.cleanup();
}
// Schedule cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(runCacheCleanup, 300000);
}
