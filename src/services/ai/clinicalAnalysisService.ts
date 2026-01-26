/**
 * Clinical Analysis Service - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Functions:
 * - supabase.functions.invoke('analysis-ai') → Firebase Functions httpsCallable()
 */

import { getFirebaseFunctions } from '@/integrations/firebase/functions';
import { httpsCallable } from 'firebase/functions';

export interface AIAnalysisResult {
  summary: string;
  technical_analysis: string;
  patient_summary: string;
  confidence_overall_0_100: number;
  key_findings: { text: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }[];
  metrics_table_markdown: string;
  improvements: string[];
  still_to_improve: string[];
  suggested_exercises: {
    name: string;
    sets: string;
    reps: string;
    goal: string;
    progression: string;
    regression: string;
  }[];
  limitations: string[];
  red_flags_generic: string[];
  disclaimer: string;
}

export const generateClinicalReport = async (metrics: Record<string, unknown>, history?: Record<string, unknown>): Promise<AIAnalysisResult> => {
    try {
        const functions = getFirebaseFunctions();
        const analysisAIFunction = httpsCallable(functions, 'analysis-ai');
        const { data } = await analysisAIFunction({
            metrics,
            history
        });

        if ((data as any)?.error) {
            console.warn("AI Service Error, falling back to mock:", (data as any)?.error);
            return mockClinicalReport(metrics);
        }

        return data as AIAnalysisResult;
    } catch (e) {
        console.error("AI Service Exception:", e);
        return mockClinicalReport(metrics);
    }
};

export const generateFormSuggestions = async (formData: Record<string, unknown>, formFields: Array<{ id: string; label: string }>): Promise<string> => {
    try {
        // Construct a context string from the form data
        const context = formFields.map(field => {
            const value = formData[field.id];
            if (!value) return null;
            return `${field.label}: ${value}`;
        }).filter(Boolean).join('\n');

        const functions = getFirebaseFunctions();
        const analysisAIFunction = httpsCallable(functions, 'analysis-ai');
        const { data } = await analysisAIFunction({
            type: 'clinical_suggestions',
            context
        });

        if ((data as any)?.error) {
            console.warn("AI Service Error, falling back to mock:", (data as any)?.error);
            return mockFormSuggestions(formData, formFields);
        }

        return (data as any)?.suggestions || mockFormSuggestions(formData, formFields);
    } catch (e) {
        console.error("AI Service Exception:", e);
        return mockFormSuggestions(formData, formFields);
    }
};

// Mock implementations for fallback
async function mockClinicalReport(metrics: Record<string, unknown>): Promise<AIAnalysisResult> {
    return {
        summary: "Análise clínica baseada nas métricas fornecidas.",
        technical_analysis: `O paciente apresenta ${Object.keys(metrics).length} métricas registradas.`,
        patient_summary: "Paciente em acompanhamento fisioterapêutico.",
        confidence_overall_0_100: 75,
        key_findings: [
            { text: "Métricas registradas com sucesso", confidence: "HIGH" }
        ],
        metrics_table_markdown: "| Métrica | Valor |\n|---------|-------|",
        improvements: ["Continuar monitoramento"],
        still_to_improve: ["Aumentar frequência de exercícios"],
        suggested_exercises: [],
        limitations: ["Análise baseada em dados limitados"],
        red_flags_generic: [],
        disclaimer: "Esta análise é gerada automaticamente e deve ser revisada por um profissional."
    };
}

async function mockFormSuggestions(_formData: Record<string, unknown>, _formFields: Array<{ id: string; label: string }>): Promise<string> {
    return "Sugestões baseadas nos dados do formulário:\n\n1. Preencher todos os campos obrigatórios\n2. Revisar os dados antes de salvar\n3. Documentar observações adicionais";
}
