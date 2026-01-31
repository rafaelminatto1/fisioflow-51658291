/**
 * AI Patient Insights Workflow - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - createClient(supabase) → Firebase Admin SDK
 * - Nested selects → Optimized query
 *
 * @version 2.0.0 - Improved with centralized Admin SDK helper
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { getAdminDb } from '../../lib/firebase/admin.js';

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
  },
  {
    event: Events.AI_PATIENT_INSIGHTS,
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { patientId, organizationId } = event.data;
    const db = getAdminDb();

    // Step 1: Fetch patient data
    const patient = await step.run('fetch-patient-data', async (): Promise<PatientData> => {
      const patientSnap = await db.collection('patients').doc(patientId).get();

      if (!patientSnap.exists) {
        throw new Error('Patient not found');
      }

      const patientData = { id: patientSnap.id, ...patientSnap.data() } as Record<string, unknown>;

      // Fetch sessions for this patient (last 10)
      const sessionsSnapshot = await db.collection('soap_records')
        .where('patient_id', '==', patientId)
        .orderBy('created_at', 'desc')
        .limit(10)
        .get();

      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return {
        ...patientData,
        sessions,
      };
    });

    // Step 2: Generate AI insights
    const insights = await step.run('generate-ai-insights', async (): Promise<z.infer<typeof insightSchema>> => {
      const sessions = patient.sessions || [];
      const recentSessions = sessions.slice(-10);

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

    // Step 3: Store insights in database
    await step.run('store-insights', async () => {
      await db.collection('patient_insights').add({
        patient_id: patientId,
        organization_id: organizationId,
        insights: insights,
        generated_at: new Date().toISOString(),
      });

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
    concurrency: 3,
  },
  {
    event: 'ai/batch.insights',
  },
  async ({ event, step }: { event: { data: Record<string, unknown> }; step: InngestStep }) => {
    const { organizationId, patientIds } = event.data;

    // Validate input
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return {
        success: false,
        error: 'No patient IDs provided',
        queued: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const results = await step.run('process-batch', async (): Promise<{ queued: number }> => {
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
