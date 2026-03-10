/**
 * AI Patient Insights Workflow - Migrated to Neon
 *
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { 
  getPatientById, 
  getLatestSessionsByPatient, 
  storePatientInsight 
} from './_shared/neon-patients-appointments';

type PatientData = {
  id: string;
  name: string;
  date_of_birth: string;
  main_complaint?: string;
  sessions?: any[];
};

const insightSchema = z.object({
  summary: z.string().describe('Brief summary of patient progress'),
  trends: z.array(z.string()).describe('Key trends observed'),
  recommendations: z.array(z.string()).describe('Specific recommendations'),
  riskFactors: z.array(z.string()).describe('Potential risk factors to monitor'),
  adherenceScore: z.number().min(0).max(100).describe('Estimated treatment adherence'),
});

export const aiPatientInsightsWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-ai-patient-insights',
    name: 'Generate AI Patient Insights',
    retries: retryConfig.api.maxAttempts,
  },
  {
    event: Events.AI_PATIENT_INSIGHTS,
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { patientId, organizationId } = event.data;

    // Step 1: Fetch patient data (Neon)
    const patient = await step.run('fetch-patient-data', async (): Promise<PatientData> => {
      const patientData = await getPatientById(String(patientId));
      if (!patientData) {
        throw new Error('Patient not found');
      }

      const sessions = await getLatestSessionsByPatient(String(patientId), 10);

      return {
        id: patientData.id,
        name: patientData.full_name,
        date_of_birth: patientData.birth_date || '',
        sessions,
      };
    });

    // Step 2: Generate AI insights
    const insights = await step.run('generate-ai-insights', async (): Promise<z.infer<typeof insightSchema>> => {
      const sessions = patient.sessions || [];
      
      if (sessions.length === 0) {
        return {
          summary: 'Insufficient data for analysis',
          trends: [],
          recommendations: ['Complete more sessions to enable AI analysis'],
          riskFactors: [],
          adherenceScore: 0,
        };
      }

      try {
        const { object } = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: insightSchema,
          prompt: `Analyze the following patient data and provide clinical insights:

Patient: ${patient.name}
Age: ${patient.date_of_birth}
Main Complaint: ${patient.main_complaint || 'Not specified'}

Recent Sessions (${sessions.length}):
${sessions.map((s, i: number) => `
Session ${i + 1} (${s.created_at}):
- Subjective: ${s.subjective || 'N/A'}
- Objective: ${s.objective || 'N/A'}
- Assessment: ${s.assessment || 'N/A'}
- Plan: ${s.plan || 'N/A'}
`).join('\n')}

Please provide:
1. A summary of the patient's progress
2. Key trends you observe
3. Specific recommendations for continued treatment
4. Risk factors to monitor
5. An adherence score (0-100) based on session attendance and progress`,
        });

        return object;
      } catch (error) {
        logger.error('[AI Insights] Generation error', error, 'ai-insights-workflow');
        return {
          summary: 'Unable to generate insights',
          trends: [],
          recommendations: ['Please try again later'],
          riskFactors: [],
          adherenceScore: 0,
        };
      }
    });

    // Step 3: Store insights in database (Neon)
    await step.run('store-insights', async () => {
      await storePatientInsight({
        patient_id: String(patientId),
        organization_id: String(organizationId),
        insights: insights,
      });

      return { stored: true };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      patientId,
      insights,
    };
  }
);
