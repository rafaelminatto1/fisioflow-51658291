import { aiApi } from '@/lib/api/workers-client';

interface PatientSummaryInput {
  patientName: string;
  condition: string;
  history: Array<{
    date: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    exercises?: string[];
  }>;
  goals?: string[];
}

interface PatientSummaryOutput {
  summary: string;
  trends: Array<{
    metric: string;
    observation: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
  clinicalAdvice: string;
  keyRisks: string[];
}

/**
 * Client-side wrapper for Genkit Patient Summary Flow
 */
export async function generatePatientSummary(input: PatientSummaryInput): Promise<PatientSummaryOutput> {
  try {
    const response = await aiApi.executiveSummary(input as unknown as Record<string, unknown>);
    return response.data as unknown as PatientSummaryOutput;
  } catch (error) {
    console.error('Failed to generate patient summary:', error);
    throw error;
  }
}
