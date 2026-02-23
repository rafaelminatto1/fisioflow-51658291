"use strict";
// Types
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
exports.updateUserRole = exports.updateUserRoleHandler = exports.listUsers = exports.listUsersHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var init_1 = require("../init");
var firebase_functions_1 = require("firebase-functions");
/**
 * List all users with their roles (Admin only)
 */
/**
 * List all users with their roles (Admin only)
 */
var listUsersHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, db, callerProfileSnap, callerRole, users, authUsers, profilesSnap, profilesMap_1, _i, _a, user, profile, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                auth = request.auth;
                // 1. Security Check: Must be authenticated
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                db = (0, init_1.getAdminDb)();
                return [4 /*yield*/, db.collection('profiles').doc(auth.uid).get()];
            case 1:
                callerProfileSnap = _c.sent();
                callerRole = (_b = callerProfileSnap.data()) === null || _b === void 0 ? void 0 : _b.role;
                if (callerRole !== 'admin') {
                    throw new https_1.HttpsError('permission-denied', 'Only admins can list users');
                }
                _c.label = 2;
            case 2:
                _c.trys.push([2, 5, , 6]);
                users = [];
                return [4 /*yield*/, (0, init_1.getAdminAuth)().listUsers(1000)];
            case 3:
                authUsers = _c.sent();
                return [4 /*yield*/, db.collection('profiles').get()];
            case 4:
                profilesSnap = _c.sent();
                profilesMap_1 = new Map();
                profilesSnap.forEach(function (doc) {
                    profilesMap_1.set(doc.id, doc.data());
                });
                for (_i = 0, _a = authUsers.users; _i < _a.length; _i++) {
                    user = _a[_i];
                    profile = profilesMap_1.get(user.uid);
                    users.push({
                        uid: user.uid,
                        email: user.email || '',
                        displayName: user.displayName || (profile === null || profile === void 0 ? void 0 : profile.full_name) || 'No Name',
                        photoURL: user.photoURL || (profile === null || profile === void 0 ? void 0 : profile.avatar_url),
                        role: (profile === null || profile === void 0 ? void 0 : profile.role) || 'unknown',
                        organizationId: profile === null || profile === void 0 ? void 0 : profile.organization_id,
                        disabled: user.disabled,
                        metadata: {
                            creationTime: user.metadata.creationTime,
                            lastSignInTime: user.metadata.lastSignInTime,
                        }
                    });
                }
                return [2 /*return*/, { users: users }];
            case 5:
                error_1 = _c.sent();
                firebase_functions_1.logger.error('[listUsers] Error listing users:', error_1);
                throw new https_1.HttpsError('internal', 'Failed to list users');
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.listUsersHandler = listUsersHandler;
exports.listUsers = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
}, exports.listUsersHandler);
/**
 * Update a user's role (Admin only)
 */
/**
 * Update a user's role (Admin only)
 */
var updateUserRoleHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var auth, data, targetUserId, newRole, validRoles, db, callerProfileSnap, callerRole, error_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                auth = request.auth, data = request.data;
                // 1. Security Check
                if (!auth) {
                    throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
                }
                targetUserId = data.targetUserId, newRole = data.newRole;
                if (!targetUserId || !newRole) {
                    throw new https_1.HttpsError('invalid-argument', 'Missing targetUserId or newRole');
                }
                validRoles = ['admin', 'fisioterapeuta', 'estagiario', 'paciente', 'pending'];
                if (!validRoles.includes(newRole)) {
                    throw new https_1.HttpsError('invalid-argument', "Invalid role: ".concat(newRole));
                }
                db = (0, init_1.getAdminDb)();
                return [4 /*yield*/, db.collection('profiles').doc(auth.uid).get()];
            case 1:
                callerProfileSnap = _b.sent();
                callerRole = (_a = callerProfileSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
                if (callerRole !== 'admin') {
                    throw new https_1.HttpsError('permission-denied', 'Only admins can manage roles');
                }
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                // Update Firestore Profile
                return [4 /*yield*/, db.collection('profiles').doc(targetUserId).update({
                        role: newRole,
                        updated_at: new Date().toISOString()
                    })];
            case 3:
                // Update Firestore Profile
                _b.sent();
                // Optional: Set Custom Claim on Firebase Auth for faster client role checking
                // but for now relying on Firestore profile is consistent with current architecture
                firebase_functions_1.logger.info("[updateUserRole] Admin ".concat(auth.uid, " updated user ").concat(targetUserId, " to role ").concat(newRole));
                return [2 /*return*/, { success: true }];
            case 4:
                error_2 = _b.sent();
                firebase_functions_1.logger.error('[updateUserRole] Error updating role:', error_2);
                throw new https_1.HttpsError('internal', 'Failed to update user role');
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.updateUserRoleHandler = updateUserRoleHandler;
exports.updateUserRole = (0, https_1.onCall)({
    cors: true,
    region: 'southamerica-east1',
}, exports.updateUserRoleHandler);
