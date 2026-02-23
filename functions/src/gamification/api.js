"use strict";
/**
 * Gamification API Functions
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
exports.processPurchase = exports.getLeaderboard = void 0;
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var firebase_functions_1 = require("firebase-functions");
var db = admin.firestore();
/**
 * Get Leaderboard for a specific clinic (Organization)
 */
exports.getLeaderboard = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var organizationId, snapshot, leaderboard, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth)
                    throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
                organizationId = request.auth.token.organization_id;
                if (!organizationId)
                    throw new https_1.HttpsError('failed-precondition', 'User has no organization');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db.collection('gamification_profiles')
                        // Idealmente teríamos organization_id no profile para performance, 
                        // mas como são perfis de pacientes, vamos buscar os top XP gerais 
                        // e filtrar ou assumir escopo global/clínica.
                        .orderBy('total_points', 'desc')
                        .limit(20)
                        .get()];
            case 2:
                snapshot = _a.sent();
                leaderboard = snapshot.docs.map(function (doc, index) {
                    var _a;
                    var data = doc.data();
                    // Anonimização parcial para LGPD
                    return {
                        rank: index + 1,
                        patientId: doc.id,
                        level: data.level,
                        xp: data.total_points,
                        streak: data.current_streak,
                        isCurrentUser: doc.id === ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)
                    };
                });
                return [2 /*return*/, { success: true, leaderboard: leaderboard }];
            case 3:
                error_1 = _a.sent();
                firebase_functions_1.logger.error('Error fetching leaderboard', error_1);
                throw new https_1.HttpsError('internal', 'Failed to fetch leaderboard');
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Process a purchase in the Reward Shop
 */
exports.processPurchase = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, itemId, cost, userId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth)
                    throw new https_1.HttpsError('unauthenticated', 'User must be logged in');
                _a = request.data, itemId = _a.itemId, cost = _a.cost;
                userId = request.auth.uid;
                return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                        var profileRef, profileSnap, profileData, purchaseRef;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    profileRef = db.collection('gamification_profiles').doc(userId);
                                    return [4 /*yield*/, transaction.get(profileRef)];
                                case 1:
                                    profileSnap = _a.sent();
                                    if (!profileSnap.exists)
                                        throw new https_1.HttpsError('not-found', 'Profile not found');
                                    profileData = profileSnap.data();
                                    if (profileData.total_points < cost) {
                                        throw new https_1.HttpsError('failed-precondition', 'Insufficient points');
                                    }
                                    // Deduct points
                                    transaction.update(profileRef, {
                                        total_points: admin.firestore.FieldValue.increment(-cost),
                                        updated_at: new Date().toISOString()
                                    });
                                    purchaseRef = db.collection('inventory').doc();
                                    transaction.set(purchaseRef, {
                                        id: purchaseRef.id,
                                        patient_id: userId,
                                        item_id: itemId,
                                        purchased_at: new Date().toISOString(),
                                        status: 'available',
                                        voucher_code: Math.random().toString(36).substr(2, 8).toUpperCase()
                                    });
                                    return [2 /*return*/, { success: true, voucherCode: purchaseRef.id }];
                            }
                        });
                    }); })];
            case 1: return [2 /*return*/, _b.sent()];
        }
    });
}); });
