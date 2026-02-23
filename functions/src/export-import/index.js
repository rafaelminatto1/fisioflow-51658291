"use strict";
/**
 * Export/Import Functions
 * Functions for exporting and importing patient data
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadExport = exports.downloadExportHandler = exports.importPatients = exports.importPatientsHandler = exports.exportPatients = exports.exportPatientsHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var logger_1 = require("../lib/logger");
var init_1 = require("../init");
var logger = (0, logger_1.getLogger)('export-import');
var db = admin.firestore();
var storage = admin.storage();
/**
 * Export patients to JSON/CSV
 */
var exportPatientsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, _b, format, _c, filters, query, snapshot, patients, filename, bucket, file, csvData, jsonData, url, error_1;
    var _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                data = request.data;
                userId = (_d = request.auth) === null || _d === void 0 ? void 0 : _d.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, _b = _a.format, format = _b === void 0 ? 'json' : _b, _c = _a.filters, filters = _c === void 0 ? {} : _c;
                if (!organizationId) {
                    throw new https_1.HttpsError('invalid-argument', 'organizationId is required');
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 8, , 9]);
                logger.info('Starting patient export', { userId: userId, organizationId: organizationId, format: format, filters: filters });
                query = db
                    .collection('patients')
                    .where('organizationId', '==', organizationId);
                if (filters.status && filters.status !== 'all') {
                    query = query.where('status', '==', filters.status);
                }
                if (filters.startDate) {
                    query = query.where('createdAt', '>=', new Date(filters.startDate));
                }
                if (filters.endDate) {
                    query = query.where('createdAt', '<=', new Date(filters.endDate));
                }
                return [4 /*yield*/, query.limit(1000).get()];
            case 2:
                snapshot = _e.sent();
                if (snapshot.empty) {
                    return [2 /*return*/, {
                            success: true,
                            count: 0,
                            url: null,
                            message: 'No patients found matching the criteria',
                        }];
                }
                patients = snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                filename = "patients_export_".concat(Date.now(), ".").concat(format);
                bucket = storage.bucket();
                file = bucket.file("exports/".concat(userId, "/").concat(filename));
                if (!(format === 'csv')) return [3 /*break*/, 4];
                csvData = convertPatientsToCSV(patients);
                return [4 /*yield*/, file.save(csvData, {
                        contentType: 'text/csv',
                        metadata: {
                            exportedBy: userId,
                            organizationId: organizationId,
                            exportDate: new Date().toISOString(),
                            count: patients.length,
                        },
                    })];
            case 3:
                _e.sent();
                return [3 /*break*/, 6];
            case 4:
                jsonData = JSON.stringify({
                    exportDate: new Date().toISOString(),
                    organizationId: organizationId,
                    count: patients.length,
                    patients: patients,
                }, null, 2);
                return [4 /*yield*/, file.save(jsonData, {
                        contentType: 'application/json',
                        metadata: {
                            exportedBy: userId,
                            organizationId: organizationId,
                            exportDate: new Date().toISOString(),
                            count: patients.length,
                        },
                    })];
            case 5:
                _e.sent();
                _e.label = 6;
            case 6: return [4 /*yield*/, file.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 15 * 60 * 1000,
                })];
            case 7:
                url = (_e.sent())[0];
                logger.info('Patient export completed', {
                    userId: userId,
                    organizationId: organizationId,
                    count: patients.length,
                    format: format,
                    filename: filename,
                });
                return [2 /*return*/, {
                        success: true,
                        count: patients.length,
                        url: url,
                        filename: filename,
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                    }];
            case 8:
                error_1 = _e.sent();
                logger.error('Patient export failed', { error: error_1, userId: userId, organizationId: organizationId });
                throw new https_1.HttpsError('internal', "Failed to export patients: ".concat(error_1.message));
            case 9: return [2 /*return*/];
        }
    });
}); };
exports.exportPatientsHandler = exportPatientsHandler;
exports.exportPatients = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    timeoutSeconds: 300,
}, exports.exportPatientsHandler);
/**
 * Import patients from JSON/CSV
 */
var importPatientsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, userId, _a, organizationId, _b, format, patientData, _c, options, patients, results, batch, BATCH_SIZE, operations, i, patient, validationResult, existingQuery, _d, patientDoc, docRef, existingDoc, error_2, error_3;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                data = request.data;
                userId = (_e = request.auth) === null || _e === void 0 ? void 0 : _e.uid;
                if (!userId) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data, organizationId = _a.organizationId, _b = _a.format, format = _b === void 0 ? 'json' : _b, patientData = _a.patientData, _c = _a.options, options = _c === void 0 ? {} : _c;
                if (!organizationId || !patientData) {
                    throw new https_1.HttpsError('invalid-argument', 'organizationId and patientData are required');
                }
                _g.label = 1;
            case 1:
                _g.trys.push([1, 19, , 20]);
                logger.info('Starting patient import', {
                    userId: userId,
                    organizationId: organizationId,
                    format: format,
                    options: options,
                });
                patients = [];
                // Parse data based on format
                if (format === 'csv') {
                    patients = parsePatientsFromCSV(patientData);
                }
                else {
                    patients = patientData;
                }
                if (patients.length === 0) {
                    return [2 /*return*/, {
                            success: true,
                            imported: 0,
                            skipped: 0,
                            failed: 0,
                            errors: [],
                            message: 'No patients to import',
                        }];
                }
                results = {
                    imported: 0,
                    skipped: 0,
                    failed: 0,
                    errors: [],
                };
                batch = db.batch();
                BATCH_SIZE = 500;
                operations = 0;
                i = 0;
                _g.label = 2;
            case 2:
                if (!(i < patients.length)) return [3 /*break*/, 16];
                patient = patients[i];
                _g.label = 3;
            case 3:
                _g.trys.push([3, 14, , 15]);
                validationResult = validatePatientData(patient);
                if (!validationResult.valid) {
                    results.failed++;
                    results.errors.push({
                        index: i,
                        id: patient.id || 'unknown',
                        error: (_f = validationResult.error) !== null && _f !== void 0 ? _f : 'Validation failed',
                    });
                    return [3 /*break*/, 15];
                }
                if (!options.skipDuplicates) return [3 /*break*/, 8];
                if (!patient.email) return [3 /*break*/, 5];
                return [4 /*yield*/, db
                        .collection('patients')
                        .where('organizationId', '==', organizationId)
                        .where('email', '==', patient.email)
                        .limit(1)
                        .get()];
            case 4:
                _d = _g.sent();
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, db
                    .collection('patients')
                    .where('organizationId', '==', organizationId)
                    .where('phone', '==', patient.phone)
                    .limit(1)
                    .get()];
            case 6:
                _d = _g.sent();
                _g.label = 7;
            case 7:
                existingQuery = _d;
                if (!existingQuery.empty) {
                    results.skipped++;
                    return [3 /*break*/, 15];
                }
                _g.label = 8;
            case 8:
                patientDoc = __assign(__assign({}, patient), { organizationId: organizationId, importedAt: admin.firestore.FieldValue.serverTimestamp(), importedBy: userId });
                docRef = void 0;
                if (options.preserveIds && patient.id) {
                    docRef = db.collection('patients').doc(patient.id);
                    delete patientDoc.id;
                }
                else {
                    docRef = db.collection('patients').doc();
                    patientDoc.id = docRef.id;
                }
                if (!options.updateExisting) return [3 /*break*/, 10];
                return [4 /*yield*/, docRef.get()];
            case 9:
                existingDoc = _g.sent();
                if (existingDoc.exists) {
                    batch.update(docRef, __assign(__assign({}, patientDoc), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
                }
                else {
                    batch.set(docRef, __assign(__assign({}, patientDoc), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
                }
                return [3 /*break*/, 11];
            case 10:
                batch.set(docRef, __assign(__assign({}, patientDoc), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
                _g.label = 11;
            case 11:
                operations++;
                results.imported++;
                if (!(operations >= BATCH_SIZE)) return [3 /*break*/, 13];
                return [4 /*yield*/, batch.commit()];
            case 12:
                _g.sent();
                batch = db.batch();
                operations = 0;
                _g.label = 13;
            case 13: return [3 /*break*/, 15];
            case 14:
                error_2 = _g.sent();
                results.failed++;
                results.errors.push({
                    index: i,
                    id: patient.id,
                    error: error_2.message,
                });
                return [3 /*break*/, 15];
            case 15:
                i++;
                return [3 /*break*/, 2];
            case 16:
                if (!(operations > 0)) return [3 /*break*/, 18];
                return [4 /*yield*/, batch.commit()];
            case 17:
                _g.sent();
                _g.label = 18;
            case 18:
                logger.info('Patient import completed', {
                    userId: userId,
                    organizationId: organizationId,
                    results: results,
                });
                return [2 /*return*/, __assign(__assign({ success: true }, results), { message: "Import completed: ".concat(results.imported, " imported, ").concat(results.skipped, " skipped, ").concat(results.failed, " failed") })];
            case 19:
                error_3 = _g.sent();
                logger.error('Patient import failed', { error: error_3, userId: userId, organizationId: organizationId });
                throw new https_1.HttpsError('internal', "Failed to import patients: ".concat(error_3.message));
            case 20: return [2 /*return*/];
        }
    });
}); };
exports.importPatientsHandler = importPatientsHandler;
exports.importPatients = (0, https_1.onCall)({
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    timeoutSeconds: 300,
}, exports.importPatientsHandler);
/**
 * Download export file
 */
var downloadExportHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, filename, filenamePattern, token, decodedToken, userId, orgIdMatch, fileOrgId, pool, profileCheck, userOrgId, bucket, file, exists, metadata, fileAge, maxAge, readStream, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                // CORS handling
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'GET');
                res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                if (req.method !== 'GET') {
                    res.status(405).json({ error: 'Method not allowed' });
                    return [2 /*return*/];
                }
                authHeader = req.headers.authorization;
                if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                    res.status(401).json({ error: 'Authorization required' });
                    return [2 /*return*/];
                }
                filename = req.query.filename;
                if (!filename || typeof filename !== 'string') {
                    res.status(400).json({ error: 'Filename is required' });
                    return [2 /*return*/];
                }
                filenamePattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(json|csv|md)$/;
                if (!filenamePattern.test(filename)) {
                    logger.warn('Invalid filename format rejected', { filename: filename });
                    res.status(400).json({ error: 'Invalid filename format' });
                    return [2 /*return*/];
                }
                // Prevent directory traversal by checking for path separators
                if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
                    logger.warn('Path traversal attempt blocked', { filename: filename });
                    res.status(400).json({ error: 'Invalid filename' });
                    return [2 /*return*/];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 6, , 7]);
                token = authHeader.substring(7);
                return [4 /*yield*/, admin.auth().verifyIdToken(token)];
            case 2:
                decodedToken = _a.sent();
                userId = decodedToken.uid;
                orgIdMatch = filename.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})_/);
                if (!orgIdMatch) {
                    res.status(400).json({ error: 'Invalid filename format' });
                    return [2 /*return*/];
                }
                fileOrgId = orgIdMatch[1];
                pool = (0, init_1.getPool)();
                return [4 /*yield*/, pool.query('SELECT organization_id, role FROM profiles WHERE user_id = $1', [userId])];
            case 3:
                profileCheck = _a.sent();
                if (profileCheck.rows.length === 0) {
                    res.status(403).json({ error: 'User not found' });
                    return [2 /*return*/];
                }
                userOrgId = profileCheck.rows[0].organization_id;
                // User can only download exports from their own organization
                if (userOrgId !== fileOrgId) {
                    logger.warn('Unauthorized export download attempt', {
                        userId: userId,
                        userOrgId: userOrgId,
                        fileOrgId: fileOrgId,
                        filename: filename
                    });
                    res.status(403).json({ error: 'Unauthorized access to export file' });
                    return [2 /*return*/];
                }
                bucket = storage.bucket();
                file = bucket.file("exports/".concat(filename));
                return [4 /*yield*/, file.exists()];
            case 4:
                exists = (_a.sent())[0];
                if (!exists) {
                    res.status(404).json({ error: 'File not found' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, file.getMetadata()];
            case 5:
                metadata = (_a.sent())[0];
                fileAge = Date.now() - (parseInt(metadata.timeCreated) || 0);
                maxAge = 60 * 60 * 1000;
                if (fileAge > maxAge) {
                    logger.warn('Expired export file access attempt', { filename: filename, fileAge: fileAge });
                    res.status(403).json({ error: 'Export file has expired. Please generate a new export.' });
                    return [2 /*return*/];
                }
                readStream = file.createReadStream();
                res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
                res.setHeader('Content-Disposition', "attachment; filename=\"".concat(filename, "\""));
                // Handle stream errors
                readStream.on('error', function (streamError) {
                    logger.error('File stream error', { error: streamError, filename: filename });
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Failed to stream file' });
                    }
                });
                readStream.pipe(res);
                return [3 /*break*/, 7];
            case 6:
                error_4 = _a.sent();
                if ((error_4 === null || error_4 === void 0 ? void 0 : error_4.code) === 'auth/argument-error') {
                    res.status(401).json({ error: 'Invalid authorization token' });
                    return [2 /*return*/];
                }
                logger.error('Download export failed', { error: error_4, filename: filename });
                res.status(500).json({ error: 'Failed to download file' });
                return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); };
exports.downloadExportHandler = downloadExportHandler;
exports.downloadExport = (0, https_1.onRequest)({
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
}, exports.downloadExportHandler);
// Helper functions
function convertPatientsToCSV(patients) {
    if (patients.length === 0)
        return '';
    // Get all unique keys from all patients
    var keys = Array.from(new Set(patients.flatMap(function (p) { return Object.keys(p); })));
    // CSV header
    var header = keys.join(',');
    // CSV rows
    var rows = patients.map(function (patient) {
        return keys
            .map(function (key) {
            var value = patient[key];
            // Handle null/undefined
            if (value === null || value === undefined)
                return '';
            // Handle objects/arrays
            if (typeof value === 'object')
                return "\"".concat(JSON.stringify(value).replace(/"/g, '""'), "\"");
            // Handle strings with commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return "\"".concat(value.replace(/"/g, '""'), "\"");
            }
            return String(value);
        })
            .join(',');
    });
    return __spreadArray([header], rows, true).join('\n');
}
function parsePatientsFromCSV(csvData) {
    var lines = csvData.trim().split('\n');
    if (lines.length < 2)
        return [];
    var headers = lines[0].split(',').map(function (h) { return h.trim().replace(/^"|"$/g, ''); });
    var patients = [];
    var _loop_1 = function (i) {
        var values = parseCSVLine(lines[i]);
        var patient = {};
        headers.forEach(function (header, index) {
            var _a;
            var value = (_a = values[index]) === null || _a === void 0 ? void 0 : _a.trim();
            if (value) {
                // Try to parse as JSON for nested objects
                try {
                    if (value.startsWith('{') || value.startsWith('[')) {
                        patient[header] = JSON.parse(value.replace(/""/g, '"'));
                    }
                    else {
                        patient[header] = value.replace(/^"|"$/g, '').replace(/""/g, '"');
                    }
                }
                catch (_b) {
                    patient[header] = value.replace(/^"|"$/g, '').replace(/""/g, '"');
                }
            }
        });
        patients.push(patient);
    };
    for (var i = 1; i < lines.length; i++) {
        _loop_1(i);
    }
    return patients;
}
function parseCSVLine(line) {
    var values = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
        var char = line[i];
        var nextChar = line[i + 1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
        }
        else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        }
        else {
            current += char;
        }
    }
    values.push(current);
    return values;
}
function validatePatientData(patient) {
    if (!patient.name) {
        return { valid: false, error: 'Name is required' };
    }
    // Validate email format if provided
    if (patient.email && !isValidEmail(patient.email)) {
        return { valid: false, error: 'Invalid email format' };
    }
    // Validate phone format if provided
    if (patient.phone && !isValidPhone(patient.phone)) {
        return { valid: false, error: 'Invalid phone format' };
    }
    return { valid: true };
}
function isValidEmail(email) {
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isValidPhone(phone) {
    // Remove non-numeric characters
    var numbersOnly = phone.replace(/\D/g, '');
    // Brazilian phone: 10 or 11 digits
    return numbersOnly.length >= 10 && numbersOnly.length <= 11;
}
