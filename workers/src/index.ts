import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
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

import { perf } from './lib/perf';
import { logToAxiom } from './lib/axiom';

const app = new Hono<{ Bindings: Env }>();

// Middleware de Logs para o Axiom (Observabilidade Total)
app.use('*', async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  c.header('X-Request-Id', requestId);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Envia log estruturado para o Axiom em segundo plano
  logToAxiom(c.env, c.executionCtx, {
    level: status >= 400 ? 'error' : 'info',
    message: `${c.req.method} ${c.req.path} - ${status}`,
    requestId,
    method: c.req.method,
    path: c.req.path,
    status,
    duration,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('cf-connecting-ip'),
  });
});

// Performance Middleware
app.use('*', async (c, next) => {
  const label = `${c.req.method} ${c.req.path}`;
  perf.start(label);
  await next();
  perf.end(label);
});

app.use('*', logger());
app.use('*', secureHeaders());

app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [];

  return cors({
    origin: (origin) => {
      // Se não houver origin (mobile apps, scripts), reflete se possível ou retorna o primeiro permitido
      if (!origin || origin === 'null') {
        return origin || allowedOrigins[0] || '*';
      }

      // Whitelist explícita e domínios confiáveis
      if (
        origin.endsWith('.pages.dev') ||
        origin.endsWith('moocafisio.com.br') ||
        origin.endsWith('inngest.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        allowedOrigins.includes(origin)
      ) {
        return origin;
      }

      // Fallback seguro (não pode usar '*' com credentials: true)
      return allowedOrigins[0] || '*';
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

// ===== HEALTH CHECK BLINDADO =====
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() }, 200);
});

app.get('/api/ping', (c) => c.json({ ok: true }, 200));

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
import { verifyToken } from './lib/auth';

app.route('/api/messaging', messagingRoutes);

// =====================
// REALTIME WEBSOCKET API
// =====================
app.get('/api/realtime', async (c) => {
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'Upgrade header required' }, 400);
  }

  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'Token is required' }, 401);
  }

  const authUser = await verifyToken(`Bearer ${token}`, c.env);
  if (!authUser) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const orgId = authUser.organizationId;
  const userId = authUser.uid;

  const id = c.env.ORGANIZATION_STATE.idFromName(orgId);
  const obj = c.env.ORGANIZATION_STATE.get(id);

  const wsUrl = new URL(c.req.url);
  wsUrl.pathname = '/ws';
  wsUrl.searchParams.set('userId', userId);
  wsUrl.searchParams.set('orgId', orgId);

  return obj.fetch(new Request(wsUrl.toString(), c.req.raw));
});

app.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404));

// Rota de Health Check
app.get('/api/health', (c) => c.json({ status: 'ok', environment: c.env.ENVIRONMENT, timestamp: new Date().toISOString() }));

// CATCH-ALL SUCCESS HANDLER para rotas /api não implementadas
// Isso evita que o frontend quebre com 404 em funcionalidades ainda não migradas
app.all('/api/*', (c) => {
  console.log(`[Worker] Unmapped API Route accessed: ${c.req.path}`);
  return c.json({ data: [], message: 'Funcionalidade em migração', unmapped: true }, 200);
});

// ERROR HANDLER BLINDADO
app.onError((err, c) => {
  console.error('[Worker Error]', err.message, err.stack);

  // Envia erro rico para o Axiom
  logToAxiom(c.env, c.executionCtx, {
    level: 'error',
    message: `Unhandled Error: ${err.message}`,
    error: {
      name: err.name,
      stack: err.stack,
      cause: (err as any).cause,
    },
    request: {
      method: c.req.method,
      path: c.req.path,
      url: c.req.url,
    }
  });

  // Retorna sucesso vazio ou erro formatado dependendo do ambiente
  const status = (err as any).status || 500;
  return c.json({ 
    data: [], 
    error: c.env.ENVIRONMENT === 'production' ? 'Ocorreu um erro interno no servidor.' : err.message 
  }, status === 404 ? 404 : 200); // Manter 200 para o frontend não quebrar se for decisão de design antiga
});

import { handleScheduled } from './cron';
export { OrganizationState } from './lib/realtime';

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
};
