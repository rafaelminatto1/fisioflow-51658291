import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types/env';
import type { CustomVariables } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
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
import { biomechanicsRoutes } from './routes/biomechanics';
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
import { announcementsRoutes } from './routes/announcements';
import { adminSeedTemplatesRoutes } from './routes/admin/seed-templates';
import { verifyToken } from './lib/auth';
import { getRawSql } from './lib/db';
import { routeAgentRequest } from 'agents';
import { analyticsMiddleware } from './lib/analytics';


const app = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

// 1. MIDDLEWARE DE CORS GLOBAL (Executa antes de tudo)
app.use('*', async (c, next) => {
  const requestOrigin = c.req.header('Origin');
  
  // Lista robusta de origens permitidas (fallback para produção se a env falhar)
  const defaultOrigins = [
    'https://moocafisio.com.br',
    'https://www.moocafisio.com.br',
    'https://fisioflow.pages.dev',
    'http://localhost:5173'
  ];

  const allowedOrigins = (c.env as any).ALLOWED_ORIGINS
    ? String((c.env as any).ALLOWED_ORIGINS).split(',').map((o: string) => o.trim())
    : defaultOrigins;

  const isAllowed = !requestOrigin || allowedOrigins.includes(requestOrigin);
  const origin = isAllowed && requestOrigin ? requestOrigin : allowedOrigins[0];

  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cookie, X-Neon-Auth-Token');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400');
    return c.body(null, 204);
  }

  await next();

  c.res.headers.set('Access-Control-Allow-Origin', origin);
  c.res.headers.set('Access-Control-Allow-Credentials', 'true');
});

app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', requestIdMiddleware);
// Analytics Engine — instrumentação automática de todas as rotas (fire-and-forget)
app.use('*', (c, next) => analyticsMiddleware(c.env)(c, next));

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
const apiRoutes = [
  ['/api/exercises', exercisesRoutes],
  ['/api/protocols', protocolsRoutes],
  ['/api/wiki', wikiRoutes],
  ['/api/knowledge', knowledgeRoutes],
  ['/api/templates', templatesRoutes],
  ['/api/sessions', sessionsRoutes],
  ['/api/auth', authRoutes],
  ['/api/media', mediaRoutes],
  ['/api/patients', patientsRoutes],
  ['/api/appointments', appointmentsRoutes],
  ['/api/documents', documentsRoutes],
  ['/api/exams', examsRoutes],
  ['/api/medical-requests', medicalRequestsRoutes],
  ['/api/goals', goalsRoutes],
  ['/api/profile', profileRoutes],
  ['/api/doctors', doctorsRoutes],
  ['/api/goal-profiles', goalProfilesRoutes],
  ['/api/financial', financialRoutes],
  ['/api/scheduling', schedulingRoutes],
  ['/api/crm', crmRoutes],
  ['/api/clinical', clinicalRoutes],
  ['/api/notifications', notificationsRoutes],
  ['/api/communications', communicationsRoutes],
  ['/api/organizations', organizationsRoutes],
  ['/api/organization-members', organizationMembersRoutes],
  ['/api/evolution', evolutionRoutes],
  ['/api/evaluation-forms', evaluationFormsRoutes],
  ['/api/notification-preferences', notificationPreferencesRoutes],
  ['/api/prestadores', prestadoresRoutes],
  ['/api/recibos', recibosRoutes],
  ['/api/feriados', feriadosRoutes],
  ['/api/push-subscriptions', pushSubscriptionsRoutes],
  ['/api/automation', automationRoutes],
  ['/api/gamification-notifications', gamificationNotificationsRoutes],
  ['/api/gamification', gamificationRoutes],
  ['/api/exercise-videos', exerciseVideosRoutes],
  ['/api/exercise-sessions', exerciseSessionsRoutes],
  ['/api/time-entries', timeEntriesRoutes],
  ['/api/whatsapp', whatsappRoutes],
  ['/api/precadastro', precadastroRoutes],
  ['/api/telemedicine', telemedicineRoutes],
  ['/api/image-processor', imageProcessorRoutes],
  ['/api/inngest', inngestRoutes],
  ['/api/calendar', calendarRoutes],
  ['/api/projects', projectsRoutes],
  ['/api/reports', reportsRoutes],
  ['/api/public-booking', publicBookingRoutes],
  ['/api/integrations', integrationsRoutes],
  ['/api/security', securityRoutes],
  ['/api/treatment-cycles', treatmentCyclesRoutes],
  ['/api/evolution-versions', evolutionVersionsRoutes],
  ['/api/exercise-plans', exercisePlansRoutes],
  ['/api/activity-lab', activityLabRoutes],
  ['/api/patient-portal', patientPortalRoutes],
  ['/api/audit-logs', auditRoutes],
  ['/api/analytics', analyticsRoutes],
  ['/api/insights', analyticsRoutes],
  ['/api', eventosRoutes],
  ['/api/innovations', innovationsRoutes],
  ['/api/tarefas', tarefasRoutes],
  ['/api/invitations', invitationsRoutes],
  ['/api/satisfaction-surveys', satisfactionSurveysRoutes],
  ['/api/wearables', wearablesRoutes],
  ['/api/document-signatures', documentSignaturesRoutes],
  ['/api/marketing', marketingRoutes],
  ['/api/biomechanics', biomechanicsRoutes],
  ['/api/ai', aiRoutes],
  ['/api/dicom', dicomRoutes],
  ['/api/fcm-tokens', fcmTokensRoutes],
  ['/api/webhooks', webhooksRoutes],
  ['/api/messaging', messagingRoutes],
  ['/api/boards', boardsRoutes],
  ['/api/standardized-tests', standardizedTestsRoutes],
  ['/api/commissions', commissionsRoutes],
  ['/api/nfse', nfseRoutes],
  ['/api/announcements', announcementsRoutes],
  ['/api/admin/seed-templates', adminSeedTemplatesRoutes],
] as const;

apiRoutes.forEach(([path, router]) => {
  app.route(path, router as any);
});

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
app.onError(errorHandler);

import { handleScheduled } from './cron';
import { handleQueue } from './queue';
export { OrganizationState } from './lib/realtime';
export { PatientAgent } from './agents/PatientAgent';

// Hono RPC — exporta o tipo da app para type-safe client no frontend
export type AppType = typeof app;

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
    // 1. Roteamento de Agentes (Cloudflare Agents SDK) - Intercepta /agents/*
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    // WebSocket upgrades: bypass Hono middleware (evita corrupção da resposta 101)
    if (request.headers.get('Upgrade') === 'websocket' && new URL(request.url).pathname === '/api/realtime') {
      return handleRealtimeWS(request, env);
    }
    return app.fetch(request, env, ctx);
  },
  scheduled: handleScheduled,
  queue: handleQueue,
};
