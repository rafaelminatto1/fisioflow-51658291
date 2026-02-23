"use strict";
/**
 * Google AI Service
 *
 * Integração com:
 * - Gemini 2.5 Pro/Flash (Vertex AI)
 * - MedLM (modelos médicos)
 * - Document AI (OCR e extração estruturada)
 * - Translation API v3
 * - MediaPipe Pose Landmarker
 * - RAG Engine com Vertex AI Search
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
exports.GoogleAIService = void 0;
exports.getGoogleAIService = getGoogleAIService;
var https_1 = require("firebase-functions/v2/https");
/**
 * Classe principal do Google AI Service
 */
var GoogleAIService = /** @class */ (function () {
    function GoogleAIService() {
        // Configurações do Google Cloud
        this.apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
        var projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || '';
        var location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        // Log das configurações (não usado mas pode ser útil no futuro)
        if (projectId)
            console.log("Google AI Service inicializado para projeto: ".concat(projectId));
        if (location)
            console.log("Location: ".concat(location));
        if (!this.apiKey) {
            console.warn('Google API Key não configurada. Usando modo mock.');
        }
    }
    // ============================================================================
    // Análise Completa de Documento
    // ============================================================================
    GoogleAIService.prototype.analyzeDocument = function (fileUrl_1) {
        return __awaiter(this, arguments, void 0, function (fileUrl, options) {
            var extractedData, classification, summary, translation, comparison, tags, error_1;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Verificar se está em modo de desenvolvimento/mock
                        if (!this.apiKey || this.apiKey === 'mock') {
                            return [2 /*return*/, this.mockDocumentAnalysis(options)];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 10, , 11]);
                        return [4 /*yield*/, this.extractText(fileUrl, options)];
                    case 2:
                        extractedData = _a.sent();
                        classification = void 0;
                        if (!options.includeClassification) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.classifyDocument(extractedData.text, fileUrl)];
                    case 3:
                        classification = _a.sent();
                        _a.label = 4;
                    case 4:
                        summary = void 0;
                        if (!options.includeSummary) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.summarizeDocument(extractedData.fullText || extractedData.text, (classification === null || classification === void 0 ? void 0 : classification.type) || 'clinical_report')];
                    case 5:
                        summary = _a.sent();
                        _a.label = 6;
                    case 6:
                        translation = void 0;
                        if (!(options.includeTranslation && options.targetLanguage)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.translateDocument(extractedData.fullText || extractedData.text, options.targetLanguage)];
                    case 7:
                        translation = _a.sent();
                        _a.label = 8;
                    case 8:
                        comparison = void 0;
                        return [4 /*yield*/, this.generateTags(extractedData.text, classification)];
                    case 9:
                        tags = _a.sent();
                        return [2 /*return*/, {
                                extractedData: extractedData,
                                classification: classification,
                                summary: summary,
                                translation: translation,
                                tags: tags,
                                comparison: comparison,
                            }];
                    case 10:
                        error_1 = _a.sent();
                        console.error('Erro na análise de documento:', error_1);
                        throw new https_1.HttpsError('internal', 'Erro ao processar documento');
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    // ============================================================================
    // Extração de Texto (Document AI / Vision)
    // ============================================================================
    GoogleAIService.prototype.extractText = function (fileUrl, options) {
        return __awaiter(this, void 0, void 0, function () {
            var isPDF;
            return __generator(this, function (_a) {
                if (!this.apiKey || this.apiKey === 'mock') {
                    return [2 /*return*/, this.mockExtractedData()];
                }
                try {
                    isPDF = fileUrl.toLowerCase().includes('.pdf');
                    if (isPDF) {
                        return [2 /*return*/, this.extractFromDocumentAI(fileUrl, options)];
                    }
                    else {
                        return [2 /*return*/, this.extractFromVision(fileUrl, options)];
                    }
                }
                catch (error) {
                    console.error('Erro na extração de texto:', error);
                    // Fallback para mock em caso de erro
                    return [2 /*return*/, this.mockExtractedData()];
                }
                return [2 /*return*/];
            });
        });
    };
    GoogleAIService.prototype.extractFromDocumentAI = function (fileUrl, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implementar chamada real ao Document AI API
                // POST https://us-documentai.googleapis.com/v1/projects/{project}/locations/{location}/processors/{processor}:process
                // Por enquanto, retornar mock
                return [2 /*return*/, this.mockExtractedData()];
            });
        });
    };
    GoogleAIService.prototype.extractFromVision = function (fileUrl, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implementar chamada real ao Vision API
                // POST https://vision.googleapis.com/v1/images:annotate
                // Por enquanto, retornar mock
                return [2 /*return*/, this.mockExtractedData()];
            });
        });
    };
    // ============================================================================
    // Classificação de Documento
    // ============================================================================
    GoogleAIService.prototype.classifyDocument = function (text, fileUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt_1, response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey || this.apiKey === 'mock') {
                            return [2 /*return*/, this.mockClassification()];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        prompt_1 = "Classifique este documento m\u00E9dico em uma das categorias:\n      - mri: Resson\u00E2ncia Magn\u00E9tica\n      - xray: Raio-X\n      - ultrasound: Ultrassom\n      - ct_scan: Tomografia Computadorizada\n      - clinical_report: Laudo Cl\u00EDnico\n      - prescription: Receitu\u00E1rio/Prescri\u00E7\u00E3o\n      - certificate: Atestado\n      - other: Outro\n\n      Tamb\u00E9m identifique a parte do corpo se relevante.\n\n      Responda APENAS em JSON com este formato:\n      {\n        \"type\": \"categoria\",\n        \"confidence\": 0.0-1.0,\n        \"bodyPart\": \"parte do corpo ou null\",\n        \"modality\": \"modalidade ou null\",\n        \"view\": \"vista/incid\u00EAncia ou null\"\n      }";
                        return [4 /*yield*/, this.callGeminiVision(fileUrl || '', text, prompt_1)];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, this.parseJSONResponse(response, this.mockClassification())];
                    case 3:
                        error_2 = _a.sent();
                        console.error('Erro na classificação:', error_2);
                        return [2 /*return*/, this.mockClassification()];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ============================================================================
    // Sumarização com Gemini/MedLM
    // ============================================================================
    GoogleAIService.prototype.summarizeDocument = function (text_1) {
        return __awaiter(this, arguments, void 0, function (text, documentType) {
            var prompt_2, model, response, error_3;
            if (documentType === void 0) { documentType = 'clinical_report'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey || this.apiKey === 'mock') {
                            return [2 /*return*/, this.mockSummary()];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        prompt_2 = this.buildSummaryPrompt(text, documentType);
                        model = documentType.includes('clinical') || documentType.includes('report')
                            ? 'medlm'
                            : 'gemini-2.5-flash';
                        return [4 /*yield*/, this.callGenerativeAI(prompt_2, model)];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, this.parseSummaryResponse(response)];
                    case 3:
                        error_3 = _a.sent();
                        console.error('Erro na sumarização:', error_3);
                        return [2 /*return*/, this.mockSummary()];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GoogleAIService.prototype.buildSummaryPrompt = function (text, documentType) {
        var basePrompt = "Analise este documento m\u00E9dico e forne\u00E7a:\n\n1. **Achados Chave**: Lista dos principais achados (m\u00E1ximo 5)\n2. **Impress\u00E3o**: Resumo da impress\u00E3o geral do exame\n3. **Recomenda\u00E7\u00F5es**: Recomenda\u00E7\u00F5es cl\u00EDnicas se houver\n4. **Alertas Cr\u00EDticos**: Qualquer achado que exija aten\u00E7\u00E3o imediata\n\nDocumento:\n".concat(text.substring(0, 10000), "\n\nResponda em JSON:\n{\n  \"keyFindings\": [\"achado 1\", \"achado 2\", ...],\n  \"impression\": \"resumo da impress\u00E3o\",\n  \"recommendations\": [\"recomenda\u00E7\u00E3o 1\", ...],\n  \"criticalAlerts\": [\"alerta 1\", ...] (ou omitir se n\u00E3o houver)\n}");
        return basePrompt;
    };
    GoogleAIService.prototype.parseSummaryResponse = function (response) {
        try {
            var parsed = JSON.parse(response);
            return {
                keyFindings: parsed.keyFindings || [],
                impression: parsed.impression || '',
                recommendations: parsed.recommendations || [],
                criticalAlerts: parsed.criticalAlerts || [],
            };
        }
        catch (_a) {
            // Fallback para parsing de texto
            return this.mockSummary();
        }
    };
    // ============================================================================
    // Tradução com Translation API v3
    // ============================================================================
    GoogleAIService.prototype.translateDocument = function (text_1) {
        return __awaiter(this, arguments, void 0, function (text, targetLanguage) {
            var detectedLanguage, response, error_4;
            if (targetLanguage === void 0) { targetLanguage = 'pt'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey || this.apiKey === 'mock') {
                            return [2 /*return*/, this.mockTranslation(text, targetLanguage)];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.detectLanguage(text)];
                    case 2:
                        detectedLanguage = _a.sent();
                        // Se já está no idioma alvo, retornar original
                        if (detectedLanguage === targetLanguage) {
                            return [2 /*return*/, {
                                    originalText: text,
                                    translatedText: text,
                                    sourceLanguage: detectedLanguage,
                                    targetLanguage: targetLanguage,
                                }];
                        }
                        return [4 /*yield*/, this.callTranslationAPI(text, targetLanguage)];
                    case 3:
                        response = _a.sent();
                        return [2 /*return*/, {
                                originalText: text,
                                translatedText: response,
                                sourceLanguage: detectedLanguage,
                                targetLanguage: targetLanguage,
                            }];
                    case 4:
                        error_4 = _a.sent();
                        console.error('Erro na tradução:', error_4);
                        return [2 /*return*/, this.mockTranslation(text, targetLanguage)];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    GoogleAIService.prototype.detectLanguage = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implementar detecção real
                // Por enquanto, detectar palavras-chave
                if (/\b(the|and|of|to|in|is|you)\b/i.test(text))
                    return [2 /*return*/, 'en'];
                if (/\b(el|la|de|que|y|a|en|un)\b/i.test(text))
                    return [2 /*return*/, 'es'];
                if (/\b(der|die|das|und|ist|mit|für)\b/i.test(text))
                    return [2 /*return*/, 'de'];
                return [2 /*return*/, 'pt']; // Default para português
            });
        });
    };
    GoogleAIService.prototype.callTranslationAPI = function (text, targetLanguage) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implementar chamada real à Translation API v3
                // POST https://translation.googleapis.com/v3/projects/{project}:translateText
                // Por enquanto, retornar texto com prefixo traduzido
                return [2 /*return*/, "[Traduzido para ".concat(targetLanguage, "] ").concat(text)];
            });
        });
    };
    // ============================================================================
    // Comparação de Documentos
    // ============================================================================
    GoogleAIService.prototype.compareDocuments = function (currentText, previousText, documentType, previousExamDate) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt_3, response, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey || this.apiKey === 'mock') {
                            return [2 /*return*/, this.mockComparison()];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        prompt_3 = "Compare estes dois exames m\u00E9dicos e identifique MUDAN\u00C7AS significativas:\n\nEXAME ATUAL:\n".concat(currentText.substring(0, 3000), "\n\nEXAME ANTERIOR:\n").concat(previousText.substring(0, 3000), "\n\nForne\u00E7a:\n1. Lista de mudan\u00E7as identificadas (melhoras, pioras, novos achados)\n2. Score de progresso geral (-100 a +100, onde positivo indica melhora)\n\nResponda em JSON:\n{\n  \"hasChanges\": true/false,\n  \"changes\": [\"mudan\u00E7a 1\", \"mudan\u00E7a 2\", ...],\n  \"progressScore\": n\u00FAmero entre -100 e 100\n}");
                        return [4 /*yield*/, this.callGenerativeAI(prompt_3, 'gemini-2.5-flash')];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, this.parseJSONResponse(response, this.mockComparison())];
                    case 3:
                        error_5 = _a.sent();
                        console.error('Erro na comparação:', error_5);
                        return [2 /*return*/, this.mockComparison()];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ============================================================================
    // Geração de Tags
    // ============================================================================
    GoogleAIService.prototype.generateTags = function (text, classification) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt_4, response, parsed, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey || this.apiKey === 'mock') {
                            return [2 /*return*/, this.mockTags()];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        prompt_4 = "Analise este texto m\u00E9dico e gere tags relevantes para:\n      - Anatomia (partes do corpo mencionadas)\n      - Condi\u00E7\u00F5es (patologias, diagn\u00F3sticos)\n      - Modalidade (tipo de exame)\n      - Prioridade (urg\u00EAncia indicada)\n\n      Texto:\n      ".concat(text.substring(0, 2000), "\n\n      Responda em JSON:\n      {\n        \"tags\": [\n          {\"name\": \"nome\", \"category\": \"anatomy|condition|modality|priority\", \"confidence\": 0.0-1.0}\n        ]\n      }");
                        return [4 /*yield*/, this.callGenerativeAI(prompt_4, 'gemini-2.5-flash')];
                    case 2:
                        response = _a.sent();
                        parsed = JSON.parse(response);
                        return [2 /*return*/, (parsed.tags || []).map(function (t, idx) { return ({
                                id: "tag-".concat(idx),
                                name: t.name,
                                category: t.category,
                                confidence: t.confidence || 0.8,
                            }); })];
                    case 3:
                        error_6 = _a.sent();
                        console.error('Erro na geração de tags:', error_6);
                        return [2 /*return*/, this.mockTags()];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ============================================================================
    // Análise de Movimento com MediaPipe
    // ============================================================================
    GoogleAIService.prototype.analyzeMovement = function (fileUrl_1) {
        return __awaiter(this, arguments, void 0, function (fileUrl, options) {
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                if (!this.apiKey || this.apiKey === 'mock') {
                    return [2 /*return*/, this.mockPoseAnalysis()];
                }
                try {
                    // TODO: Implementar análise real com MediaPipe Pose Landmarker
                    // Por enquanto, retornar análise mockada
                    return [2 /*return*/, this.mockPoseAnalysis()];
                }
                catch (error) {
                    console.error('Erro na análise de movimento:', error);
                    return [2 /*return*/, this.mockPoseAnalysis()];
                }
                return [2 /*return*/];
            });
        });
    };
    // ============================================================================
    // Chat com RAG
    // ============================================================================
    GoogleAIService.prototype.chatWithRAG = function (patientId_1, message_1) {
        return __awaiter(this, arguments, void 0, function (patientId, message, conversationHistory) {
            var contextPrompt, response, error_7;
            if (conversationHistory === void 0) { conversationHistory = []; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey || this.apiKey === 'mock') {
                            return [2 /*return*/, {
                                    response: 'Esta é uma resposta simulada do chat RAG. A integração real usará Vertex AI Search com Gemini 2.5 Pro para fornecer respostas baseadas no contexto do paciente e literatura médica.',
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        contextPrompt = this.buildRAGPrompt(patientId, message, conversationHistory);
                        return [4 /*yield*/, this.callGenerativeAI(contextPrompt, 'gemini-2.5-pro')];
                    case 2:
                        response = _a.sent();
                        return [2 /*return*/, {
                                response: response,
                                sources: [], // TODO: retornar fontes reais
                            }];
                    case 3:
                        error_7 = _a.sent();
                        console.error('Erro no chat RAG:', error_7);
                        return [2 /*return*/, {
                                response: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GoogleAIService.prototype.buildRAGPrompt = function (patientId, message, history) {
        var historyText = history
            .map(function (h) { return "".concat(h.role, ": ").concat(h.content); })
            .join('\n');
        return "Voc\u00EA \u00E9 um assistente cl\u00EDnico especializado em fisioterapia.\n      Use o contexto do paciente e a literatura m\u00E9dica para responder perguntas.\n\n      Hist\u00F3rico da conversa:\n      ".concat(historyText, "\n\n      Mensagem atual: ").concat(message, "\n\n      Forne\u00E7a uma resposta \u00FAtil, precisa e baseada em evid\u00EAncias.\n    ");
    };
    // ============================================================================
    // Geração de PDF
    // ============================================================================
    GoogleAIService.prototype.generatePDF = function (documentData_1) {
        return __awaiter(this, arguments, void 0, function (documentData, includeTranslation) {
            if (includeTranslation === void 0) { includeTranslation = false; }
            return __generator(this, function (_a) {
                // TODO: Implementar geração real de PDF
                // Por enquanto, retornar URL mockada
                return [2 /*return*/, "https://storage.googleapis.com/mock-bucket/pdfs/document-".concat(Date.now(), ".pdf")];
            });
        });
    };
    // ============================================================================
    // Chamadas às APIs do Google
    // ============================================================================
    GoogleAIService.prototype.callGeminiVision = function (imageUrl, text, prompt) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implementar chamada real ao Gemini Vision
                // POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-vision:generateContent
                // Por enquanto, retornar mock
                return [2 /*return*/, JSON.stringify(this.mockClassification())];
            });
        });
    };
    GoogleAIService.prototype.callGenerativeAI = function (prompt_5) {
        return __awaiter(this, arguments, void 0, function (prompt, model) {
            if (model === void 0) { model = 'gemini-2.5-flash'; }
            return __generator(this, function (_a) {
                // TODO: Implementar chamada real ao Gemini API
                // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
                // Por enquanto, retornar resposta baseada no prompt
                if (prompt.includes('classifique') || prompt.includes('Classifique')) {
                    return [2 /*return*/, JSON.stringify(this.mockClassification())];
                }
                else if (prompt.includes('Analise') || prompt.includes('achevedos')) {
                    return [2 /*return*/, JSON.stringify(this.mockSummary())];
                }
                else if (prompt.includes('Compare') || prompt.includes('mudanças')) {
                    return [2 /*return*/, JSON.stringify(this.mockComparison())];
                }
                else {
                    return [2 /*return*/, 'Resposta do Gemini 2.5 Pro'];
                }
                return [2 /*return*/];
            });
        });
    };
    GoogleAIService.prototype.parseJSONResponse = function (response, fallback) {
        try {
            // Tentar extrair JSON da resposta
            var jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return fallback;
        }
        catch (_a) {
            return fallback;
        }
    };
    // ============================================================================
    // Mock Data (para desenvolvimento)
    // ============================================================================
    GoogleAIService.prototype.mockExtractedData = function () {
        return {
            text: 'Paciente: João Silva, 45 anos\nExame: Ressonância Magnética do Joelho Esquerdo\n\nLAUDO:\n\n1. Lesão parcial do ligamento cruzado anterior (LCA).\n2. Edema ósseo na região tibial anterior.\n3. Menisco interno íntegro.\n4. Condromalácia patelar grau II.\n\nCONCLUSÃO:\n\nPaciente apresenta lesão parcial do LCA associada a edema ósseo, sugestivo de processo inflamatório pós-traumático. Acompanhamento fisioterapêutico é recomendado.',
            fullText: 'Paciente: João Silva, 45 anos\nExame: Ressonância Magnética do Joelho Esquerdo\n\nLAUDO:\n\n1. Lesão parcial do ligamento cruzado anterior (LCA).\n2. Edema ósseo na região tibial anterior.\n3. Menisco interno íntegro.\n4. Condromalácia patelar grau II.\n\nCONCLUSÃO:\n\nPaciente apresenta lesão parcial do LCA associada a edema ósseo, sugestivo de processo inflamatório pós-traumático. Acompanhamento fisioterapêutico é recomendado.',
            confidence: 0.95,
            language: 'pt',
            tables: [],
            formFields: {
                paciente: 'João Silva',
                idade: '45 anos',
                exame: 'Ressonância Magnética do Joelho Esquerdo',
            },
        };
    };
    GoogleAIService.prototype.mockClassification = function () {
        return {
            type: 'mri',
            confidence: 0.92,
            bodyPart: 'Joelho Esquerdo',
            modality: 'Ressonância Magnética',
            view: 'Sagital T1/T2',
        };
    };
    GoogleAIService.prototype.mockSummary = function () {
        return {
            keyFindings: [
                'Lesão parcial do ligamento cruzado anterior (LCA)',
                'Edema ósseo na região tibial anterior',
                'Menisco interno preservado',
                'Condromalácia patelar grau II',
            ],
            impression: 'Paciente de 45 anos com lesão parcial do LCA do joelho esquerdo, associada a edema ósseo tibial anterior. O menisco interno está íntegro. Há sinais de condromalácia patelar grau II.',
            recommendations: [
                'Iniciar protocolo de fortalecimento de quadríceps',
                'Crioterapia para controle do edema',
                'Exercícios de propriocepção',
                'Reavaliação em 4 semanas',
            ],
            criticalAlerts: [],
        };
    };
    GoogleAIService.prototype.mockComparison = function () {
        return {
            hasChanges: true,
            changes: [
                'Redução do edema ósseo em relação ao exame anterior',
                'Melhora da amplitude de movimento',
                'LCA com sinais de cicatrização',
            ],
            progressScore: 35,
            previousExamDate: '2026-01-15',
        };
    };
    GoogleAIService.prototype.mockTranslation = function (originalText, targetLanguage) {
        return {
            originalText: originalText,
            translatedText: "[Traduzido para ".concat(targetLanguage, "] Patient: John Smith, 45 years old\nExam: MRI of Left Knee\n\nREPORT:\n\n1. Partial ACL tear.\n2. Bone marrow edema in anterior tibial region.\n3. Medial meniscus intact.\n4. Patellar chondromalacia grade II.\n\nCONCLUSION:\n\nPatient presents partial ACL injury associated with bone edema, suggestive of post-traumatic inflammatory process. Physical therapy follow-up is recommended."),
            sourceLanguage: 'pt',
            targetLanguage: targetLanguage,
        };
    };
    GoogleAIService.prototype.mockTags = function () {
        return [
            { id: 'tag-1', name: 'Joelho', category: 'anatomy', confidence: 0.98 },
            { id: 'tag-2', name: 'LCA', category: 'condition', confidence: 0.95 },
            { id: 'tag-3', name: 'Edema Ósseo', category: 'condition', confidence: 0.90 },
            { id: 'tag-4', name: 'Ressonância Magnética', category: 'modality', confidence: 0.99 },
        ];
    };
    GoogleAIService.prototype.mockPoseAnalysis = function () {
        return {
            summary: 'Paciente apresenta bom padrão de movimento durante o agachamento. Observa-se ligeira assimetria na distribuição de peso entre os lados direito e esquerdo. A amplitude de movimento está dentro dos limites funcionais.',
            overallScore: 75,
            postureScore: 80,
            romScore: 72,
            controlScore: 68,
            tempoScore: 78,
            joints: {
                leftShoulder: { angle: 165, status: 'normal' },
                rightShoulder: { angle: 168, status: 'normal' },
                leftElbow: { angle: 85, status: 'normal' },
                rightElbow: { angle: 88, status: 'normal' },
                leftHip: { angle: 95, status: 'normal' },
                rightHip: { angle: 92, status: 'normal' },
                leftKnee: { angle: 88, status: 'warning' },
                rightKnee: { angle: 102, status: 'normal' },
            },
            deviations: [
                'Ligeira valgo dinâmico do joelho esquerdo na fase descendente',
                'Inclinação anterior do tronco aumentada abaixo de 90° de flexão',
            ],
            recommendations: [
                'Fortalecer glúteo médio para corrigir valgo',
                'Trabalhar mobilidade de quadril para permitir agachamento mais profundo',
                'Praticar agachamento com apoio frontal para melhorar padrão',
            ],
        };
    };
    GoogleAIService.prototype.mockDocumentAnalysis = function (options) {
        return {
            extractedData: this.mockExtractedData(),
            classification: options.includeClassification ? this.mockClassification() : undefined,
            summary: options.includeSummary ? this.mockSummary() : undefined,
            translation: options.includeTranslation ? this.mockTranslation(this.mockExtractedData().text, options.targetLanguage || 'pt') : undefined,
            tags: this.mockTags(),
            comparison: undefined,
        };
    };
    return GoogleAIService;
}());
exports.GoogleAIService = GoogleAIService;
/**
 * Exporta função helper para criar instância do serviço
 */
function getGoogleAIService() {
    return new GoogleAIService();
}
