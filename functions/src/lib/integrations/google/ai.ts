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

import { HttpsError } from 'firebase-functions/v2/https';

// Interfaces para os dados de entrada/saída

export interface DocumentAnalysisOptions {
  fileName?: string;
  mediaType?: string;
  includeClassification?: boolean;
  includeSummary?: boolean;
  includeExtraction?: boolean;
  includeTables?: boolean;
  includeTranslation?: boolean;
  targetLanguage?: string;
  compareWithPrevious?: boolean;
  patientId?: string | null;
}

export interface ExtractedData {
  text: string;
  fullText?: string;
  confidence?: number;
  language?: string;
  tables?: Array<{
    headers: string[];
    rows: string[][];
  }>;
  formFields?: Record<string, string>;
}

export interface DocumentClassification {
  type: 'mri' | 'xray' | 'ultrasound' | 'ct_scan' | 'clinical_report' | 'prescription' | 'certificate' | 'other';
  confidence: number;
  bodyPart?: string;
  modality?: string;
  view?: string;
}

export interface DocumentSummary {
  keyFindings: string[];
  impression: string;
  recommendations: string[];
  criticalAlerts?: string[];
}

export interface DocumentComparison {
  hasChanges: boolean;
  changes: string[];
  progressScore?: number;
  previousExamDate?: string;
}

export interface TranslatedDocument {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  category: 'anatomy' | 'condition' | 'modality' | 'priority';
  confidence: number;
}

export interface MovementAnalysisOptions {
  mediaType?: 'video' | 'image';
  includePoseData?: boolean;
}

export interface PoseAnalysis {
  summary: string;
  overallScore: number;
  postureScore: number;
  romScore: number;
  controlScore: number;
  tempoScore: number;
  joints: {
    leftShoulder?: { angle: number; status: string };
    rightShoulder?: { angle: number; status: string };
    leftElbow?: { angle: number; status: string };
    rightElbow?: { angle: number; status: string };
    leftHip?: { angle: number; status: string };
    rightHip?: { angle: number; status: string };
    leftKnee?: { angle: number; status: string };
    rightKnee?: { angle: number; status: string };
  };
  deviations: string[];
  recommendations: string[];
}

/**
 * Classe principal do Google AI Service
 */
export class GoogleAIService {
  private apiKey: string;
  private projectId: string;
  private location: string;

  constructor() {
    // Configurações do Google Cloud
    this.apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || '';
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    if (!this.apiKey) {
      console.warn('Google API Key não configurada. Usando modo mock.');
    }
  }

  // ============================================================================
  // Análise Completa de Documento
  // ============================================================================

  async analyzeDocument(
    fileUrl: string,
    options: DocumentAnalysisOptions = {}
  ): Promise<{
    extractedData: ExtractedData;
    classification?: DocumentClassification;
    summary?: DocumentSummary;
    comparison?: DocumentComparison;
    translation?: TranslatedDocument;
    tags?: DocumentTag[];
  }> {
    // Verificar se está em modo de desenvolvimento/mock
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockDocumentAnalysis(options);
    }

    try {
      // 1. Extrair texto com Document AI / Vision
      const extractedData = await this.extractText(fileUrl, options);

      // 2. Classificar documento
      let classification: DocumentClassification | undefined;
      if (options.includeClassification) {
        classification = await this.classifyDocument(extractedData.text, fileUrl);
      }

      // 3. Sumarizar com Gemini/MedLM
      let summary: DocumentSummary | undefined;
      if (options.includeSummary) {
        summary = await this.summarizeDocument(
          extractedData.fullText || extractedData.text,
          classification?.type || 'clinical_report'
        );
      }

      // 4. Traduzir se solicitado
      let translation: TranslatedDocument | undefined;
      if (options.includeTranslation && options.targetLanguage) {
        translation = await this.translateDocument(
          extractedData.fullText || extractedData.text,
          options.targetLanguage
        );
      }

      // 5. Comparar com exames anteriores se solicitado
      let comparison: DocumentComparison | undefined;
      // A comparação é feita na função separada aiCompareDocuments

      // 6. Gerar tags
      const tags = await this.generateTags(extractedData.text, classification);

      return {
        extractedData,
        classification,
        summary,
        translation,
        tags,
        comparison,
      };
    } catch (error) {
      console.error('Erro na análise de documento:', error);
      throw new HttpsError('internal', 'Erro ao processar documento');
    }
  }

  // ============================================================================
  // Extração de Texto (Document AI / Vision)
  // ============================================================================

  private async extractText(
    fileUrl: string,
    options: DocumentAnalysisOptions
  ): Promise<ExtractedData> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockExtractedData();
    }

    try {
      // Usar Document AI para OCR avançado ou Vision para imagens
      const isPDF = fileUrl.toLowerCase().includes('.pdf');

      if (isPDF) {
        return this.extractFromDocumentAI(fileUrl, options);
      } else {
        return this.extractFromVision(fileUrl, options);
      }
    } catch (error) {
      console.error('Erro na extração de texto:', error);
      // Fallback para mock em caso de erro
      return this.mockExtractedData();
    }
  }

  private async extractFromDocumentAI(
    fileUrl: string,
    options: DocumentAnalysisOptions
  ): Promise<ExtractedData> {
    // TODO: Implementar chamada real ao Document AI API
    // POST https://us-documentai.googleapis.com/v1/projects/{project}/locations/{location}/processors/{processor}:process

    // Por enquanto, retornar mock
    return this.mockExtractedData();
  }

  private async extractFromVision(
    fileUrl: string,
    options: DocumentAnalysisOptions
  ): Promise<ExtractedData> {
    // TODO: Implementar chamada real ao Vision API
    // POST https://vision.googleapis.com/v1/images:annotate

    // Por enquanto, retornar mock
    return this.mockExtractedData();
  }

  // ============================================================================
  // Classificação de Documento
  // ============================================================================

  async classifyDocument(
    text: string,
    fileUrl?: string
  ): Promise<DocumentClassification> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockClassification();
    }

    try {
      // Usar Gemini Vision para classificar
      const prompt = `Classifique este documento médico em uma das categorias:
      - mri: Ressonância Magnética
      - xray: Raio-X
      - ultrasound: Ultrassom
      - ct_scan: Tomografia Computadorizada
      - clinical_report: Laudo Clínico
      - prescription: Receituário/Prescrição
      - certificate: Atestado
      - other: Outro

      Também identifique a parte do corpo se relevante.

      Responda APENAS em JSON com este formato:
      {
        "type": "categoria",
        "confidence": 0.0-1.0,
        "bodyPart": "parte do corpo ou null",
        "modality": "modalidade ou null",
        "view": "vista/incidência ou null"
      }`;

      const response = await this.callGeminiVision(fileUrl || '', text, prompt);

      return this.parseJSONResponse(response, this.mockClassification());
    } catch (error) {
      console.error('Erro na classificação:', error);
      return this.mockClassification();
    }
  }

  // ============================================================================
  // Sumarização com Gemini/MedLM
  // ============================================================================

  async summarizeDocument(
    text: string,
    documentType: string = 'clinical_report'
  ): Promise<DocumentSummary> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockSummary();
    }

    try {
      // Prompt especializado para o tipo de documento
      const prompt = this.buildSummaryPrompt(text, documentType);

      // Usar MedLM para documentos médicos ou Gemini para outros
      const model = documentType.includes('clinical') || documentType.includes('report')
        ? 'medlm'
        : 'gemini-2.5-flash';

      const response = await this.callGenerativeAI(prompt, model);

      return this.parseSummaryResponse(response);
    } catch (error) {
      console.error('Erro na sumarização:', error);
      return this.mockSummary();
    }
  }

  private buildSummaryPrompt(text: string, documentType: string): string {
    const basePrompt = `Analise este documento médico e forneça:

1. **Achados Chave**: Lista dos principais achados (máximo 5)
2. **Impressão**: Resumo da impressão geral do exame
3. **Recomendações**: Recomendações clínicas se houver
4. **Alertas Críticos**: Qualquer achado que exija atenção imediata

Documento:
${text.substring(0, 10000)}

Responda em JSON:
{
  "keyFindings": ["achado 1", "achado 2", ...],
  "impression": "resumo da impressão",
  "recommendations": ["recomendação 1", ...],
  "criticalAlerts": ["alerta 1", ...] (ou omitir se não houver)
}`;

    return basePrompt;
  }

  private parseSummaryResponse(response: string): DocumentSummary {
    try {
      const parsed = JSON.parse(response);
      return {
        keyFindings: parsed.keyFindings || [],
        impression: parsed.impression || '',
        recommendations: parsed.recommendations || [],
        criticalAlerts: parsed.criticalAlerts || [],
      };
    } catch {
      // Fallback para parsing de texto
      return this.mockSummary();
    }
  }

  // ============================================================================
  // Tradução com Translation API v3
  // ============================================================================

  async translateDocument(
    text: string,
    targetLanguage: string = 'pt'
  ): Promise<TranslatedDocument> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockTranslation(text, targetLanguage);
    }

    try {
      // Detectar idioma primeiro
      const detectedLanguage = await this.detectLanguage(text);

      // Se já está no idioma alvo, retornar original
      if (detectedLanguage === targetLanguage) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: detectedLanguage,
          targetLanguage,
        };
      }

      // Chamar Translation API v3
      const response = await this.callTranslationAPI(text, targetLanguage);

      return {
        originalText: text,
        translatedText: response,
        sourceLanguage: detectedLanguage,
        targetLanguage,
      };
    } catch (error) {
      console.error('Erro na tradução:', error);
      return this.mockTranslation(text, targetLanguage);
    }
  }

  private async detectLanguage(text: string): Promise<string> {
    // TODO: Implementar detecção real
    // Por enquanto, detectar palavras-chave
    if (/\b(the|and|of|to|in|is|you)\b/i.test(text)) return 'en';
    if (/\b(el|la|de|que|y|a|en|un)\b/i.test(text)) return 'es';
    if (/\b(der|die|das|und|ist|mit|für)\b/i.test(text)) return 'de';
    return 'pt'; // Default para português
  }

  private async callTranslationAPI(text: string, targetLanguage: string): Promise<string> {
    // TODO: Implementar chamada real à Translation API v3
    // POST https://translation.googleapis.com/v3/projects/{project}:translateText

    // Por enquanto, retornar texto com prefixo traduzido
    return `[Traduzido para ${targetLanguage}] ${text}`;
  }

  // ============================================================================
  // Comparação de Documentos
  // ============================================================================

  async compareDocuments(
    currentText: string,
    previousText: string,
    documentType?: string,
    previousExamDate?: string
  ): Promise<DocumentComparison> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockComparison();
    }

    try {
      const prompt = `Compare estes dois exames médicos e identifique MUDANÇAS significativas:

EXAME ATUAL:
${currentText.substring(0, 3000)}

EXAME ANTERIOR:
${previousText.substring(0, 3000)}

Forneça:
1. Lista de mudanças identificadas (melhoras, pioras, novos achados)
2. Score de progresso geral (-100 a +100, onde positivo indica melhora)

Responda em JSON:
{
  "hasChanges": true/false,
  "changes": ["mudança 1", "mudança 2", ...],
  "progressScore": número entre -100 e 100
}`;

      const response = await this.callGenerativeAI(prompt, 'gemini-2.5-flash');

      return this.parseJSONResponse(response, this.mockComparison());
    } catch (error) {
      console.error('Erro na comparação:', error);
      return this.mockComparison();
    }
  }

  // ============================================================================
  // Geração de Tags
  // ============================================================================

  async generateTags(
    text: string,
    classification?: DocumentClassification | null
  ): Promise<DocumentTag[]> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockTags();
    }

    try {
      const prompt = `Analise este texto médico e gere tags relevantes para:
      - Anatomia (partes do corpo mencionadas)
      - Condições (patologias, diagnósticos)
      - Modalidade (tipo de exame)
      - Prioridade (urgência indicada)

      Texto:
      ${text.substring(0, 2000)}

      Responda em JSON:
      {
        "tags": [
          {"name": "nome", "category": "anatomy|condition|modality|priority", "confidence": 0.0-1.0}
        ]
      }`;

      const response = await this.callGenerativeAI(prompt, 'gemini-2.5-flash');

      const parsed = JSON.parse(response);
      return (parsed.tags || []).map((t: any, idx: number) => ({
        id: `tag-${idx}`,
        name: t.name,
        category: t.category,
        confidence: t.confidence || 0.8,
      }));
    } catch (error) {
      console.error('Erro na geração de tags:', error);
      return this.mockTags();
    }
  }

  // ============================================================================
  // Análise de Movimento com MediaPipe
  // ============================================================================

  async analyzeMovement(
    fileUrl: string,
    options: MovementAnalysisOptions = {}
  ): Promise<PoseAnalysis> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return this.mockPoseAnalysis();
    }

    try {
      // TODO: Implementar análise real com MediaPipe Pose Landmarker
      // Por enquanto, retornar análise mockada
      return this.mockPoseAnalysis();
    } catch (error) {
      console.error('Erro na análise de movimento:', error);
      return this.mockPoseAnalysis();
    }
  }

  // ============================================================================
  // Chat com RAG
  // ============================================================================

  async chatWithRAG(
    patientId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<{
    response: string;
    sources?: Array<{ id: string; title: string; snippet: string }>;
  }> {
    if (!this.apiKey || this.apiKey === 'mock') {
      return {
        response: 'Esta é uma resposta simulada do chat RAG. A integração real usará Vertex AI Search com Gemini 2.5 Pro para fornecer respostas baseadas no contexto do paciente e literatura médica.',
      };
    }

    try {
      // TODO: Implementar RAG real com Vertex AI Search
      // 1. Buscar contexto do paciente no Firestore
      // 2. Buscar documentos relevantes com Vertex AI Search
      // 3. Construir prompt com contexto
      // 4. Chamar Gemini 2.5 Pro com contexto

      const contextPrompt = this.buildRAGPrompt(patientId, message, conversationHistory);

      const response = await this.callGenerativeAI(contextPrompt, 'gemini-2.5-pro');

      return {
        response,
        sources: [], // TODO: retornar fontes reais
      };
    } catch (error) {
      console.error('Erro no chat RAG:', error);
      return {
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
      };
    }
  }

  private buildRAGPrompt(
    patientId: string,
    message: string,
    history: Array<{ role: string; content: string }>
  ): string {
    const historyText = history
      .map((h) => `${h.role}: ${h.content}`)
      .join('\n');

    return `Você é um assistente clínico especializado em fisioterapia.
      Use o contexto do paciente e a literatura médica para responder perguntas.

      Histórico da conversa:
      ${historyText}

      Mensagem atual: ${message}

      Forneça uma resposta útil, precisa e baseada em evidências.
    `;
  }

  // ============================================================================
  // Geração de PDF
  // ============================================================================

  async generatePDF(
    documentData: any,
    includeTranslation: boolean = false
  ): Promise<string> {
    // TODO: Implementar geração real de PDF
    // Por enquanto, retornar URL mockada
    return `https://storage.googleapis.com/mock-bucket/pdfs/document-${Date.now()}.pdf`;
  }

  // ============================================================================
  // Chamadas às APIs do Google
  // ============================================================================

  private async callGeminiVision(
    imageUrl: string,
    text: string,
    prompt: string
  ): Promise<string> {
    // TODO: Implementar chamada real ao Gemini Vision
    // POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-vision:generateContent

    // Por enquanto, retornar mock
    return JSON.stringify(this.mockClassification());
  }

  private async callGenerativeAI(
    prompt: string,
    model: string = 'gemini-2.5-flash'
  ): Promise<string> {
    // TODO: Implementar chamada real ao Gemini API
    // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent

    // Por enquanto, retornar resposta baseada no prompt
    if (prompt.includes('classifique') || prompt.includes('Classifique')) {
      return JSON.stringify(this.mockClassification());
    } else if (prompt.includes('Analise') || prompt.includes('achevedos')) {
      return JSON.stringify(this.mockSummary());
    } else if (prompt.includes('Compare') || prompt.includes('mudanças')) {
      return JSON.stringify(this.mockComparison());
    } else {
      return 'Resposta do Gemini 2.5 Pro';
    }
  }

  private parseJSONResponse<T>(response: string, fallback: T): T {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  // ============================================================================
  // Mock Data (para desenvolvimento)
  // ============================================================================

  private mockExtractedData(): ExtractedData {
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
  }

  private mockClassification(): DocumentClassification {
    return {
      type: 'mri',
      confidence: 0.92,
      bodyPart: 'Joelho Esquerdo',
      modality: 'Ressonância Magnética',
      view: 'Sagital T1/T2',
    };
  }

  private mockSummary(): DocumentSummary {
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
  }

  private mockComparison(): DocumentComparison {
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
  }

  private mockTranslation(originalText: string, targetLanguage: string): TranslatedDocument {
    return {
      originalText,
      translatedText: `[Traduzido para ${targetLanguage}] Patient: John Smith, 45 years old\nExam: MRI of Left Knee\n\nREPORT:\n\n1. Partial ACL tear.\n2. Bone marrow edema in anterior tibial region.\n3. Medial meniscus intact.\n4. Patellar chondromalacia grade II.\n\nCONCLUSION:\n\nPatient presents partial ACL injury associated with bone edema, suggestive of post-traumatic inflammatory process. Physical therapy follow-up is recommended.`,
      sourceLanguage: 'pt',
      targetLanguage,
    };
  }

  private mockTags(): DocumentTag[] {
    return [
      { id: 'tag-1', name: 'Joelho', category: 'anatomy', confidence: 0.98 },
      { id: 'tag-2', name: 'LCA', category: 'condition', confidence: 0.95 },
      { id: 'tag-3', name: 'Edema Ósseo', category: 'condition', confidence: 0.90 },
      { id: 'tag-4', name: 'Ressonância Magnética', category: 'modality', confidence: 0.99 },
    ];
  }

  private mockPoseAnalysis(): PoseAnalysis {
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
  }

  private mockDocumentAnalysis(options: DocumentAnalysisOptions) {
    return {
      extractedData: this.mockExtractedData(),
      classification: options.includeClassification ? this.mockClassification() : undefined,
      summary: options.includeSummary ? this.mockSummary() : undefined,
      translation: options.includeTranslation ? this.mockTranslation(
        this.mockExtractedData().text,
        options.targetLanguage || 'pt'
      ) : undefined,
      tags: this.mockTags(),
      comparison: undefined,
    };
  }
}

/**
 * Exporta função helper para criar instância do serviço
 */
export function getGoogleAIService(): GoogleAIService {
  return new GoogleAIService();
}
