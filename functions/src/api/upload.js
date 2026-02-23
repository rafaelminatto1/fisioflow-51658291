"use strict";
/**
 * Upload API - Firebase Cloud Function
 *
 * Substitui a rota /api/upload que usava Vercel Blob
 * Agora usa Firebase Storage para todos os uploads
 *
 * @version 1.1.0 - Firebase Functions v2 - Refactored for consistency
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
exports.listUserFiles = exports.listUserFilesHandler = exports.deleteFile = exports.deleteFileHandler = exports.confirmUpload = exports.confirmUploadHandler = exports.generateUploadToken = exports.generateUploadTokenHandler = void 0;
// ============================================================================
// TYPES
// ============================================================================
var init_1 = require("../init");
var cors_1 = require("../lib/cors");
var https_1 = require("firebase-functions/v2/https");
var firebase_functions_1 = require("firebase-functions");
// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================
/**
 * Signed URL handler
 */
var generateUploadTokenHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, filename, contentType, _a, folder, allowedTypes, adminAuth, timestamp, random, extension, storageFilename, storagePath, adminStorage, bucket, file, uploadUrl, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data, auth = request.auth;
                // Auth check
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                filename = data.filename, contentType = data.contentType, _a = data.folder, folder = _a === void 0 ? 'uploads' : _a;
                // Validate input
                if (!filename || !contentType) {
                    throw new https_1.HttpsError('invalid-argument', 'filename and contentType are required');
                }
                allowedTypes = [
                    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
                    'video/mp4', 'video/webm', 'video/quicktime',
                    'audio/mpeg', 'audio/wav', 'audio/ogg',
                    'application/pdf', 'text/plain', 'application/json',
                ];
                if (!allowedTypes.includes(contentType)) {
                    throw new https_1.HttpsError('failed-precondition', "Content type ".concat(contentType, " not allowed"));
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                adminAuth = (0, init_1.getAdminAuth)();
                return [4 /*yield*/, adminAuth.getUser(auth.uid)];
            case 2:
                _b.sent(); // Verify user exists
                timestamp = Date.now();
                random = Math.random().toString(36).substring(2, 8);
                extension = filename.split('.').pop();
                storageFilename = "".concat(timestamp, "-").concat(random, ".").concat(extension);
                storagePath = "".concat(folder, "/").concat(auth.uid, "/").concat(storageFilename);
                adminStorage = (0, init_1.getAdminStorage)();
                bucket = adminStorage.bucket();
                file = bucket.file(storagePath);
                return [4 /*yield*/, file.getSignedUrl({
                        version: 'v4',
                        action: 'write',
                        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                        contentType: contentType,
                    })];
            case 3:
                uploadUrl = (_b.sent())[0];
                firebase_functions_1.logger.info('[generateUploadToken] Upload token generated', {
                    userId: auth.uid,
                    storagePath: storagePath,
                    contentType: contentType,
                });
                return [2 /*return*/, {
                        uploadUrl: uploadUrl,
                        storagePath: storagePath,
                        token: Buffer.from(JSON.stringify({ storagePath: storagePath, contentType: contentType })).toString('base64'), // Simple token for client verification
                    }];
            case 4:
                error_1 = _b.sent();
                firebase_functions_1.logger.error('[generateUploadToken] Error', {
                    userId: auth.uid,
                    error: error_1,
                });
                if (error_1 instanceof https_1.HttpsError)
                    throw error_1;
                throw new https_1.HttpsError('internal', 'Failed to generate upload token');
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.generateUploadTokenHandler = generateUploadTokenHandler;
/**
 * Generate a signed URL for direct upload to Firebase Storage
 */
exports.generateUploadToken = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, exports.generateUploadTokenHandler);
/**
 * Confirm upload handler
 */
var confirmUploadHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, storagePath, token, tokenData, adminStorage, bucket, file, exists, downloadUrl, publicUrl, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                data = request.data, auth = request.auth;
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                storagePath = data.storagePath, token = data.token;
                if (!storagePath) {
                    throw new https_1.HttpsError('invalid-argument', 'storagePath is required');
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                tokenData = void 0;
                try {
                    tokenData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
                }
                catch (_b) {
                    throw new https_1.HttpsError('permission-denied', 'Invalid token');
                }
                if (tokenData.storagePath !== storagePath) {
                    throw new https_1.HttpsError('permission-denied', 'Token mismatch');
                }
                adminStorage = (0, init_1.getAdminStorage)();
                bucket = adminStorage.bucket();
                file = bucket.file(storagePath);
                return [4 /*yield*/, file.exists()];
            case 2:
                exists = (_a.sent())[0];
                if (!exists) {
                    throw new https_1.HttpsError('not-found', 'File not found');
                }
                return [4 /*yield*/, file.getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
                    })];
            case 3:
                downloadUrl = (_a.sent())[0];
                publicUrl = "https://firebasestorage.googleapis.com/v0/b/".concat(bucket.name, "/o/").concat(encodeURIComponent(storagePath), "?alt=media");
                firebase_functions_1.logger.info('[confirmUpload] Upload confirmed', {
                    userId: auth.uid,
                    storagePath: storagePath,
                });
                return [2 /*return*/, {
                        downloadUrl: downloadUrl,
                        publicUrl: publicUrl,
                    }];
            case 4:
                error_2 = _a.sent();
                if (error_2 instanceof https_1.HttpsError) {
                    throw error_2;
                }
                firebase_functions_1.logger.error('[confirmUpload] Error', {
                    userId: auth.uid,
                    storagePath: storagePath,
                    error: error_2,
                });
                throw new https_1.HttpsError('internal', 'Failed to confirm upload');
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.confirmUploadHandler = confirmUploadHandler;
/**
 * Confirm an upload and get the download URL
 */
exports.confirmUpload = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, exports.confirmUploadHandler);
/**
 * Delete file handler
 */
var deleteFileHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, storagePath, adminStorage, bucket, file, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                data = request.data, auth = request.auth;
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                storagePath = data.storagePath;
                if (!storagePath) {
                    throw new https_1.HttpsError('invalid-argument', 'storagePath is required');
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                // Verify user owns the file (path should contain user ID)
                if (!storagePath.includes("/".concat(auth.uid, "/")) && !storagePath.startsWith("".concat(auth.uid, "/"))) {
                    throw new https_1.HttpsError('permission-denied', 'You can only delete your own files');
                }
                adminStorage = (0, init_1.getAdminStorage)();
                bucket = adminStorage.bucket();
                file = bucket.file(storagePath);
                return [4 /*yield*/, file.delete()];
            case 2:
                _a.sent();
                firebase_functions_1.logger.info('[deleteFile] File deleted', {
                    userId: auth.uid,
                    storagePath: storagePath,
                });
                return [2 /*return*/, { success: true }];
            case 3:
                error_3 = _a.sent();
                firebase_functions_1.logger.error('[deleteFile] Error', {
                    userId: auth.uid,
                    storagePath: storagePath,
                    error: error_3,
                });
                if (error_3 instanceof https_1.HttpsError)
                    throw error_3;
                throw new https_1.HttpsError('internal', 'Failed to delete file');
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.deleteFileHandler = deleteFileHandler;
/**
 * Delete a file from Firebase Storage
 */
exports.deleteFile = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, exports.deleteFileHandler);
/**
 * List files handler
 */
var listUserFilesHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var data, auth, _a, folder, adminStorage, bucket, prefix, files, fileList, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                data = request.data, auth = request.auth;
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                _a = data.folder, folder = _a === void 0 ? 'uploads' : _a;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                adminStorage = (0, init_1.getAdminStorage)();
                bucket = adminStorage.bucket();
                prefix = "".concat(folder, "/").concat(auth.uid, "/");
                return [4 /*yield*/, bucket.getFiles({ prefix: prefix })];
            case 2:
                files = (_b.sent())[0];
                fileList = files.map(function (file) { return ({
                    name: file.name.split('/').pop() || file.name,
                    path: file.name,
                    size: typeof file.metadata.size === 'number'
                        ? file.metadata.size
                        : parseInt(String(file.metadata.size || '0'), 10),
                    contentType: file.metadata.contentType || 'unknown',
                    updatedAt: file.metadata.updated || new Date().toISOString(),
                }); });
                firebase_functions_1.logger.info('[listUserFiles] Files listed', {
                    userId: auth.uid,
                    count: fileList.length,
                });
                return [2 /*return*/, { files: fileList }];
            case 3:
                error_4 = _b.sent();
                firebase_functions_1.logger.error('[listUserFiles] Error', {
                    userId: auth.uid,
                    error: error_4,
                });
                if (error_4 instanceof https_1.HttpsError)
                    throw error_4;
                throw new https_1.HttpsError('internal', 'Failed to list files');
            case 4: return [2 /*return*/];
        }
    });
}); };
exports.listUserFilesHandler = listUserFilesHandler;
/**
 * List files owned by the user
 */
exports.listUserFiles = (0, https_1.onCall)({ cors: cors_1.CORS_ORIGINS }, exports.listUserFilesHandler);
