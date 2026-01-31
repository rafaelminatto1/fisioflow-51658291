/**
 * Módulo de Análise de Documentos Médicos - FASE 3
 * Analisa documentos médicos (PDFs, imagens) usando IA multimodal
 *
 * Recursos:
 * - Análise de PDFs (suporta até 3000 arquivos!)
 * - Extração de diagnósticos, medicamentos, contraindicações
 * - Processamento de resultados de exames
 * - Identificação de itens que requerem atenção do fisioterapeuta
 * - Uso de Gemini Pro para análise complexa
 *
 * @module lib/ai/document-analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, collection, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { storage, db } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType =
  | 'medical_report'
  | 'exam_result'
  | 'prescription'
  | 'diagnosis'
  | 'discharge_summary'
  | 'surgery_report'
  | 'imaging'
  | 'lab_results'
  | 'other';

export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface ExtractedDiagnosis {
  code?: string; // CID, ICD, etc
  name: string;
  description?: string;
  severity?: 'leve' | 'moderada' | 'grave';
  chronic?: boolean;
  confidence: ExtractionConfidence;
  relevanceToPhysiotherapy: 'alta' | 'media' | 'baixa';
}

export interface ExtractedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  purpose?: string;
  sideEffects?: string[];
  physiotherapyRelevance: string;
  confidence: ExtractionConfidence;
}

export interface ExtractedContraindication {
  type: 'absolute' | 'relative' | 'precaution';
  category: 'movement' | 'exercise' | 'technique' | 'modality' | 'position';
  description: string;
  affectedRegion?: string;
  recommendation: string;
  confidence: ExtractionConfidence;
}

export interface ExtractedExamResult {
  examName: string;
  examType: string;
  findings: string[];
  abnormalities?: string[];
  normalValues?: string;
  clinicalSignificance: string;
  relevantToPhysiotherapy: boolean;
  confidence: ExtractionConfidence;
}

export interface PhysiotherapistAttention {
  level: 'critical' | 'important' | 'informational';
  category: 'safety' | 'treatment' | 'prognosis' | 'communication';
  title: string;
  description: string;
  actionRequired: string;
  sourcePage?: number;
}

export interface DocumentAnalysisResult {
  documentId: string;
  patientId: string;
  documentType: DocumentType;
  fileName: string;
  analysisDate: string;

  // Dados extraídos
  diagnoses: ExtractedDiagnosis[];
  medications: ExtractedMedication[];
  contraindications: ExtractedContraindications[];
  examResults: ExtractedExamResult[];

  // Atenção necessária
  physiotherapistAlerts: PhysiotherapistAttention[];

  // Resumo
  documentSummary: string;
  keyFindings: string[];
  recommendations: string[];

  // Metadados
  documentDate?: string;
  issuingDoctor?: string;
  institution?: string;
  pagesAnalyzed: number;
  modelUsed: string;
  processingTime: number; // em ms
  confidence: number; // 0-1
}

export interface DocumentUploadOptions {
  patientId: string;
  documentType: DocumentType;
  language?: 'pt-BR' | 'en';
  extractImages?: boolean;
  onProgress?: (progress: number, stage: string) => void;
}

export interface BatchAnalysisOptions {
  maxDocuments?: number; // max 3000
  combineResults?: boolean;
  language?: 'pt-BR' | 'en';
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
                       import.meta.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Modelos para diferentes tarefas
const DOCUMENT_MODELS = {
  pro: 'gemini-2.5-pro', // Análise complexa, melhor precisão
  flash: 'gemini-2.5-flash', // Mais rápido, bom para documentos simples
  preview: 'gemini-3-pro-preview' // Mais recente
};

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Analisa um documento médico (PDF ou imagem)
 */
export async function analyzeMedicalDocument(
  file: File,
  options: DocumentUploadOptions
): Promise<DocumentAnalysisResult> {

  const startTime = Date.now();
  const language = options.language || 'pt-BR';

  try {
    // 1. Upload do arquivo
    options.onProgress?.(10, 'Fazendo upload do documento...');

    const documentUrl = await uploadDocument(file, options.patientId);
    const documentId = extractIdFromUrl(documentUrl);

    // 2. Determinar tipo do documento
    options.onProgress?.(20, 'Identificando tipo de documento...');

    const documentType = options.documentType || await detectDocumentType(file);

    // 3. Extrair texto do documento
    options.onProgress?.(30, 'Processando documento...');

    const documentContent = await extractDocumentContent(file);

    // 4. Análise com IA
    options.onProgress?.(40, 'Analisando com IA...');

    const analysis = await performDocumentAnalysis(
      documentContent,
      documentType,
      language,
      (progress) => options.onProgress?.(40 + progress * 0.5, 'Analisando conteúdo...')
    );

    // 5. Montar resultado final
    options.onProgress?.(90, 'Finalizando análise...');

    const result: DocumentAnalysisResult = {
      documentId,
      patientId: options.patientId,
      documentType,
      fileName: file.name,
      analysisDate: new Date().toISOString(),

      diagnoses: analysis.diagnoses,
      medications: analysis.medications,
      contraindications: analysis.contraindications,
      examResults: analysis.examResults,

      physiotherapistAlerts: analysis.physiotherapistAlerts,

      documentSummary: analysis.documentSummary,
      keyFindings: analysis.keyFindings,
      recommendations: analysis.recommendations,

      pagesAnalyzed: analysis.pagesAnalyzed || 1,
      modelUsed: DOCUMENT_MODELS.pro,
      processingTime: Date.now() - startTime,
      confidence: analysis.confidence
    };

    // 6. Salvar no Firestore
    await saveDocumentAnalysis(result, documentUrl);

    options.onProgress?.(100, 'Análise concluída!');

    return result;

  } catch (error) {
    logger.error('Erro ao analisar documento', error, 'document-analysis');
    throw error;
  }
}

/**
 * Analisa múltiplos documentos em lote
 * Suporta até 3000 documentos!
 */
export async function analyzeDocumentBatch(
  files: File[],
  patientId: string,
  options: BatchAnalysisOptions = {}
): Promise<{
  individualResults: DocumentAnalysisResult[];
  combinedSummary?: {
    allDiagnoses: ExtractedDiagnosis[];
    allMedications: ExtractedMedication[];
    criticalAlerts: PhysiotherapistAttention[];
    treatmentRecommendations: string[];
  };
}> {

  const maxDocs = options.maxDocuments || 3000;
  const filesToProcess = files.slice(0, maxDocs);
  const language = options.language || 'pt-BR';

  const individualResults: DocumentAnalysisResult[] = [];

  // Processar documentos sequencialmente para evitar sobrecarga
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];

    try {
      const result = await analyzeMedicalDocument(file, {
        patientId,
        documentType: 'other',
        language,
        onProgress: (progress, stage) => {
          logger.info(`Documento ${i + 1}/${filesToProcess.length}: ${stage} (${progress}%)`, { index: i + 1, total: filesToProcess.length, progress, stage }, 'document-analysis');
        }
      });

      individualResults.push(result);

    } catch (error) {
      logger.error(`Erro ao processar arquivo ${file.name}`, error, 'document-analysis');
      // Continuar com próximos arquivos
    }
  }

  // Se solicitado, combinar resultados
  let combinedSummary;
  if (options.combineResults && individualResults.length > 0) {
    combinedSummary = await combineBatchResults(individualResults, language);
  }

  return {
    individualResults,
    combinedSummary
  };
}

/**
 * Re-analisa um documento com novas instruções
 */
export async function reanalyzeDocument(
  documentId: string,
  patientId: string,
  additionalInstructions: string,
  language: 'pt-BR' | 'en' = 'pt-BR'
): Promise<DocumentAnalysisResult> {
  // Buscar documento e re-analisar com instruções adicionais
  // Implementação depende de como documentos estão armazenados
  throw new Error('Funcionalidade a implementar');
}

// ============================================================================
// FUNÇÕES DE ANÁLISE
// ============================================================================

/**
 * Realiza a análise do conteúdo do documento com IA
 */
async function performDocumentAnalysis(
  content: string,
  documentType: DocumentType,
  language: 'pt-BR' | 'en',
  onProgress?: (progress: number) => void
): Promise<Omit<DocumentAnalysisResult, 'documentId' | 'patientId' | 'fileName' | 'analysisDate' | 'documentType' | 'pagesAnalyzed' | 'modelUsed' | 'processingTime'>> {

  const model = genAI.getGenerativeModel({ model: DOCUMENT_MODELS.pro });

  const prompt = language === 'pt-BR' ? `
Você é um assistente especializado em análise de documentos médicos para fisioterapeutas.

TIPO DE DOCUMENTO: ${documentType}

CONTEÚDO DO DOCUMENTO:
${content}

TASK: Extraia e analise as informações relevantes para fisioterapia:

1. DIAGNÓSTICOS:
   - Código (CID, se disponível)
   - Nome do diagnóstico
   - Descrição breve
   - Severidade (leve/moderada/grave)
   - Se é crônico
   - Confiança da extração (high/medium/low)
   - Relevância para fisioterapia (alta/média/baixa)

2. MEDICAÇÕES:
   - Nome do medicamento
   - Dosagem
   - Frequência
   - Propósito
   - Efeitos colaterais relevantes para fisioterapia
   - Relevância para tratamento fisioterapêutico
   - Confiança da extração

3. CONTRAINDICAÇÕES:
   - Tipo (absolute/relative/precaution)
   - Categoria (movement/exercise/technique/modality/position)
   - Descrição detalhada
   - Regão afetada (se aplicável)
   - Recomendação específica
   - Confiança da extração

4. RESULTADOS DE EXAMES:
   - Nome do exame
   - Tipo de exame
   - Achados principais
   - Anormalidades detectadas
   - Valores de referência
   - Significado clínico
   - Se é relevante para fisioterapia
   - Confiança da extração

5. ALERTAS PARA FISIOTERAPEUTA:
   - Nível (critical/important/informational)
   - Categoria (safety/treatment/prognosis/communication)
   - Título descritivo
   - Descrição detalhada
   - Ação necessária
   - Página de origem (se aplicável)

6. RESUMO E RECOMENDAÇÕES:
   - Resumo executivo do documento (2-3 frases)
   - Descobertas principais (3-5 bullets)
   - Recomendações para fisioterapia (3-5 bullets)

IMPORTANTE:
- Seja preciso e específico
- Priorize segurança do paciente
- Indique nível de confiança em cada extração
- Se algo não estiver claro, mencione no alertas
- Considere implicações para tratamento fisioterapêutico

Responda em JSON válido:
{
  "diagnoses": [{
    "code": string,
    "name": string,
    "description": string,
    "severity": "leve"|"moderada"|"grave",
    "chronic": boolean,
    "confidence": "high"|"medium"|"low",
    "relevanceToPhysiotherapy": "alta"|"media"|"baixa"
  }],
  "medications": [{
    "name": string,
    "dosage": string,
    "frequency": string,
    "purpose": string,
    "sideEffects": string[],
    "physiotherapyRelevance": string,
    "confidence": "high"|"medium"|"low"
  }],
  "contraindications": [{
    "type": "absolute"|"relative"|"precaution",
    "category": "movement"|"exercise"|"technique"|"modality"|"position",
    "description": string,
    "affectedRegion": string,
    "recommendation": string,
    "confidence": "high"|"medium"|"low"
  }],
  "examResults": [{
    "examName": string,
    "examType": string,
    "findings": string[],
    "abnormalities": string[],
    "normalValues": string,
    "clinicalSignificance": string,
    "relevantToPhysiotherapy": boolean,
    "confidence": "high"|"medium"|"low"
  }],
  "physiotherapistAlerts": [{
    "level": "critical"|"important"|"informational",
    "category": "safety"|"treatment"|"prognosis"|"communication",
    "title": string,
    "description": string,
    "actionRequired": string,
    "sourcePage": number
  }],
  "documentSummary": string,
  "keyFindings": string[],
  "recommendations": string[],
  "pagesAnalyzed": number,
  "confidence": number
}
` : `
You are a specialized assistant for medical document analysis for physical therapists.

DOCUMENT TYPE: ${documentType}

DOCUMENT CONTENT:
${content}

TASK: Extract and analyze information relevant to physical therapy:

1. DIAGNOSES:
   - Code (ICD if available)
   - Diagnosis name
   - Brief description
   - Severity (mild/moderate/severe)
   - If chronic
   - Extraction confidence (high/medium/low)
   - Relevance to physical therapy (high/medium/low)

2. MEDICATIONS:
   - Medication name
   - Dosage
   - Frequency
   - Purpose
   - Side effects relevant to physical therapy
   - Relevance to physical therapy treatment
   - Extraction confidence

3. CONTRAINDICATIONS:
   - Type (absolute/relative/precaution)
   - Category (movement/exercise/technique/modality/position)
   - Detailed description
   - Affected region (if applicable)
   - Specific recommendation
   - Extraction confidence

4. EXAM RESULTS:
   - Exam name
   - Exam type
   - Main findings
   - Detected abnormalities
   - Reference values
   - Clinical significance
   - If relevant to physical therapy
   - Extraction confidence

5. ALERTS FOR PHYSICAL THERAPIST:
   - Level (critical/important/informational)
   - Category (safety/treatment/prognosis/communication)
   - Descriptive title
   - Detailed description
   - Required action
   - Source page (if applicable)

6. SUMMARY AND RECOMMENDATIONS:
   - Executive summary (2-3 sentences)
   - Key findings (3-5 bullets)
   - Physical therapy recommendations (3-5 bullets)

IMPORTANT:
- Be precise and specific
- Prioritize patient safety
- Indicate confidence level for each extraction
- If something is unclear, mention in alerts
- Consider implications for physical therapy treatment

Respond in valid JSON:
{
  "diagnoses": [{
    "code": string,
    "name": string,
    "description": string,
    "severity": "mild"|"moderate"|"severe",
    "chronic": boolean,
    "confidence": "high"|"medium"|"low",
    "relevanceToPhysiotherapy": "high"|"medium"|"low"
  }],
  "medications": [{
    "name": string,
    "dosage": string,
    "frequency": string,
    "purpose": string,
    "sideEffects": string[],
    "physiotherapyRelevance": string,
    "confidence": "high"|"medium"|"low"
  }],
  "contraindications": [{
    "type": "absolute"|"relative"|"precaution",
    "category": "movement"|"exercise"|"technique"|"modality"|"position",
    "description": string,
    "affectedRegion": string,
    "recommendation": string,
    "confidence": "high"|"medium"|"low"
  }],
  "examResults": [{
    "examName": string,
    "examType": string,
    "findings": string[],
    "abnormalities": string[],
    "normalValues": string,
    "clinicalSignificance": string,
    "relevantToPhysiotherapy": boolean,
    "confidence": "high"|"medium"|"low"
  }],
  "physiotherapistAlerts": [{
    "level": "critical"|"important"|"informational",
    "category": "safety"|"treatment"|"prognosis"|"communication",
    "title": string,
    "description": string,
    "actionRequired": string,
    "sourcePage": number
  }],
  "documentSummary": string,
  "keyFindings": string[],
  "recommendations": string[],
  "pagesAnalyzed": number,
  "confidence": number
}
`;

  onProgress?.(50);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  onProgress?.(90);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(language === 'pt-BR'
      ? 'Resposta da IA não contém JSON válido'
      : 'AI response does not contain valid JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Combina resultados de múltiplos documentos
 */
async function combineBatchResults(
  results: DocumentAnalysisResult[],
  language: 'pt-BR' | 'en'
): Promise<{
  allDiagnoses: ExtractedDiagnosis[];
  allMedications: ExtractedMedication[];
  criticalAlerts: PhysiotherapistAttention[];
  treatmentRecommendations: string[];
}> {

  // Combinar todos os diagnósticos (remover duplicatas)
  const diagnosisMap = new Map<string, ExtractedDiagnosis>();

  results.forEach(result => {
    result.diagnoses.forEach(diag => {
      const key = diag.name.toLowerCase();
      const existing = diagnosisMap.get(key);

      if (!existing || diag.confidence === 'high') {
        diagnosisMap.set(key, diag);
      }
    });
  });

  // Combinar todos os medicamentos
  const medicationMap = new Map<string, ExtractedMedication>();

  results.forEach(result => {
    result.medications.forEach(med => {
      const key = med.name.toLowerCase();
      const existing = medicationMap.get(key);

      if (!existing || med.confidence === 'high') {
        medicationMap.set(key, med);
      }
    });
  });

  // Filtrar alertas críticos
  const criticalAlerts = results
    .flatMap(r => r.physiotherapistAlerts)
    .filter(a => a.level === 'critical');

  // Gerar recomendações combinadas
  const treatmentRecommendations = results
    .flatMap(r => r.recommendations)
    .slice(0, 10); // Top 10

  return {
    allDiagnoses: Array.from(diagnosisMap.values()),
    allMedications: Array.from(medicationMap.values()),
    criticalAlerts,
    treatmentRecommendations
  };
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Faz upload do documento para Firebase Storage
 */
async function uploadDocument(
  file: File,
  patientId: string
): Promise<string> {

  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `medical-documents/${patientId}/${timestamp}-${sanitizedFileName}`;
  const storageRef = ref(storage, filename);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'application/pdf',
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      size: file.size.toString()
    }
  });

  return getDownloadURL(storageRef);
}

/**
 * Detecta o tipo de documento automaticamente
 */
async function detectDocumentType(file: File): Promise<DocumentType> {
  // Implementar detecção baseada no nome e conteúdo
  const name = file.name.toLowerCase();

  if (name.includes('exame') || name.includes('exam') || name.includes('raio-x') || name.includes('rm') || name.includes('ressonancia')) {
    return 'exam_result';
  }
  if (name.includes('receita') || name.includes('prescription') || name.includes('medicamento')) {
    return 'prescription';
  }
  if (name.includes('alta') || name.includes('discharge') || name.includes('sumario')) {
    return 'discharge_summary';
  }
  if (name.includes('cirurgia') || name.includes('surgery') || name.includes('operatorio')) {
    return 'surgery_report';
  }
  if (name.includes('laudo') || name.includes('relatorio') || name.includes('report')) {
    return 'medical_report';
  }
  if (name.includes('diagnostico') || name.includes('diagnosis')) {
    return 'diagnosis';
  }
  if (name.includes('imagem') || name.includes('imaging') || name.includes('ultrassom')) {
    return 'imaging';
  }
  if (name.includes('laboratorio') || name.includes('lab') || name.includes('sangue')) {
    return 'lab_results';
  }

  return 'other';
}

/**
 * Extrai conteúdo de texto do documento
 * Para PDFs, imagens, etc.
 */
async function extractDocumentContent(file: File): Promise<string> {

  // Se for imagem, pode tentar usar visão do Gemini
  if (file.type.startsWith('image/')) {
    return await extractFromImage(file);
  }

  // Se for PDF, extrair texto
  if (file.type === 'application/pdf') {
    return await extractFromPDF(file);
  }

  // Para outros tipos, tentar ler como texto
  return await file.text();
}

/**
 * Extrai texto de imagem usando Gemini Vision
 */
async function extractFromImage(file: File): Promise<string> {

  const model = genAI.getGenerativeModel({ model: DOCUMENT_MODELS.pro });

  const imageData = await fileToBase64(file);

  const prompt = `
Extraia todo o texto visível desta imagem de documento médico.
Mantenha a formatação e estrutura original.
Se houver tabelas, represente-as claramente.
Ignore marcas d'água e ruído.

Retorne apenas o texto extraído, sem comentários adicionais.
`;

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: file.type,
        data: imageData.split(',')[1] // Remove data: prefix
      }
    },
    { text: prompt }
  ]);

  return result.response.text();
}

/**
 * Extrai texto de PDF
 * Simplificado - na produção usar biblioteca como pdf-parse
 */
async function extractFromPDF(file: File): Promise<string> {

  // Na implementação real, usar uma biblioteca de PDF
  // Por ora, retorna placeholder
  return `[CONTEÚDO DO PDF: ${file.name}]
[A extração de texto de PDF requer biblioteca adicional como pdf-parse]
[Implemente pdf-parse ou similar para extração completa]`;
}

/**
 * Converte arquivo para base64
 */
async function fileToBase64(file: File): Promise<string> {

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/**
 * Extrai ID da URL do Storage
 */
function extractIdFromUrl(url: string): string {

  const matches = url.match(/\/([0-9]+-[^/]+)/);
  return matches ? matches[1] : `doc_${Date.now()}`;
}

/**
 * Salva resultado da análise no Firestore
 */
async function saveDocumentAnalysis(
  result: DocumentAnalysisResult,
  documentUrl: string
): Promise<void> {

  const analysisRef = doc(
    collection(db, 'patients', result.patientId, 'document-analyses')
  );

  await setDoc(analysisRef, {
    ...result,
    documentUrl,
    createdAt: serverTimestamp(),
    id: analysisRef.id
  });

  // Atualizar perfil do paciente com diagnósticos e medicações
  const patientRef = doc(db, 'patients', result.patientId);

  if (result.diagnoses.length > 0) {
    await updateDoc(patientRef, {
      diagnoses: arrayUnion(...result.diagnoses.map(d => ({
        name: d.name,
        code: d.code,
        severity: d.severity,
        source: result.documentId,
        date: result.analysisDate
      })))
    });
  }

  if (result.medications.length > 0) {
    await updateDoc(patientRef, {
      medications: arrayUnion(...result.medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        source: result.documentId,
        date: result.analysisDate
      })))
    });
  }

  // Adicionar alertas críticos se houver
  if (result.physiotherapistAlerts.some(a => a.level === 'critical')) {
    await updateDoc(patientRef, {
      criticalAlerts: arrayUnion(...result.physiotherapistAlerts
        .filter(a => a.level === 'critical')
        .map(a => ({
          ...a,
          source: result.documentId,
          date: result.analysisDate
        }))
      )
    });
  }
}

/**
 * Busca análises de documentos de um paciente
 */
export async function getPatientDocumentAnalyses(
  patientId: string,
  limit = 20
): Promise<DocumentAnalysisResult[]> {

  // Implementar busca no Firestore
  // Por ora, retorna array vazio
  return [];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  analyzeMedicalDocument,
  analyzeDocumentBatch,
  reanalyzeDocument,
  getPatientDocumentAnalyses
};

export type {
  DocumentType,
  ExtractionConfidence,
  ExtractedDiagnosis,
  ExtractedMedication,
  ExtractedContraindication,
  ExtractedExamResult,
  PhysiotherapistAttention,
  DocumentAnalysisResult,
  DocumentUploadOptions,
  BatchAnalysisOptions
};
