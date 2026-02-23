"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateRolesToClaimsHandler = void 0;
var admin = require("firebase-admin");
var init_1 = require("../init");
/**
 * Migration: Move roles from Firestore 'profiles' collection to Auth Custom Claims.
 * This improves security and performance by avoiding extra Firestore reads.
 */
var migrateRolesToClaimsHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var bootstrapUid, auth, profilesRef, snapshot, results, updates;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                // Security check: Only admin can run this migration
                if (!((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin) && ((_d = (_c = request.auth) === null || _c === void 0 ? void 0 : _c.token) === null || _d === void 0 ? void 0 : _d.role) !== 'admin') {
                    bootstrapUid = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2';
                    if (((_e = request.auth) === null || _e === void 0 ? void 0 : _e.uid) !== bootstrapUid) {
                        throw new Error('Permission denied. Only admins can run this migration.');
                    }
                }
                auth = admin.auth();
                profilesRef = init_1.adminDb.collection('profiles');
                return [4 /*yield*/, profilesRef.limit(500).get()];
            case 1:
                snapshot = _f.sent();
                results = {
                    success: 0,
                    failed: 0,
                    skipped: 0,
                    errors: []
                };
                console.log("[Migration] Found ".concat(snapshot.size, " profiles to process."));
                updates = snapshot.docs.map(function (doc) { return __awaiter(void 0, void 0, void 0, function () {
                    var profile, uid, role, organizationId, userRecord, currentClaims, newClaims, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                profile = doc.data();
                                uid = doc.id;
                                role = profile.role;
                                organizationId = profile.organization_id;
                                if (!role) {
                                    results.skipped++;
                                    return [2 /*return*/];
                                }
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 4, , 5]);
                                return [4 /*yield*/, auth.getUser(uid)];
                            case 2:
                                userRecord = _a.sent();
                                currentClaims = userRecord.customClaims || {};
                                // Check if update is needed
                                if (currentClaims.role === role && currentClaims.organizationId === organizationId) {
                                    results.skipped++;
                                    return [2 /*return*/];
                                }
                                newClaims = __assign(__assign({}, currentClaims), { role: role, organizationId: organizationId || null, 
                                    // Add specific boolean flags for easier rules
                                    isProfessional: ['fisioterapeuta', 'estagiario', 'owner', 'admin'].includes(role), isAdmin: role === 'admin' || currentClaims.admin === true });
                                return [4 /*yield*/, auth.setCustomUserClaims(uid, newClaims)];
                            case 3:
                                _a.sent();
                                results.success++;
                                console.log("[Migration] Updated claims for user ".concat(uid, ": ").concat(role));
                                return [3 /*break*/, 5];
                            case 4:
                                error_1 = _a.sent();
                                console.error("[Migration] Error updating user ".concat(uid, ":"), error_1);
                                results.failed++;
                                results.errors.push({ uid: uid, error: error_1.message });
                                return [3 /*break*/, 5];
                            case 5: return [2 /*return*/];
                        }
                    });
                }); });
                return [4 /*yield*/, Promise.all(updates)];
            case 2:
                _f.sent();
                return [2 /*return*/, {
                        message: 'Migration completed',
                        stats: results
                    }];
        }
    });
}); };
exports.migrateRolesToClaimsHandler = migrateRolesToClaimsHandler;
