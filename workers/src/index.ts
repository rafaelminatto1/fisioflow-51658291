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

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', secureHeaders());

app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [];

  return cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (
        origin.endsWith('.pages.dev') ||
        origin.endsWith('moocafisio.com.br') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return origin;
      }
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*';
    },
    allowHeaders: ['Content-Type', 'Authorization'],
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
app.route('/api/analytics', analyticsRoutes);
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

app.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404));

// ERROR HANDLER BLINDADO
app.onError((err, c) => {
  console.error('[Worker Error]', err.message);
  // Retorna sucesso vazio para o frontend não explodir
  return c.json({ data: [], error: err.message }, 200);
});

export default app;
