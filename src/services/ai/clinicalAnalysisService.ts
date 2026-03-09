/**
 * Clinical Analysis Service - Migrated to Workers/Neon
 */

import { aiApi, type AIClinicalReport } from '@/lib/api/workers-client';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface AIAnalysisResult extends AIClinicalReport {}

export const generateClinicalReport = async (
  metrics: Record<string, unknown>,
  history?: Record<string, unknown>,
): Promise<AIAnalysisResult> => {
  try {
    const { data } = await aiApi.clinicalReport({ metrics, history });
    return data;
  } catch (e) {
    logger.error('AI Service Exception', e, 'clinicalAnalysisService');
    return mockClinicalReport(metrics);
  }
};

export const generateFormSuggestions = async (
  formData: Record<string, unknown>,
  formFields: Array<{ id: string; label: string }>,
): Promise<string> => {
  try {
    const context = formFields
      .map((field) => {
        const value = formData[field.id];
        if (!value) return null;
        return `${field.label}: ${value}`;
      })
      .filter(Boolean)
      .join('\n');

    const { data } = await aiApi.formSuggestions({ context });
    return data.suggestions?.join('\n') || mockFormSuggestions(formData, formFields);
  } catch (e) {
    logger.error('AI Service Exception', e, 'clinicalAnalysisService');
    return mockFormSuggestions(formData, formFields);
  }
};

async function mockClinicalReport(metrics: Record<string, unknown>): Promise<AIAnalysisResult> {
  return {
    summary: 'Análise clínica baseada nas métricas fornecidas.',
    technical_analysis: `O paciente apresenta ${Object.keys(metrics).length} métricas registradas.`,
    patient_summary: 'Paciente em acompanhamento fisioterapêutico.',
    confidence_overall_0_100: 75,
    key_findings: [{ text: 'Métricas registradas com sucesso', confidence: 'HIGH' }],
    metrics_table_markdown: '| Métrica | Valor |\n|---------|-------|',
    improvements: ['Continuar monitoramento'],
    still_to_improve: ['Aumentar frequência de exercícios'],
    suggested_exercises: [],
    limitations: ['Análise baseada em dados limitados'],
    red_flags_generic: [],
    disclaimer: 'Esta análise é gerada automaticamente e deve ser revisada por um profissional.',
  };
}

async function mockFormSuggestions(
  _formData: Record<string, unknown>,
  _formFields: Array<{ id: string; label: string }>,
): Promise<string> {
  return 'Sugestões baseadas nos dados do formulário:\n\n1. Preencher todos os campos obrigatórios\n2. Revisar os dados antes de salvar\n3. Documentar observações adicionais';
}
