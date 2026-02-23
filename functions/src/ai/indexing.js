"use strict";
/**
 * Cloud Functions para Indexação de Embeddings
 *
 * Indexa evoluções existentes para busca semântica
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
exports.getIndexingStats = exports.onEvolutionCreated = exports.removeEvolutionEmbedding = exports.reindexPatientEvolutions = exports.indexEvolution = exports.indexExistingEvolutions = void 0;
var functions = require("firebase-functions/v2");
var admin = require("firebase-admin");
var google_auth_library_1 = require("google-auth-library");
// Inicializar Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}
// Criar cliente de autenticação
var authClient = new google_auth_library_1.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
/**
 * Gera embedding para um texto SOAP usando Vertex AI REST API
 */
function generateSOAPEmbedding(evolution) {
    return __awaiter(this, void 0, void 0, function () {
        var text, projectId, accessToken, response, error, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    text = [
                        evolution.subjective || '',
                        evolution.objective || '',
                        evolution.assessment || '',
                        evolution.plan || '',
                    ].filter(Boolean).join('\n');
                    projectId = process.env.GCP_PROJECT || 'fisioflow-migration';
                    return [4 /*yield*/, getAccessToken()];
                case 1:
                    accessToken = _a.sent();
                    return [4 /*yield*/, fetch("https://us-central1-aiplatform.googleapis.com/v1/projects/".concat(projectId, "/locations/us-central1/publishers/google/models/text-embedding-004:predict"), {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(accessToken),
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                instances: [
                                    {
                                        content: text,
                                    },
                                ],
                                parameters: {
                                    autoTruncate: true,
                                },
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    error = _a.sent();
                    throw new Error("Vertex AI error: ".concat(error));
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    data = _a.sent();
                    return [2 /*return*/, data.predictions[0].embeddings.values];
            }
        });
    });
}
/**
 * Obtém access token para autenticação
 */
function getAccessToken() {
    return __awaiter(this, void 0, void 0, function () {
        var accessToken;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, authClient.getAccessToken()];
                case 1:
                    accessToken = _a.sent();
                    return [2 /*return*/, accessToken || ''];
            }
        });
    });
}
/**
 * Indexa evoluções sem embedding (roda diariamente às 2 AM)
 */
exports.indexExistingEvolutions = functions.scheduler.onSchedule({
    schedule: '0 2 * * *', // 2 AM diário
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1, // Mínimo 0.5 para memória > 512MiB
    timeoutSeconds: 540, // 9 minutos
}, function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var db, snapshot, success, failed, batch, _i, _a, doc, evolution, embedding, ref, error_1, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                functions.logger.info('[Indexing] Iniciando indexação de evoluções');
                db = admin.firestore();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 10, , 11]);
                return [4 /*yield*/, db
                        .collection('evolutions')
                        .where('embedding', '==', null)
                        .limit(100)
                        .get()];
            case 2:
                snapshot = _b.sent();
                if (snapshot.empty) {
                    functions.logger.info('[Indexing] Nenhuma evolução para indexar');
                    return [2 /*return*/];
                }
                functions.logger.info("[Indexing] Encontradas ".concat(snapshot.size, " evolu\u00E7\u00F5es para indexar"));
                success = 0;
                failed = 0;
                batch = db.batch();
                _i = 0, _a = snapshot.docs;
                _b.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 8];
                doc = _a[_i];
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 7]);
                evolution = doc.data();
                return [4 /*yield*/, generateSOAPEmbedding({
                        subjective: evolution.subjective,
                        objective: evolution.objective,
                        assessment: evolution.assessment,
                        plan: evolution.plan,
                    })];
            case 5:
                embedding = _b.sent();
                ref = db.collection('evolutions').doc(doc.id);
                batch.update(ref, {
                    embedding: embedding,
                    embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    embeddingVersion: 1,
                });
                success++;
                return [3 /*break*/, 7];
            case 6:
                error_1 = _b.sent();
                functions.logger.error("[Indexing] Erro ao indexar evolu\u00E7\u00E3o ".concat(doc.id, ":"), error_1);
                failed++;
                return [3 /*break*/, 7];
            case 7:
                _i++;
                return [3 /*break*/, 3];
            case 8: 
            // Commit batch (max 500 operações)
            return [4 /*yield*/, batch.commit()];
            case 9:
                // Commit batch (max 500 operações)
                _b.sent();
                functions.logger.info("[Indexing] Conclu\u00EDdo: ".concat(success, " sucessos, ").concat(failed, " falhas"));
                return [3 /*break*/, 11];
            case 10:
                error_2 = _b.sent();
                functions.logger.error('[Indexing] Erro na indexação:', error_2);
                throw error_2;
            case 11: return [2 /*return*/];
        }
    });
}); });
/**
 * Indexa uma evolução específica (callable)
 */
exports.indexEvolution = functions.https.onCall({
    region: 'southamerica-east1',
    memory: '512MiB',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var evolutionId, db, doc, evolution, embedding, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                evolutionId = request.data.evolutionId;
                if (!evolutionId) {
                    throw new functions.https.HttpsError('invalid-argument', 'evolutionId is required');
                }
                functions.logger.info("[Indexing] Indexando evolu\u00E7\u00E3o ".concat(evolutionId));
                db = admin.firestore();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, db.collection('evolutions').doc(evolutionId).get()];
            case 2:
                doc = _a.sent();
                if (!doc.exists) {
                    throw new functions.https.HttpsError('not-found', 'Evolution not found');
                }
                evolution = doc.data();
                if (!evolution) {
                    throw new functions.https.HttpsError('not-found', 'Evolution data not found');
                }
                return [4 /*yield*/, generateSOAPEmbedding({
                        subjective: evolution.subjective,
                        objective: evolution.objective,
                        assessment: evolution.assessment,
                        plan: evolution.plan,
                    })];
            case 3:
                embedding = _a.sent();
                // Atualizar
                return [4 /*yield*/, doc.ref.update({
                        embedding: embedding,
                        embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        embeddingVersion: 1,
                    })];
            case 4:
                // Atualizar
                _a.sent();
                functions.logger.info("[Indexing] Evolu\u00E7\u00E3o ".concat(evolutionId, " indexada com sucesso"));
                return [2 /*return*/, { success: true }];
            case 5:
                error_3 = _a.sent();
                functions.logger.error("[Indexing] Erro ao indexar evolu\u00E7\u00E3o ".concat(evolutionId, ":"), error_3);
                throw new functions.https.HttpsError('internal', 'Failed to index evolution');
            case 6: return [2 /*return*/];
        }
    });
}); });
/**
 * Reindexa todas as evoluções de um paciente
 */
exports.reindexPatientEvolutions = functions.https.onCall({
    region: 'southamerica-east1',
    memory: '512MiB',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var patientId, db, snapshot, success, failed, batch, _i, _a, doc, evolution, embedding, error_4, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                patientId = request.data.patientId;
                if (!patientId) {
                    throw new functions.https.HttpsError('invalid-argument', 'patientId is required');
                }
                if (!request.auth) {
                    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
                }
                functions.logger.info("[Indexing] Reindexando evolu\u00E7\u00F5es do paciente ".concat(patientId));
                db = admin.firestore();
                _b.label = 1;
            case 1:
                _b.trys.push([1, 10, , 11]);
                return [4 /*yield*/, db
                        .collection('evolutions')
                        .where('patientId', '==', patientId)
                        .get()];
            case 2:
                snapshot = _b.sent();
                if (snapshot.empty) {
                    functions.logger.info("[Indexing] Nenhuma evolu\u00E7\u00E3o encontrada para paciente ".concat(patientId));
                    return [2 /*return*/, { count: 0 }];
                }
                functions.logger.info("[Indexing] Encontradas ".concat(snapshot.size, " evolu\u00E7\u00F5es"));
                success = 0;
                failed = 0;
                batch = db.batch();
                _i = 0, _a = snapshot.docs;
                _b.label = 3;
            case 3:
                if (!(_i < _a.length)) return [3 /*break*/, 8];
                doc = _a[_i];
                _b.label = 4;
            case 4:
                _b.trys.push([4, 6, , 7]);
                evolution = doc.data();
                return [4 /*yield*/, generateSOAPEmbedding({
                        subjective: evolution.subjective,
                        objective: evolution.objective,
                        assessment: evolution.assessment,
                        plan: evolution.plan,
                    })];
            case 5:
                embedding = _b.sent();
                // Atualizar
                batch.update(doc.ref, {
                    embedding: embedding,
                    embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    embeddingVersion: 1,
                });
                success++;
                return [3 /*break*/, 7];
            case 6:
                error_4 = _b.sent();
                functions.logger.error("[Indexing] Erro ao indexar ".concat(doc.id, ":"), error_4);
                failed++;
                return [3 /*break*/, 7];
            case 7:
                _i++;
                return [3 /*break*/, 3];
            case 8: 
            // Commit
            return [4 /*yield*/, batch.commit()];
            case 9:
                // Commit
                _b.sent();
                functions.logger.info("[Indexing] Reindexa\u00E7\u00E3o conclu\u00EDda: ".concat(success, " sucessos, ").concat(failed, " falhas"));
                return [2 /*return*/, { count: success, failed: failed }];
            case 10:
                error_5 = _b.sent();
                functions.logger.error("[Indexing] Erro ao reindexar paciente ".concat(patientId, ":"), error_5);
                throw new functions.https.HttpsError('internal', 'Failed to reindex patient evolutions');
            case 11: return [2 /*return*/];
        }
    });
}); });
/**
 * Remove embedding de uma evolução (quando deletada)
 */
exports.removeEvolutionEmbedding = functions.https.onCall({
    region: 'southamerica-east1',
    memory: '256MiB',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var evolutionId, db, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                evolutionId = request.data.evolutionId;
                if (!evolutionId) {
                    throw new functions.https.HttpsError('invalid-argument', 'evolutionId is required');
                }
                db = admin.firestore();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db.collection('evolutions').doc(evolutionId).update({
                        embedding: null,
                        embeddingUpdatedAt: null,
                        embeddingVersion: null,
                    })];
            case 2:
                _a.sent();
                functions.logger.info("[Indexing] Embedding removido da evolu\u00E7\u00E3o ".concat(evolutionId));
                return [2 /*return*/, { success: true }];
            case 3:
                error_6 = _a.sent();
                functions.logger.error("[Indexing] Erro ao remover embedding ".concat(evolutionId, ":"), error_6);
                throw new functions.https.HttpsError('internal', 'Failed to remove embedding');
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Trigger automático ao criar evolução
 * NOTA: Para usar, configure o trigger no Firestore
 */
exports.onEvolutionCreated = functions.https.onCall({
    region: 'southamerica-east1',
    memory: '512MiB',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, evolutionId, evolution, embedding, db, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = request.data, evolutionId = _a.evolutionId, evolution = _a.evolution;
                if (!evolutionId || !evolution) {
                    throw new functions.https.HttpsError('invalid-argument', 'evolutionId and evolution are required');
                }
                functions.logger.info("[Indexing] Auto-indexando evolu\u00E7\u00E3o ".concat(evolutionId));
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, generateSOAPEmbedding(evolution)];
            case 2:
                embedding = _b.sent();
                db = admin.firestore();
                // Atualizar
                return [4 /*yield*/, db.collection('evolutions').doc(evolutionId).update({
                        embedding: embedding,
                        embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        embeddingVersion: 1,
                    })];
            case 3:
                // Atualizar
                _b.sent();
                functions.logger.info("[Indexing] Evolu\u00E7\u00E3o ".concat(evolutionId, " auto-indexada"));
                return [2 /*return*/, { success: true }];
            case 4:
                error_7 = _b.sent();
                functions.logger.error("[Indexing] Erro ao auto-indexar ".concat(evolutionId, ":"), error_7);
                // Não lança erro para não quebrar a criação da evolução
                return [2 /*return*/, { success: false, error: String(error_7) }];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Estatísticas de indexação
 */
exports.getIndexingStats = functions.https.onCall({
    region: 'southamerica-east1',
    memory: '256MiB',
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var db, totalSnapshot, total, indexedSnapshot, indexed, notIndexed, percentage, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!request.auth) {
                    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
                }
                db = admin.firestore();
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, db.collection('evolutions').count().get()];
            case 2:
                totalSnapshot = _a.sent();
                total = totalSnapshot.data().count;
                return [4 /*yield*/, db
                        .collection('evolutions')
                        .where('embedding', '!=', null)
                        .count()
                        .get()];
            case 3:
                indexedSnapshot = _a.sent();
                indexed = indexedSnapshot.data().count;
                notIndexed = total - indexed;
                percentage = total > 0 ? (indexed / total) * 100 : 0;
                return [2 /*return*/, {
                        total: total,
                        indexed: indexed,
                        notIndexed: notIndexed,
                        percentage: Math.round(percentage * 10) / 10,
                    }];
            case 4:
                error_8 = _a.sent();
                functions.logger.error('[Indexing] Erro ao buscar estatísticas:', error_8);
                throw new functions.https.HttpsError('internal', 'Failed to get indexing stats');
            case 5: return [2 /*return*/];
        }
    });
}); });
