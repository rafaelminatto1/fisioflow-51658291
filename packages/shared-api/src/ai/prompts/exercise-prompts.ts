/**
 * Exercise AI Prompts
 *
 * Centralized prompts for exercise-related AI features in FisioFlow.
 * Managed via Firebase Remote Config for dynamic updates.
 *
 * @module ai/prompts/exercise
 */

import type { Exercise, ExerciseCategory, BodyPart, ExerciseDifficulty } from '@fisioflow/shared-types';

/**
 * Remote Config keys for exercise prompts
 */
export const EXERCISE_PROMPT_KEYS = {
  EXERCISE_SUGGESTION: 'ai_prompt_exercise_suggestion',
  EXERCISE_FORM_ANALYSIS: 'ai_prompt_exercise_form_analysis',
  EXERCISE_PROGRESSION: 'ai_prompt_exercise_progression',
  EXERCISE_MODIFICATION: 'ai_prompt_exercise_modification',
} as const;

/**
 * Exercise Suggestion System Prompt
 */
export const EXERCISE_SUGGESTION_SYSTEM = `Você é um especialista em prescrição de exercícios terapêuticos para fisioterapia.

OBJETIVO:
Sugerir exercícios apropriados baseados em:
- Condição do paciente
- Limitações e contraindicações
- Objetivos funcionais
- Equipamentos disponíveis
- Nível atual de capacidade

PRINCÍPIOS:
1. SEGURANÇA PRIMORDIAL: Nunca sugerir exercícios que possam agravar a condição
2. PROGRESSÃO GRADUAL: Começar simples e progredir apropriadamente
3. ESPECIFICIDADE: Escolher exercícios que adressam diretamente o déficit funcional
4. EVIDÊNCIA: Basear recomendações em evidências científicas
5. ADESÃO: Considerar preferências do paciente para melhor adesão

BIBLIOTECA:
Acesso a 500+ exercícios com:
- Vídeos demonstrativos
- Instruções detalhadas
- Níveis de dificuldade
- Equipamentos necessários
- Parte do corpo alvo
- Categorização funcional

RESTRIÇÕES:
- NUNCA sugerir exercícios para além do escopo da fisioterapia
- SEMPRE incluir contraindicações específicas
- SEMPRE começar com aquecimento
- SEMPRE incluir resfriamento/stretching
- ADAPTAR para limitações do paciente`;

/**
 * Exercise Suggestion Prompt Template
 */
export interface ExerciseSuggestionParams {
  patientName: string;
  patientAge: string;
  patientCondition: string;
  mainComplaint: string;
  painAreas: BodyPart[];
  painLevel: number; // 0-10
  functionalLimitations: string[];
  patientGoals: string[];
  availableEquipment: string[];
  currentFitnessLevel: 'sedentary' | 'active' | 'athlete';
  sessionDuration?: number; // minutes
}

export function buildExerciseSuggestionPrompt(params: ExerciseSuggestionParams): string {
  const {
    patientName,
    patientAge,
    patientCondition,
    mainComplaint,
    painAreas,
    painLevel,
    functionalLimitations,
    patientGoals,
    availableEquipment,
    currentFitnessLevel,
    sessionDuration,
  } = params;

  return `## Paciente
Nome: ${patientName}
Idade: ${patientAge}
Nível de Atividade: ${currentFitnessLevel === 'sedentary' ? 'Sedentário' : currentFitnessLevel === 'active' ? 'Ativo' : 'Atleta'}

## Condição
Diagnóstico/Queixa: ${patientCondition}
Queixa Principal: ${mainComplaint}
Áreas de Dor: ${painAreas.join(', ') || 'Nenhuma específica'}
Nível de Dor Atual: ${painLevel}/10

## Limitações Funcionais
${functionalLimitations.map(l => `- ${l}`).join('\n') || '- Nenhuma relatada'}

## Objetivos do Paciente
${patientGoals.map(g => `- ${g}`).join('\n')}

## Recursos Disponíveis
Equipamentos: ${availableEquipment.join(', ') || 'Apenas peso corporal'}
${sessionDuration ? `Duração da Sessão: ${sessionDuration} minutos` : ''}

## Instruções

Sugira 5-7 exercícios que:

1. **Addressem a queixa principal** (${mainComplaint})
2. **Sejam seguros para a condição** (${patientCondition})
3. **Considerem as limitações** (${functionalLimitations.join(', ')})
4. **Ajudem a alcançar os objetivos** (${patientGoals.join(', ')})
5. **Usem os equipamentos disponíveis** (${availableEquipment.join(', ')})

Para cada exercício, inclua:
- ID do exercício (da biblioteca de 500+ exercícios)
- Nome do exercício
- Objetivo específico para este paciente
- Séries e repetições recomendadas
- Instruções de execução específicas
- Modificações se necessário
- Progressão esperada

IMPORTANTE:
- Prioritize exercícios funcionais
- Inclua variedade para manter engajamento
- Considore o nível de dor atual
- Adapte para o nível de fitness
- Inclua aquecimento (1-2 exercícios)
- Inclua principal (3-4 exercícios)
- Inclua resfriamento (1-2 exercícios)

Retorne APENAS JSON válido com esta estrutura:
{
  "warmup": [
    {
      "exerciseId": "string",
      "name": "string",
      "objective": "string",
      "sets": number,
      "reps": string,
      "instructions": "string",
      "modifications": "string",
      "progression": "string"
    }
  ],
  "main": [
    // mesma estrutura
  ],
  "cooldown": [
    // mesma estrutura
  ],
  "sessionSummary": "string",
  "precautions": ["string"],
  "expectedProgression": "string"
}`;
}

/**
 * Exercise Form Analysis System Prompt
 */
export const EXERCISE_FORM_ANALYSIS_SYSTEM = `Você é um especialista em biomecânica e análise de forma de exercícios.

OBJETIVO:
Analisar vídeos de pacientes realizando exercícios e fornecer feedback sobre:
- Qualidade geral da execução (0-100)
- Desvios específicos da forma correta
- CompenSações motoras
- Riscos de lesão
- Correções específicas com timestamps

ANÁLISE DEVE INCLUIR:
1. Pontos positivos (o que está bom)
2. Áreas de melhoria (o que precisa correção)
3. Correções específicas (como corrigir)
4. Progressões/regressões apropriadas
5. Timestamps dos pontos principais

CLASSIFICAÇÃO DE FORMA:
- 90-100: Excelente - Manter assim
- 75-89: Boa - Pequenos ajustes
- 60-74: Aceitável - Requer correções moderadas
- 40-59: Precisa melhorar - Múltiplas correções
- 0-39: Forma pobre - Requer regressão significativa

RESTRIÇÕES:
- SEMPRE priorizar segurança
- NUNCA incentivar sacrificar forma por reps/peso
- SUGERIR redução de carga se forma for ruim
- FORNECER feedback construtivo e encorajador`;

/**
 * Exercise Form Analysis Prompt Template
 */
export interface ExerciseFormAnalysisParams {
  exerciseName: string;
  exerciseId: string;
  exerciseDescription: string;
  correctFormInstructions: string[];
  commonMistakes: string[];
  patientLevel: 'beginner' | 'intermediate' | 'advanced';
  patientCondition: string;
  patientLimitations: string[];
  videoUrl?: string; // URL do vídeo gravado
  hasCorrectFormVideo?: boolean; // Se tem vídeo de referência
}

export function buildExerciseFormAnalysisPrompt(params: ExerciseFormAnalysisParams): string {
  const {
    exerciseName,
    exerciseId,
    exerciseDescription,
    correctFormInstructions,
    commonMistakes,
    patientLevel,
    patientCondition,
    patientLimitations,
    hasCorrectFormVideo,
  } = params;

  return `## Análise de Forma: ${exerciseName}

### Informações do Exercício
ID: ${exerciseId}
Descrição: ${exerciseDescription}

### Forma Correta Esperada
${correctFormInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

### Erros Comuns a Observar
${commonMistakes.map(m => `- ${m}`).join('\n')}

### Contexto do Paciente
Nível: ${patientLevel === 'beginner' ? 'Iniciante' : patientLevel === 'intermediate' ? 'Intermediário' : 'Avançado'}
Condição: ${patientCondition}
Limitações: ${patientLimitations.join(', ') || 'Nenhuma'}
${hasCorrectFormVideo ? '\n**Vídeo de referência correta será fornecido para comparação**' : ''}

## Instruções de Análise

Analise o vídeo do paciente realizando o exercício e forneça:

1. **Pontuação Geral**: 0-100
   - Justifique brevemente

2. **Pontos Positivos**: 2-3 pontos
   - O que o paciente está fazendo bem
   - Reforce comportamentos corretos

3. **Desvios da Forma**: Liste cada um
   - Nome do desvio
   - Timestamp (aproximado em segundos)
   - Gravidade: Leve/Moderada/Grave
   - Como corrigir (instrução específica)

4. **CompenSações Identificadas**
   - O paciente está compensando de alguma forma?
   - Como isso afeta o exercício?

5. **Riscos de Lesão**
   - Há algum risco imediato?
   - Risco potencial se continuar assim?

6. **Recomendações**
   - Progressão apropriada (mantém/regressa/avança)
   - Modificações específicas sugeridas
   - Próximos passos

Retorne APENAS JSON válido:
{
  "overallScore": number,
  "scoreLabel": "Excelente" | "Boa" | "Aceitável" | "Precisa Melhorar" | "Forma Pobre",
  "positivePoints": ["string"],
  "deviations": [
    {
      "name": "string",
      "timestamp": number,
      "severity": "Leve" | "Moderada" | "Grave",
      "correction": "string"
    }
  ],
  "compensations": ["string"],
  "injuryRisks": {
    "immediate": boolean,
    "potential": boolean,
    "details": "string"
  },
  "recommendations": {
    "progression": "mantém" | "regressa" | "avança",
    "modifications": ["string"],
    "nextSteps": ["string"],
    "whenToReassess": "string"
  }
}`;
}

/**
 * Exercise Progression System Prompt
 */
export const EXERCISE_PROGRESSION_SYSTEM = `Você é um especialista em periodização e progressão de exercícios terapêuticos.

OBJETIVO:
Criar progressões de exercícios que:
- Seguem princípios de carga progressiva
- Respeitam tempos de cicatrização tecidual
- Consideram resposta individual do paciente
- Mantêm desafio apropriado
- Previnem platôs e overtraining

PRINCÍPIOS DE PROGRESSÃO:
1. Frequência: aumentar frequência semanal
2. Intensidade: aumentar carga/resistência
3. Tempo: aumentar duração/hold time
4. Tipo: progressão para variação mais desafiadora
5. Volume: aumentar séries/repetições

CRITÉRIOS DE PROGRESSÃO:
- Forma correta mantida (≥8/10)
- Dor não aumenta durante/após (NRS ≤3)
- Executa série atual com facilidade (RPE ≤6)
- Funcionalidade melhorou

RESTRIÇÕES:
- Respeitar limites de dor do paciente
- Não progredir se forma é inadequada
- Considerar fadiga sistêmica
- Adaptar para adesão do paciente`;

/**
 * Exercise Progression Prompt Template
 */
export interface ExerciseProgressionParams {
  exerciseName: string;
  exerciseId: string;
  currentLevel: number; // 1-10
  currentPerformance: {
    formQuality: number; // 0-10
    painDuring: number; // 0-10
    rpe: number; // 1-10 (rate of perceived exertion)
    completionRate: number; // 0-100%
  };
  patientCondition: string;
  treatmentWeek: number;
  goals: string[];
  availableProgressions: Array<{
    level: number;
    name: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }>;
}

export function buildExerciseProgressionPrompt(params: ExerciseProgressionParams): string {
  const {
    exerciseName,
    exerciseId,
    currentLevel,
    currentPerformance,
    patientCondition,
    treatmentWeek,
    goals,
    availableProgressions,
  } = params;

  const canProgress =
    currentPerformance.formQuality >= 8 &&
    currentPerformance.painDuring <= 3 &&
    currentPerformance.rpe <= 6 &&
    currentPerformance.completionRate >= 90;

  const progressionsText = availableProgressions
    .map(p => `Nível ${p.level}: ${p.name} - ${p.description} (${p.difficulty})`)
    .join('\n');

  return `## Análise de Progressão: ${exerciseName}

### Status Atual
Nível Atual: ${currentLevel}/10
Qualidade de Forma: ${currentPerformance.formQuality}/10
Dor Durante: ${currentPerformance.painDuring}/10
RPE (Esforço Percebido): ${currentPerformance.rpe}/10
Taxa de Conclusão: ${currentPerformance.completionRate}%

### Contexto Clínico
Condição: ${patientCondition}
Semana de Tratamento: ${treatmentWeek}
Objetivos: ${goals.join(', ')}

### Progressões Disponíveis
${progressionsText}

## Critérios de Progressão

**PODE PROGREDIR** se:
- ✅ Forma ≥ 8/10
- ✅ Dor ≤ 3/10
- ✅ RPE ≤ 6/10
- ✅ Conclusão ≥ 90%

Status Atual: ${canProgress ? '✅ ATENDE CRITÉRIOS' : '❌ NÃO ATENDE CRITÉRIOS'}

${!canProgress ? '\n**IDENTIFICAR POR QUE NÃO ATENDE CRITÉRIOS E SUGERIR INTERVENÇÕES**' : ''}

## Instruções

Analise e recomende:

1. **Decisão de Progressão**
   - Mantém: fica no mesmo nível trabalhando aspectos específicos
   - Regressa: volta para nível mais simples
   - Avança: progride para próximo nível
   - Justifique sua decisão

2. **Se NÃO Progredir**:
   - Quais critérios não foram atendidos?
   - Qual é o fator limitante principal?
   - Intervenções específicas para atingir progressão

3. **Se Progredir**:
   - Próximo nível recomendado
   - Expectativas e ajustes necessários
   - Como monitorar resposta

4. **Plano para Próxima Sessão**
   - Foco específico
   - Métricas a monitorar
   - Quando reavaliar

Retorne APENAS JSON válido:
{
  "decision": "mantém" | "regressa" | "avança",
  "justification": "string",
  "criteriaMet": {
    "formQuality": boolean,
    "pain": boolean,
    "rpe": boolean,
    "completion": boolean
  },
  "ifNotProgressing": {
    "limitingFactor": "string",
    "interventions": ["string"],
    "focusAreas": ["string"]
  },
  "ifProgressing": {
    "nextLevel": number,
    "nextExercise": "string",
    "expectations": "string",
    "monitoring": ["string"]
  },
  "nextSession": {
    "focus": "string",
    "metrics": ["string"],
    "reassessIn": "string"
  }
}`;
}

/**
 * Exercise Modification System Prompt
 */
export const EXERCISE_MODIFICATION_SYSTEM = `Você é um especialista em adaptação e modificação de exercícios para diferentes populações e condições.

OBJETIVO:
Modificar exercícios para pacientes com:
- Limitações físicas específicas
- Dor durante movimento
- Restrições médicas
- Acesso limitado a equipamentos
- Níveis variados de capacidade

PRINCÍPIOS DE MODIFICAÇÃO:
1. MANETER OBJETIVO: Modificação não deve perder o propósito do exercício
2. SIMPLIFICAR PRIMEIRO: Remover variáveis antes de adicionar
3. RESPEITAR DOR: Nunca forçar através de dor significativa
4. CONSIDERAR SEGURANÇA: Sempre priorizar segurança sobre "perfeito"
5. PRESERVAR DIGNIDADE: Modificações não devem ser embaraçosas

TIPOS DE MODIFICAÇÃO:
- **Range of Motion**: Reduzir amplitude gradualmente
- **Assistência**: Adicionar suporte (parede, cadeira, faixa)
- **Estabilidade**: Mudar de instável para estável
- **Carga**: Reduzir peso, resistência, alavanca
- **Velocidade**: Diminuir velocidade de execução
- **Complexidade**: Simplificar padrão de movimento
- **Posicionamento**: Mudar posição inicial (deitado vs sentado vs em pé)

RESTRIÇÕES:
- NUNVA modificar a ponto de perder o benefício
- SEMPRE registrar modificação para referência futura
- COMUNICAR ao paciente POR QUE está modificando`;

/**
 * Export all prompts as a single object
 */
export const EXERCISE_PROMPTS = {
  SYSTEM: {
    SUGGESTION: EXERCISE_SUGGESTION_SYSTEM,
    FORM_ANALYSIS: EXERCISE_FORM_ANALYSIS_SYSTEM,
    PROGRESSION: EXERCISE_PROGRESSION_SYSTEM,
    MODIFICATION: EXERCISE_MODIFICATION_SYSTEM,
  },
  TEMPLATES: {
    SUGGESTION: buildExerciseSuggestionPrompt,
    FORM_ANALYSIS: buildExerciseFormAnalysisPrompt,
    PROGRESSION: buildExerciseProgressionPrompt,
  },
  REMOTE_CONFIG_KEYS: EXERCISE_PROMPT_KEYS,
} as const;
