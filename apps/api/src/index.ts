import { Hono } from "hono";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { Env } from "./types/env";
import type { CustomVariables } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { requestIdMiddleware } from "./middleware/requestId";
import { exercisesRoutes } from "./routes/exercises";
import { protocolsRoutes } from "./routes/protocols";
import { wikiRoutes } from "./routes/wiki";
import { knowledgeRoutes } from "./routes/knowledge";
import { templatesRoutes } from "./routes/templates";
import { sessionsRoutes } from "./routes/sessions";
import { mediaRoutes } from "./routes/media";
import { patientsRoutes } from "./routes/patients";
import { appointmentsRoutes } from "./routes/appointments";
import { authRoutes } from "./routes/auth";
import { documentsRoutes } from "./routes/documents";
import { examsRoutes } from "./routes/exams";
import { medicalRequestsRoutes } from "./routes/medicalRequests";
import { goalsRoutes } from "./routes/goals";
import { profileRoutes } from "./routes/profile";
import { doctorsRoutes } from "./routes/doctors";
import { goalProfilesRoutes } from "./routes/goalProfiles";
import { financialRoutes } from "./routes/financial";
import { schedulingRoutes } from "./routes/scheduling";
import { crmRoutes } from "./routes/crm";
import { clinicalRoutes } from "./routes/clinical";
import { notificationsRoutes } from "./routes/notifications";
import { eventosRoutes } from "./routes/eventos";
import { auditRoutes } from "./routes/auditRoutes";
import { analyticsRoutes } from "./routes/analytics";
import { evolutionRoutes } from "./routes/evolution";
import { evaluationFormsRoutes } from "./routes/evaluationForms";
import { organizationsRoutes } from "./routes/organizations";
import { organizationMembersRoutes } from "./routes/organizationMembers";
import { notificationPreferencesRoutes } from "./routes/notificationPreferences";
import { prestadoresRoutes } from "./routes/prestadores";
import { recibosRoutes } from "./routes/recibos";
import { feriadosRoutes } from "./routes/feriados";
import { pushSubscriptionsRoutes } from "./routes/pushSubscriptions";
import { automationRoutes } from "./routes/automation";
import { gamificationNotificationsRoutes } from "./routes/gamificationNotifications";
import { gamificationRoutes } from "./routes/gamification";
import { exerciseVideosRoutes } from "./routes/exerciseVideos";
import { exerciseSessionsRoutes } from "./routes/exerciseSessions";
import { timeEntriesRoutes } from "./routes/timeEntries";
import { whatsappRoutes } from "./routes/whatsapp";
import { whatsappWebhookRoutes } from "./routes/whatsapp-webhook";
import { whatsappInboxRoutes } from "./routes/whatsapp-inbox";
import { precadastroRoutes } from "./routes/precadastro";
import { telemedicineRoutes } from "./routes/telemedicine";
import { imageProcessorRoutes } from "./routes/imageProcessor";
import { calendarRoutes } from "./routes/calendar";
import { projectsRoutes } from "./routes/projects";
import { reportsRoutes } from "./routes/reports";
import { publicBookingRoutes } from "./routes/publicBooking";
import { integrationsRoutes } from "./routes/integrations";
import { securityRoutes } from "./routes/security";
import { communicationsRoutes } from "./routes/communications";
import { innovationsRoutes } from "./routes/innovations";
import { tarefasRoutes } from "./routes/tarefas";
import { invitationsRoutes } from "./routes/invitations";
import { satisfactionSurveysRoutes } from "./routes/satisfactionSurveys";
import { wearablesRoutes } from "./routes/wearables";
import { documentSignaturesRoutes } from "./routes/documentSignatures";
import { treatmentCyclesRoutes } from "./routes/treatmentCycles";
import { evolutionVersionsRoutes } from "./routes/evolutionVersions";
import { exercisePlansRoutes } from "./routes/exercisePlans";
import { activityLabRoutes } from "./routes/activityLab";
import { marketingRoutes } from "./routes/marketing";
import { biomechanicsRoutes } from "./routes/biomechanics";
import { aiRoutes } from "./routes/ai";
import { aiAgentsRoutes } from "./routes/ai-agents";
import { aiStudioRoutes } from "./routes/ai-studio";
import { fcmTokensRoutes } from "./routes/fcmTokens";
import { webhooksRoutes } from "./routes/webhooks";
import { patientPortalRoutes } from "./routes/patientPortal";
import { messagingRoutes } from "./routes/messaging";
import { boardsRoutes } from "./routes/boards";
import { standardizedTestsRoutes } from "./routes/standardizedTests";
import { commissionsRoutes } from "./routes/commissions";
import { nfseRoutes } from "./routes/nfse";
import { packagesRoutes } from "./routes/packages";
import { announcementsRoutes } from "./routes/announcements";
import { adminSeedTemplatesRoutes } from "./routes/admin/seed-templates";
import { triggerDigitalTwinRoutes } from "./routes/admin/trigger-digital-twin";
import { searchRoutes } from "./routes/search";
import { reportsPdfRoutes } from "./routes/reportsPdf";
import { eventsRoutes as businessEventsRoutes } from "./routes/events";
import aiSearchApp from "./routes/aiSearch";
import { aiConfigRoutes } from "./routes/ai-config";
import { aiClinicalSearchRoutes } from "./routes/ai-clinical-search";
import { verifyToken } from "./lib/auth";
import { getRawSql } from "./lib/db";
import { routeAgentRequest } from "agents";
import { analyticsMiddleware } from "./lib/analytics";

import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env; Variables: CustomVariables }>();

function parseAllowedOrigins(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveCorsOrigin(origin: string | undefined, env: Env): string | undefined {
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  if (allowedOrigins.length === 0) return undefined;

  if (allowedOrigins.includes("*")) {
    return env.ENVIRONMENT === "production" ? undefined : origin;
  }

  if (!origin) return undefined;
  return allowedOrigins.includes(origin) ? origin : undefined;
}

// CORS: usa allowlist de ambiente; wildcard só é aceito fora de produção.
app.use(
  "*",
  cors({
    origin: (origin, c) => resolveCorsOrigin(origin, c.env),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cookie",
      "X-Neon-Auth-Token",
      "X-Request-ID",
    ],
    credentials: true,
    maxAge: 86400,
  }),
);

app.use("*", logger());
app.use(
  "*",
  secureHeaders({
    strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: {
      camera: ["self"],
      microphone: ["self"],
      geolocation: ["self"],
      payment: [],
      usb: [],
      accelerometer: [],
      gyroscope: ["self"],
      magnetometer: [],
    },
    crossOriginOpenerPolicy: "same-origin",
    crossOriginResourcePolicy: "cross-origin",
  }),
);
app.use("*", requestIdMiddleware);
// Analytics Engine — instrumentação automática de todas as rotas (fire-and-forget)
app.use("*", (c, next) => analyticsMiddleware(c.env)(c, next));

// ===== HEALTH & DB DIAGNOSTIC =====
app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.get("/api/health/db", async (c) => {
  try {
    const sql = getRawSql(c.env);
    const result = await sql("SELECT 1 as connection_test");
    return c.json({ status: "connected", rows: result.rows });
  } catch (error: any) {
    return c.json({ status: "error", message: error.message }, 500);
  }
});

app.get("/api/health/schema", async (c) => {
  try {
    const sql = getRawSql(c.env);
    const result = await sql(`
			SELECT column_name, data_type
			FROM information_schema.columns
			WHERE table_name = 'patients'
		`);
    return c.json({ table: "patients", columns: result.rows });
  } catch (error: any) {
    return c.json({ status: "error", message: error.message }, 500);
  }
});

// ===== ROTAS =====
const apiRoutes = [
  ["/api/ai-trigger-dt", triggerDigitalTwinRoutes],
  ["/api/ai-clinical-search", aiClinicalSearchRoutes],
  ["/api/exercises", exercisesRoutes],
  ["/api/protocols", protocolsRoutes],
  ["/api/wiki", wikiRoutes],
  ["/api/knowledge", knowledgeRoutes],
  ["/api/templates", templatesRoutes],
  ["/api/sessions", sessionsRoutes],
  ["/api/auth", authRoutes],
  ["/api/media", mediaRoutes],
  ["/api/patients", patientsRoutes],
  ["/api/appointments", appointmentsRoutes],
  ["/api/documents", documentsRoutes],
  ["/api/exams", examsRoutes],
  ["/api/medical-requests", medicalRequestsRoutes],
  ["/api/goals", goalsRoutes],
  ["/api/profile", profileRoutes],
  ["/api/doctors", doctorsRoutes],
  ["/api/goal-profiles", goalProfilesRoutes],
  ["/api/financial", financialRoutes],
  ["/api/scheduling", schedulingRoutes],
  ["/api/crm", crmRoutes],
  ["/api/clinical", clinicalRoutes],
  ["/api/notifications", notificationsRoutes],
  ["/api/communications", communicationsRoutes],
  ["/api/organizations", organizationsRoutes],
  ["/api/organization-members", organizationMembersRoutes],
  ["/api/evolution", evolutionRoutes],
  ["/api/evaluation-forms", evaluationFormsRoutes],
  ["/api/notification-preferences", notificationPreferencesRoutes],
  ["/api/prestadores", prestadoresRoutes],
  ["/api/recibos", recibosRoutes],
  ["/api/feriados", feriadosRoutes],
  ["/api/push-subscriptions", pushSubscriptionsRoutes],
  ["/api/automation", automationRoutes],
  ["/api/gamification-notifications", gamificationNotificationsRoutes],
  ["/api/gamification", gamificationRoutes],
  ["/api/exercise-videos", exerciseVideosRoutes],
  ["/api/exercise-sessions", exerciseSessionsRoutes],
  ["/api/time-entries", timeEntriesRoutes],
  ["/api/whatsapp", whatsappRoutes],
  ["/api/whatsapp/webhook", whatsappWebhookRoutes],
  ["/api/whatsapp/inbox", whatsappInboxRoutes],
  ["/api/precadastro", precadastroRoutes],
  ["/api/telemedicine", telemedicineRoutes],
  ["/api/image-processor", imageProcessorRoutes],
  ["/api/calendar", calendarRoutes],
  ["/api/projects", projectsRoutes],
  ["/api/reports", reportsRoutes],
  ["/api/public-booking", publicBookingRoutes],
  ["/api/integrations", integrationsRoutes],
  ["/api/security", securityRoutes],
  ["/api/treatment-cycles", treatmentCyclesRoutes],
  ["/api/evolution-versions", evolutionVersionsRoutes],
  ["/api/exercise-plans", exercisePlansRoutes],
  ["/api/activity-lab", activityLabRoutes],
  ["/api/patient-portal", patientPortalRoutes],
  ["/api/audit-logs", auditRoutes],
  ["/api/analytics", analyticsRoutes],
  ["/api/insights", analyticsRoutes],
  ["/api", eventosRoutes],
  ["/api/innovations", innovationsRoutes],
  ["/api/tarefas", tarefasRoutes],
  ["/api/invitations", invitationsRoutes],
  ["/api/satisfaction-surveys", satisfactionSurveysRoutes],
  ["/api/wearables", wearablesRoutes],
  ["/api/document-signatures", documentSignaturesRoutes],
  ["/api/marketing", marketingRoutes],
  ["/api/biomechanics", biomechanicsRoutes],
  ["/api/ai", aiRoutes],
  ["/api/ia-studio", aiStudioRoutes],
  ["/api/agents", aiAgentsRoutes],
  ["/api/fcm-tokens", fcmTokensRoutes],
  ["/api/webhooks", webhooksRoutes],
  ["/api/messaging", messagingRoutes],
  ["/api/boards", boardsRoutes],
  ["/api/standardized-tests", standardizedTestsRoutes],
  ["/api/commissions", commissionsRoutes],
  ["/api/nfse", nfseRoutes],
  ["/api/packages", packagesRoutes],
  ["/api/announcements", announcementsRoutes],
  ["/api/admin/seed-templates", adminSeedTemplatesRoutes],
  ["/api/search", searchRoutes],
  ["/api/reports/pdf", reportsPdfRoutes],
  ["/api/events", businessEventsRoutes],
  ["/api/ai-search", aiSearchApp],
  ["/api/ai-config", aiConfigRoutes],
  ["/api/ai-clinical-search", aiClinicalSearchRoutes],
] as const;

apiRoutes.forEach(([path, router]) => {
  app.route(path, router as any);
});

// REALTIME
app.get("/api/realtime", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") return c.json({ error: "Upgrade required" }, 400);
  const token = c.req.query("token");
  if (!token) return c.json({ error: "Token required" }, 401);
  const authUser = await verifyToken(c, c.env);
  if (!authUser) return c.json({ error: "Invalid token" }, 401);
  const id = c.env.ORGANIZATION_STATE.idFromName(authUser.organizationId);
  const obj = c.env.ORGANIZATION_STATE.get(id);
  // Durable Object espera path /ws com userId e orgId
  const wsUrl = new URL(c.req.url);
  wsUrl.pathname = "/ws";
  wsUrl.searchParams.set("userId", authUser.uid);
  wsUrl.searchParams.set("orgId", authUser.organizationId);
  return obj.fetch(new Request(wsUrl.toString(), c.req.raw));
});

// ERROR HANDLER (BLINDADO COM CORS)
app.onError(errorHandler);

import { handleScheduled } from "./cron";
import { handleQueue } from "./queue";
export { OrganizationState } from "./lib/realtime";
export { PatientAgent } from "./agents/PatientAgent";
export { AssessmentLiveSession } from "./agents/AssessmentLiveSession";
export {
  AppointmentReminderWorkflow,
  PatientOnboardingWorkflow,
  NFSeWorkflow,
  HEPComplianceWorkflow,
  PatientDischargeWorkflow,
  PatientReengagementWorkflow,
  PatientDigitalTwinWorkflow,
} from "./workflows";

// Hono RPC — exporta o tipo da app para type-safe client no frontend
export type AppType = typeof app;

/**
 * WebSocket upgrades precisam ser tratados ANTES do middleware Hono para que os
 * headers do middleware (CORS, secureHeaders) não corrompam a resposta 101.
 */
async function handleRealtimeWS(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token)
    return new Response(JSON.stringify({ error: "Token required" }), {
      status: 401,
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUser = await verifyToken(
    {
      req: {
        header: () => undefined,
        query: (k: string) => (k === "token" ? token : undefined),
      },
    } as any,
    env,
  );
  if (!authUser)
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
    });

  const id = env.ORGANIZATION_STATE.idFromName(authUser.organizationId);
  const obj = env.ORGANIZATION_STATE.get(id);
  const wsUrl = new URL(request.url);
  wsUrl.pathname = "/ws";
  wsUrl.searchParams.set("userId", authUser.uid);
  wsUrl.searchParams.set("orgId", authUser.organizationId);
  return obj.fetch(new Request(wsUrl.toString(), request));
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Roteamento de Agentes (Cloudflare Agents SDK) - Intercepta /agents/*
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) return agentResponse;

    // WebSocket upgrades: bypass Hono middleware (evita corrupção da resposta 101)
    if (
      request.headers.get("Upgrade") === "websocket" &&
      new URL(request.url).pathname === "/api/realtime"
    ) {
      return handleRealtimeWS(request, env);
    }
    return app.fetch(request, env, ctx);
  },
  scheduled: handleScheduled,
  queue: handleQueue,
};
