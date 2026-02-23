"use strict";
/**
 * Publica atualizações no Firebase Realtime Database
 * Usado para sincronizar estado entre clientes via triggers
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.rtdb = exports.publishRealtime = void 0;
var admin = require("firebase-admin");
var logger_1 = require("./logger");
var publishRealtime = function (path, data) { return __awaiter(void 0, void 0, void 0, function () {
    var db, ref, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                db = admin.database();
                ref = db.ref(path);
                // Adiciona timestamp para garantir que o cliente perceba a mudança
                return [4 /*yield*/, ref.set({
                        data: data,
                        _timestamp: admin.database.ServerValue.TIMESTAMP
                    })];
            case 1:
                // Adiciona timestamp para garantir que o cliente perceba a mudança
                _a.sent();
                logger_1.logger.info("[RTDB] Published to ".concat(path));
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                logger_1.logger.error("[RTDB] Error publishing to ".concat(path, ":"), error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.publishRealtime = publishRealtime;
/**
 * Helpers específicos de domínio
 */
exports.rtdb = {
    // Atualiza a agenda de uma organização
    refreshAppointments: function (orgId) {
        return (0, exports.publishRealtime)("orgs/".concat(orgId, "/agenda/refresh_trigger"), { force: true });
    },
    // Atualiza a lista de pacientes (V1 - Firestore)
    refreshPatients: function (orgId) {
        return (0, exports.publishRealtime)("orgs/".concat(orgId, "/patients/refresh_trigger"), { force: true });
    },
    // Atualiza a lista de pacientes (V2 - Postgres)
    refreshPatientsV2: function (orgId) {
        return (0, exports.publishRealtime)("orgs/".concat(orgId, "/patients-v2/refresh_trigger"), { force: true });
    },
    // Adiciona item ao feed de atividades
    pushActivity: function (orgId, activity) {
        var db = admin.database();
        return db.ref("orgs/".concat(orgId, "/activity_feed")).push(__assign(__assign({}, activity), { timestamp: admin.database.ServerValue.TIMESTAMP }));
    }
};
