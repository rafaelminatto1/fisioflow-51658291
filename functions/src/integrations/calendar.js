"use strict";
/**
 * Google Calendar Integration
 *
 * Sincronização de agendamentos com Google Calendar
 *
 * @module integrations/calendar
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
exports.syncIntegration = exports.syncIntegrationHandler = exports.getGoogleAuthUrl = exports.getGoogleAuthUrlHandler = exports.disconnectGoogleCalendar = exports.disconnectGoogleCalendarHandler = exports.connectGoogleCalendar = exports.connectGoogleCalendarHandler = exports.exportToICal = exports.exportToICalCallableHandler = exports.exportToICalHandler = exports.importFromGoogleCalendar = exports.importFromGoogleCalendarHandler = exports.syncToGoogleCalendar = exports.syncToGoogleCalendarHandler = void 0;
// Configuração do Google Calendar
var https_1 = require("firebase-functions/v2/https");
var admin = require("firebase-admin");
var firebase_admin_1 = require("firebase-admin");
var googleapis_1 = require("googleapis");
var google_auth_library_1 = require("google-auth-library");
var logger = require("firebase-functions/logger");
var cors_1 = require("../lib/cors");
var CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
var syncToGoogleCalendarHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, appointmentId, _b, action, appointmentDoc, appointment, patientDoc, patient, therapistDoc, therapist, tokensDoc, tokens, oauth2Client, credentials, calendar, dateTime_1, _c, hours, minutes, endTime, googleEventId, event_1, response, event_2, error_1;
    var _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, appointmentId = _a.appointmentId, _b = _a.action, action = _b === void 0 ? 'create' : _b;
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('appointments')
                        .doc(appointmentId)
                        .get()];
            case 1:
                appointmentDoc = _g.sent();
                if (!appointmentDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Agendamento não encontrado');
                }
                appointment = appointmentDoc.data();
                if (!(appointment === null || appointment === void 0 ? void 0 : appointment.date) || !(appointment === null || appointment === void 0 ? void 0 : appointment.startTime)) {
                    throw new https_1.HttpsError('failed-precondition', 'Agendamento sem data ou horário inicial');
                }
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('patients')
                        .doc(appointment === null || appointment === void 0 ? void 0 : appointment.patientId)
                        .get()];
            case 2:
                patientDoc = _g.sent();
                if (!patientDoc.exists) {
                    throw new https_1.HttpsError('not-found', 'Paciente não encontrado');
                }
                patient = patientDoc.data();
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('users')
                        .doc(appointment === null || appointment === void 0 ? void 0 : appointment.therapistId)
                        .get()];
            case 3:
                therapistDoc = _g.sent();
                therapist = therapistDoc.data();
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_oauth_tokens')
                        .doc(appointment === null || appointment === void 0 ? void 0 : appointment.therapistId)
                        .get()];
            case 4:
                tokensDoc = _g.sent();
                if (!tokensDoc.exists || !((_e = (_d = tokensDoc.data()) === null || _d === void 0 ? void 0 : _d.google) === null || _e === void 0 ? void 0 : _e.refresh_token)) {
                    throw new https_1.HttpsError('failed-precondition', 'Google Calendar não conectado. Conecte sua conta nas configurações.');
                }
                tokens = (_f = tokensDoc.data()) === null || _f === void 0 ? void 0 : _f.google;
                _g.label = 5;
            case 5:
                _g.trys.push([5, 19, , 22]);
                oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, tokens.redirect_uri);
                oauth2Client.setCredentials({
                    refresh_token: tokens.refresh_token,
                });
                return [4 /*yield*/, oauth2Client.refreshAccessToken()];
            case 6:
                credentials = (_g.sent()).credentials;
                oauth2Client.setCredentials(credentials);
                calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                dateTime_1 = new Date(appointment.date);
                _c = appointment.startTime.split(':'), hours = _c[0], minutes = _c[1];
                dateTime_1.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                endTime = appointment.endTime
                    ? (function () {
                        var _a = appointment.endTime.split(':'), endHours = _a[0], endMinutes = _a[1];
                        var endDateTime = new Date(dateTime_1);
                        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
                        return endDateTime.toISOString();
                    })()
                    : (function () {
                        var endDateTime = new Date(dateTime_1);
                        endDateTime.setHours(dateTime_1.getHours() + 1);
                        return endDateTime.toISOString();
                    })();
                googleEventId = null;
                if (!(action === 'create')) return [3 /*break*/, 9];
                event_1 = {
                    summary: "Fisioterapia - ".concat((patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name)),
                    description: generateEventDescription({ appointment: appointment, patient: patient, therapist: therapist }),
                    start: {
                        dateTime: dateTime_1.toISOString(),
                        timeZone: 'America/Sao_Paulo',
                    },
                    end: {
                        dateTime: endTime,
                        timeZone: 'America/Sao_Paulo',
                    },
                    location: (therapist === null || therapist === void 0 ? void 0 : therapist.clinicAddress) || (therapist === null || therapist === void 0 ? void 0 : therapist.organizationName) || 'FisioFlow',
                    attendees: [
                        { email: therapist === null || therapist === void 0 ? void 0 : therapist.email },
                        { email: patient === null || patient === void 0 ? void 0 : patient.email },
                    ].filter(function (a) { return a.email; }),
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'email', minutes: 24 * 60 }, // 24 horas antes
                            { method: 'email', minutes: 60 }, // 1 hora antes
                        ],
                    },
                    extendedProperties: {
                        private: {
                            appointmentId: appointmentId,
                            patientId: appointment === null || appointment === void 0 ? void 0 : appointment.patientId,
                            source: 'fisioflow',
                        },
                    },
                };
                return [4 /*yield*/, calendar.events.insert({
                        calendarId: CALENDAR_ID,
                        requestBody: event_1,
                        conferenceDataVersion: 1,
                    })];
            case 7:
                response = _g.sent();
                googleEventId = response.data.id || null;
                // Salvar ID do evento no Firestore
                return [4 /*yield*/, appointmentDoc.ref.update({
                        googleCalendarEventId: googleEventId,
                        syncedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 8:
                // Salvar ID do evento no Firestore
                _g.sent();
                logger.info("Event created in Google Calendar: ".concat(googleEventId, " for appointment: ").concat(appointmentId));
                return [3 /*break*/, 16];
            case 9:
                if (!(action === 'update')) return [3 /*break*/, 13];
                event_2 = {
                    summary: "Fisioterapia - ".concat((patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name)),
                    description: generateEventDescription({ appointment: appointment, patient: patient, therapist: therapist }),
                    start: {
                        dateTime: dateTime_1.toISOString(),
                        timeZone: 'America/Sao_Paulo',
                    },
                    end: {
                        dateTime: endTime,
                        timeZone: 'America/Sao_Paulo',
                    },
                };
                if (!(appointment === null || appointment === void 0 ? void 0 : appointment.googleCalendarEventId)) return [3 /*break*/, 12];
                return [4 /*yield*/, calendar.events.update({
                        calendarId: CALENDAR_ID,
                        eventId: appointment.googleCalendarEventId,
                        requestBody: event_2,
                    })];
            case 10:
                _g.sent();
                googleEventId = appointment.googleCalendarEventId;
                return [4 /*yield*/, appointmentDoc.ref.update({
                        syncedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 11:
                _g.sent();
                _g.label = 12;
            case 12: return [3 /*break*/, 16];
            case 13:
                if (!(action === 'delete')) return [3 /*break*/, 16];
                if (!(appointment === null || appointment === void 0 ? void 0 : appointment.googleCalendarEventId)) return [3 /*break*/, 16];
                return [4 /*yield*/, calendar.events.delete({
                        calendarId: CALENDAR_ID,
                        eventId: appointment.googleCalendarEventId,
                    })];
            case 14:
                _g.sent();
                return [4 /*yield*/, appointmentDoc.ref.update({
                        googleCalendarEventId: null,
                        syncDeletedAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    })];
            case 15:
                _g.sent();
                _g.label = 16;
            case 16:
                if (!(credentials.refresh_token !== tokens.refresh_token)) return [3 /*break*/, 18];
                return [4 /*yield*/, tokensDoc.ref.update({
                        'google.refresh_token': credentials.refresh_token,
                        'google.access_token': credentials.access_token,
                        'google.expiry_date': credentials.expiry_date,
                    })];
            case 17:
                _g.sent();
                _g.label = 18;
            case 18: return [2 /*return*/, {
                    success: true,
                    googleEventId: googleEventId,
                }];
            case 19:
                error_1 = _g.sent();
                logger.error('Google Calendar sync error:', error_1);
                if (!(error_1.code === 401)) return [3 /*break*/, 21];
                // Token inválido - remover tokens
                return [4 /*yield*/, tokensDoc.ref.update({
                        'google': null,
                    })];
            case 20:
                // Token inválido - remover tokens
                _g.sent();
                throw new https_1.HttpsError('unauthenticated', 'Sessão do Google Calendar expirou. Por favor, reconecte sua conta.');
            case 21: throw new https_1.HttpsError('internal', "Erro ao sincronizar com Google Calendar: ".concat(error_1.message));
            case 22: return [2 /*return*/];
        }
    });
}); };
exports.syncToGoogleCalendarHandler = syncToGoogleCalendarHandler;
exports.syncToGoogleCalendar = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, exports.syncToGoogleCalendarHandler);
/**
 * Cloud Function: Importar eventos do Google Calendar (listar para o usuário)
 * Retorna lista de eventos no período; o frontend pode exibir e opcionalmente confirmar import.
 */
var importFromGoogleCalendarHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, calendarIdParam, db, tokensDoc, tokens, oauth2Client, credentials, calendar, calendarId, timeMin, timeMax, response, events, error_2;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, startDate = _a.startDate, endDate = _a.endDate, calendarIdParam = _a.calendarId;
                if (!startDate || !endDate) {
                    throw new https_1.HttpsError('invalid-argument', 'startDate e endDate são obrigatórios');
                }
                db = (0, firebase_admin_1.firestore)();
                return [4 /*yield*/, db.collection('user_oauth_tokens').doc(request.auth.uid).get()];
            case 1:
                tokensDoc = _e.sent();
                if (!tokensDoc.exists || !((_c = (_b = tokensDoc.data()) === null || _b === void 0 ? void 0 : _b.google) === null || _c === void 0 ? void 0 : _c.refresh_token)) {
                    throw new https_1.HttpsError('failed-precondition', 'Google Calendar não conectado. Conecte sua conta nas configurações.');
                }
                tokens = (_d = tokensDoc.data()) === null || _d === void 0 ? void 0 : _d.google;
                _e.label = 2;
            case 2:
                _e.trys.push([2, 5, , 6]);
                oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, tokens.redirect_uri);
                oauth2Client.setCredentials({ refresh_token: tokens.refresh_token });
                return [4 /*yield*/, oauth2Client.refreshAccessToken()];
            case 3:
                credentials = (_e.sent()).credentials;
                oauth2Client.setCredentials(credentials);
                calendar = googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
                calendarId = calendarIdParam || CALENDAR_ID;
                timeMin = new Date(startDate).toISOString();
                timeMax = new Date(endDate).toISOString();
                return [4 /*yield*/, calendar.events.list({
                        calendarId: calendarId,
                        timeMin: timeMin,
                        timeMax: timeMax,
                        singleEvents: true,
                        orderBy: 'startTime',
                        maxResults: 250,
                    })];
            case 4:
                response = _e.sent();
                events = (response.data.items || []).map(function (ev) {
                    var _a, _b, _c, _d;
                    return ({
                        id: ev.id,
                        summary: ev.summary || '(Sem título)',
                        description: ev.description || null,
                        start: ((_a = ev.start) === null || _a === void 0 ? void 0 : _a.dateTime) || ((_b = ev.start) === null || _b === void 0 ? void 0 : _b.date) || null,
                        end: ((_c = ev.end) === null || _c === void 0 ? void 0 : _c.dateTime) || ((_d = ev.end) === null || _d === void 0 ? void 0 : _d.date) || null,
                        location: ev.location || null,
                        htmlLink: ev.htmlLink || null,
                    });
                });
                return [2 /*return*/, {
                        success: true,
                        events: events,
                        calendarId: calendarId,
                    }];
            case 5:
                error_2 = _e.sent();
                logger.error('importFromGoogleCalendar error:', error_2);
                if (error_2.code === 401) {
                    throw new https_1.HttpsError('unauthenticated', 'Sessão do Google Calendar expirou. Por favor, reconecte sua conta.');
                }
                throw new https_1.HttpsError('internal', "Erro ao importar eventos: ".concat(error_2.message));
            case 6: return [2 /*return*/];
        }
    });
}); };
exports.importFromGoogleCalendarHandler = importFromGoogleCalendarHandler;
exports.importFromGoogleCalendar = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, exports.importFromGoogleCalendarHandler);
/**
 * Cloud Function: Exportar agenda para iCal (callable - mantém tipo para deploy)
 */
function buildICalData(userId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var appointmentsSnapshot, iCalData, _i, _a, doc, apt, patient, dateTime, _b, hours, minutes, endDateTime;
        var _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('appointments')
                        .where('therapistId', '==', userId)
                        .where('date', '>=', startDate)
                        .where('date', '<=', endDate)
                        .where('status', 'in', ['agendado', 'confirmado'])
                        .orderBy('date')
                        .get()];
                case 1:
                    appointmentsSnapshot = _g.sent();
                    if (appointmentsSnapshot.empty) {
                        return [2 /*return*/, {
                                success: true,
                                iCalData: 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FisioFlow//Calendar//EN\nEND:VCALENDAR',
                                filename: "fisioflow_agenda_".concat(new Date().toISOString().split('T')[0], ".ics"),
                            }];
                    }
                    iCalData = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FisioFlow//Calendar//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n';
                    _i = 0, _a = appointmentsSnapshot.docs;
                    _g.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    doc = _a[_i];
                    apt = doc.data();
                    return [4 /*yield*/, (0, firebase_admin_1.firestore)().collection('patients').doc(apt.patientId).get()];
                case 3:
                    patient = _g.sent();
                    dateTime = new Date(apt.date);
                    _b = apt.startTime.split(':'), hours = _b[0], minutes = _b[1];
                    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    endDateTime = new Date(dateTime);
                    endDateTime.setHours(dateTime.getHours() + 1);
                    iCalData += 'BEGIN:VEVENT\n';
                    iCalData += "UID:".concat(doc.id, "@fisioflow.app\n");
                    iCalData += "DTSTAMP:".concat(formatDateForICal(new Date(((_d = (_c = apt.createdAt) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date())), "\n");
                    iCalData += "DTSTART:".concat(formatDateForICal(dateTime), "\n");
                    iCalData += "DTEND:".concat(formatDateForICal(endDateTime), "\n");
                    iCalData += "SUMMARY:Fisioterapia - ".concat(((_e = patient.data()) === null || _e === void 0 ? void 0 : _e.fullName) || ((_f = patient.data()) === null || _f === void 0 ? void 0 : _f.name), "\n");
                    iCalData += "DESCRIPTION:Tipo: ".concat(apt.type, "\n");
                    iCalData += "LOCATION:".concat(apt.room || 'A definir', "\n");
                    iCalData += 'END:VEVENT\n';
                    _g.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    iCalData += 'END:VCALENDAR';
                    return [2 /*return*/, {
                            success: true,
                            iCalData: iCalData,
                            filename: "fisioflow_agenda_".concat(new Date().toISOString().split('T')[0], ".ics"),
                        }];
            }
        });
    });
}
var exportToICalHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var authHeader, decodedToken, _a, startDate, endDate, result, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'GET');
                res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                if (req.method === 'OPTIONS') {
                    res.status(204).send('');
                    return [2 /*return*/];
                }
                authHeader = req.headers.authorization;
                if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
                    res.status(401).json({ error: 'Unauthorized' });
                    return [2 /*return*/];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, admin.auth().verifyIdToken(authHeader.substring(7))];
            case 2:
                decodedToken = _b.sent();
                _a = (req.query || req.body || {}), startDate = _a.startDate, endDate = _a.endDate;
                if (!startDate || !endDate) {
                    res.status(400).json({ error: 'startDate and endDate are required' });
                    return [2 /*return*/];
                }
                return [4 /*yield*/, buildICalData(decodedToken.uid, startDate, endDate)];
            case 3:
                result = _b.sent();
                res.json(result);
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                logger.error('exportToICal error:', error_3);
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.exportToICalHandler = exportToICalHandler;
var exportToICalCallableHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate;
    return __generator(this, function (_b) {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
        }
        _a = (request.data || {}), startDate = _a.startDate, endDate = _a.endDate;
        if (!startDate || !endDate) {
            throw new https_1.HttpsError('invalid-argument', 'startDate and endDate are required');
        }
        return [2 /*return*/, buildICalData(request.auth.uid, startDate, endDate)];
    });
}); };
exports.exportToICalCallableHandler = exportToICalCallableHandler;
exports.exportToICal = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, exports.exportToICalCallableHandler);
/**
 * Cloud Function: Conectar Google Calendar (OAuth)
 */
var connectGoogleCalendarHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, code, redirectUri, oauth2Client, tokens, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                _a = request.data, code = _a.code, redirectUri = _a.redirectUri;
                oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, oauth2Client.getToken(code)];
            case 2:
                tokens = (_b.sent()).tokens;
                // Salvar tokens no Firestore
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_oauth_tokens')
                        .doc(request.auth.uid)
                        .set({
                        google: {
                            access_token: tokens.access_token,
                            refresh_token: tokens.refresh_token,
                            scope: tokens.scope,
                            token_type: tokens.token_type,
                            expiry_date: tokens.expiry_date,
                            redirect_uri: redirectUri,
                            connected_at: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        },
                    })];
            case 3:
                // Salvar tokens no Firestore
                _b.sent();
                logger.info("Google Calendar connected for user: ".concat(request.auth.uid));
                return [2 /*return*/, {
                        success: true,
                    }];
            case 4:
                error_4 = _b.sent();
                logger.error('Google Calendar connection error:', error_4);
                throw new https_1.HttpsError('internal', "Erro ao conectar Google Calendar: ".concat(error_4.message));
            case 5: return [2 /*return*/];
        }
    });
}); };
exports.connectGoogleCalendarHandler = connectGoogleCalendarHandler;
exports.connectGoogleCalendar = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, exports.connectGoogleCalendarHandler);
/**
 * Cloud Function: Desconectar Google Calendar
 */
var disconnectGoogleCalendarHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                // Remover tokens
                return [4 /*yield*/, (0, firebase_admin_1.firestore)()
                        .collection('user_oauth_tokens')
                        .doc(request.auth.uid)
                        .update({
                        google: null,
                    })];
            case 1:
                // Remover tokens
                _a.sent();
                logger.info("Google Calendar disconnected for user: ".concat(request.auth.uid));
                return [2 /*return*/, {
                        success: true,
                    }];
        }
    });
}); };
exports.disconnectGoogleCalendarHandler = disconnectGoogleCalendarHandler;
exports.disconnectGoogleCalendar = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, exports.disconnectGoogleCalendarHandler);
/**
 * Cloud Function: Obter URL de autorização OAuth
 */
var getGoogleAuthUrlHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var scopes, oauth2Client, authUrl;
    return __generator(this, function (_a) {
        if (!request.auth) {
            throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
        }
        scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];
        oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, "".concat(process.env.PUBLIC_URL, "/settings/integrations/callback"));
        authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(' '),
            prompt: 'consent',
            state: request.auth.uid,
        });
        return [2 /*return*/, {
                success: true,
                authUrl: authUrl,
            }];
    });
}); };
exports.getGoogleAuthUrlHandler = getGoogleAuthUrlHandler;
exports.getGoogleAuthUrl = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, exports.getGoogleAuthUrlHandler);
/**
 * Cloud Function: Sincronizar integração (persiste last_sync_at e sync_status)
 * Para google_calendar: atualiza status; sync real de eventos é feito por syncToGoogleCalendar por agendamento.
 */
var syncIntegrationHandler = function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, db, profileSnap, organizationId, now, statusRef;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!request.auth) {
                    throw new https_1.HttpsError('unauthenticated', 'Usuário não autenticado');
                }
                provider = request.data.provider;
                if (!provider) {
                    throw new https_1.HttpsError('invalid-argument', 'provider é obrigatório');
                }
                db = (0, firebase_admin_1.firestore)();
                return [4 /*yield*/, db.collection('profiles').doc(request.auth.uid).get()];
            case 1:
                profileSnap = _b.sent();
                organizationId = (_a = profileSnap.data()) === null || _a === void 0 ? void 0 : _a.organization_id;
                if (!organizationId) {
                    throw new https_1.HttpsError('failed-precondition', 'Perfil sem organização');
                }
                now = new Date();
                statusRef = db
                    .collection('organizations')
                    .doc(organizationId)
                    .collection('integration_status')
                    .doc(provider);
                return [4 /*yield*/, statusRef.set({
                        last_sync_at: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                        sync_status: 'synced',
                        updated_by: request.auth.uid,
                        updated_at: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true })];
            case 2:
                _b.sent();
                logger.info("Integration sync recorded: ".concat(provider, " for org ").concat(organizationId));
                return [2 /*return*/, {
                        last_sync_at: now.toISOString(),
                        sync_status: 'synced',
                    }];
        }
    });
}); };
exports.syncIntegrationHandler = syncIntegrationHandler;
exports.syncIntegration = (0, https_1.onCall)({
    cors: cors_1.CORS_ORIGINS,
    memory: '256MiB',
    maxInstances: 1,
}, exports.syncIntegrationHandler);
// ============================================================================================
// HELPER FUNCTIONS
// ============================================================================================
/**
 * Gera descrição do evento para o Google Calendar
 */
function generateEventDescription(params) {
    var appointment = params.appointment, patient = params.patient, therapist = params.therapist;
    return "\nFisioFlow - Sess\u00E3o de Fisioterapia\n\nPaciente: ".concat((patient === null || patient === void 0 ? void 0 : patient.fullName) || (patient === null || patient === void 0 ? void 0 : patient.name), "\nEmail: ").concat((patient === null || patient === void 0 ? void 0 : patient.email) || 'Não informado', "\nTelefone: ").concat((patient === null || patient === void 0 ? void 0 : patient.phone) || 'Não informado', "\n\nTipo: ").concat(appointment === null || appointment === void 0 ? void 0 : appointment.type, "\nSala: ").concat((appointment === null || appointment === void 0 ? void 0 : appointment.room) || 'A definir', "\n\nFisioterapeuta: ").concat((therapist === null || therapist === void 0 ? void 0 : therapist.displayName) || (therapist === null || therapist === void 0 ? void 0 : therapist.fullName), "\nCl\u00EDnica: ").concat((therapist === null || therapist === void 0 ? void 0 : therapist.organizationName) || 'FisioFlow', "\n\n---\nEste evento foi sincronizado automaticamente pelo FisioFlow.\n  ").trim();
}
/**
 * Formata data para formato iCal
 */
function formatDateForICal(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
