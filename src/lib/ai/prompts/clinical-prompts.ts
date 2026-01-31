/**
 * Clinical AI Prompt Templates
 *
 * Specialized prompts for clinical AI features in FisioFlow.
 * Ensures consistent, safe, and effective AI interactions.
 *
 * @module lib/ai/prompts/clinical-prompts
 */

import { AIFeatureCategory } from '@/integrations/firebase/ai';

/**
 * System prompt base with safety guidelines
 */
const CLINICAL_SAFETY_GUIDELINES = `
Você é um assistente de IA especializado em fisioterapia, operando no sistema FisioFlow.

DIRETRIZES DE SEGURANÇA:
- Nunca faça diagnósticos médicos definitivos
- Sempre recomende consulta com profissional de saúde para avaliações
- Não prescreva medicamentos ou procedimentos invasivos
- Sugira exercícios apenas dentro do contexto de fisioterapia
- Em caso de sintomas graves, recomende atendimento médico imediato

CONTEXTO:
- Você auxilia fisioterapeutas e pacientes em tarefas de fisioterapia
- Todas as sugestões devem ser baseadas em evidências científicas
- Mantenha linguagem clara e acessível para pacientes leigos
- Use terminologia técnica apropriada quando comunicar com profissionais
`.trim();

/**
 * Exercise recommendation prompt
 */
export interface ExerciseRecommendationPromptInput {
  patientProfile: {
    age?: number;
    gender?: string;
    primaryComplaint?: string;
    limitations?: string[];
    goals?: string[];
  };
  clinicalContext?: {
    diagnosis?: string;
    pathology?: string;
    phase?: 'aguda' | 'subaguda' | 'cronica';
    painLevel?: number; // 0-10
  };
  preferences?: {
    availableEquipment?: string[];
    sessionDuration?: number;
    difficultyLevel?: 'iniciante' | 'intermediario' | 'avancado';
  };
}

export function createExerciseRecommendationPrompt(
  input: ExerciseRecommendationPromptInput
): string {
  const { patientProfile, clinicalContext, preferences } = input;

  return `
${CLINICAL_SAFETY_GUIDELINES}

TAREFA: Recomendar exercícios de fisioterapia adequados

PERFIL DO PACIENTE:
- Idade: ${patientProfile.age || 'não informada'}
- Gênero: ${patientProfile.gender || 'não informado'}
- Queixa principal: ${patientProfile.primaryComplaint || 'não informada'}
- Limitações: ${patientProfile.limitations?.join(', ') || 'nenhuma'}
- Objetivos: ${patientProfile.goals?.join(', ') || 'não especificados'}

CONTEXTO CLÍNICO:
- Diagnóstico: ${clinicalContext?.diagnosis || 'não informado'}
- Patologia: ${clinicalContext?.pathology || 'não informada'}
- Fase: ${clinicalContext?.phase || 'não especificada'}
- Nível de dor: ${clinicalContext?.painLevel ?? 'não informado'} (0-10)

PREFERÊNCIAS:
- Equipamentos disponíveis: ${preferences?.availableEquipment?.join(', ') || 'nenhum'}
- Duração da sessão: ${preferences?.sessionDuration || 'não especificada'} minutos
- Nível de dificuldade: ${preferences?.difficultyLevel || 'não especificado'}

INSTRUÇÕES:
1. Sugira de 3 a 5 exercícios apropriados
2. Para cada exercício, inclua:
   - Nome do exercício
   - Objetivo (por que é adequado)
   - Execução (passo a passo claro)
   - Repetições e séries recomendadas
   - Cuidados e contraindicações
3. Ordene os exercícios por prioridade
4. Inclua orientações sobre aquecimento e alongamento
5. Adicione alertas se algum exercício não for adequado para as limitações

Responda em português brasileiro, de forma estruturada e fácil de seguir.
`.trim();
}

/**
 * Clinical analysis prompt
 */
export interface ClinicalAnalysisPromptInput {
  patientData: {
    chiefComplaint?: string;
    history?: string;
    symptoms?: string[];
    painHistory?: Array<{ date: string; level: number; location: string }>;
    functionalLimitations?: string[];
  };
  evaluationResults?: {
    rom?: Record<string, { value: string; normal: string }>;
  muscleStrength?: Record<string, string>;
  specialTests?: Array<{ name: string; result: string }>;
  };
}

export function createClinicalAnalysisPrompt(
  input: ClinicalAnalysisPromptInput
): string {
  const { patientData, evaluationResults } = input;

  return `
${CLINICAL_SAFETY_GUIDELINES}

TAREFA: Analisar dados clínicos e fornecer insights para fisioterapeuta

DADOS DO PACIENTE:
Queixa Principal: ${patientData.chiefComplaint || 'não informada'}
História: ${patientData.history || 'não informada'}
Sintomas: ${patientData.symptoms?.join(', ') || 'não informados'}
Limitações Funcionais: ${patientData.functionalLimitations?.join(', ') || 'nenhuma'}

HISTÓRICO DE DOR:
${patientData.painHistory?.map(h =>
  `- ${h.date}: Nível ${h.level}/10 em ${h.location}`
).join('\n') || 'Nenhum registro'}

RESULTADOS DE AVALIAÇÃO:
ADM (Amplitude de Movimento):
${Object.entries(evaluationResults?.rom || {}).map(([joint, data]) =>
  `- ${joint}: ${data.value} (normal: ${data.normal})`
).join('\n') || 'Nenhuma avaliação'}

Força Muscular:
${Object.entries(evaluationResults?.muscleStrength || {}).map(([muscle, grade]) =>
  `- ${muscle}: ${grade}`
).join('\n') || 'Nenhuma avaliação'}

Testes Especiais:
${evaluationResults?.specialTests?.map(t =>
  `- ${t.name}: ${t.result}`
).join('\n') || 'Nenhum teste'}

INSTRUÇÕES:
1. Analise os padrões e tendências nos dados
2. Identifique áreas de preocupação
3. Sugira possíveis correlações entre sintomas e achados
4. Recomende áreas foco para tratamento
5. Indique se há sinais de alerta que requerem atenção

NOTA: Esta é uma análise de suporte. O fisioterapeuta deve validar todas as conclusões.
`.trim();
}

/**
 * Treatment planning prompt
 */
export interface TreatmentPlanningPromptInput {
  patientInfo: {
    diagnosis?: string;
    chronicity?: 'aguda' | 'subaguda' | 'cronica';
    primaryGoals?: string[];
    secondaryGoals?: string[];
  };
  constraints: {
    sessionFrequency?: number; // per week
    treatmentDurationWeeks?: number;
    availableResources?: string[];
    timePerSession?: number;
  };
  progressSoFar?: {
    sessionsCompleted?: number;
    improvements?: string[];
    challenges?: string[];
  };
}

export function createTreatmentPlanningPrompt(
  input: TreatmentPlanningPromptInput
): string {
  const { patientInfo, constraints, progressSoFar } = input;

  return `
${CLINICAL_SAFETY_GUIDELINES}

TAREFA: Elaborar plano de tratamento fisioterapêutico

INFORMAÇÕES DO PACIENTE:
Diagnóstico: ${patientInfo.diagnosis || 'não informado'}
Cronicidade: ${patientInfo.chronicity || 'não especificada'}
Objetivos Primários: ${patientInfo.primaryGoals?.join(', ') || 'não definidos'}
Objetivos Secundários: ${patientInfo.secondaryGoals?.join(', ') || 'não definidos'}

RESTRIÇÕES:
Frequência de sessões: ${constraints.sessionFrequency || 'não especificada'} por semana
Duração do tratamento: ${constraints.treatmentDurationWeeks || 'não especificada'} semanas
Recursos disponíveis: ${constraints.availableResources?.join(', ') || 'não especificados'}
Tempo por sessão: ${constraints.timePerSession || 'não especificado'} minutos

PROGRESSO ATUAL:
Sessões completadas: ${progressSoFar?.sessionsCompleted || 0}
Melhoras observadas: ${progressSoFar?.improvements?.join(', ') || 'nenhuma'}
Desafios encontrados: ${progressSoFar?.challenges?.join(', ') || 'nenhum'}

INSTRUÇÕES:
1. Estruture o plano em fases (aguda, subaguda, crônica se aplicável)
2. Para cada fase, inclua:
   - Objetivos específicos
   - Técnicas e intervenções propostas
   - Exercícios recomendados
   - Critérios de progressão
3. Defina marcadores de progresso para avaliação
4. Sugira estratégias para adesão ao tratamento
5. Indique quando considerar alta ou encaminhamento

Responda de forma estruturada, com objetivos SMART (específicos, mensuráveis, alcançáveis, relevantes, temporais).
`.trim();
}

/**
 * Patient communication prompt
 */
export interface PatientCommunicationPromptInput {
  context: 'education' | 'motivation' | 'reminder' | 'clarification';
  topic: string;
  patientLevel: 'leigo' | 'conhecimento_basico' | 'informado';
  tone?: 'formal' | 'acolhedor' | 'motivacional';
}

export function createPatientCommunicationPrompt(
  input: PatientCommunicationPromptInput
): string {
  const { context, topic, patientLevel, tone = 'acolhedor' } = input;

  return `
${CLINICAL_SAFETY_GUIDELINES}

TAREFA: Gerar comunicação para paciente

CONTEXTO: ${context.toUpperCase()}
TÓPICO: ${topic}
NÍVEL DO PACIENTE: ${patientLevel.replace(/_/g, ' ').toUpperCase()}
TOM: ${tone.toUpperCase()}

INSTRUÇÕES:
1. Adapte a linguagem ao nível do paciente:
   - LEIGO: termos simples, analogias, evitar jargão
   - CONHECIMENTO BÁSICO: alguns termos técnicos com explicações
   - INFORMADO: linguagem técnica apropriada
2. Mantenha o tom ${tone} throughout
3. Seja claro e conciso (máximo 200 palavras)
4. Inclua:
   - Uma mensagem principal
   - Explicação do "por que" é importante
   - Orientação prática do "como" aplicar
   - Chamada para ação (se aplicável)
5. Use formatação para facilitar leitura (parágrafos curtos, bullet points)

ADICIONALMENTE:
- Se contexto é EDUCAÇÃO: Foque em ensinar um conceito
- Se contexto é MOTIVAÇÃO: Destaque benefícios e progressos
- Se contexto é REMINDER: Reforce importância de adesão
- Se contexto é CLARIFICAÇÃO: Esclareça dúvidas comuns

Responda em português brasileiro.
`.trim();
}

/**
 * Progress analysis prompt
 */
export interface ProgressAnalysisPromptInput {
  progressData: {
    initialAssessment?: Record<string, string | number>;
    currentAssessment?: Record<string, string | number>;
    sessionsData?: Array<{
      date: string;
      painLevel: number;
      improvements: string[];
      challenges: string[];
    }>;
  };
  treatmentGoals?: string[];
  timeline?: {
    startDate?: string;
    expectedEndDate?: string;
    currentDate?: string;
  };
}

export function createProgressAnalysisPrompt(
  input: ProgressAnalysisPromptInput
): string {
  const { progressData, treatmentGoals, timeline } = input;

  return `
${CLINICAL_SAFETY_GUIDELINES}

TAREFA: Analisar progresso do paciente em fisioterapia

AVALIAÇÃO INICIAL:
${Object.entries(progressData.initialAssessment || {})
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n') || 'Nenhuma avaliação inicial registrada'}

AVALIAÇÃO ATUAL:
${Object.entries(progressData.currentAssessment || {})
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n') || 'Nenhuma avaliação atual registrada'}

HISTÓRICO DE SESSÕES:
${progressData.sessionsData?.map(s =>
  `${s.date}: Dor ${s.painLevel}/10
   - Melhoras: ${s.improvements.join(', ') || 'nenhuma'}
   - Desafios: ${s.challenges.join(', ') || 'nenhum'}`
).join('\n\n') || 'Nenhuma sessão registrada'}

OBJETIVOS DO TRATAMENTO:
${treatmentGoals?.map((g, i) => `${i + 1}. ${g}`).join('\n') || 'Nenhum objetivo definido'}

LINHA DO TEMPO:
- Início: ${timeline?.startDate || 'não informado'}
- Atual: ${timeline?.currentDate || new Date().toISOString().split('T')[0]}
- Previsão de alta: ${timeline?.expectedEndDate || 'não definida'}

INSTRUÇÕES:
1. Compare avaliação inicial com atual
2. Identifique tendências no histórico de sessões
3. Avalie progresso em relação aos objetivos
4. Destaque áreas de melhoria significativa
5. Identifique estagnações ou regressões
6. Sugira ajustes no plano de tratamento
7. Estime se o paciente está em direção à alta no prazo previsto

Responda de forma analítica, com dados e insights acionáveis.
`.trim();
}

/**
 * Quick suggestion prompt
 */
export interface QuickSuggestionPromptInput {
  query: string;
  context: 'exercicio' | 'sintoma' | 'orientacao_geral';
  patientInfo?: {
    age?: number;
    condition?: string;
    restrictions?: string[];
  };
}

export function createQuickSuggestionPrompt(
  input: QuickSuggestionPromptInput
): string {
  const { query, context, patientInfo } = input;

  return `
${CLINICAL_SAFETY_GUIDELINES}

TAREFA: Fornecer sugestão rápida e concisa

CONTEXTO: ${context.toUpperCase()}
PERGUNTA: ${query}

INFORMAÇÕES DO PACIENTE:
${patientInfo ? `
Idade: ${patientInfo.age || 'não informada'}
Condição: ${patientInfo.condition || 'não informada'}
Restrições: ${patientInfo.restrictions?.join(', ') || 'nenhuma'}
` : 'Nenhuma informação adicional'}

INSTRUÇÕES:
1. Responda de forma direta e concisa (máximo 100 palavras)
2. Foque na pergunta específica
3. Inclua orientação prática imediata
4. Adicione alerta de segurança se necessário
5. Indique quando buscar ajuda profissional

Responda em português brasileiro.
`.trim();
}

/**
 * Prompt builder factory
 */
export class ClinicalPromptBuilder {
  /**
   * Get prompt for feature category
   */
  static getPrompt(
    category: AIFeatureCategory,
    input: unknown
  ): string {
    switch (category) {
      case AIFeatureCategory.EXERCISE_RECOMMENDATION:
        return createExerciseRecommendationPrompt(
          input as ExerciseRecommendationPromptInput
        );

      case AIFeatureCategory.CLINICAL_ANALYSIS:
        return createClinicalAnalysisPrompt(
          input as ClinicalAnalysisPromptInput
        );

      case AIFeatureCategory.TREATMENT_PLANNING:
        return createTreatmentPlanningPrompt(
          input as TreatmentPlanningPromptInput
        );

      case AIFeatureCategory.PATIENT_CHAT:
        return createPatientCommunicationPrompt(
          input as PatientCommunicationPromptInput
        );

      case AIFeatureCategory.PROGRESS_ANALYSIS:
        return createProgressAnalysisPrompt(
          input as ProgressAnalysisPromptInput
        );

      case AIFeatureCategory.QUICK_SUGGESTIONS:
        return createQuickSuggestionPrompt(
          input as QuickSuggestionPromptInput
        );

      default:
        throw new Error(`Unsupported feature category: ${category}`);
    }
  }

  /**
   * Get system prompt for category
   */
  static getSystemPrompt(category: AIFeatureCategory): string {
    return CLINICAL_SAFETY_GUIDELINES + `

CATEGORIA: ${category.toUpperCase()}

Responda sempre em português brasileiro, mantendo profissionalismo e empatia.`;
  }
}
