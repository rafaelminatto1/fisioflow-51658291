"use strict";
/**
 * Exercise Service Unificado - Fase 3 de Otimização
 *
 * Consolida múltiplas funções de exercícios em um único serviço
 * Reduz de 10 funções separadas para 1 função unificada
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exerciseService = exports.exerciseServiceHandler = void 0;
var https_1 = require("firebase-functions/v2/https");
var function_config_1 = require("../lib/function-config");
// ============================================================================
// EXERCISE HANDLERS IMPORT (Direct - no dynamic imports)
// ============================================================================
var exercises_1 = require("./exercises");
// ============================================================================
// UNIFIED EXERCISE SERVICE
// ============================================================================
/**
 * Exercise Service Unificado
 *
 * Uma única função que roteia para todos os handlers de exercícios
 * Ações disponíveis: list, get, searchSimilar, getCategories, getPrescribed,
 *                   log, create, update, delete, merge
 */
var exerciseServiceHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, action, params, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.data, action = _a.action, params = __rest(_a, ["action"]);
                if (!action) {
                    throw new Error('action é obrigatório');
                }
                _b = action;
                switch (_b) {
                    case 'list': return [3 /*break*/, 1];
                    case 'get': return [3 /*break*/, 3];
                    case 'searchSimilar': return [3 /*break*/, 5];
                    case 'getCategories': return [3 /*break*/, 7];
                    case 'getPrescribed': return [3 /*break*/, 9];
                    case 'log': return [3 /*break*/, 11];
                    case 'create': return [3 /*break*/, 13];
                    case 'update': return [3 /*break*/, 15];
                    case 'delete': return [3 /*break*/, 17];
                    case 'merge': return [3 /*break*/, 19];
                }
                return [3 /*break*/, 21];
            case 1: return [4 /*yield*/, (0, exercises_1.listExercisesHandler)({ data: params })];
            case 2: return [2 /*return*/, _c.sent()];
            case 3: return [4 /*yield*/, (0, exercises_1.getExerciseHandler)({ data: params })];
            case 4: return [2 /*return*/, _c.sent()];
            case 5: return [4 /*yield*/, (0, exercises_1.searchSimilarExercisesHandler)({ data: params })];
            case 6: return [2 /*return*/, _c.sent()];
            case 7: return [4 /*yield*/, (0, exercises_1.getExerciseCategoriesHandler)({ data: params })];
            case 8: return [2 /*return*/, _c.sent()];
            case 9: return [4 /*yield*/, (0, exercises_1.getPrescribedExercisesHandler)({ data: params })];
            case 10: return [2 /*return*/, _c.sent()];
            case 11: return [4 /*yield*/, (0, exercises_1.logExerciseHandler)({ data: params })];
            case 12: return [2 /*return*/, _c.sent()];
            case 13: return [4 /*yield*/, (0, exercises_1.createExerciseHandler)({ data: params })];
            case 14: return [2 /*return*/, _c.sent()];
            case 15: return [4 /*yield*/, (0, exercises_1.updateExerciseHandler)({ data: params })];
            case 16: return [2 /*return*/, _c.sent()];
            case 17: return [4 /*yield*/, (0, exercises_1.deleteExerciseHandler)({ data: params })];
            case 18: return [2 /*return*/, _c.sent()];
            case 19: return [4 /*yield*/, (0, exercises_1.mergeExercisesHandler)({ data: params })];
            case 20: return [2 /*return*/, _c.sent()];
            case 21: throw new Error("A\u00E7\u00E3o desconhecida: ".concat(action));
        }
    });
}); };
exports.exerciseServiceHandler = exerciseServiceHandler;
exports.exerciseService = (0, https_1.onCall)(function_config_1.STANDARD_FUNCTION, exports.exerciseServiceHandler);
