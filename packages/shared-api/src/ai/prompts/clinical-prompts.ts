/**
 * Clinical AI Prompts
 *
 * Centralized prompts for clinical AI features in FisioFlow.
 * These prompts are managed via Firebase Remote Config for dynamic updates.
 *
 * @module ai/prompts/clinical
 */

import type { Patient, Exercise } from '@fisioflow/shared-types';

/**
 * Remote Config keys for clinical prompts
 */
export const CLINICAL_PROMPT_KEYS = {
  SOAP_ASSISTANT: 'ai_prompt_soap_assistant',
  CLINICAL_DECISION_SUPPORT: 'ai_prompt_clinical_support',
  TREATMENT_OPTIMIZATION: 'ai_prompt_treatment_optimization',
  PROGRESS_ANALYSIS: 'ai_prompt_progress_analysis',
} as const;

/**
 * SOAP Assistant System Prompt
 */
export const SOAP_ASSISTANT_SYSTEM = `Você é um assistente especializado em documentação clínica para fisioterapia, usando o formato SOAP (Subjective, Objective, Assessment, Plan).

Suas responsabilidades:
1. Transcrever consultas com precisão em português do Brasil
2. Estruturar informações no formato SOAP padronizado
3. Identificar e destacar informações críticas (red flags)
4. Usar terminologia clínica apropriada
5. Manter objetividade e concisão

Formato SOAP requerido:
- S (Subjective): Queixa principal, histórico relatado pelo paciente, sintomas descritos
- O (Objective): Dados observáveis, medições, testes físicos, achados do exame
- A (Assessment): Avaliação clínica, impressão do fisioterapeuta, diagnóstico funcional
- P (Plan): Plano de tratamento, próximas sessões, orientações ao paciente

IMPORTANTE:
- NUNCA fornecer diagnósticos médicos (deixe isso para o médico)
- NUNCA sugerir interromper medicação prescrita
- SEMPRE recomendar atendimento médico urgente para red flags
- Usar linguagem profissional mas acessível
- Incluir medições numéricas quando disponíveis`;

/**
 * SOAP Assistant Prompt Template
 */
export interface SOAPPromptParams {
  patientName: string;
  patientAge: string;
  patientContext: string;
  consultationTranscript: string;
  previousSOAP?: string;
  sessionNumber?: number;
}

export function buildSOAPPrompt(params: SOAPPromptParams): string {
  const { patientName, patientAge, patientContext, consultationTranscript, previousSOAP, sessionNumber } = params;

  let prompt = `## Paciente
Nome: ${patientName}
Idade: ${patientAge}
Contexto: ${patientContext}${sessionNumber ? `\nSessão número: ${sessionNumber}` : ''}

## Transcrição da Consulta
${consultationTranscript}`;

  if (previousSOAP) {
    prompt += `

## SOAP da Consulta Anterior
${previousSOAP}

Por favor, compare a evolução com a consulta anterior e destaque melhoras ou pioras.`;
  }

  prompt += `

## Instruções
1. Transcreva a consulta acima
2. Gere uma nota SOAP estruturada e completa
3. Identifique qualquer red flag que requer atenção médica imediata
4. Forneça recomendações específicas para o plano de tratamento

Retorne APENAS JSON válido com esta estrutura:
{
  "transcription": "string",
  "soap": {
    "subjective": "string",
    "objective": "string",
    "assessment": "string",
    "plan": "string"
  },
  "redFlags": ["string"],
  "recommendations": ["string"],
  "nextSessionFocus": "string"
}`;

  return prompt;
}

/**
 * Clinical Decision Support System Prompt
 */
export const CLINICAL_DECISION_SUPPORT_SYSTEM = `Você é um sistema de suporte à decisão clínica para fisioterapeutas.

Suas responsabilidades:
1. Fornecer insights baseados em evidências científicas
2. Identificar fatores de risco e red flags
3. Sugerir abordagens de tratamento baseadas em guidelines
4. Recomendar avaliações adicionais quando apropriado
5. Citar níveis de evidência quando possível

RESTRIÇÕES IMPORTANTES:
- SEMPRE recomendar julgamento clínico profissional sobre algoritmos
- NUNCA substituir a avaliação presencial do fisioterapeuta
- SEMPRE recomendar encaminhamento médico para sinais de perigo
- Usar guidelines brasileiras e internacionais quando disponíveis
- Admitir limitações quando evidências são insuficientes`;

/**
 * Clinical Decision Support Prompt Template
 */
export interface ClinicalSupportParams {
  patientData: Partial<Patient>;
  currentCondition: string;
  symptoms: string[];
  duration: string;
  previousTreatments?: string[];
  assessmentFindings?: string;
}

export function buildClinicalSupportPrompt(params: ClinicalSupportParams): string {
  const { patientData, currentCondition, symptoms, duration, previousTreatments, assessmentFindings } = params;

  return `## Caso Clínico

### Paciente
Nome: ${patientData.name || 'Não informado'}
Idade: ${patientData.birthDate ? new Date().getFullYear() - new Date(patientData.birthDate).getFullYear() : 'Não informada'}
Histórico Médico: ${patientData.medicalHistory?.map(h => h.condition).join(', ') || 'Nenhum informado'}

### Condição Atual
Diagnóstico/Queixa: ${currentCondition}
Sintomas: ${symptoms.join(', ')}
Duração: ${duration}

### Avaliação
${assessmentFindings || 'Não informada'}

### Tratamentos Anteriores
${previousTreatments?.join(', ') || 'Nenhum'}

## Análise Solicitada

Por favor, forneça:

1. **Red Flags** (sinais que requerem encaminhamento médico urgente):
   - Liste sinais de perigo específicos para esta condição

2. **Abordagens de Tratamento Baseadas em Evidências**:
   - Primeira linha de tratamento com nível de evidência
   - Alternativas se primeira linha não for eficaz
   - Referências a guidelines quando aplicável

3. **Avaliações Recomendadas**:
   - Testes específicos para confirmar diagnóstico
   - Medidas de resultado para monitorar progresso

4. **Prognóstico e Expectativas**:
   - Tempo esperado de recuperação
   - Fatores que podem afetar prognóstico
   - Marcos de recuperação esperados

5. **Precauções e Contraindicações**:
   - Movimentos ou técnicas a evitar
   - Adaptações necessárias

Retorne APENAS JSON válido.`;
}

/**
 * Treatment Optimization System Prompt
 */
export const TREATMENT_OPTIMIZATION_SYSTEM = `Você é um especialista em otimização de planos de tratamento fisioterapêutico.

Objetivos:
1. Analisar planos de tratamento existentes
2. Sugerir otimizações baseadas em:
   - Evidências científicas mais recentes
   - Melhores práticas clínicas
   - Preferências e contexto do paciente
   - Recursos disponíveis
3. Balancear eficácia com adesão do paciente
4. Considerar carga de treinamento e recuperação

Princípios:
- Progressão gradual de carga/dificuldade
- Especificidade para objetivos funcionais
- Variedade para manter engajamento
- Periodização para evitar platôs
- Avaliação contínua e ajustes`;

/**
 * Progress Analysis System Prompt
 */
export const PROGRESS_ANALYSIS_SYSTEM = `Você é um analista especializado em evolução de pacientes de fisioterapia.

Objetivos:
1. Analisar tendências de progresso ao longo do tempo
2. Identificar padrões de resposta ao tratamento
3. Detectar estagnações ou regressões
4. Fornecer insights acionáveis para ajustes de tratamento
5. Calcular taxas de melhora e previsões

Métricas a analisar:
- Níveis de dor (EVA/NRS)
- Amplitude de movimento
- Força muscular
- Funcionalidade (escalas validadas)
- Adesão ao exercício
- Satisfação do paciente`;

/**
 * Progress Analysis Prompt Template
 */
export interface ProgressAnalysisParams {
  patientName: string;
  condition: string;
  treatmentDuration: string;
  sessions: Array<{
    date: string;
    painLevel: number;
    notes?: string;
    improvements?: string[];
  }>;
  baseline: Record<string, number>;
  current: Record<string, number>;
}

export function buildProgressAnalysisPrompt(params: ProgressAnalysisParams): string {
  const { patientName, condition, treatmentDuration, sessions, baseline, current } = params;

  const sessionsText = sessions.map((s, i) =>
    `Sessão ${i + 1} (${s.date}): Dor ${s.painLevel}/10${s.notes ? `. Notas: ${s.notes}` : ''}${s.improvements ? `. Melhoras: ${s.improvements.join(', ')}` : ''}`
  ).join('\n');

  return `## Análise de Evolução do Paciente

### Paciente
Nome: ${patientName}
Condição: ${condition}
Tempo de Tratamento: ${treatmentDuration}

### Histórico de Sessões
${sessionsText}

### Métricas
Baseline (início): ${JSON.stringify(baseline)}
Atual: ${JSON.stringify(current)}

## Análise Solicitada

Por favor, forneça:

1. **Resumo da Evolução**:
   - Melhora geral em porcentagem
   - Tendências principais
   - Pontos de inflexão importantes

2. **Análise por Métrica**:
   - Comparação baseline vs atual
   - Significância clínica das mudanças
   - Métricas que necessitam mais atenção

3. **Taxa de Resposta ao Tratamento**:
   - Classifique como: Excelente/Boa/Modesta/Estagnada/Regressão
   - Justificativa baseada nos dados

4. **Previsão de Recuperação**:
   - Tempo estimado para recuperação completa
   - Fatores que podem acelerar ou retardar

5. **Recomendações**:
   - Ajustes no plano de tratamento
   - Novas metas realistas
   - Intervenções a considerar

Retorne APENAS JSON válido.`;
}

/**
 * Export all prompts as a single object
 */
export const CLINICAL_PROMPTS = {
  SYSTEM: {
    SOAP_ASSISTANT: SOAP_ASSISTANT_SYSTEM,
    CLINICAL_SUPPORT: CLINICAL_DECISION_SUPPORT_SYSTEM,
    TREATMENT_OPTIMIZATION: TREATMENT_OPTIMIZATION_SYSTEM,
    PROGRESS_ANALYSIS: PROGRESS_ANALYSIS_SYSTEM,
  },
  TEMPLATES: {
    SOAP: buildSOAPPrompt,
    CLINICAL_SUPPORT: buildClinicalSupportPrompt,
    PROGRESS: buildProgressAnalysisPrompt,
  },
  REMOTE_CONFIG_KEYS: CLINICAL_PROMPT_KEYS,
} as const;
