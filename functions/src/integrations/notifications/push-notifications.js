"use strict";
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
exports.sendPushNotificationToUser = sendPushNotificationToUser;
var expo_server_sdk_1 = require("expo-server-sdk");
var init_1 = require("../../init");
var expo = new expo_server_sdk_1.Expo();
var normalizeTokens = function (value) {
    if (!value)
        return [];
    if (typeof value === 'string') {
        return [value];
    }
    if (Array.isArray(value)) {
        return value
            .map(function (entry) { return (typeof entry === 'string' ? entry : entry === null || entry === void 0 ? void 0 : entry.token); })
            .filter(function (token) { return typeof token === 'string'; });
    }
    if (value.token && typeof value.token === 'string') {
        return [value.token];
    }
    return [];
};
function collectPushTokens(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, _a, userSnap, profileSnap, tokens_1, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    db = (0, init_1.getAdminDb)();
                    return [4 /*yield*/, Promise.all([
                            db.collection('users').doc(userId).get(),
                            db.collection('profiles').doc(userId).get(),
                        ])];
                case 1:
                    _a = _b.sent(), userSnap = _a[0], profileSnap = _a[1];
                    tokens_1 = new Set();
                    [userSnap, profileSnap].forEach(function (snap) {
                        if (!snap.exists)
                            return;
                        var data = snap.data();
                        var pushTokens = normalizeTokens(data === null || data === void 0 ? void 0 : data.pushTokens);
                        pushTokens.forEach(function (token) {
                            if (token)
                                tokens_1.add(token);
                        });
                    });
                    return [2 /*return*/, Array.from(tokens_1)];
                case 2:
                    error_1 = _b.sent();
                    console.error('[PushNotifications] Failed to collect tokens', error_1);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function sendPushNotificationToUser(userId, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var tokens, messages, invalidTokens, result, chunks, _loop_1, _i, chunks_1, chunk;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, collectPushTokens(userId)];
                case 1:
                    tokens = _a.sent();
                    messages = tokens
                        .filter(function (token) { return expo_server_sdk_1.Expo.isExpoPushToken(token); })
                        .map(function (token) {
                        var _a;
                        return ({
                            to: token,
                            title: payload.title,
                            body: payload.body,
                            data: payload.data,
                            sound: (_a = payload.sound) !== null && _a !== void 0 ? _a : 'default',
                        });
                    });
                    invalidTokens = tokens.filter(function (token) { return !expo_server_sdk_1.Expo.isExpoPushToken(token); });
                    result = {
                        successCount: 0,
                        failureCount: 0,
                        invalidTokens: invalidTokens,
                        errors: [],
                    };
                    if (messages.length === 0) {
                        return [2 /*return*/, result];
                    }
                    chunks = expo.chunkPushNotifications(messages);
                    _loop_1 = function (chunk) {
                        var tickets, error_2;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, expo.sendPushNotificationsAsync(chunk)];
                                case 1:
                                    tickets = _b.sent();
                                    tickets.forEach(function (ticket, index) {
                                        var _a;
                                        if (ticket.status === 'ok') {
                                            result.successCount += 1;
                                        }
                                        else {
                                            result.failureCount += 1;
                                            var errorMessage = ((_a = ticket.details) === null || _a === void 0 ? void 0 : _a.error) ? ticket.details.error : 'unknown';
                                            result.errors.push(errorMessage);
                                            var token = chunk[index].to;
                                            if (typeof token === 'string') {
                                                result.invalidTokens.push(token);
                                            }
                                        }
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_2 = _b.sent();
                                    console.error('[PushNotifications] Chunk failed', error_2);
                                    result.failureCount += chunk.length;
                                    result.errors.push(error_2.message);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, chunks_1 = chunks;
                    _a.label = 2;
                case 2:
                    if (!(_i < chunks_1.length)) return [3 /*break*/, 5];
                    chunk = chunks_1[_i];
                    return [5 /*yield**/, _loop_1(chunk)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, result];
            }
        });
    });
}
