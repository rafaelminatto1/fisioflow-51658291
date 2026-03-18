import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';
import type { Env } from './types/env';
import { exercisesRoutes } from './routes/exercises';
import { protocolsRoutes } from './routes/protocols';
import { wikiRoutes } from './routes/wiki';
import { knowledgeRoutes } from './routes/knowledge';
import { templatesRoutes } from './routes/templates';
import { sessionsRoutes } from './routes/sessions';
import { mediaRoutes } from './routes/media';
import { patientsRoutes } from './routes/patients';
import { appointmentsRoutes } from './routes/appointments';
import { authRoutes } from './routes/auth';
import { documentsRoutes } from './routes/documents';
import { examsRoutes } from './routes/exams';
import { medicalRequestsRoutes } from './routes/medicalRequests';
import { goalsRoutes } from './routes/goals';
import { profileRoutes } from './routes/profile';
import { doctorsRoutes } from './routes/doctors';
import { goalProfilesRoutes } from './routes/goalProfiles';
import { financialRoutes } from './routes/financial';
import { schedulingRoutes } from './routes/scheduling';
import { crmRoutes } from './routes/crm';
import { clinicalRoutes } from './routes/clinical';
import { notificationsRoutes } from './routes/notifications';
import { eventosRoutes } from './routes/eventos';
import { auditRoutes } from './routes/auditRoutes';
import { analyticsRoutes } from './routes/analytics';
import { evolutionRoutes } from './routes/evolution';
import { evaluationFormsRoutes } from './routes/evaluationForms';
import { organizationsRoutes } from './routes/organizations';
import { organizationMembersRoutes } from './routes/organizationMembers';
import { notificationPreferencesRoutes } from './routes/notificationPreferences';
import { prestadoresRoutes } from './routes/prestadores';
import { recibosRoutes } from './routes/recibos';
import { feriadosRoutes } from './routes/feriados';
import { pushSubscriptionsRoutes } from './routes/pushSubscriptions';
import { automationRoutes } from './routes/automation';
import { gamificationNotificationsRoutes } from './routes/gamificationNotifications';
import { gamificationRoutes } from './routes/gamification';
import { exerciseVideosRoutes } from './routes/exerciseVideos';
import { exerciseSessionsRoutes } from './routes/exerciseSessions';
import { timeEntriesRoutes } from './routes/timeEntries';
import { whatsappRoutes } from './routes/whatsapp';
import { precadastroRoutes } from './routes/precadastro';
import { telemedicineRoutes } from './routes/telemedicine';
import { imageProcessorRoutes } from './routes/imageProcessor';
import { inngestRoutes } from './routes/inngest';
import { calendarRoutes } from './routes/calendar';
import { projectsRoutes } from './routes/projects';
import { reportsRoutes } from './routes/reports';
import { publicBookingRoutes } from './routes/publicBooking';
import { integrationsRoutes } from './routes/integrations';
import { securityRoutes } from './routes/security';
import { communicationsRoutes } from './routes/communications';
import { innovationsRoutes } from './routes/innovations';
import { tarefasRoutes } from './routes/tarefas';
import { invitationsRoutes } from './routes/invitations';
import { satisfactionSurveysRoutes } from './routes/satisfactionSurveys';
import { wearablesRoutes } from './routes/wearables';
import { documentSignaturesRoutes } from './routes/documentSignatures';
import { treatmentCyclesRoutes } from './routes/treatmentCycles';
import { evolutionVersionsRoutes } from './routes/evolutionVersions';
import { exercisePlansRoutes } from './routes/exercisePlans';
import { activityLabRoutes } from './routes/activityLab';
import { marketingRoutes } from './routes/marketing';
import { aiRoutes } from './routes/ai';
import { dicomRoutes } from './routes/dicom';
import { fcmTokensRoutes } from './routes/fcmTokens';
import { webhooksRoutes } from './routes/webhooks';
import { patientPortalRoutes } from './routes/patientPortal';
import { messagingRoutes } from './routes/messaging';
import { boardsRoutes } from './routes/boards';
import { standardizedTestsRoutes } from './routes/standardizedTests';
import { commissionsRoutes } from './routes/commissions';
import { nfseRoutes } from './routes/nfse';
import { verifyToken } from './lib/auth';
import { getRawSql } from './lib/db';

import { perf } from './lib/perf';
import { logToAxiom } from './lib/axiom';

const app = new Hono<{ Bindings: Env }>();

// 1. MIDDLEWARE DE CORS GLOBAL (Executa antes de tudo)
app.use('*', async (c, next) => {
  const requestOrigin = c.req.header('Origin');
  const allowedOrigins = (c.env as any).ALLOWED_ORIGINS
    ? String((c.env as any).ALLOWED_ORIGINS).split(',').map((o: string) => o.trim())
    : ['http://localhost:5173'];

  const isAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);
  const origin = isAllowed && requestOrigin ? requestOrigin : allowedOrigins[0];

  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Cookie',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  c.res.headers.set('Access-Control-Allow-Origin', origin);
  c.res.headers.set('Access-Control-Allow-Credentials', 'true');
});

app.use('*', logger());
app.use('*', secureHeaders());

// ===== HEALTH & DB DIAGNOSTIC =====
app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/api/health/db', async (c) => {
  try {
    const sql = getRawSql(c.env);
    const result = await sql`SELECT 1 as connection_test`;
    return c.json({ status: 'connected', result });
  } catch (error: any) {
    return c.json({ status: 'error', message: error.message }, 500);
  }
});

// ===== ROTAS =====
app.route('/api/exercises', exercisesRoutes);
app.route('/api/protocols', protocolsRoutes);
app.route('/api/wiki', wikiRoutes);
app.route('/api/knowledge', knowledgeRoutes);
app.route('/api/templates', templatesRoutes);
app.route('/api/sessions', sessionsRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/patients', patientsRoutes);
app.route('/api/appointments', appointmentsRoutes);
app.route('/api/documents', documentsRoutes);
app.route('/api/exams', examsRoutes);
app.route('/api/medical-requests', medicalRequestsRoutes);
app.route('/api/goals', goalsRoutes);
app.route('/api/profile', profileRoutes);
app.route('/api/doctors', doctorsRoutes);
app.route('/api/goal-profiles', goalProfilesRoutes);
app.route('/api/financial', financialRoutes);
app.route('/api/scheduling', schedulingRoutes);
app.route('/api/crm', crmRoutes);
app.route('/api/clinical', clinicalRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api', eventosRoutes);
app.route('/api/insights', analyticsRoutes);
app.route('/api/evolution', evolutionRoutes);
app.route('/api/audit-logs', auditRoutes);
app.route('/api/evaluation-forms', evaluationFormsRoutes);
app.route('/api/organizations', organizationsRoutes);
app.route('/api/organization-members', organizationMembersRoutes);
app.route('/api/notification-preferences', notificationPreferencesRoutes);
app.route('/api/prestadores', prestadoresRoutes);
app.route('/api/recibos', recibosRoutes);
app.route('/api/feriados', feriadosRoutes);
app.route('/api/push-subscriptions', pushSubscriptionsRoutes);
app.route('/api/automation', automationRoutes);
app.route('/api/gamification-notifications', gamificationNotificationsRoutes);
app.route('/api/gamification', gamificationRoutes);
app.route('/api/exercise-videos', exerciseVideosRoutes);
app.route('/api/exercise-sessions', exerciseSessionsRoutes);
app.route('/api/time-entries', timeEntriesRoutes);
app.route('/api/whatsapp', whatsappRoutes);
app.route('/api/precadastro', precadastroRoutes);
app.route('/api/telemedicine', telemedicineRoutes);
app.route('/api/exercise-image', imageProcessorRoutes);
app.route('/api/inngest', inngestRoutes);
app.route('/api/calendar', calendarRoutes);
app.route('/api/projects', projectsRoutes);
app.route('/api/reports', reportsRoutes);
app.route('/api/public', publicBookingRoutes);
app.route('/api/integrations', integrationsRoutes);
app.route('/api/security', securityRoutes);
app.route('/api/communications', communicationsRoutes);
app.route('/api/innovations', innovationsRoutes);
app.route('/api/tarefas', tarefasRoutes);
app.route('/api/invitations', invitationsRoutes);
app.route('/api/satisfaction-surveys', satisfactionSurveysRoutes);
app.route('/api/wearables', wearablesRoutes);
app.route('/api/document-signatures', documentSignaturesRoutes);
app.route('/api/treatment-cycles', treatmentCyclesRoutes);
app.route('/api/evolution-versions', evolutionVersionsRoutes);
app.route('/api/exercise-plans', exercisePlansRoutes);
app.route('/api/activity-lab', activityLabRoutes);
app.route('/api/marketing', marketingRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/dicom', dicomRoutes);
app.route('/api/fcm-tokens', fcmTokensRoutes);
app.route('/api/webhooks', webhooksRoutes);
app.route('/api/patient-portal', patientPortalRoutes);
app.route('/api/messaging', messagingRoutes);
app.route('/api/boards', boardsRoutes);
app.route('/api/standardized-tests', standardizedTestsRoutes);
app.route('/api/commissions', commissionsRoutes);
app.route('/api/nfse', nfseRoutes);

// REALTIME
app.get('/api/realtime', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') return c.json({ error: 'Upgrade required' }, 400);
  const token = c.req.query('token');
  if (!token) return c.json({ error: 'Token required' }, 401);
  const authUser = await verifyToken(c, c.env);
  if (!authUser) return c.json({ error: 'Invalid token' }, 401);
  const id = c.env.ORGANIZATION_STATE.idFromName(authUser.organizationId);
  const obj = c.env.ORGANIZATION_STATE.get(id);
  // Durable Object espera path /ws com userId e orgId
  const wsUrl = new URL(c.req.url);
  wsUrl.pathname = '/ws';
  wsUrl.searchParams.set('userId', authUser.uid);
  wsUrl.searchParams.set('orgId', authUser.organizationId);
  return obj.fetch(new Request(wsUrl.toString(), c.req.raw));
});

// ERROR HANDLER (BLINDADO COM CORS)
app.onError((err, c) => {
  console.error('[CRITICAL WORKER ERROR]', err.message);
  const requestOrigin = c.req.header('Origin');
  const allowedOrigins = (c.env as any).ALLOWED_ORIGINS
    ? String((c.env as any).ALLOWED_ORIGINS).split(',').map((o: string) => o.trim())
    : ['http://localhost:5173'];
  const isAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);
  const origin = isAllowed && requestOrigin ? requestOrigin : allowedOrigins[0];

  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    details: err.stack,
  }, 500, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  });
});

import { handleScheduled } from './cron';
import { handleQueue } from './queue';
export { OrganizationState } from './lib/realtime';

/**
 * WebSocket upgrades precisam ser tratados ANTES do middleware Hono para que os
 * headers do middleware (CORS, secureHeaders) não corrompam a resposta 101.
 */
async function handleRealtimeWS(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return new Response(JSON.stringify({ error: 'Token required' }), { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUser = await verifyToken({ req: { header: () => undefined, query: (k: string) => (k === 'token' ? token : undefined) } } as any, env);
  if (!authUser) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });

  const id = env.ORGANIZATION_STATE.idFromName(authUser.organizationId);
  const obj = env.ORGANIZATION_STATE.get(id);
  const wsUrl = new URL(request.url);
  wsUrl.pathname = '/ws';
  wsUrl.searchParams.set('userId', authUser.uid);
  wsUrl.searchParams.set('orgId', authUser.organizationId);
  return obj.fetch(new Request(wsUrl.toString(), request));
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // WebSocket upgrades: bypass Hono middleware (evita corrupção da resposta 101)
    if (request.headers.get('Upgrade') === 'websocket' && new URL(request.url).pathname === '/api/realtime') {
      return handleRealtimeWS(request, env);
    }
    return app.fetch(request, env, ctx);
  },
  scheduled: handleScheduled,
  queue: handleQueue,
};
