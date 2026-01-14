/**
 * AI Patient Insights Workflow
 *
 * Generates AI-powered insights for patients using OpenAI/Gemini
 * This demonstrates the power of Inngest for long-running AI workflows
 */

import { inngest, retryConfig } from '../../lib/inngest/client';
import { Events, InngestStep } from '../../lib/inngest/types';
import { createClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

type PatientData = {
  id: string;
  name: string;
  date_of_birth: string;
  main_complaint?: string;
  sessions?: Array<{
    id?: string;
    pain_level_after?: number;
    created_at?: string;
    patient_id?: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  }>;
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
    // maxDuration: '5m', // Allow up to 5 minutes for AI processing
  },
  {
    event: Events.AI_PATIENT_INSIGHTS,
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { patientId, organizationId } = event.data;

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Fetch patient data
    const patient = await step.run('fetch-patient-data', async (): Promise<PatientData> => {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          sessions(
            id,
            created_at,
            status,
            notes,
            subjective,
            objective,
            assessment,
            plan
          ),
          appointments(
            id,
            date,
            time,
            status
          )
        `)
        .eq('id', patientId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch patient: ${error.message}`);
      }

      return (data || {}) as unknown as PatientData;
    });

    // Step 2: Generate AI insights
    const insights = await step.run('generate-ai-insights', async (): Promise<z.infer<typeof insightSchema>> => {
      const sessions = patient.sessions || [];
      const recentSessions = sessions.slice(-10); // Last 10 sessions

      if (recentSessions.length === 0) {
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

Recent Sessions (${recentSessions.length}):
${recentSessions.map((s, i: number) => `
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
        console.error('AI generation error:', error);
        return {
          summary: 'Unable to generate insights',
          trends: [],
          recommendations: ['Please try again later'],
          riskFactors: [],
          adherenceScore: 0,
        };
      }
    });

    // Step 3: Store insights in database
    await step.run('store-insights', async () => {
      const { error } = await supabase.from('patient_insights').insert({
        patient_id: patientId,
        organization_id: organizationId,
        insights: insights,
        generated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to store insights: ${error.message}`);
      }

      return { stored: true };
    });

    // Step 4: Invalidate cache
    await step.run('invalidate-cache', async () => {
      // Invalidate patient cache
      // TODO: Use KVCacheService
      return { invalidated: true };
    });

    return {
      success: true,
      timestamp: new Date().toISOString(),
      patientId,
      insights,
    };
  }
);

/**
 * Batch AI insights workflow for multiple patients
 */
export const aiBatchInsightsWorkflow = inngest.createFunction(
  {
    id: 'fisioflow-ai-batch-insights',
    name: 'Generate Batch AI Insights',
    retries: retryConfig.api.maxAttempts,
    concurrency: 3, // Process 3 patients at a time to avoid rate limits
  },
  {
    event: 'ai/batch.insights',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { organizationId, patientIds } = event.data;

    const results = await step.run('process-batch', async (): Promise<{ queued: number }> => {
      // Queue individual insight generation for each patient
      const events = (patientIds as string[]).map((patientId) => ({
        name: Events.AI_PATIENT_INSIGHTS,
        data: {
          patientId,
          organizationId,
        },
      }));

      await inngest.send(events);

      return {
        queued: events.length,
      };
    });

    return {
      success: true,
      queued: results.queued,
      timestamp: new Date().toISOString(),
    };
  }
);
