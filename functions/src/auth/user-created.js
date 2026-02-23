"use strict";
/**
 * Trigger fired when a new user is created in Firebase Auth.
 * Creates the user profile in Firestore with 'pending' role.
 * Notifies the admin about the new registration.
 *
 * Updated to Cloud Functions (2nd Gen)
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
exports.onUserCreated = void 0;
var functionsV1 = require("firebase-functions/v1");
var logger_1 = require("../lib/logger");
var init_1 = require("../init");
var admin = require("firebase-admin");
exports.onUserCreated = functionsV1.auth.user().onCreate(function (user) { return __awaiter(void 0, void 0, void 0, function () {
    var db, pool, DEFAULT_ORG_ID, ADMIN_EMAIL, maskedEmail, maskedUid, profileRef, profileSnap, organizationId, orgQuery, now, fullName, claimError_1, sqlError_1, notificationRef, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!user) {
                    logger_1.logger.error('[onUserCreated] No user data found');
                    return [2 /*return*/];
                }
                db = (0, init_1.getAdminDb)();
                pool = (0, init_1.getPool)();
                DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
                ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fisioflow.com.br';
                _a.label = 1;
            case 1:
                _a.trys.push([1, 16, , 17]);
                maskedEmail = user.email ? user.email.split('@')[0].substring(0, 3) + '***@' + user.email.split('@')[1] : '***';
                maskedUid = user.uid.substring(0, 8) + '...';
                logger_1.logger.info("[onUserCreated] Creating profile for user: ".concat(maskedUid, " (").concat(maskedEmail, ")"));
                profileRef = db.collection('profiles').doc(user.uid);
                return [4 /*yield*/, profileRef.get()];
            case 2:
                profileSnap = _a.sent();
                organizationId = DEFAULT_ORG_ID;
                if (!!profileSnap.exists) return [3 /*break*/, 4];
                return [4 /*yield*/, db.collection('organizations')
                        .where('active', '==', true)
                        .limit(1)
                        .get()];
            case 3:
                orgQuery = _a.sent();
                if (!orgQuery.empty) {
                    organizationId = orgQuery.docs[0].id;
                }
                _a.label = 4;
            case 4:
                now = new Date().toISOString();
                fullName = user.displayName || 'Novo Usuário';
                _a.label = 5;
            case 5:
                _a.trys.push([5, 7, , 8]);
                return [4 /*yield*/, admin.auth().setCustomUserClaims(user.uid, {
                        role: 'pending',
                        organizationId: organizationId,
                        isProfessional: false,
                        isAdmin: false
                    })];
            case 6:
                _a.sent();
                logger_1.logger.info("[onUserCreated] Initial claims set for ".concat(user.uid));
                return [3 /*break*/, 8];
            case 7:
                claimError_1 = _a.sent();
                logger_1.logger.error("[onUserCreated] Failed to set initial claims:", claimError_1);
                return [3 /*break*/, 8];
            case 8:
                _a.trys.push([8, 10, , 11]);
                return [4 /*yield*/, pool.query("INSERT INTO profiles (\n                    user_id,\n                    organization_id,\n                    full_name,\n                    email,\n                    role,\n                    email_verified,\n                    is_active,\n                    avatar_url,\n                    created_at,\n                    updated_at\n                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())\n                ON CONFLICT (user_id) DO NOTHING", [
                        user.uid,
                        organizationId,
                        fullName,
                        user.email,
                        'pending', // Default role
                        user.emailVerified || false,
                        true, // is_active
                        user.photoURL || null
                    ])];
            case 9:
                _a.sent();
                logger_1.logger.info("[onUserCreated] Profile synced to PostgreSQL for ".concat(user.uid));
                return [3 /*break*/, 11];
            case 10:
                sqlError_1 = _a.sent();
                logger_1.logger.error("[onUserCreated] Failed to sync profile to PostgreSQL:", sqlError_1);
                return [3 /*break*/, 11];
            case 11:
                if (!!profileSnap.exists) return [3 /*break*/, 13];
                return [4 /*yield*/, profileRef.set({
                        user_id: user.uid,
                        full_name: fullName,
                        email: user.email,
                        role: 'pending', // DEFAULT ROLE IS NOW PENDING
                        email_verified: user.emailVerified || false,
                        avatar_url: user.photoURL || null,
                        organization_id: organizationId,
                        is_active: true,
                        created_at: now,
                        updated_at: now,
                        onboarding_completed: false
                    })];
            case 12:
                _a.sent();
                logger_1.logger.info("[onUserCreated] Profile created in Firestore for ".concat(user.uid));
                return [3 /*break*/, 14];
            case 13:
                logger_1.logger.info("[onUserCreated] Profile already exists in Firestore for ".concat(user.uid, ", skipping creation."));
                _a.label = 14;
            case 14:
                notificationRef = db.collection('notifications').doc();
                return [4 /*yield*/, notificationRef.set({
                        user_id: 'SYSTEM', // System notification
                        target_user_email: ADMIN_EMAIL, // Who receives it
                        type: 'USER_REGISTRATION',
                        title: 'Novo Usuário Cadastrado',
                        body: "Usu\u00E1rio ".concat(user.email, " se cadastrou e aguarda aprova\u00E7\u00E3o."),
                        metadata: {
                            new_user_id: user.uid,
                            new_user_email: user.email
                        },
                        status: 'pending',
                        created_at: now,
                        channel: 'email'
                    })];
            case 15:
                _a.sent();
                logger_1.logger.info("[onUserCreated] Admin notification queued for ".concat(ADMIN_EMAIL));
                return [3 /*break*/, 17];
            case 16:
                error_1 = _a.sent();
                logger_1.logger.error("[onUserCreated] Error processing new user ".concat(user.uid, ":"), error_1);
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
