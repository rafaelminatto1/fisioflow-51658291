/**
 * FisioFlow API — Cloudflare Workers
 *
 * Stack: Hono + Neon PostgreSQL (via Hyperdrive) + Drizzle ORM
 * Auth:  Neon Auth JWT (verificado via JWKS)
 *
 * Endpoints:
 *   GET    /api/health
 *   GET    /api/exercises/categories
 *   GET    /api/exercises
 *   GET    /api/exercises/:id
 *   POST   /api/exercises/:id/favorite    (auth)
 *   DELETE /api/exercises/:id/favorite    (auth)
 *   GET    /api/exercises/favorites/me    (auth)
 *   GET    /api/protocols
 *   GET    /api/protocols/:id
 *   POST   /api/protocols               (auth)
 *   PUT    /api/protocols/:id            (auth)
 *   DELETE /api/protocols/:id            (auth)
 *   GET    /api/wiki
 *   GET    /api/wiki/:slug
 *   GET    /api/wiki/:slug/children
 *   GET    /api/wiki/:slug/versions       (auth)
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types/env';
import { createPool } from './lib/db';
import { exercisesRoutes } from './routes/exercises';
import { protocolsRoutes } from './routes/protocols';
import { wikiRoutes } from './routes/wiki';
import { templatesRoutes } from './routes/templates';
import { sessionsRoutes } from './routes/sessions';
import { mediaRoutes } from './routes/media';
import { patientsRoutes } from './routes/patients';
import { appointmentsRoutes } from './routes/appointments';
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
import { whatsappRoutes } from './routes/whatsapp';

const app = new Hono<{ Bindings: Env }>();

// ===== MIDDLEWARES GLOBAIS =====

app.use('*', logger());

app.use('*', secureHeaders());

// CORS dinâmico baseado na variável ALLOWED_ORIGINS
app.use('*', async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [];
  const origin = c.req.header('Origin') ?? '';
  const allowed = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*';

  return cors({
    origin: allowed,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

// ===== HEALTH CHECK =====
app.get('/api/health', async (c) => {
  let dbOk = true;
  try {
    const pool = createPool(c.env);
    await pool.query('SELECT 1');
    await pool.end();
  } catch {
    dbOk = false;
  }
  const status = dbOk ? 'ok' : 'degraded';
  return c.json(
    {
      status,
      db: dbOk ? 'ok' : 'error',
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    dbOk ? 200 : 503,
  );
});

// ===== ROTAS =====
// Ping simples para health checks de infraestrutura (Playwright webServer, load balancers, etc.)
app.get('/api/ping', (c) => c.json({ ok: true }, 200));

app.route('/api/exercises', exercisesRoutes);
app.route('/api/protocols', protocolsRoutes);
app.route('/api/wiki', wikiRoutes);
app.route('/api/templates', templatesRoutes);
app.route('/api/sessions', sessionsRoutes);
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
app.route('/api/whatsapp', whatsappRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404));

// Error handler global
app.onError((err, c) => {
  console.error('[Worker Error]', err.message, err.stack);
  return c.json(
    {
      error: 'Erro interno do servidor',
      ...(c.env.ENVIRONMENT !== 'production' && { details: err.message }),
    },
    500,
  );
});

export default app;
