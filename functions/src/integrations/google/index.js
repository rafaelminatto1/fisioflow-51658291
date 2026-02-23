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
exports.createPatientDriveFolder = exports.listGoogleTemplates = exports.generateGoogleReport = exports.getBusinessReviews = exports.syncPatientCalendar = exports.createMeetLink = exports.googleAuthCallback = exports.getGoogleAuthUrl = exports.searchPlaces = void 0;
// Variáveis de Ambiente (Configurar no Google Cloud / .env)
var init_1 = require("../../init");
var https_1 = require("firebase-functions/v2/https");
var logger = require("firebase-functions/logger");
var googleapis_1 = require("googleapis");
var params_1 = require("firebase-functions/params");
var docs_service_1 = require("./docs.service");
var drive_service_1 = require("./drive.service");
var GOOGLE_CLIENT_ID = (0, params_1.defineString)('GOOGLE_CLIENT_ID', { default: '' });
var GOOGLE_CLIENT_SECRET = (0, params_1.defineString)('GOOGLE_CLIENT_SECRET', { default: '' });
var GOOGLE_MAPS_KEY = (0, params_1.defineString)('GOOGLE_MAPS_API_KEY', { default: '' });
/**
 * Helper to get OAuth2 client lazily
 */
function getOAuth2Client() {
    return new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID.value(), GOOGLE_CLIENT_SECRET.value(), 'https://fisioflow-migration.web.app/integrations/callback' // URL de redirecionamento
    );
}
/**
 * Helper to get services with tokens (mocked for demo, should fetch from DB)
 */
function getGoogleServices(request) {
    return __awaiter(this, void 0, void 0, function () {
        var accessToken;
        return __generator(this, function (_a) {
            accessToken = request.data.accessToken || 'mock-token';
            return [2 /*return*/, {
                    docs: new docs_service_1.DocsService(accessToken),
                    drive: new drive_service_1.DriveService(accessToken),
                }];
        });
    });
}
/**
 * 1. Autocomplete de Endereço (Google Places)
 * Protege sua API Key rodando no backend
 */
exports.searchPlaces = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var query, url, response, data, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                query = request.data.query;
                if (!query)
                    throw new https_1.HttpsError('invalid-argument', 'Query string required');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                url = "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=".concat(encodeURIComponent(query), "&key=").concat(GOOGLE_MAPS_KEY.value(), "&language=pt-BR");
                return [4 /*yield*/, fetch(url)];
            case 2:
                response = _a.sent();
                return [4 /*yield*/, response.json()];
            case 3:
                data = _a.sent();
                return [2 /*return*/, data.predictions];
            case 4:
                error_1 = _a.sent();
                logger.error('Error fetching places', error_1);
                throw new https_1.HttpsError('internal', 'Failed to fetch places');
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * 2. Gerar Link de Autenticação (Calendar & Meet & Business)
 */
exports.getGoogleAuthUrl = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var scopes, oauth2Client, url;
    return __generator(this, function (_a) {
        scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/business.manage', // Para Reviews
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/documents',
        ];
        oauth2Client = getOAuth2Client();
        url = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Importante para receber Refresh Token
            scope: scopes,
            prompt: 'consent' // Força gerar refresh token novo
        });
        return [2 /*return*/, { url: url }];
    });
}); });
/**
 * 3. Trocar Código por Token (Callback)
 */
exports.googleAuthCallback = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var code, oauth2Client, tokens, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                code = request.data.code;
                if (!code)
                    throw new https_1.HttpsError('invalid-argument', 'Code required');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                oauth2Client = getOAuth2Client();
                return [4 /*yield*/, oauth2Client.getToken(code)];
            case 2:
                tokens = (_a.sent()).tokens;
                // AQUI: Salvar tokens no banco Postgres (tabela user_integrations)
                // Simulação:
                logger.info('Tokens received', { hasRefreshToken: !!tokens.refresh_token });
                return [2 /*return*/, { success: true, tokens: tokens }];
            case 3:
                error_2 = _a.sent();
                logger.error('Auth error', error_2);
                throw new https_1.HttpsError('permission-denied', 'Failed to exchange token');
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 4. Criar Reunião no Google Meet
 */
exports.createMeetLink = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var oauth2Client, calendar, event_1, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                oauth2Client = getOAuth2Client();
                calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, calendar.events.insert({
                        calendarId: 'primary',
                        requestBody: {
                            summary: 'Consulta FisioFlow',
                            description: 'Atendimento via Telemedicina',
                            start: { dateTime: new Date().toISOString() },
                            end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
                            conferenceData: {
                                createRequest: {
                                    requestId: "meet-".concat(Date.now()),
                                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                                },
                            },
                        },
                        conferenceDataVersion: 1,
                    })];
            case 2:
                event_1 = _a.sent();
                return [2 /*return*/, {
                        meetLink: event_1.data.hangoutLink,
                        eventId: event_1.data.id
                    }];
            case 3:
                error_3 = _a.sent();
                logger.error('Meet creation error', error_3);
                return [2 /*return*/, { meetLink: 'https://meet.google.com/abc-defg-hij-mock' }];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 5. Sincronizar Calendário (Paciente - Unidirecional)
 */
exports.syncPatientCalendar = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, patientEmail, date, startTime, _b, duration, oauth2Client, calendar, startDateTime, endDateTime, event_2, error_4;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.data, patientEmail = _a.patientEmail, date = _a.date, startTime = _a.startTime, _b = _a.duration, duration = _b === void 0 ? 60 : _b;
                if (!patientEmail || !date || !startTime) {
                    throw new https_1.HttpsError('invalid-argument', 'Email, data e horário são obrigatórios');
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                oauth2Client = getOAuth2Client();
                calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                startDateTime = new Date("".concat(date, "T").concat(startTime, ":00"));
                endDateTime = new Date(startDateTime.getTime() + duration * 60000);
                event_2 = {
                    summary: 'Consulta de Fisioterapia - FisioFlow',
                    description: 'Seu agendamento foi confirmado. Para mais detalhes, acesse o app FisioFlow.',
                    start: {
                        dateTime: startDateTime.toISOString(),
                        timeZone: 'America/Sao_Paulo',
                    },
                    end: {
                        dateTime: endDateTime.toISOString(),
                        timeZone: 'America/Sao_Paulo',
                    },
                    attendees: [{ email: patientEmail }],
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'email', minutes: 24 * 60 },
                            { method: 'popup', minutes: 60 },
                        ],
                    },
                };
                return [4 /*yield*/, calendar.events.insert({
                        calendarId: 'primary',
                        requestBody: event_2,
                        sendUpdates: 'all',
                    })];
            case 2:
                _c.sent();
                return [2 /*return*/, { success: true }];
            case 3:
                error_4 = _c.sent();
                logger.error('Calendar sync error', error_4);
                return [2 /*return*/, { success: true, mock: true }];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 6. Buscar Reviews (Google Business)
 */
exports.getBusinessReviews = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var uid, db, profileQuery, organizationId, configSnap, config, placeId, url, response, data, reviews, error_5;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'O usuário deve estar autenticado.');
                }
                uid = request.auth.uid;
                db = (0, init_1.getAdminDb)();
                _d.label = 1;
            case 1:
                _d.trys.push([1, 6, , 7]);
                return [4 /*yield*/, db.collection('profiles')
                        .where('user_id', '==', uid)
                        .limit(1)
                        .get()];
            case 2:
                profileQuery = _d.sent();
                if (profileQuery.empty) {
                    throw new https_1.HttpsError('not-found', 'Perfil de usuário não encontrado.');
                }
                organizationId = profileQuery.docs[0].data().organization_id;
                if (!organizationId) {
                    throw new https_1.HttpsError('failed-precondition', 'Usuário não está vinculado a uma organização.');
                }
                return [4 /*yield*/, db.collection('marketing_configs')
                        .doc("".concat(organizationId, "_reviews"))
                        .get()];
            case 3:
                configSnap = _d.sent();
                if (!configSnap.exists) {
                    return [2 /*return*/, { reviews: [] }];
                }
                config = configSnap.data();
                placeId = config === null || config === void 0 ? void 0 : config.google_place_id;
                if (!placeId) {
                    logger.info("Nenhum Google Place ID configurado para a organiza\u00E7\u00E3o ".concat(organizationId));
                    return [2 /*return*/, { reviews: [] }];
                }
                url = "https://maps.googleapis.com/maps/api/place/details/json?place_id=".concat(placeId, "&fields=reviews,rating,user_ratings_total&key=").concat(GOOGLE_MAPS_KEY.value(), "&language=pt-BR");
                return [4 /*yield*/, fetch(url)];
            case 4:
                response = _d.sent();
                return [4 /*yield*/, response.json()];
            case 5:
                data = _d.sent();
                if (data.status !== 'OK') {
                    logger.error('Erro na API do Google Places', data);
                    throw new https_1.HttpsError('internal', "Erro do Google: ".concat(data.status));
                }
                reviews = (((_a = data.result) === null || _a === void 0 ? void 0 : _a.reviews) || []).map(function (r) { return ({
                    author: r.author_name,
                    rating: r.rating,
                    comment: r.text,
                    date: new Date(r.time * 1000).toISOString().split('T')[0],
                    profile_photo: r.profile_photo_url,
                    relative_time: r.relative_time_description
                }); });
                return [2 /*return*/, {
                        reviews: reviews,
                        rating: (_b = data.result) === null || _b === void 0 ? void 0 : _b.rating,
                        total_ratings: (_c = data.result) === null || _c === void 0 ? void 0 : _c.user_ratings_total
                    }];
            case 6:
                error_5 = _d.sent();
                if (error_5 instanceof https_1.HttpsError)
                    throw error_5;
                logger.error('Error fetching Google Business reviews', error_5);
                throw new https_1.HttpsError('internal', 'Falha ao buscar avaliações do Google.');
            case 7: return [2 /*return*/];
        }
    });
}); });
/**
 * 7. Gerar Relatório PDF via Google Docs
 */
exports.generateGoogleReport = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, templateId, patientName, data, folderId, _b, docs, drive, newDocName, copy, documentId, pdfBuffer, savedFile, error_6;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.data, templateId = _a.templateId, patientName = _a.patientName, data = _a.data, folderId = _a.folderId;
                if (!templateId || !patientName)
                    throw new https_1.HttpsError('invalid-argument', 'Missing templateId or patientName');
                _c.label = 1;
            case 1:
                _c.trys.push([1, 7, , 8]);
                return [4 /*yield*/, getGoogleServices(request)];
            case 2:
                _b = _c.sent(), docs = _b.docs, drive = _b.drive;
                newDocName = "Relat\u00F3rio - ".concat(patientName, " - ").concat(new Date().toLocaleDateString('pt-BR'));
                return [4 /*yield*/, docs.copyTemplate(templateId, newDocName)];
            case 3:
                copy = _c.sent();
                documentId = copy.id;
                return [4 /*yield*/, docs.replacePlaceholders(documentId, data)];
            case 4:
                _c.sent();
                return [4 /*yield*/, docs.exportToPdf(documentId)];
            case 5:
                pdfBuffer = _c.sent();
                return [4 /*yield*/, drive.saveToDrive(pdfBuffer, "".concat(newDocName, ".pdf"), folderId)];
            case 6:
                savedFile = _c.sent();
                return [2 /*return*/, {
                        success: true,
                        fileId: savedFile.id,
                        webViewLink: savedFile.webViewLink,
                        documentId: documentId
                    }];
            case 7:
                error_6 = _c.sent();
                logger.error('Report generation error', error_6);
                throw new https_1.HttpsError('internal', 'Failed to generate report');
            case 8: return [2 /*return*/];
        }
    });
}); });
/**
 * 8. Listar Templates de Documentos
 */
exports.listGoogleTemplates = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var drive, templates, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, getGoogleServices(request)];
            case 1:
                drive = (_a.sent()).drive;
                return [4 /*yield*/, drive.listTemplates(request.data.folderId)];
            case 2:
                templates = _a.sent();
                return [2 /*return*/, { templates: templates }];
            case 3:
                error_7 = _a.sent();
                logger.error('List templates error', error_7);
                throw new https_1.HttpsError('internal', 'Failed to list templates');
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * 9. Criar Pasta do Paciente no Drive
 */
exports.createPatientDriveFolder = (0, https_1.onCall)({ region: 'southamerica-east1', cors: true }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, parentId, drive, folder, error_8;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, name = _a.name, parentId = _a.parentId;
                if (!name)
                    throw new https_1.HttpsError('invalid-argument', 'Folder name required');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, getGoogleServices(request)];
            case 2:
                drive = (_b.sent()).drive;
                return [4 /*yield*/, drive.createFolder(name, parentId)];
            case 3:
                folder = _b.sent();
                return [2 /*return*/, { folderId: folder.id }];
            case 4:
                error_8 = _b.sent();
                logger.error('Folder creation error', error_8);
                throw new https_1.HttpsError('internal', 'Failed to create folder');
            case 5: return [2 /*return*/];
        }
    });
}); });
