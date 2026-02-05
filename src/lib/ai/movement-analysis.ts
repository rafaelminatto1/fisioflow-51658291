/**
 * Módulo de Análise Multimodal de Movimento - FASE 3
 * Analisa forma de exercícios a partir de vídeo usando IA
 *
 * Recursos:
 * - Análise de vídeo até 60 minutos
 * - Comparação com vídeo demo de forma correta
 * - Pontuação de qualidade (0-100)
 * - Identificação de desvios com timestamps
 * - Alertas de segurança
 *
 * @module lib/ai/movement-analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage, db, doc, setDoc, collection, serverTimestamp } from '@/integrations/firebase/app';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ExerciseFormDeviation {
  timestamp: number; // em segundos
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  bodyPart: string;
  correction: string;
  frameUrl?: string; // URL para o frame específico
}

export interface FormQualityScore {
  overall: number; // 0-100
  posture: number; // 0-100
  rangeOfMotion: number; // 0-100
  control: number; // 0-100
  tempo: number; // 0-100
  breathing: number; // 0-100
}

export interface SafetyConcern {
  type: 'joint_overload' | 'spinal_compression' | 'loss_of_balance' | 'excessive_speed' | 'pain_indicator';
  severity: 'warning' | 'danger';
  description: string;
  timestamp: number;
  recommendation: string;
}

export interface MovementAnalysisResult {
  exerciseId: string;
  exerciseName: string;
  patientId: string;
  analysisDate: string;

  // Vídeos
  demoVideoUrl?: string;
  patientVideoUrl: string;
  patientVideoDuration: number; // em segundos

  // Resultados
  formQuality: FormQualityScore;
  deviations: ExerciseFormDeviation[];
  safetyConcerns: SafetyConcern[];
  repetitions: number;

  // Feedback
  summary: string;
  strengths: string[];
  improvements: string[];
  progression: string;

  // Metadados
  modelUsed: string;
  processingTime: number; // em ms
  confidence: number; // 0-1
}

export interface VideoAnalysisOptions {
  exerciseId: string;
  exerciseName: string;
  patientId: string;
  demoVideoUrl?: string;
  expectedReps?: number;
  focusAreas?: string[]; // áreas específicas para focar
  language?: 'pt-BR' | 'en';
}

export interface AnalysisProgress {
  stage: 'uploading' | 'analyzing' | 'processing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
                       import.meta.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Modelos suportados para vídeo
const VIDEO_MODELS = {
  pro: 'gemini-2.5-pro', // Melhor análise, suporta 60min
  flash: 'gemini-2.5-flash', // Mais rápido, melhor custo-benefício
  vision: 'gemini-3-pro-preview' // Mais recente, melhor visão
};

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Analisa vídeo de exercício do paciente comparando com forma correta
 * Suporta vídeos de até 60 minutos (3600 segundos)
 */
export async function analyzeExerciseForm(
  patientVideoFile: File,
  options: VideoAnalysisOptions,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<MovementAnalysisResult> {

  const startTime = Date.now();
  let patientVideoUrl = '';
  let demoVideoUrl = options.demoVideoUrl || '';

  try {
    // 1. Upload do vídeo do paciente
    onProgress?.({
      stage: 'uploading',
      progress: 10,
      message: 'Fazendo upload do vídeo...'
    });

    patientVideoUrl = await uploadExerciseVideo(
      patientVideoFile,
      options.patientId,
      options.exerciseId
    );

    // 2. Se não há demo vídeo, buscar vídeo demo padrão
    if (!demoVideoUrl) {
      onProgress?.({
        stage: 'processing',
        progress: 20,
        message: 'Buscando vídeo de referência...'
      });
      demoVideoUrl = await getDefaultDemoVideo(options.exerciseId);
    }

    // 3. Análise com IA
    onProgress?.({
      stage: 'analyzing',
      progress: 30,
      message: 'Analisando movimento com IA...'
    });

    const result = await performVideoAnalysis(
      patientVideoUrl,
      demoVideoUrl,
      options,
      onProgress
    );

    // 4. Salvar resultado no Firestore
    onProgress?.({
      stage: 'processing',
      progress: 90,
      message: 'Salvando análise...'
    });

    await saveAnalysisResult(result);

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Análise concluída!'
    });

    return result;

  } catch (error) {
    logger.error('Erro na análise de movimento', error, 'movement-analysis');
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}

/**
 * Realiza a análise de vídeo usando Gemini Pro
 */
async function performVideoAnalysis(
  patientVideoUrl: string,
  demoVideoUrl: string,
  options: VideoAnalysisOptions,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<MovementAnalysisResult> {

  // Usar Gemini 2.5 Pro para melhor análise (suporta até 60min)
  const model = genAI.getGenerativeModel({ model: VIDEO_MODELS.pro });

  const language = options.language || 'pt-BR';
  const labels = language === 'pt-BR' ? {
    posture: 'Postura',
    rom: 'Amplitude de Movimento',
    control: 'Controle Motor',
    tempo: 'Tempo e Cadência',
    breathing: 'Respiração',
    summary: 'Resumo da Análise',
    strengths: 'Pontos Fortes',
    improvements: 'Pontos de Melhoria',
    progression: 'Progressão Sugerida'
  } : {
    posture: 'Posture',
    rom: 'Range of Motion',
    control: 'Motor Control',
    tempo: 'Tempo and Cadence',
    breathing: 'Breathing',
    summary: 'Analysis Summary',
    strengths: 'Strengths',
    improvements: 'Areas for Improvement',
    progression: 'Suggested Progression'
  };

  // Prompt estruturado para análise
  const prompt = language === 'pt-BR' ? `
Você é um especialista em biomecânica e fisioterapia analisando a execução de exercícios.

EXERCÍCIO: ${options.exerciseName}
REpetições esperadas: ${options.expectedReps || 'não especificado'}

VÍDEO DEMO (forma correta): ${demoVideoUrl}
VÍDEDO DO PACIENTE (para análise): ${patientVideoUrl}

${options.focusAreas ? `
ÁREAS DE FOCO ESPECIAIS:
${options.focusAreas.map(area => `- ${area}`).join('\n')}
` : ''}

TASK: Analise o vídeo do paciente comparando com o demo e forneça:

1. PONTUAÇÃO DE QUALIDADE (0-100 para cada aspecto):
   - Postura: alinhamento corporal geral
   - Amplitude de Movimento: completude do movimento
   - Controle Motor: estabilidade e controle muscular
   - Tempo e Cadência: ritmo apropriado
   - Respiração: coordenação respiratória

2. DESVIOS IDENTIFICADOS (lista com timestamps em segundos):
   - Timestamp específico
   - Problema detectado
   - Severidade (low/medium/high/critical)
   - Parte do corpo afetada
   - Correção sugerida

3. PREOCUPAÇÕES DE SEGURANÇA (se houver):
   - Tipo: joint_overload, spinal_compression, loss_of_balance, excessive_speed, pain_indicator
   - Severidade: warning ou danger
   - Descrição detalhada
   - Timestamp
   - Recomendação imediata

4. CONTAGEM DE REPETIÇÕES REALIZADAS

5. FEEDBACK COMPLETO:
   - ${labels.summary}: análise geral em 2-3 frases
   - ${labels.strengths}: 3-5 pontos que o paciente fez bem
   - ${labels.improvements}: 3-5 áreas para trabalhar
   - ${labels.progression}: próxima progressão ou regressão adequada

IMPORTANTE:
- Seja específico com timestamps (ex: "00:15", "01:30")
- Priorize alertas de segurança acima de tudo
- Use linguagem clara e encorajadora
- Forneça correções acionáveis

Responda em JSON válido com esta estrutura:
{
  "formQuality": {
    "overall": number,
    "posture": number,
    "rangeOfMotion": number,
    "control": number,
    "tempo": number,
    "breathing": number
  },
  "deviations": [{
    "timestamp": number,
    "issue": string,
    "severity": "low"|"medium"|"high"|"critical",
    "bodyPart": string,
    "correction": string
  }],
  "safetyConcerns": [{
    "type": string,
    "severity": "warning"|"danger",
    "description": string,
    "timestamp": number,
    "recommendation": string
  }],
  "repetitions": number,
  "summary": string,
  "strengths": string[],
  "improvements": string[],
  "progression": string,
  "confidence": number
}
` : `
You are a biomechanics and physical therapy expert analyzing exercise execution.

EXERCISE: ${options.exerciseName}
Expected reps: ${options.expectedReps || 'not specified'}

DEMO VIDEO (correct form): ${demoVideoUrl}
PATIENT VIDEO (to analyze): ${patientVideoUrl}

${options.focusAreas ? `
SPECIAL FOCUS AREAS:
${options.focusAreas.map(area => `- ${area}`).join('\n')}
` : ''}

TASK: Analyze the patient's video comparing with the demo and provide:

1. QUALITY SCORES (0-100 for each aspect):
   - Posture: overall body alignment
   - Range of Motion: movement completeness
   - Motor Control: stability and muscular control
   - Tempo and Cadence: appropriate rhythm
   - Breathing: breathing coordination

2. IDENTIFIED DEVIATIONS (list with timestamps in seconds):
   - Specific timestamp
   - Problem detected
   - Severity (low/medium/high/critical)
   - Body part affected
   - Suggested correction

3. SAFETY CONCERNS (if any):
   - Type: joint_overload, spinal_compression, loss_of_balance, excessive_speed, pain_indicator
   - Severity: warning or danger
   - Detailed description
   - Timestamp
   - Immediate recommendation

4. REPETITION COUNT PERFORMED

5. COMPLETE FEEDBACK:
   - ${labels.summary}: general analysis in 2-3 sentences
   - ${labels.strengths}: 3-5 things patient did well
   - ${labels.improvements}: 3-5 areas to work on
   - ${labels.progression}: appropriate next progression or regression

IMPORTANT:
- Be specific with timestamps (ex: "00:15", "01:30")
- Prioritize safety alerts above all
- Use clear, encouraging language
- Provide actionable corrections

Respond in valid JSON with this structure:
{
  "formQuality": {
    "overall": number,
    "posture": number,
    "rangeOfMotion": number,
    "control": number,
    "tempo": number,
    "breathing": number
  },
  "deviations": [{
    "timestamp": number,
    "issue": string,
    "severity": "low"|"medium"|"high"|"critical",
    "bodyPart": string,
    "correction": string
  }],
  "safetyConcerns": [{
    "type": string,
    "severity": "warning"|"danger",
    "description": string,
    "timestamp": number,
    "recommendation": string
  }],
  "repetitions": number,
  "summary": string,
  "strengths": string[],
  "improvements": string[],
  "progression": string,
  "confidence": number
}
`;

  onProgress?.({
    stage: 'analyzing',
    progress: 50,
    message: language === 'pt-BR' ? 'Processando vídeo com IA...' : 'Processing video with AI...'
  });

  // Chamar API Gemini com ambos os vídeos
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: 'video/*',
        fileUri: patientVideoUrl
      }
    },
    {
      fileData: {
        mimeType: 'video/*',
        fileUri: demoVideoUrl
      }
    },
    { text: prompt }
  ]);

  const response = result.response;
  const text = response.text();

  // Extrair JSON da resposta
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(language === 'pt-BR'
      ? 'Resposta da IA não contém JSON válido'
      : 'AI response does not contain valid JSON');
  }

  const analysisData = JSON.parse(jsonMatch[0]);

  // Obter duração do vídeo (se disponível)
  const patientVideoDuration = await getVideoDuration(patientVideoUrl);

  // Construir resultado completo
  const finalResult: MovementAnalysisResult = {
    exerciseId: options.exerciseId,
    exerciseName: options.exerciseName,
    patientId: options.patientId,
    analysisDate: new Date().toISOString(),

    demoVideoUrl,
    patientVideoUrl,
    patientVideoDuration,

    formQuality: {
      overall: analysisData.formQuality.overall,
      posture: analysisData.formQuality.posture,
      rangeOfMotion: analysisData.formQuality.rangeOfMotion,
      control: analysisData.formQuality.control,
      tempo: analysisData.formQuality.tempo,
      breathing: analysisData.formQuality.breathing
    },

    deviations: analysisData.deviations || [],
    safetyConcerns: analysisData.safetyConcerns || [],
    repetitions: analysisData.repetitions,

    summary: analysisData.summary,
    strengths: analysisData.strengths || [],
    improvements: analysisData.improvements || [],
    progression: analysisData.progression,

    modelUsed: VIDEO_MODELS.pro,
    processingTime: Date.now() - startTime,
    confidence: analysisData.confidence || 0.8
  };

  return finalResult;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Faz upload do vídeo para Firebase Storage
 */
async function uploadExerciseVideo(
  file: File,
  patientId: string,
  exerciseId: string
): Promise<string> {
  const timestamp = Date.now();
  const filename = `exercise-analysis/${patientId}/${exerciseId}/${timestamp}.mp4`;
  const storageRef = ref(storage, filename);

  await uploadBytes(storageRef, file, {
    contentType: 'video/mp4',
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name
    }
  });

  return getDownloadURL(storageRef);
}

/**
 * Busca vídeo demo padrão para um exercício
 */
async function getDefaultDemoVideo(exerciseId: string): Promise<string> {
  // Tenta buscar do Storage
  const demoRef = ref(storage, `exercise-demos/${exerciseId}/demo.mp4`);

  try {
    return await getDownloadURL(demoRef);
  } catch {
    // Se não encontrar, retorna URL de placeholder
    logger.warn(`Demo video not found for exercise ${exerciseId}`, undefined, 'movement-analysis');
    return '';
  }
}

/**
 * Obtém duração do vídeo
 */
async function getVideoDuration(videoUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      resolve(0);
    };

    video.src = videoUrl;
  });
}

/**
 * Salva resultado da análise no Firestore
 */
async function saveAnalysisResult(result: MovementAnalysisResult): Promise<void> {
  const analysisRef = doc(
    collection(db, 'patients', result.patientId, 'exercise-analyses')
  );

  await setDoc(analysisRef, {
    ...result,
    createdAt: serverTimestamp(),
    id: analysisRef.id
  });
}

/**
 * Obtém análises anteriores de um exercício
 */
export async function getExerciseAnalysisHistory(
  patientId: string,
  exerciseId: string,
  limit = 10
): Promise<MovementAnalysisResult[]> {
  // Implementar busca no Firestore
  // Por ora, retorna array vazio
  return [];
}

/**
 * Compara evolução entre análises
 */
export function compareAnalyses(
  previous: MovementAnalysisResult,
  current: MovementAnalysisResult
): {
  improved: string[];
  worsened: string[];
  stable: string[];
  overallImprovement: number;
} {
  const improved: string[] = [];
  const worsened: string[] = [];
  const stable: string[] = [];

  const aspects = [
    { key: 'posture', label: 'Postura' },
    { key: 'rangeOfMotion', label: 'Amplitude de Movimento' },
    { key: 'control', label: 'Controle Motor' },
    { key: 'tempo', label: 'Tempo' },
    { key: 'breathing', label: 'Respiração' }
  ] as const;

  aspects.forEach(({ key, label }) => {
    const prevScore = previous.formQuality[key];
    const currScore = current.formQuality[key];
    const diff = currScore - prevScore;

    if (diff > 5) improved.push(label);
    else if (diff < -5) worsened.push(label);
    else stable.push(label);
  });

  const overallImprovement = current.formQuality.overall - previous.formQuality.overall;

  return {
    improved,
    worsened,
    stable,
    overallImprovement
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  analyzeExerciseForm,
  getExerciseAnalysisHistory,
  compareAnalyses,
  VIDEO_MODELS
};

export type {
  ExerciseFormDeviation,
  FormQualityScore,
  SafetyConcern,
  MovementAnalysisResult,
  VideoAnalysisOptions,
  AnalysisProgress
};
