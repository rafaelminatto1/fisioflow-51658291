/**
 * Módulo de Análise de Mapa de Dor com Visão - FASE 3
 * Analisa evolução da dor usando IA e visão computacional
 *
 * Recursos:
 * - Análise de evolução da dor entre avaliações
 * - Identificação de padrões de migração da dor
 * - Rastreamento de resposta ao tratamento
 * - Geração de anotações visuais
 * - Uso de Gemini Flash para eficiência
 *
 * @module lib/ai/pain-analysis
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';
import type { PainMapRecord, PainMapPoint, PainEvolutionData } from '@/types/painMap';

// ============================================================================
// TYPES
// ============================================================================

export interface PainMigrationPattern {
  fromRegion: string;
  toRegion: string;
  direction: 'centralizing' | 'peripheralizing' | 'shifting' | 'static';
  significance: 'positive' | 'neutral' | 'concerning';
  description: string;
  clinicalImplication: string;
}

export interface PainTrendAnalysis {
  overallTrend: 'improving' | 'stable' | 'worsening';
  globalPainChange: number; // diferença absoluta
  percentageChange: number; // porcentagem de mudança
  trendDescription: string;
  confidence: number;
}

export interface TreatmentResponse {
  effectiveness: 'excellent' | 'good' | 'moderate' | 'minimal' | 'none' | 'worsening';
  painReductionPercentage: number;
  regionSpecificResponses: RegionResponse[];
  overallAssessment: string;
  recommendations: string[];
}

export interface RegionResponse {
  region: string;
  initialIntensity: number;
  currentIntensity: number;
  change: number;
  response: 'resolved' | 'improved' | 'stable' | 'worsened' | 'new';
}

export interface VisualAnnotation {
  region: string;
  type: 'improvement' | 'concern' | 'stable' | 'new_pain';
  color: string;
  label: string;
  description: string;
  coordinates: { x: number; y: number };
}

export interface PainAnalysisResult {
  patientId: string;
  assessmentPeriod: {
    startDate: string;
    endDate: string;
    daysBetween: number;
  };

  // Dados comparativos
  initialAssessment: PainEvolutionData;
  currentAssessment: PainEvolutionData;
  allAssessments: PainEvolutionData[];

  // Análises
  migrationPatterns: PainMigrationPattern[];
  trendAnalysis: PainTrendAnalysis;
  treatmentResponse: TreatmentResponse;
  visualAnnotations: VisualAnnotation[];

  // Insights
  keyFindings: string[];
  clinicalAlerts: string[];
  positiveIndicators: string[];

  // Metadados
  analysisDate: string;
  modelUsed: string;
  confidence: number;
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
                       import.meta.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Usar Gemini 2.5 Flash para eficiência em análise de dor
const PAIN_MODEL = 'gemini-2.5-flash';

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Analisa evolução da dor entre múltiplas avaliações
 */
export async function analyzePainEvolution(
  patientId: string,
  startDate?: Date,
  endDate?: Date,
  language: 'pt-BR' | 'en' = 'pt-BR'
): Promise<PainAnalysisResult> {

  // 1. Buscar avaliações do período
  const assessments = await getPainAssessments(patientId, startDate, endDate);

  if (assessments.length < 2) {
    throw new Error(language === 'pt-BR'
      ? 'É necessário pelo menos 2 avaliações para analisar evolução'
      : 'At least 2 assessments are required to analyze evolution');
  }

  const initialAssessment = assessments[0];
  const currentAssessment = assessments[assessments.length - 1];

  // 2. Analisar padrões de migração
  const migrationPatterns = analyzeMigrationPatterns(initialAssessment, currentAssessment);

  // 3. Analisar tendência
  const trendAnalysis = analyzeTrend(assessments);

  // 4. Avaliar resposta ao tratamento
  const treatmentResponse = evaluateTreatmentResponse(
    initialAssessment,
    currentAssessment,
    assessments
  );

  // 5. Gerar anotações visuais
  const visualAnnotations = generateVisualAnnotations(
    initialAssessment,
    currentAssessment
  );

  // 6. Gerar insights com IA
  const insights = await generatePainInsights(
    assessments,
    migrationPatterns,
    trendAnalysis,
    language
  );

  return {
    patientId,
    assessmentPeriod: {
      startDate: initialAssessment.date,
      endDate: currentAssessment.date,
      daysBetween: calculateDaysBetween(
        new Date(initialAssessment.date),
        new Date(currentAssessment.date)
      )
    },
    initialAssessment,
    currentAssessment,
    allAssessments: assessments,
    migrationPatterns,
    trendAnalysis,
    treatmentResponse,
    visualAnnotations,
    keyFindings: insights.keyFindings,
    clinicalAlerts: insights.clinicalAlerts,
    positiveIndicators: insights.positiveIndicators,
    analysisDate: new Date().toISOString(),
    modelUsed: PAIN_MODEL,
    confidence: insights.confidence
  };
}

/**
 * Analisa uma imagem de mapa de dor usando visão computacional
 */
export async function analyzePainMapImage(
  imageUrl: string,
  patientContext?: {
    condition?: string;
    previousPainLevel?: number;
    treatmentPhase?: string;
  },
  language: 'pt-BR' | 'en' = 'pt-BR'
): Promise<{
  detectedRegions: Array<{
    region: string;
    intensity: number;
    confidence: number;
  }>;
  globalAssessment: string;
  recommendations: string[];
}> {

  const model = genAI.getGenerativeModel({ model: PAIN_MODEL });

  const prompt = language === 'pt-BR' ? `
Você é um especialista em fisioterapia analisando um mapa de dor.

IMAGEM DO MAPA DE DOR: ${imageUrl}

${patientContext ? `
CONTEXTO DO PACIENTE:
- Condição: ${patientContext.condition || 'Não especificada'}
- Nível anterior de dor: ${patientContext.previousPainLevel || 'N/A'}/10
- Fase do tratamento: ${patientContext.treatmentPhase || 'Não especificada'}
` : ''}

TASK: Analise a imagem do mapa de dor e forneça:

1. REGIÕES DETECTADAS:
   - Nome da região corporal
   - Intensidade estimada (0-10)
   - Confiança da detecção (0-1)

2. AVALIAÇÃO GLOBAL:
   - Resumo da distribuição da dor
   - Padrões identificados (centralização, periferização, etc.)
   - Comparação com contexto se disponível

3. RECOMENDAÇÕES:
   - Áreas para priorizar
   - Técnicas sugeridas
   - Precauções

IMPORTANTE:
- A imagem usa cores para indicar intensidade (verde=baixa, amarela=média, vermelha=alta)
- Pontos maiores indicam área afetada maior
- Considere a posição anatômica correta

Responda em JSON válido:
{
  "detectedRegions": [{
    "region": string,
    "intensity": number (0-10),
    "confidence": number (0-1)
  }],
  "globalAssessment": string,
  "recommendations": string[],
  "overallConfidence": number
}
` : `
You are a physical therapy expert analyzing a pain map.

PAIN MAP IMAGE: ${imageUrl}

${patientContext ? `
PATIENT CONTEXT:
- Condition: ${patientContext.condition || 'Not specified'}
- Previous pain level: ${patientContext.previousPainLevel || 'N/A'}/10
- Treatment phase: ${patientContext.treatmentPhase || 'Not specified'}
` : ''}

TASK: Analyze the pain map image and provide:

1. DETECTED REGIONS:
   - Body region name
   - Estimated intensity (0-10)
   - Detection confidence (0-1)

2. GLOBAL ASSESSMENT:
   - Pain distribution summary
   - Identified patterns (centralization, peripheralization, etc.)
   - Comparison with context if available

3. RECOMMENDATIONS:
   - Areas to prioritize
   - Suggested techniques
   - Precautions

IMPORTANT:
- Image uses colors to indicate intensity (green=low, yellow=medium, red=high)
- Larger points indicate larger affected area
- Consider correct anatomical position

Respond in valid JSON:
{
  "detectedRegions": [{
    "region": string,
    "intensity": number (0-10),
    "confidence": number (0-1)
  }],
  "globalAssessment": string,
  "recommendations": string[],
  "overallConfidence": number
}
`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType: 'image/png',
        data: imageUrl
      }
    }
  ]);

  const response = result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(language === 'pt-BR'
      ? 'Resposta da IA não contém JSON válido'
      : 'AI response does not contain valid JSON');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Compara dois mapas de dor e destaca diferenças
 */
export function comparePainMaps(
  before: PainMapRecord,
  after: PainMapRecord,
  language: 'pt-BR' | 'en' = 'pt-BR'
): {
  resolvedRegions: string[];
  newRegions: string[];
  improvedRegions: Array<{ region: string; reduction: number }>;
  worsenedRegions: Array<{ region: string; increase: number }>;
  summary: string;
} {

  const beforeMap = new Map(before.pain_points.map(p => [p.region, p]));
  const afterMap = new Map(after.pain_points.map(p => [p.region, p]));

  const allRegions = new Set([
    ...before.pain_points.map(p => p.region),
    ...after.pain_points.map(p => p.region)
  ]);

  const resolvedRegions: string[] = [];
  const newRegions: string[] = [];
  const improvedRegions: Array<{ region: string; reduction: number }> = [];
  const worsenedRegions: Array<{ region: string; increase: number }> = [];

  allRegions.forEach(region => {
    const beforePoint = beforeMap.get(region);
    const afterPoint = afterMap.get(region);

    if (!beforePoint && afterPoint) {
      newRegions.push(region);
    } else if (beforePoint && !afterPoint) {
      resolvedRegions.push(region);
    } else if (beforePoint && afterPoint) {
      const change = afterPoint.intensity - beforePoint.intensity;
      if (change < -2) {
        improvedRegions.push({ region, reduction: Math.abs(change) });
      } else if (change > 2) {
        worsenedRegions.push({ region, increase: change });
      }
    }
  });

  const globalChange = after.global_pain_level - before.global_pain_level;

  const summary = language === 'pt-BR' ? `
Mudança no nível global de dor: ${globalChange > 0 ? '+' : ''}${globalChange}
Regiões resolvidas: ${resolvedRegions.length}
Novas regiões: ${newRegions.length}
Regiões melhoradas: ${improvedRegions.length}
Regiões agravadas: ${worsenedRegions.length}
  `.trim() : `
Global pain level change: ${globalChange > 0 ? '+' : ''}${globalChange}
Resolved regions: ${resolvedRegions.length}
New regions: ${newRegions.length}
Improved regions: ${improvedRegions.length}
Worsened regions: ${worsenedRegions.length}
  `.trim();

  return {
    resolvedRegions,
    newRegions,
    improvedRegions,
    worsenedRegions,
    summary
  };
}

// ============================================================================
// FUNÇÕES DE ANÁLISE
// ============================================================================

/**
 * Analisa padrões de migração da dor
 */
function analyzeMigrationPatterns(
  initial: PainEvolutionData,
  current: PainEvolutionData
): PainMigrationPattern[] {

  const patterns: PainMigrationPattern[] = [];

  const initialMap = new Map(initial.painPoints.map(p => [p.region, p]));
  const currentMap = new Map(current.painPoints.map(p => [p.region, p]));

  // Verificar centralização (bom sinal para lombar/cervical)
  if (isCentralizing(initial, current)) {
    patterns.push({
      fromRegion: getMostDistalRegion(initial),
      toRegion: getMostProximalRegion(current),
      direction: 'centralizing',
      significance: 'positive',
      description: 'A dor está migrando para a região central (proximal)',
      clinicalImplication: 'Geralmente indica melhora e bom prognóstico'
    });
  }

  // Verificar periferização (ruim sinal)
  if (isPeripheralizing(initial, current)) {
    patterns.push({
      fromRegion: getMostProximalRegion(initial),
      toRegion: getMostDistalRegion(current),
      direction: 'peripheralizing',
      significance: 'concerning',
      description: 'A dor está migrando para a periferia (distal)',
      clinicalImplication: 'Pode indicar piora, requer reavaliação'
    });
  }

  // Verificar migrações entre regiões específicas
  currentMap.forEach((currentPoint, region) => {
    const initialPoint = initialMap.get(region);

    if (!initialPoint && currentPoint) {
      patterns.push({
        fromRegion: 'Nenhuma',
        toRegion: region,
        direction: 'shifting',
        significance: 'neutral',
        description: `Nova dor apareceu em ${region}`,
        clinicalImplication: 'Avaliar se é relacionada ou nova queixa'
      });
    }
  });

  return patterns;
}

/**
 * Analisa tendência da dor ao longo do tempo
 */
function analyzeTrend(assessments: PainEvolutionData[]): PainTrendAnalysis {

  if (assessments.length < 2) {
    return {
      overallTrend: 'stable',
      globalPainChange: 0,
      percentageChange: 0,
      trendDescription: 'Dados insuficientes',
      confidence: 0
    };
  }

  const first = assessments[0];
  const last = assessments[assessments.length - 1];

  const absoluteChange = first.globalPainLevel - last.globalPainLevel;
  const percentageChange = first.globalPainLevel > 0
    ? (absoluteChange / first.globalPainLevel) * 100
    : 0;

  let trend: 'improving' | 'stable' | 'worsening';
  let description: string;

  if (percentageChange > 20) {
    trend = 'improving';
    description = `Melhora significativa de ${percentageChange.toFixed(0)}% no nível de dor`;
  } else if (percentageChange > 5) {
    trend = 'improving';
    description = `Melhora moderada de ${percentageChange.toFixed(0)}% no nível de dor`;
  } else if (percentageChange < -20) {
    trend = 'worsening';
    description = `Piora significativa de ${Math.abs(percentageChange).toFixed(0)}% no nível de dor`;
  } else if (percentageChange < -5) {
    trend = 'worsening';
    description = `Piora moderada de ${Math.abs(percentageChange).toFixed(0)}% no nível de dor`;
  } else {
    trend = 'stable';
    description = 'Nível de dor permanece estável';
  }

  return {
    overallTrend: trend,
    globalPainChange: absoluteChange,
    percentageChange,
    trendDescription: description,
    confidence: Math.min(1, assessments.length / 10) // Mais avaliações = mais confiança
  };
}

/**
 * Avalia resposta ao tratamento
 */
function evaluateTreatmentResponse(
  initial: PainEvolutionData,
  current: PainEvolutionData,
  allAssessments: PainEvolutionData[]
): TreatmentResponse {

  const painReduction = initial.globalPainLevel - current.globalPainLevel;
  const percentageReduction = initial.globalPainLevel > 0
    ? (painReduction / initial.globalPainLevel) * 100
    : 0;

  let effectiveness: TreatmentResponse['effectiveness'];

  if (percentageReduction >= 70) effectiveness = 'excellent';
  else if (percentageReduction >= 50) effectiveness = 'good';
  else if (percentageReduction >= 30) effectiveness = 'moderate';
  else if (percentageReduction >= 10) effectiveness = 'minimal';
  else if (percentageReduction > 0) effectiveness = 'minimal';
  else if (percentageReduction === 0) effectiveness = 'none';
  else effectiveness = 'worsening';

  // Análise por região
  const regionResponses: RegionResponse[] = [];
  const initialMap = new Map(initial.painPoints.map(p => [p.region, p]));
  const currentMap = new Map(current.painPoints.map(p => [p.region, p]));

  const allRegions = new Set([...initial.painPoints, ...current.painPoints].map(p => p.region));

  allRegions.forEach(region => {
    const initialPoint = initialMap.get(region);
    const currentPoint = currentMap.get(region);
    const initialIntensity = initialPoint?.intensity || 0;
    const currentIntensity = currentPoint?.intensity || 0;
    const change = initialIntensity - currentIntensity;

    let response: RegionResponse['response'];
    if (!initialPoint && currentPoint) response = 'new';
    else if (initialPoint && !currentPoint) response = 'resolved';
    else if (change >= 3) response = 'improved';
    else if (change <= -3) response = 'worsened';
    else response = 'stable';

    regionResponses.push({
      region,
      initialIntensity,
      currentIntensity,
      change,
      response
    });
  });

  const overallAssessment = `${effectiveness === 'excellent' ? 'Excelente' : effectiveness === 'good' ? 'Boa' : effectiveness === 'moderate' ? 'Moderada' : effectiveness === 'minimal' ? 'Mínima' : effectiveness === 'none' ? 'Sem melhora' : 'Piora'} resposta ao tratamento com ${percentageReduction.toFixed(0)}% de redução da dor.`;

  const recommendations: string[] = [];

  if (effectiveness === 'worsening') {
    recommendations.push('Reavaliar plano de tratamento');
    recommendations.push('Considerar diferentes abordagens');
  } else if (effectiveness === 'none' || effectiveness === 'minimal') {
    recommendations.push('Ajustar parâmetros do tratamento atual');
    recommendations.push('Avaliar adesão do paciente');
  } else if (effectiveness === 'moderate' || effectiveness === 'good') {
    recommendations.push('Continuar tratamento atual');
    recommendations.push('Monitorar evolução');
  } else if (effectiveness === 'excellent') {
    recommendations.push('Manter tratamento atual');
    recommendations.push('Considerar progressão dos exercícios');
  }

  if (regionResponses.some(r => r.response === 'new')) {
    recommendations.push('Investigar novas áreas de dor');
  }

  if (regionResponses.some(r => r.response === 'worsened')) {
    recommendations.push('Revisar técnicas e carga');
  }

  return {
    effectiveness,
    painReductionPercentage: percentageReduction,
    regionSpecificResponses: regionResponses,
    overallAssessment,
    recommendations
  };
}

/**
 * Gera anotações visuais para o mapa de dor
 */
function generateVisualAnnotations(
  initial: PainEvolutionData,
  current: PainEvolutionData
): VisualAnnotation[] {

  const annotations: VisualAnnotation[] = [];

  const initialMap = new Map(initial.painPoints.map(p => [p.region, p]));
  const currentMap = new Map(current.painPoints.map(p => [p.region, p]));

  current.painPoints.forEach(point => {
    const initialPoint = initialMap.get(point.region);
    const change = initialPoint ? point.intensity - initialPoint.intensity : point.intensity;

    let type: VisualAnnotation['type'];
    let color: string;
    let label: string;

    if (!initialPoint) {
      type = 'new_pain';
      color = '#ef4444';
      label = 'Nova';
    } else if (change <= -3) {
      type = 'improvement';
      color = '#22c55e';
      label = 'Melhorou';
    } else if (change >= 3) {
      type = 'concern';
      color = '#ef4444';
      label = 'Piorou';
    } else {
      type = 'stable';
      color = '#eab308';
      label = 'Estável';
    }

    annotations.push({
      region: point.region,
      type,
      color,
      label,
      description: `${point.region}: ${point.intensity}/10 (${initialPoint ? `${change > 0 ? '+' : ''}${change}` : 'nova'})`,
      coordinates: { x: point.x, y: point.y }
    });
  });

  return annotations;
}

/**
 * Gera insights clínicos com IA
 */
async function generatePainInsights(
  assessments: PainEvolutionData[],
  patterns: PainMigrationPattern[],
  trend: PainTrendAnalysis,
  language: 'pt-BR' | 'en'
): Promise<{
  keyFindings: string[];
  clinicalAlerts: string[];
  positiveIndicators: string[];
  confidence: number;
}> {

  const model = genAI.getGenerativeModel({ model: PAIN_MODEL });

  const prompt = language === 'pt-BR' ? `
Você é um fisioterapeuta experiente analisando a evolução da dor de um paciente.

DADOS DAS AVALIAÇÕES:
${JSON.stringify(assessments, null, 2)}

PADRÕES DE MIGRAÇÃO:
${JSON.stringify(patterns, null, 2)}

ANÁLISE DE TENDÊNCIA:
${JSON.stringify(trend, null, 2)}

TASK: Forneça insights clínicos em formato JSON:

1. KEY_FINDINGS (3-5 descobertas importantes):
   - Observações clínicas relevantes
   - Mudanças significativas
   - Padrões identificados

2. CLINICAL_ALERTS (se houver):
   - Sinais de alerta
   - Pioras
   - Necessidade de reavaliação

3. POSITIVE_INDICATORS (3-5 sinais positivos):
   - Melhoras
   - Bons prognósticos
   - Respostas positivas

Responda em JSON válido:
{
  "keyFindings": string[],
  "clinicalAlerts": string[],
  "positiveIndicators": string[],
  "confidence": number
}
` : `
You are an experienced physical therapist analyzing a patient's pain evolution.

ASSESSMENT DATA:
${JSON.stringify(assessments, null, 2)}

MIGRATION PATTERNS:
${JSON.stringify(patterns, null, 2)}

TREND ANALYSIS:
${JSON.stringify(trend, null, 2)}

TASK: Provide clinical insights in JSON format:

1. KEY_FINDINGS (3-5 important findings):
   - Relevant clinical observations
   - Significant changes
   - Identified patterns

2. CLINICAL_ALERTS (if any):
   - Warning signs
   - Worsening
   - Need for re-evaluation

3. POSITIVE_INDICATORS (3-5 positive signs):
   - Improvements
   - Good prognostics
   - Positive responses

Respond in valid JSON:
{
  "keyFindings": string[],
  "clinicalAlerts": string[],
  "positiveIndicators": string[],
  "confidence": number
}
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      keyFindings: [],
      clinicalAlerts: [],
      positiveIndicators: [],
      confidence: 0
    };
  }

  return JSON.parse(jsonMatch[0]);
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

async function getPainAssessments(
  patientId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PainEvolutionData[]> {

  let q = query(
    collection(db, 'patients', patientId, 'pain-maps'),
    orderBy('recorded_at', 'asc')
  );

  if (startDate) {
    // Adicionar filtro de data se necessário
  }

  const snapshot = await getDocs(q);
  const records: PainMapRecord[] = snapshot.docs.map(doc => doc.data() as PainMapRecord);

  // Converter para PainEvolutionData
  return records.map(record => ({
    date: record.recorded_at,
    globalPainLevel: record.global_pain_level,
    regionCount: record.pain_points.length,
    mostAffectedRegion: getMostIntenseRegion(record.pain_points),
    painPoints: record.pain_points
  }));
}

function getMostIntenseRegion(points: PainMapPoint[]): string {
  if (points.length === 0) return '';

  return points.reduce((max, point) =>
    point.intensity > max.intensity ? point : max
  ).region;
}

function getMostDistalRegion(data: PainEvolutionData): string {
  // Simplificado - na prática, verificar regiões mais distais
  const distalRegions = ['pe_direito', 'pe_esquerdo', 'tornozelo_direito', 'tornozelo_esquerdo'];
  const found = data.painPoints.find(p => distalRegions.includes(p.region));
  return found?.region || data.mostAffectedRegion || '';
}

function getMostProximalRegion(data: PainEvolutionData): string {
  // Simplificado - na prática, verificar regiões mais proximais
  const proximalRegions = ['cabeca', 'pescoco', 'torax'];
  const found = data.painPoints.find(p => proximalRegions.includes(p.region));
  return found?.region || data.mostAffectedRegion || '';
}

function isCentralizing(initial: PainEvolutionData, current: PainEvolutionData): boolean {
  // Verificar se dor migrou de distal para proximal
  const initialDistal = getMostDistalRegion(initial);
  const currentProximal = getMostProximalRegion(current);

  return initialDistal !== '' && currentProximal !== '' &&
    initial.painPoints.some(p => p.region === initialDistal) &&
    !current.painPoints.some(p => p.region === initialDistal);
}

function isPeripheralizing(initial: PainEvolutionData, current: PainEvolutionData): boolean {
  // Verificar se dor migrou de proximal para distal
  const initialProximal = getMostProximalRegion(initial);
  const currentDistal = getMostDistalRegion(current);

  return initialProximal !== '' && currentDistal !== '' &&
    initial.painPoints.some(p => p.region === initialProximal) &&
    !current.painPoints.some(p => p.region === initialProximal);
}

function calculateDaysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  analyzePainEvolution,
  analyzePainMapImage,
  comparePainMaps
};

export type {
  PainMigrationPattern,
  PainTrendAnalysis,
  TreatmentResponse,
  RegionResponse,
  VisualAnnotation,
  PainAnalysisResult
};
