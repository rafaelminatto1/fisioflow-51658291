"use strict";
/**
 * Genkit Flow Wrappers
 *
 * Compatibility layer between existing Cloud Functions and new Genkit flows
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
exports.patientSummaryHandler = patientSummaryHandler;
exports.analyzeProgressHandler = analyzeProgressHandler;
exports.exerciseSuggestionHandler = exerciseSuggestionHandler;
exports.clinicalAnalysisHandler = clinicalAnalysisHandler;
exports.soapGenerationHandler = soapGenerationHandler;
exports.exerciseGeneratorHandler = exerciseGeneratorHandler;
var flows_1 = require("./flows");
var logger_1 = require("../lib/logger");
function patientSummaryHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        var result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!request.auth) {
                        throw new Error('Unauthorized');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, flows_1.patientExecutiveSummaryFlow)(request.data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
                case 3:
                    e_1 = _a.sent();
                    logger_1.logger.error('Genkit flow failed', e_1);
                    throw new Error('Summary generation failed');
                case 4: return [2 /*return*/];
            }
        });
    });
}
function analyzeProgressHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        var result, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!request.auth) {
                        throw new Error('Unauthorized');
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, flows_1.analyzePatientProgressFlow)(request.data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
                case 3:
                    e_2 = _a.sent();
                    logger_1.logger.error('Genkit flow failed', e_2);
                    throw new Error('Analysis failed');
                case 4: return [2 /*return*/];
            }
        });
    });
}
function exerciseSuggestionHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        var input, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    input = {
                        patientId: request.data.patientId,
                        goals: request.data.goals || [],
                        availableEquipment: request.data.availableEquipment || [],
                        treatmentPhase: request.data.treatmentPhase || 'initial',
                        painMap: request.data.painMap || {},
                        sessionCount: request.data.sessionCount || 0,
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, flows_1.exerciseSuggestionFlow)(input)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            data: result,
                        }];
                case 3:
                    error_1 = _a.sent();
                    console.error('[exerciseSuggestionHandler] Error:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message || 'Failed to generate exercise suggestions',
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function clinicalAnalysisHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        var input, result, redFlagResult, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    input = {
                        patientId: request.data.patientId,
                        currentSOAP: request.data.currentSOAP || {},
                        useGrounding: request.data.useGrounding || false,
                        treatmentDurationWeeks: request.data.treatmentDurationWeeks,
                        redFlagCheckOnly: request.data.redFlagCheckOnly || false,
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    result = void 0;
                    if (!input.redFlagCheckOnly) return [3 /*break*/, 3];
                    return [4 /*yield*/, (0, flows_1.redFlagCheckFlow)(input)];
                case 2:
                    redFlagResult = _a.sent();
                    result = {
                        redFlags: redFlagResult.redFlags,
                        hasRedFlags: redFlagResult.hasRedFlags,
                    };
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, flows_1.comprehensiveClinicalFlow)(input)];
                case 4:
                    result = _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/, {
                        success: true,
                        data: result,
                    }];
                case 6:
                    error_2 = _a.sent();
                    console.error('[clinicalAnalysisHandler] Error:', error_2);
                    return [2 /*return*/, {
                            success: false,
                            error: error_2.message || 'Failed to generate clinical analysis',
                        }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function soapGenerationHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        var input, result, error_3;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    input = {
                        patientContext: {
                            patientName: ((_a = request.data.patientContext) === null || _a === void 0 ? void 0 : _a.patientName) || 'Paciente',
                            condition: ((_b = request.data.patientContext) === null || _b === void 0 ? void 0 : _b.condition) || 'Não especificado',
                            sessionNumber: ((_c = request.data.patientContext) === null || _c === void 0 ? void 0 : _c.sessionNumber) || 1,
                        },
                        subjective: request.data.subjective,
                        objective: request.data.objective,
                        assistantNeeded: request.data.assistantNeeded || 'both',
                    };
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, flows_1.soapGenerationFlow)(input)];
                case 2:
                    result = _d.sent();
                    return [2 /*return*/, {
                            success: true,
                            soapNote: result,
                            timestamp: new Date().toISOString(),
                        }];
                case 3:
                    error_3 = _d.sent();
                    console.error('[soapGenerationHandler] Error:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            error: error_3.message || 'Failed to generate SOAP note',
                            timestamp: new Date().toISOString(),
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function exerciseGeneratorHandler(request) {
    return __awaiter(this, void 0, void 0, function () {
        var result, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, flows_1.generateExercisePlan)(request.data)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            data: result,
                        }];
                case 2:
                    error_4 = _a.sent();
                    console.error('[exerciseGeneratorHandler] Error:', error_4);
                    return [2 /*return*/, {
                            success: false,
                            error: error_4.message || 'Failed to generate exercise plan',
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
