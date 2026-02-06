/**
 * AI Reports System
 * Auto-generated clinical and administrative reports using Vertex AI
 */

import { onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { VertexAI } from '@google-cloud/vertexai';
import * as admin from 'firebase-admin';
import { getLogger } from '../lib/logger';
import { withIdempotency } from '../lib/idempotency';

const logger = getLogger('ai-reports');
const db = admin.firestore();

/**
 * Report types
 */
export enum ReportType {
  PATIENT_PROGRESS = 'patient_progress',
  TREATMENT_SUMMARY = 'treatment_summary',
  CLINICAL_OUTCOMES = 'clinical_outcomes',
  APPOINTMENT_ANALYTICS = 'appointment_analytics',
  REVENUE_REPORT = 'revenue_report',
  DAILY_SUMMARY = 'daily_summary',
  WEEKLY_SUMMARY = 'weekly_summary',
  MONTHLY_SUMMARY = 'monthly_summary',
}

/**
 * Report generation request
 */
export interface ReportRequest {
  type: ReportType;
  organizationId: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
  includeRecommendations?: boolean;
  format?: 'json' | 'markdown' | 'html';
}

/**
 * Generated report
 */
export interface GeneratedReport {
  id: string;
  type: ReportType;
  organizationId: string;
  patientId?: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  content: string;
  summary: string;
  recommendations?: string[];
  metadata?: Record<string, any>;
}

/**
 * Generate AI report
 */
export const generateAIReport = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 180,
  },
  async (request) => {
    const { data } = request;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const {
      type,
      organizationId,
      patientId,
      startDate,
      endDate,
      includeRecommendations = true,
      format = 'markdown',
    } = data as ReportRequest;

    if (!type || !organizationId) {
      throw new HttpsError('invalid-argument', 'type and organizationId are required');
    }

    try {
      logger.info('Generating AI report', { userId, type, organizationId, patientId });

      // Set default date range (last 30 days)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Gather data based on report type
      const reportData = await gatherReportData(type, organizationId, patientId, start, end);

      // Use idempotency for caching similar reports
      const cacheParams = {
        type,
        organizationId,
        patientId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        includeRecommendations,
      };

      const report = await withIdempotency(
        'AI_REPORT',
        userId,
        cacheParams,
        async () => {
          return await generateReportContent(type, reportData, {
            start,
            end,
            includeRecommendations,
            format,
          });
        },
        { cacheTtl: 30 * 60 * 1000 } // 30 minutes cache
      );

      // Save report to Firestore
      const reportRef = await db.collection('ai_reports').add({
        type,
        organizationId,
        patientId,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        period: { start, end },
        content: report.content,
        summary: report.summary,
        recommendations: report.recommendations,
        generatedBy: userId,
        format,
      });

      logger.info('AI report generated', { reportId: reportRef.id, type });

      return {
        success: true,
        reportId: reportRef.id,
        report: {
          id: reportRef.id,
          ...report,
        },
      };
    } catch (error) {
      logger.error('Failed to generate AI report', { error });
      throw new HttpsError(
        'internal',
        `Failed to generate report: ${(error as Error).message}`
      );
    }
  }
);

/**
 * Get list of generated reports
 */
export const listReports = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  async (request) => {
    const { data } = request;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { organizationId, type, limit = 20 } = data as {
      organizationId: string;
      type?: ReportType;
      limit?: number;
    };

    try {
      let query = db
        .collection('ai_reports')
        .where('organizationId', '==', organizationId)
        .orderBy('generatedAt', 'desc')
        .limit(limit) as any;

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();

      const reports = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          generatedAt: data.generatedAt?.toDate(),
        };
      });

      return { success: true, reports, count: reports.length };
    } catch (error) {
      logger.error('Failed to list reports', { error });
      throw new HttpsError(
        'internal',
        `Failed to list reports: ${(error as Error).message}`
      );
    }
  }
);

/**
 * Get report by ID
 */
export const getReport = onCall(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  async (request) => {
    const { data } = request;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { reportId } = data as { reportId: string };

    if (!reportId) {
      throw new HttpsError('invalid-argument', 'reportId is required');
    }

    try {
      const doc = await db.collection('ai_reports').doc(reportId).get();

      if (!doc.exists) {
        throw new HttpsError('not-found', 'Report not found');
      }

      const reportData = doc.data() as Record<string, any>;

      return {
        success: true,
        report: {
          id: doc.id,
          ...reportData,
          generatedAt: reportData.generatedAt?.toDate(),
        },
      };
    } catch (error) {
      if ((error as HttpsError).code === 'not-found') {
        throw error;
      }
      logger.error('Failed to get report', { error });
      throw new HttpsError(
        'internal',
        `Failed to get report: ${(error as Error).message}`
      );
    }
  }
);

/**
 * Download report as file
 */
export const downloadReport = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 1,
  },
  async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { reportId } = req.query;

    if (!reportId || typeof reportId !== 'string') {
      res.status(400).json({ error: 'reportId is required' });
      return;
    }

    try {
      const doc = await db.collection('ai_reports').doc(reportId).get();

      if (!doc.exists) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      const report = doc.data() as Record<string, any>;

      // Determine content type
      let contentType = 'text/markdown';
      let extension = 'md';

      if (report.format === 'json') {
        contentType = 'application/json';
        extension = 'json';
      } else if (report.format === 'html') {
        contentType = 'text/html';
        extension = 'html';
      }

      // Set headers for download
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report-${report.type}-${reportId}.${extension}"`
      );

      res.send(report.content);
    } catch (error) {
      logger.error('Failed to download report', { error });
      res.status(500).json({ error: 'Failed to download report' });
    }
  }
);

/**
 * Scheduled report generation - daily summary
 */
export const scheduledDailyReport = onSchedule(
  {
    schedule: '0 20 * * *', // 8 PM every day
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    timeoutSeconds: 300,
  },
  async (event) => {
    logger.info('Starting scheduled daily report generation');

    try {
      // Get all active organizations
      const orgsSnapshot = await db.collection('organizations').where('active', '==', true).get();

      for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;

        try {
          // Generate daily summary report
          const end = new Date();
          const start = new Date();
          start.setHours(0, 0, 0, 0);

          const reportData = await gatherReportData(
            ReportType.DAILY_SUMMARY,
            orgId,
            undefined,
            start,
            end
          );

          const report = await generateReportContent(
            ReportType.DAILY_SUMMARY,
            reportData,
            { start, end, includeRecommendations: true, format: 'markdown' }
          );

          // Save report
          await db.collection('ai_reports').add({
            type: ReportType.DAILY_SUMMARY,
            organizationId: orgId,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            period: { start, end },
            content: report.content,
            summary: report.summary,
            recommendations: report.recommendations,
            generatedBy: 'system',
            format: 'markdown',
            isScheduled: true,
          });

          logger.info('Daily report generated', { organizationId: orgId });
        } catch (error) {
          logger.error('Failed to generate daily report for org', {
            organizationId: orgId,
            error,
          });
        }
      }

      logger.info('Scheduled daily reports completed');
    } catch (error) {
      logger.error('Failed to complete scheduled reports', { error });
    }
  }
);

/**
 * Scheduled report generation - weekly summary
 */
export const scheduledWeeklyReport = onSchedule(
  {
    schedule: '0 20 * * 1', // 8 PM every Monday
    region: 'southamerica-east1',
    memory: '512MiB',
    maxInstances: 1,
    timeoutSeconds: 300,
  },
  async (event) => {
    logger.info('Starting scheduled weekly report generation');

    try {
      const orgsSnapshot = await db.collection('organizations').where('active', '==', true).get();

      for (const orgDoc of orgsSnapshot.docs) {
        const orgId = orgDoc.id;

        try {
          const end = new Date();
          const start = new Date();
          start.setDate(start.getDate() - 7);

          const reportData = await gatherReportData(
            ReportType.WEEKLY_SUMMARY,
            orgId,
            undefined,
            start,
            end
          );

          const report = await generateReportContent(
            ReportType.WEEKLY_SUMMARY,
            reportData,
            { start, end, includeRecommendations: true, format: 'markdown' }
          );

          await db.collection('ai_reports').add({
            type: ReportType.WEEKLY_SUMMARY,
            organizationId: orgId,
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            period: { start, end },
            content: report.content,
            summary: report.summary,
            recommendations: report.recommendations,
            generatedBy: 'system',
            format: 'markdown',
            isScheduled: true,
          });

          logger.info('Weekly report generated', { organizationId: orgId });
        } catch (error) {
          logger.error('Failed to generate weekly report for org', {
            organizationId: orgId,
            error,
          });
        }
      }

      logger.info('Scheduled weekly reports completed');
    } catch (error) {
      logger.error('Failed to complete scheduled reports', { error });
    }
  }
);

// Helper functions

async function gatherReportData(
  type: ReportType,
  organizationId: string,
  patientId: string | undefined,
  start: Date,
  end: Date
): Promise<any> {
  const data: any = {
    organizationId,
    patientId,
    period: { start, end },
  };

  switch (type) {
    case ReportType.PATIENT_PROGRESS: {
      if (!patientId) throw new Error('patientId required for patient progress report');

      const [patient, evolutions, sessions, exercises] = await Promise.all([
        db.collection('patients').doc(patientId).get(),
        db
          .collection('evolutions')
          .where('patientId', '==', patientId)
          .where('createdAt', '>=', start)
          .where('createdAt', '<=', end)
          .orderBy('createdAt', 'asc')
          .get(),
        db
          .collection('treatment_sessions')
          .where('patientId', '==', patientId)
          .where('createdAt', '>=', start)
          .where('createdAt', '<=', end)
          .get(),
        db
          .collection('exercise_logs')
          .where('patientId', '==', patientId)
          .where('timestamp', '>=', start)
          .where('timestamp', '<=', end)
          .get(),
      ]);

      data.patient = patient.exists ? patient.data() : null;
      data.evolutions = evolutions.docs.map(d => d.data());
      data.sessions = sessions.docs.map(d => d.data());
      data.exercises = exercises.docs.map(d => d.data());
      break;
    }

    case ReportType.APPOINTMENT_ANALYTICS:
    case ReportType.DAILY_SUMMARY:
    case ReportType.WEEKLY_SUMMARY: {
      const [appointments, patients, payments] = await Promise.all([
        db
          .collection('appointments')
          .where('organizationId', '==', organizationId)
          .where('startTime', '>=', start)
          .where('startTime', '<=', end)
          .get(),
        db.collection('patients').where('organizationId', '==', organizationId).get(),
        db
          .collection('payments')
          .where('organizationId', '==', organizationId)
          .where('createdAt', '>=', start)
          .where('createdAt', '<=', end)
          .get(),
      ]);

      data.appointments = appointments.docs.map(d => d.data());
      data.patients = patients.docs.map(d => d.data());
      data.payments = payments.docs.map(d => d.data());
      break;
    }

    case ReportType.REVENUE_REPORT: {
      const payments = await db
        .collection('payments')
        .where('organizationId', '==', organizationId)
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .get();

      data.payments = payments.docs.map(d => d.data());
      break;
    }

    default:
      break;
  }

  return data;
}

async function generateReportContent(
  type: ReportType,
  data: any,
  options: {
    start: Date;
    end: Date;
    includeRecommendations: boolean;
    format: string;
  }
): Promise<{ content: string; summary: string; recommendations?: string[] }> {
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
    location: 'us-central1',
  });

  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  });

  const systemPrompt = getSystemPromptForReportType(type);
  const userPrompt = buildPromptForReportType(type, data, options);

    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    });

  const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse response to extract summary and recommendations
  const summary = extractSummary(response);
  const recommendations = options.includeRecommendations
    ? extractRecommendations(response)
    : undefined;

  let content = response;

  // Convert format if needed
  if (options.format === 'json') {
    content = JSON.stringify({ summary, recommendations, fullReport: response }, null, 2);
  } else if (options.format === 'html') {
    content = markdownToHtml(response);
  }

  return { content, summary, recommendations };
}

function getSystemPromptForReportType(type: ReportType): string {
  const basePrompt = `Você é um especialista em fisioterapia e análise de dados clínicos do FisioFlow.
Gere relatórios profissionais, objetivos e acionáveis em português brasileiro.
Use markdown para formatação.
Seja conciso mas completo.`;

  const specificPrompts: Record<ReportType, string> = {
    [ReportType.PATIENT_PROGRESS]: `${basePrompt}
Foque em: evolução clínica, progresso funcional, adesão ao tratamento, próximos passos.`,
    [ReportType.TREATMENT_SUMMARY]: `${basePrompt}
Foque em: eficácia do tratamento, objetivos alcançados, ajustes necessários.`,
    [ReportType.CLINICAL_OUTCOMES]: `${basePrompt}
Foque em: resultados clínicos, melhoria de qualidade de vida, métricas de outcome.`,
    [ReportType.APPOINTMENT_ANALYTICS]: `${basePrompt}
Foque em: taxa de comparecimento, cancelamentos, horários de pico, otimização de agenda.`,
    [ReportType.REVENUE_REPORT]: `${basePrompt}
Foque em: receita, fluxo de pagamentos, valores pendentes, projeções.`,
    [ReportType.DAILY_SUMMARY]: `${basePrompt}
Foque em: resumo executivo do dia, pontos de atenção, tarefas para amanhã.`,
    [ReportType.WEEKLY_SUMMARY]: `${basePrompt}
Foque em: análise semanal, tendências, comparações, planejamento para próxima semana.`,
    [ReportType.MONTHLY_SUMMARY]: `${basePrompt}
Foque em: análise mensal, KPIs, metas alcançadas, planejamento estratégico.`,
  };

  return specificPrompts[type] || basePrompt;
}

function buildPromptForReportType(type: ReportType, data: any, options: any): string {
  const periodStr = `Período: ${options.start.toLocaleDateString('pt-BR')} a ${options.end.toLocaleDateString('pt-BR')}`;

  let prompt = `${periodStr}\n\n`;

  switch (type) {
    case ReportType.PATIENT_PROGRESS:
      prompt += `**Paciente:** ${data.patient?.name || 'N/A'}\n`;
      prompt += `**Condição:** ${data.patient?.condition || 'N/A'}\n\n`;
      prompt += `**Evoluções (${data.evolutions?.length || 0}):**\n`;
      data.evolutions?.forEach((e: any, i: number) => {
        prompt += `${i + 1}. ${new Date(e.createdAt?.toDate?.() || e.createdAt).toLocaleDateString('pt-BR')}: ${e.notes || 'Sem notas'}\n`;
      });
      prompt += `\n**Sessões realizadas:** ${data.sessions?.length || 0}\n`;
      prompt += `**Exercícios registrados:** ${data.exercises?.length || 0}\n\n`;
      prompt += `**Instruções:**\n`;
      prompt += `1. Analise o progresso do paciente\n`;
      prompt += `2. Identifique melhorias e áreas de atenção\n`;
      prompt += `3. Sugira ajustes no plano de tratamento\n`;
      prompt += `4. Forneça 3-5 recomendações específicas\n`;
      break;

    case ReportType.APPOINTMENT_ANALYTICS:
    case ReportType.DAILY_SUMMARY:
    case ReportType.WEEKLY_SUMMARY: {
      const totalAppts = data.appointments?.length || 0;
      const completed = data.appointments?.filter((a: any) => a.status === 'completed').length || 0;
      const cancelled = data.appointments?.filter((a: any) => a.status === 'cancelled').length || 0;
      const noShow = data.appointments?.filter((a: any) => a.status === 'no_show').length || 0;

      prompt += `**Estatísticas de Agendamentos:**\n`;
      prompt += `- Total: ${totalAppts}\n`;
      prompt += `- Completados: ${completed} (${((completed / totalAppts) * 100).toFixed(1)}%)\n`;
      prompt += `- Cancelados: ${cancelled} (${((cancelled / totalAppts) * 100).toFixed(1)}%)\n`;
      prompt += `- Não compareceu: ${noShow} (${((noShow / totalAppts) * 100).toFixed(1)}%)\n\n`;
      prompt += `**Pacientes ativos:** ${data.patients?.length || 0}\n\n`;
      prompt += `**Instruções:**\n`;
      prompt += `Gere um relatório executivo com:\n`;
      prompt += `1. Resumo dos principais números\n`;
      prompt += `2. Pontos de atenção\n`;
      prompt += `3. Oportunidades de melhoria\n`;
      if (options.includeRecommendations) {
        prompt += `4. Recomendações acionáveis\n`;
      }
      break;
    }

    case ReportType.REVENUE_REPORT: {
      const totalRevenue = data.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const pending = data.payments?.filter((p: any) => p.status === 'pending').length || 0;
      const overdue = data.payments?.filter((p: any) => p.status === 'overdue').length || 0;

      prompt += `**Resumo Financeiro:**\n`;
      prompt += `- Receita total: R$ ${(totalRevenue / 100).toFixed(2)}\n`;
      prompt += `- Pagamentos pendentes: ${pending}\n`;
      prompt += `- Pagamentos atrasados: ${overdue}\n\n`;
      prompt += `**Instruções:**\n`;
      prompt += `Gere um relatório financeiro com:\n`;
      prompt += `1. Análise de receita\n`;
      prompt += `2. Identificação de pendências\n`;
      prompt += `3. Projeções e recomendações\n`;
      break;
    }

    default:
      prompt += `**Dados disponíveis:**\n${JSON.stringify(data, null, 2)}\n\n`;
      prompt += `Gere um relatório baseado nos dados fornecidos.`;
  }

  return prompt;
}

function extractSummary(content: string): string {
  // Try to extract summary section
  const summaryMatch = content.match(/##? Resumo?\n+(.*?)(?=\n##|\n\n|$)/is);
  if (summaryMatch) {
    return summaryMatch[1].trim();
  }

  // Fallback: first paragraph
  const firstParagraph = content.split('\n\n')[0];
  return firstParagraph?.replace(/#/g, '').trim() || content.substring(0, 200) + '...';
}

function extractRecommendations(content: string): string[] {
  const recommendations: string[] = [];

  // Try to find numbered recommendations
  const recMatch = content.match(/##? Recomendações?\n+(.*?)(?=\n##|\n\n|$)/is);
  if (recMatch) {
    const lines = recMatch[1].split('\n');
    lines.forEach(line => {
      const match = line.match(/^\d+\.\s+(.*)/);
      if (match) {
        recommendations.push(match[1].trim());
      }
    });
  }

  return recommendations.length > 0 ? recommendations : ['Analisar os dados para identificar oportunidades de melhoria.'];
}

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*/gim, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Lists
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  return html;
}

import { HttpsError } from 'firebase-functions/v2/https';
