import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '@/integrations/firebase/app';

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
  const functions = getFunctions(getFirebaseApp(), 'southamerica-east1');
  const aiService = httpsCallable(functions, 'aiService');

  try {
    const response = await aiService({
      action: 'patientExecutiveSummary',
      ...input
    });

    return (response.data as any) as PatientSummaryOutput;
  } catch (error) {
    console.error('Failed to generate patient summary:', error);
    throw error;
  }
}
