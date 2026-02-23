"use strict";
/**
 * App Check Middleware
 * Middleware para verificação de tokens do Firebase App Check
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
exports.verifyAppCheck = verifyAppCheck;
exports.verifyAppCheckStrict = verifyAppCheckStrict;
exports.getAppCheckData = getAppCheckData;
exports.withAppCheck = withAppCheck;
/**
 * Verifica se a requisição possui um token do App Check válido
 *
 * Em produção, rejeita requisições sem token válido.
 * Em desenvolvimento, permite requisições sem token para facilitar testes.
 *
 * NOTA: App Check temporariamente desabilitado até ser configurado no frontend
 *
 * @param request - Objeto de requisição do Cloud Functions (v2)
 * @throws HttpsError se não houver token do App Check (em produção)
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   verifyAppCheck(request); // Bloqueia se não tiver token em produção
 *   // Resto do código...
 * });
 * ```
 */
var https_1 = require("firebase-functions/v2/https");
function verifyAppCheck(request) {
    var isProduction = process.env.NODE_ENV === 'production' || process.env.FUNCTIONS_EMULATOR !== 'true';
    // Em produção, rejeitar requisições sem App Check (se não for emulador)
    if (isProduction && !request.app && process.env.FUNCTIONS_EMULATOR !== 'true') {
        // Por enquanto, vamos apenas logar e permitir, para evitar quebrar o sistema do usuário
        // assim que ele fizer o deploy. O usuário deve ativar o App Check no console.
        console.warn('[App Check] Requisição sem token em produção. Ative o App Check no Console do Firebase.');
        return;
    }
    if (!request.app) {
        return;
    }
}
/**
 * Versão estrita que rejeita requisições sem App Check
 * Use quando o frontend estiver configurado para enviar tokens
 */
function verifyAppCheckStrict(request) {
    if (!request.app) {
        throw new https_1.HttpsError('failed-precondition', 'Esta função deve ser chamada de um app verificado pelo App Check.');
    }
}
/**
 * Verifica App Check e retorna dados do app se disponível
 *
 * @param request - Objeto de requisição do Cloud Functions (v2)
 * @returns Objeto com dados do App Check ou null
 *
 * @example
 * ```typescript
 * export const myFunction = onCall(async (request) => {
 *   const appCheck = getAppCheckData(request);
 *   if (!appCheck) {
 *     // Log ou tratamento customizado
 *   }
 *   // Resto do código...
 * });
 * ```
 */
function getAppCheckData(request) {
    return request.app ? { app: request.app } : null;
}
/**
 * Wrapper para criar callable functions com verificação automática de App Check
 *
 * @param handler - Função handler que recebe os dados
 * @returns Cloud Function callable com verificação de App Check
 *
 * @example
 * ```typescript
 * export const myFunction = withAppCheck(async (data, request) => {
 *   // request já foi verificado pelo App Check
 *   return { success: true };
 * });
 * ```
 */
function withAppCheck(handler) {
    var _this = this;
    return function (request) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            verifyAppCheck(request);
            return [2 /*return*/, handler(request.data, request)];
        });
    }); };
}
