"use strict";
/**
 * AI Scheduling Flow - Features de agendamento inteligente
 *
 * Fase 3: AI Scheduling Features
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
exports.waitlistPrioritizationFlow = exports.optimizeCapacityFlow = exports.predictNoShowFlow = exports.suggestOptimalSlotFlow = exports.getPatientPreferences = exports.checkSlotCapacity = exports.getPatientAppointmentHistory = void 0;
var zod_1 = require("zod");
var config_1 = require("../config");
var firestore_1 = require("firebase-admin/firestore");
// ============================================================================
// SCHEMAS
// ============================================================================
var SlotSuggestionSchema = zod_1.z.object({
    date: zod_1.z.string(),
    time: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    reason: zod_1.z.string(),
    alternatives: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string(),
        time: zod_1.z.string(),
    })).default([]),
});
var CapacityOptimizationSchema = zod_1.z.object({
    date: zod_1.z.string(),
    currentCapacity: zod_1.z.number(),
    recommendedCapacity: zod_1.z.number(),
    reason: zod_1.z.string(),
    expectedLoad: zod_1.z.string(), // 'low', 'medium', 'high', 'overload'
});
var WaitlistPrioritySchema = zod_1.z.object({
    waitlistEntryId: zod_1.z.string(),
    patientId: zod_1.z.string(),
    patientName: zod_1.z.string(),
    urgency: zod_1.z.enum(['low', 'medium', 'high', 'urgent']),
    waitingDays: zod_1.z.number(),
    score: zod_1.z.number(),
    suggestedSlot: zod_1.z.object({
        date: zod_1.z.string(),
        time: zod_1.z.string(),
    }).optional(),
});
// ============================================================================
// TOOLS
// ============================================================================
/**
 * Buscar histórico de agendamentos de um paciente
 */
exports.getPatientAppointmentHistory = config_1.ai.defineTool({
    name: 'getPatientAppointmentHistory',
    description: 'Busca o histórico de agendamentos de um paciente para análise de padrões',
    inputSchema: zod_1.z.object({
        patientId: zod_1.z.string(),
        limit: zod_1.z.number().min(1).max(100).default(30),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var db, historySnapshot, appointments, total, completed, noShows, noShowRate, timeSlots, hourCounts, mostCommonHours;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = (0, firestore_1.getFirestore)();
                return [4 /*yield*/, db
                        .collection('appointments')
                        .where('patientId', '==', input.patientId)
                        .orderBy('date', 'desc')
                        .limit(input.limit)
                        .get()];
            case 1:
                historySnapshot = _a.sent();
                appointments = historySnapshot.docs.map(function (doc) {
                    var data = doc.data();
                    return {
                        id: doc.id,
                        patientId: data === null || data === void 0 ? void 0 : data.patientId,
                        patientName: (data === null || data === void 0 ? void 0 : data.patientName) || '',
                        date: (data === null || data === void 0 ? void 0 : data.date) || '',
                        time: (data === null || data === void 0 ? void 0 : data.time) || '',
                        status: (data === null || data === void 0 ? void 0 : data.status) || '',
                        type: (data === null || data === void 0 ? void 0 : data.type) || '',
                        duration: (data === null || data === void 0 ? void 0 : data.duration) || 60,
                        createdAt: (data === null || data === void 0 ? void 0 : data.createdAt) || '',
                    };
                });
                total = appointments.length;
                completed = appointments.filter(function (a) { return a.status === 'confirmado' || a.status === 'concluido'; }).length;
                noShows = appointments.filter(function (a) { return a.status === 'nao_compareceu' || a.status === 'falta'; }).length;
                noShowRate = total > 0 ? (noShows / total) * 100 : 0;
                timeSlots = appointments.map(function (a) {
                    var hour = a.time.split(':').map(Number)[0];
                    return hour;
                });
                hourCounts = timeSlots.reduce(function (acc, hour) {
                    acc[hour] = (acc[hour] || 0) + 1;
                    return acc;
                }, {});
                mostCommonHours = Object.entries(hourCounts)
                    .sort(function (a, b) { return b[1] - a[1]; })
                    .slice(0, 3)
                    .map(function (_a) {
                    var hour = _a[0];
                    return hour;
                });
                return [2 /*return*/, {
                        appointments: appointments,
                        stats: {
                            total: total,
                            completed: completed,
                            noShows: noShows,
                            noShowRate: noShowRate,
                            mostCommonHours: mostCommonHours,
                            averageDuration: appointments.reduce(function (sum, a) { return sum + (a.duration || 60); }, 0) / total || 60,
                        },
                    }];
        }
    });
}); });
/**
 * Verificar disponibilidade de capacidade para um slot específico
 */
exports.checkSlotCapacity = config_1.ai.defineTool({
    name: 'checkSlotCapacity',
    description: 'Verifica a capacidade disponível e ocupação atual de um slot',
    inputSchema: zod_1.z.object({
        date: zod_1.z.string(),
        time: zod_1.z.string(),
        organizationId: zod_1.z.string(),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var db, capacityConfig, config, baseCapacity, appointmentsSnapshot, occupied;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = (0, firestore_1.getFirestore)();
                return [4 /*yield*/, db
                        .collection('schedule_capacity_config')
                        .where('organizationId', '==', input.organizationId)
                        .where('date', '==', input.date)
                        .get()];
            case 1:
                capacityConfig = _a.sent();
                if (capacityConfig.empty) {
                    // Fallback: capacidade padrão
                    return [2 /*return*/, {
                            capacity: 4,
                            occupied: 0,
                            available: 4,
                            isBlocked: false,
                        }];
                }
                config = capacityConfig.docs[0].data();
                baseCapacity = (config === null || config === void 0 ? void 0 : config.capacity) || 4;
                return [4 /*yield*/, db
                        .collection('appointments')
                        .where('organizationId', '==', input.organizationId)
                        .where('date', '==', input.date)
                        .where('time', '==', input.time)
                        .where('status', 'in', ['confirmado', 'agendado', 'em_andamento'])
                        .get()];
            case 2:
                appointmentsSnapshot = _a.sent();
                occupied = appointmentsSnapshot.size;
                return [2 /*return*/, {
                        capacity: baseCapacity,
                        occupied: occupied,
                        available: baseCapacity - occupied,
                        isBlocked: (config === null || config === void 0 ? void 0 : config.isBlocked) || false,
                    }];
        }
    });
}); });
/**
 * Obter preferências do paciente
 */
exports.getPatientPreferences = config_1.ai.defineTool({
    name: 'getPatientPreferences',
    description: 'Obtém as preferências de agendamento de um paciente',
    inputSchema: zod_1.z.object({
        patientId: zod_1.z.string(),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var db, patientDoc, patientData, appointmentsSnapshot, appointments, total, noShows, noShowRate, timeSlots, hourCounts, mostCommonHours;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = (0, firestore_1.getFirestore)();
                return [4 /*yield*/, db
                        .collection('patients')
                        .doc(input.patientId)
                        .get()];
            case 1:
                patientDoc = _a.sent();
                if (!patientDoc.exists) {
                    throw new Error('Patient not found');
                }
                patientData = patientDoc.data();
                return [4 /*yield*/, db
                        .collection('appointments')
                        .where('patientId', '==', input.patientId)
                        .limit(50)
                        .get()];
            case 2:
                appointmentsSnapshot = _a.sent();
                appointments = appointmentsSnapshot.docs.map(function (doc) { return doc.data(); });
                total = appointments.length;
                noShows = appointments.filter(function (a) {
                    return a.status === 'nao_compareceu' || a.status === 'falta';
                }).length;
                noShowRate = total > 0 ? (noShows / total) * 100 : 0;
                timeSlots = appointments.map(function (a) {
                    var hour = (a.time || '09:00').split(':').map(Number)[0];
                    return hour;
                });
                hourCounts = {};
                timeSlots.forEach(function (hour) {
                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                });
                mostCommonHours = Object.entries(hourCounts)
                    .sort(function (a, b) { return b[1] - a[1]; })
                    .slice(0, 5)
                    .map(function (_a) {
                    var h = _a[0];
                    return h;
                });
                return [2 /*return*/, {
                        patientId: input.patientId,
                        patientName: (patientData === null || patientData === void 0 ? void 0 : patientData.name) || '',
                        preferredDays: (patientData === null || patientData === void 0 ? void 0 : patientData.preferredDays) || [],
                        preferredTimes: (patientData === null || patientData === void 0 ? void 0 : patientData.preferredTimes) || [],
                        preferredTherapistId: patientData === null || patientData === void 0 ? void 0 : patientData.preferredTherapistId,
                        avoidTherapists: (patientData === null || patientData === void 0 ? void 0 : patientData.avoidTherapists) || [],
                        treatmentType: (patientData === null || patientData === void 0 ? void 0 : patientData.treatmentType) || '',
                        urgency: (patientData === null || patientData === void 0 ? void 0 : patientData.urgency) || 'medium',
                        noShowRate: noShowRate,
                        missedAppointmentsCount: noShows,
                        totalAppointmentsCount: total,
                        mostCommonHours: mostCommonHours,
                        lastVisitDate: patientData === null || patientData === void 0 ? void 0 : patientData.lastVisitDate,
                    }];
        }
    });
}); });
// ============================================================================
// FLOW: Suggest Optimal Slot
// ============================================================================
exports.suggestOptimalSlotFlow = config_1.ai.defineFlow({
    name: 'suggestOptimalSlot',
    inputSchema: zod_1.z.object({
        patientId: zod_1.z.string(),
        desiredDate: zod_1.z.string().optional(),
        treatmentType: zod_1.z.string().optional(),
        organizationId: zod_1.z.string(),
    }),
    outputSchema: zod_1.z.object({
        suggestions: zod_1.z.array(SlotSuggestionSchema),
        reasoning: zod_1.z.string(),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var preferences, prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, config_1.ai.run('getPatientPreferences', function () { return (0, exports.getPatientPreferences)(input); })];
            case 1:
                preferences = _a.sent();
                prompt = "Analise as prefer\u00EAncias do paciente e sugira os melhores hor\u00E1rios de agendamento.\n\nPaciente: ".concat(preferences.patientName, "\nTaxa de falta: ").concat(preferences.noShowRate.toFixed(1), "%\nHor\u00E1rios preferidos: ").concat(preferences.mostCommonHours.join(', '), "\nUrg\u00EAncia: ").concat(preferences.urgency, "\n\nRetorne at\u00E9 5 sugest\u00F5es com:\n- Data e hora no formato YYYY-MM-DDTHH:mm\n- N\u00EDvel de confian\u00E7a (0-1)\n- Justificativa breve");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        output: {
                            schema: zod_1.z.object({
                                suggestions: zod_1.z.array(zod_1.z.object({
                                    date: zod_1.z.string(),
                                    time: zod_1.z.string(),
                                    confidence: zod_1.z.number(),
                                    reason: zod_1.z.string(),
                                })),
                                reasoning: zod_1.z.string(),
                            }),
                        },
                    })];
            case 2:
                output = (_a.sent()).output;
                if (!output)
                    throw new Error("AI generation failed");
                return [2 /*return*/, {
                        suggestions: output.suggestions.map(function (s) { return ({
                            date: s.date,
                            time: s.time,
                            confidence: s.confidence,
                            reason: s.reason,
                            alternatives: output.suggestions
                                .filter(function (alt) { return alt.date !== s.date || alt.time !== s.time; })
                                .slice(0, 3)
                                .map(function (alt) { return ({
                                date: alt.date,
                                time: alt.time,
                            }); }),
                        }); }),
                        reasoning: output.reasoning,
                    }];
        }
    });
}); });
// ============================================================================
// FLOW: Predict No Show
// ============================================================================
exports.predictNoShowFlow = config_1.ai.defineFlow({
    name: 'predictNoShow',
    inputSchema: zod_1.z.object({
        patientId: zod_1.z.string(),
        appointmentDate: zod_1.z.string(),
        appointmentTime: zod_1.z.string(),
        organizationId: zod_1.z.string(),
    }),
    outputSchema: zod_1.z.object({
        prediction: zod_1.z.enum(['low', 'medium', 'high', 'very-high']),
        probability: zod_1.z.number().min(0).max(1),
        riskFactors: zod_1.z.array(zod_1.z.string()),
        recommendation: zod_1.z.string(),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var history, riskFactors, prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, config_1.ai.run('getPatientHistory', function () { return (0, exports.getPatientAppointmentHistory)({ patientId: input.patientId, limit: 50 }); })];
            case 1:
                history = _a.sent();
                riskFactors = [];
                if (history.stats.noShowRate > 20) {
                    riskFactors.push('Alta taxa histórica de não comparecimento');
                }
                prompt = "Analise o risco de n\u00E3o comparecimento para este agendamento:\n\nHist\u00F3rico do paciente:\n- Taxa de falta: ".concat(history.stats.noShowRate.toFixed(1), "%\n- Total de agendamentos: ").concat(history.stats.total, "\n- Agendamentos conclu\u00EDdos: ").concat(history.stats.completed, "\n\nAgendamento atual:\n- Data: ").concat(input.appointmentDate, "\n- Hora: ").concat(input.appointmentTime, "\n\nRetorne:\n1. N\u00EDvel de risco (low, medium, high, very-high)\n2. Probabilidade num\u00E9rica (0-1)\n3. Lista de fatores de risco\n4. Recomenda\u00E7\u00E3o de a\u00E7\u00E3o");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        output: {
                            schema: zod_1.z.object({
                                prediction: zod_1.z.enum(['low', 'medium', 'high', 'very-high']),
                                probability: zod_1.z.number(),
                                riskFactors: zod_1.z.array(zod_1.z.string()),
                                recommendation: zod_1.z.string(),
                            }),
                        },
                    })];
            case 2:
                output = (_a.sent()).output;
                if (!output)
                    throw new Error("AI generation failed");
                return [2 /*return*/, {
                        prediction: output.prediction,
                        probability: output.probability,
                        riskFactors: output.riskFactors,
                        recommendation: output.recommendation,
                    }];
        }
    });
}); });
// ============================================================================
// FLOW: Optimize Capacity
// ============================================================================
exports.optimizeCapacityFlow = config_1.ai.defineFlow({
    name: 'optimizeCapacity',
    inputSchema: zod_1.z.object({
        organizationId: zod_1.z.string(),
        date: zod_1.z.string(),
        currentCapacity: zod_1.z.number(),
    }),
    outputSchema: zod_1.z.object({
        recommendations: zod_1.z.array(CapacityOptimizationSchema),
        overallOptimization: zod_1.z.string(),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, output;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                prompt = "Analise a capacidade de agendamento e sugira otimiza\u00E7\u00F5es para a data ".concat(input.date, " com capacidade atual ").concat(input.currentCapacity, ".");
                return [4 /*yield*/, config_1.ai.generate({
                        model: config_1.gemini15Flash,
                        prompt: prompt,
                        output: {
                            schema: zod_1.z.object({
                                recommendations: zod_1.z.array(CapacityOptimizationSchema),
                                overallOptimization: zod_1.z.string(),
                            }),
                        },
                    })];
            case 1:
                output = (_a.sent()).output;
                if (!output)
                    throw new Error("AI generation failed");
                return [2 /*return*/, {
                        recommendations: output.recommendations,
                        overallOptimization: output.overallOptimization,
                    }];
        }
    });
}); });
// ============================================================================
// FLOW: Waitlist Prioritization
// ============================================================================
exports.waitlistPrioritizationFlow = config_1.ai.defineFlow({
    name: 'waitlistPrioritization',
    inputSchema: zod_1.z.object({
        organizationId: zod_1.z.string(),
        limit: zod_1.z.number().default(50),
        sortBy: zod_1.z.enum(['priority', 'waitingTime', 'mixed']).default('priority'),
        filterStatus: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    outputSchema: zod_1.z.object({
        rankedEntries: zod_1.z.array(WaitlistPrioritySchema),
        summary: zod_1.z.object({
            totalEntries: zod_1.z.number(),
            highPriority: zod_1.z.number(),
            mediumPriority: zod_1.z.number(),
            lowPriority: zod_1.z.number(),
        }),
    }),
}, function (input) { return __awaiter(void 0, void 0, void 0, function () {
    var db, query, snapshot, entries, sortedEntries, highPriority, mediumPriority, lowPriority;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                db = (0, firestore_1.getFirestore)();
                query = db
                    .collection('waitlist')
                    .where('organizationId', '==', input.organizationId)
                    .where('status', '==', 'pending');
                if (input.filterStatus.length > 0) {
                    query = query.where('urgency', 'in', input.filterStatus);
                }
                return [4 /*yield*/, query.limit(input.limit).get()];
            case 1:
                snapshot = _a.sent();
                return [4 /*yield*/, Promise.all(snapshot.docs.map(function (doc) { return __awaiter(void 0, void 0, void 0, function () {
                        var data, patientDoc, waitingDays, score, patientData;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    data = doc.data();
                                    return [4 /*yield*/, db.collection('patients').doc(data.patientId).get()];
                                case 1:
                                    patientDoc = _a.sent();
                                    waitingDays = Math.floor((Date.now() - new Date(data.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
                                    score = 0;
                                    // Pontuação por urgência
                                    switch (data.urgency || 'medium') {
                                        case 'urgent':
                                            score += 100;
                                            break;
                                        case 'high':
                                            score += 50;
                                            break;
                                        case 'medium':
                                            score += 10;
                                            break;
                                        case 'low':
                                            score += 5;
                                            break;
                                    }
                                    score += Math.min(waitingDays * 2, 60);
                                    patientData = patientDoc.exists ? patientDoc.data() : null;
                                    return [2 /*return*/, {
                                            waitlistEntryId: doc.id,
                                            patientId: data.patientId,
                                            patientName: (patientData === null || patientData === void 0 ? void 0 : patientData.name) || '',
                                            urgency: data.urgency || 'medium',
                                            waitingDays: waitingDays,
                                            score: score,
                                        }];
                            }
                        });
                    }); }))];
            case 2:
                entries = _a.sent();
                sortedEntries = entries.sort(function (a, b) { return b.score - a.score; });
                highPriority = entries.filter(function (e) { return e.urgency === 'urgent' || e.urgency === 'high'; }).length;
                mediumPriority = entries.filter(function (e) { return e.urgency === 'medium'; }).length;
                lowPriority = entries.filter(function (e) { return e.urgency === 'low'; }).length;
                return [2 /*return*/, {
                        rankedEntries: sortedEntries.map(function (e) { return ({
                            waitlistEntryId: e.waitlistEntryId,
                            patientId: e.patientId,
                            patientName: e.patientName,
                            urgency: e.urgency,
                            waitingDays: e.waitingDays,
                            score: e.score,
                        }); }),
                        summary: {
                            totalEntries: entries.length,
                            highPriority: highPriority,
                            mediumPriority: mediumPriority,
                            lowPriority: lowPriority,
                        },
                    }];
        }
    });
}); });
