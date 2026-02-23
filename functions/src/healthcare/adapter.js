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
exports.callImageProcessor = callImageProcessor;
exports.generateDicomToken = generateDicomToken;
exports.searchDicomStudies = searchDicomStudies;
exports.getDicomStoreUrl = getDicomStoreUrl;
var google_auth_library_1 = require("google-auth-library");
var PROJECT_ID = process.env.GCLOUD_PROJECT || 'fisioflow-production';
var LOCATION = 'southamerica-east1'; // ou us-central1
var DATASET_ID = 'fisioflow-medical-data';
var DICOM_STORE_ID = 'patient-exams';
var BASE_URL = "https://healthcare.googleapis.com/v1/projects/".concat(PROJECT_ID, "/locations/").concat(LOCATION, "/datasets/").concat(DATASET_ID, "/dicomStores/").concat(DICOM_STORE_ID);
var CLOUD_RUN_URL = 'https://image-processor-412418905255.us-central1.run.app';
// Inicializa autenticação com a conta de serviço padrão do Cloud Functions
var auth = new google_auth_library_1.GoogleAuth({
    scopes: [
        'https://www.googleapis.com/auth/cloud-healthcare',
        'https://www.googleapis.com/auth/cloud-platform'
    ],
});
/**
 * Chama o worker no Cloud Run para processar uma imagem DICOM
 */
function callImageProcessor(gcsPath) {
    return __awaiter(this, void 0, void 0, function () {
        var client, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, auth.getClient()];
                case 1:
                    client = _a.sent();
                    return [4 /*yield*/, client.request({
                            url: "".concat(CLOUD_RUN_URL, "/process-dicom"),
                            method: 'POST',
                            data: { gcs_path: gcsPath },
                        })];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, response.data];
            }
        });
    });
}
/**
 * Gera um token de acesso para o frontend usar (ex: OHIF Viewer)
 * Nota: Em produção, restrinja o escopo deste token!
 */
function generateDicomToken() {
    return __awaiter(this, void 0, void 0, function () {
        var client, token;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, auth.getClient()];
                case 1:
                    client = _a.sent();
                    return [4 /*yield*/, client.getAccessToken()];
                case 2:
                    token = _a.sent();
                    return [2 /*return*/, {
                            token: token.token,
                            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hora
                        }];
            }
        });
    });
}
/**
 * Busca estudos DICOM de um paciente específico
 */
function searchDicomStudies(patientId) {
    return __awaiter(this, void 0, void 0, function () {
        var client, url, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, auth.getClient()];
                case 1:
                    client = _a.sent();
                    url = "".concat(BASE_URL, "/dicomWeb/studies?PatientID=").concat(patientId);
                    return [4 /*yield*/, client.request({ url: url })];
                case 2:
                    response = _a.sent();
                    return [2 /*return*/, response.data];
            }
        });
    });
}
/**
 * URL base para configuração do visualizador no frontend
 */
function getDicomStoreUrl() {
    return BASE_URL;
}
