"use strict";
/**
 * HTTP endpoint to fix user organization_id
 *
 * Usage: curl -X POST "https://REGION-PROJECT.cloudfunctions.net/fixUserOrganization?key=YOUR_API_KEY&email=user@email.com"
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
exports.fixUserOrganization = void 0;
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-admin/firestore");
var auth_1 = require("firebase-admin/auth");
var init_1 = require("../init");
exports.fixUserOrganization = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 60,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, email, db, auth, pool, uid, userRecord, e_1, profileRef, orgResult, organization, firstOrgResult, error_1;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
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
                email = req.query.email || ((_a = req.body) === null || _a === void 0 ? void 0 : _a.email);
                if (!email || typeof email !== 'string') {
                    res.status(400).json({ error: 'Email is required' });
                    return [2 /*return*/];
                }
                db = (0, firestore_1.getFirestore)();
                auth = (0, auth_1.getAuth)();
                pool = (0, init_1.getPool)();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 13, , 14]);
                console.log("\uD83D\uDD27 Fixing organization for user email: ".concat(email));
                uid = void 0;
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                return [4 /*yield*/, auth.getUserByEmail(email)];
            case 3:
                userRecord = _b.sent();
                uid = userRecord.uid;
                console.log("Found UID: ".concat(uid));
                return [3 /*break*/, 5];
            case 4:
                e_1 = _b.sent();
                res.status(404).json({ error: 'User not found in Auth' });
                return [2 /*return*/];
            case 5:
                profileRef = db.collection('profiles').doc(uid);
                return [4 /*yield*/, pool.query("\n      SELECT id, name FROM organizations\n      WHERE is_default = true\n      LIMIT 1\n    ")];
            case 6:
                orgResult = _b.sent();
                organization = void 0;
                if (!(orgResult.rows.length === 0)) return [3 /*break*/, 8];
                return [4 /*yield*/, pool.query("\n        SELECT id, name FROM organizations\n        ORDER BY created_at ASC\n        LIMIT 1\n      ")];
            case 7:
                firstOrgResult = _b.sent();
                if (firstOrgResult.rows.length === 0) {
                    res.status(404).json({ error: 'No organization found in database' });
                    return [2 /*return*/];
                }
                organization = firstOrgResult.rows[0];
                return [3 /*break*/, 9];
            case 8:
                organization = orgResult.rows[0];
                _b.label = 9;
            case 9:
                console.log('Target Organization:', organization);
                // 3. Update/Create profile in Firestore
                return [4 /*yield*/, profileRef.set({
                        organization_id: organization.id,
                        organization_name: organization.name,
                        email: email,
                        updated_at: new Date().toISOString()
                    }, { merge: true })];
            case 10:
                // 3. Update/Create profile in Firestore
                _b.sent();
                // 4. Update/Create profile in PostgreSQL
                return [4 /*yield*/, pool.query("\n      INSERT INTO profiles (user_id, organization_id, email, is_active, created_at, updated_at)\n      VALUES ($1, $2, $3, true, NOW(), NOW())\n      ON CONFLICT (user_id) DO UPDATE \n      SET organization_id = $2, updated_at = NOW()\n    ", [uid, organization.id, email])];
            case 11:
                // 4. Update/Create profile in PostgreSQL
                _b.sent();
                // 5. Set Custom Claims
                return [4 /*yield*/, auth.setCustomUserClaims(uid, {
                        organizationId: organization.id
                    })];
            case 12:
                // 5. Set Custom Claims
                _b.sent();
                console.log("\u2705 Fixed profile for ".concat(email, " (").concat(uid, ") -> Org: ").concat(organization.id));
                res.json({
                    success: true,
                    message: 'User organization fixed successfully',
                    data: {
                        uid: uid,
                        email: email,
                        organization_id: organization.id,
                        organization_name: organization.name,
                    },
                    timestamp: new Date().toISOString(),
                });
                return [3 /*break*/, 14];
            case 13:
                error_1 = _b.sent();
                console.error('❌ Error fixing user organization:', error_1);
                res.status(500).json({
                    success: false,
                    error: (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || String(error_1),
                });
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
