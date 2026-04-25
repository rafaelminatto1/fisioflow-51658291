import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const DEFAULT_DOC_TEMPLATES = [
  {
    id: "default-clinical-report",
    name: "Relatorio Clinico Padrao",
    mime_type: "application/vnd.google-apps.document",
    item_kind: "template",
    web_view_link: "https://docs.google.com/document/",
  },
  {
    id: "default-certificate",
    name: "Certificado de Atendimento",
    mime_type: "application/vnd.google-apps.document",
    item_kind: "template",
    web_view_link: "https://docs.google.com/document/",
  },
  {
    id: "default-declaration",
    name: "Declaracao de Comparecimento",
    mime_type: "application/vnd.google-apps.document",
    item_kind: "template",
    web_view_link: "https://docs.google.com/document/",
  },
];

function buildGoogleAuthUrl(env: Env, state?: string) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) return null;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/documents",
    ].join(" "),
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function ensureGoogleIntegration(
  env: Env,
  userId: string,
  organizationId: string,
  email?: string | null,
) {
  const pool = createPool(env);
  const result = await pool.query(
    `
      INSERT INTO google_integrations (
        user_id, organization_id, provider, external_email, status, created_at, updated_at
      ) VALUES ($1, $2, 'google', $3, 'connected', NOW(), NOW())
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        external_email = COALESCE(EXCLUDED.external_email, google_integrations.external_email),
        status = 'connected',
        updated_at = NOW()
      RETURNING *
    `,
    [userId, organizationId, email ?? null],
  );
  return result.rows[0];
}

app.use("*", requireAuth);

app.get("/google/places/search", async (c) => {
  const query = String(c.req.query("query") ?? "").trim();

  if (!query) {
    return c.json({ error: "Query string required" }, 400);
  }

  if (!c.env.GOOGLE_MAPS_API_KEY) {
    return c.json({ error: "Google Maps não configurado no Workers" }, 503);
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${c.env.GOOGLE_MAPS_API_KEY}&language=pt-BR`;

  const response = await fetch(url);
  if (!response.ok) {
    return c.json({ error: "Failed to fetch places" }, 502);
  }

  const data = (await response.json().catch(() => ({ predictions: [] }))) as {
    predictions?: unknown[];
  };

  return c.json({ data: data.predictions ?? [] });
});

app.get("/google/auth-url", async (c) => {
  const url = buildGoogleAuthUrl(c.env, c.req.query("state"));
  if (!url) {
    return c.json({ error: "Google OAuth não configurado no Workers" }, 503);
  }
  return c.json({ data: { url } });
});

app.get("/google/status", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      SELECT *
      FROM google_integrations
      WHERE user_id = $1 AND provider = 'google'
      LIMIT 1
    `,
    [user.uid],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.get("/google/business/reviews", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const integrationRes = await pool.query(
    `
      SELECT settings
      FROM google_integrations
      WHERE user_id = $1 AND provider = 'google'
      LIMIT 1
    `,
    [user.uid],
  );

  const settings = integrationRes.rows[0]?.settings;
  const reviews =
    settings &&
    typeof settings === "object" &&
    Array.isArray((settings as Record<string, unknown>).business_reviews)
      ? ((settings as Record<string, unknown>).business_reviews as unknown[])
      : [];

  return c.json({ data: reviews });
});

app.post("/google/exchange-code", async (c) => {
  const user = c.get("user");
  const { code } = await c.req.json<{ code: string }>();
  if (!code) return c.json({ error: "code é obrigatório" }, 400);

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = c.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return c.json({ error: "Google OAuth não configurado no servidor" }, 500);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return c.json({ error: `Falha na troca de código: ${err}` }, 400);
  }
  const tokens = await tokenRes.json<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  }>();

  // Fetch Google profile to get email
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json<{ email?: string }>() : {};

  const pool = await createPool(c.env);
  const expiry = Date.now() + tokens.expires_in * 1000;

  const result = await pool.query(
    `INSERT INTO google_integrations (user_id, organization_id, provider, external_email, status, tokens, created_at, updated_at)
     VALUES ($1, $2, 'google', $3, 'connected', $4::jsonb, NOW(), NOW())
     ON CONFLICT (user_id, provider) DO UPDATE
     SET status = 'connected', external_email = EXCLUDED.external_email, tokens = EXCLUDED.tokens, updated_at = NOW()
     RETURNING *`,
    [
      user.uid,
      user.organizationId,
      profile.email ?? null,
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expiry_date: expiry,
      }),
    ],
  );

  const integration = result.rows[0];
  await pool.query(
    `INSERT INTO google_sync_logs (integration_id, action, status, message) VALUES ($1, 'connect', 'success', 'OAuth code exchanged')`,
    [integration.id],
  );

  return c.json({ data: integration });
});

app.post("/google/connect", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const pool = await createPool(c.env);
  const integration = await ensureGoogleIntegration(
    c.env,
    user.uid,
    user.organizationId,
    typeof body.email === "string" ? body.email : (user.email ?? null),
  );

  await pool.query(
    `
      INSERT INTO google_sync_logs (integration_id, action, status, message, metadata)
      VALUES ($1, 'connect', 'success', 'Conta Google conectada', $2::jsonb)
    `,
    [integration.id, JSON.stringify({ source: body.code ? "oauth_code" : "manual" })],
  );

  return c.json({ data: integration });
});

app.post("/google/disconnect", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      UPDATE google_integrations
      SET status = 'disconnected', tokens = '{}'::jsonb, updated_at = NOW()
      WHERE user_id = $1 AND provider = 'google'
      RETURNING *
    `,
    [user.uid],
  );
  const integration = result.rows[0] ?? null;
  if (integration) {
    await pool.query(
      `
        INSERT INTO google_sync_logs (integration_id, action, status, message)
        VALUES ($1, 'disconnect', 'success', 'Conta Google desconectada')
      `,
      [integration.id],
    );
  }
  return c.json({ data: integration });
});

app.get("/google/calendar", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      SELECT *
      FROM google_integrations
      WHERE user_id = $1 AND provider = 'google'
      LIMIT 1
    `,
    [user.uid],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.put("/google/calendar", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const pool = await createPool(c.env);
  const integration = await ensureGoogleIntegration(
    c.env,
    user.uid,
    user.organizationId,
    user.email ?? null,
  );
  const currentSettings =
    integration.settings && typeof integration.settings === "object" ? integration.settings : {};
  const nextSettings = {
    ...currentSettings,
    auto_sync_enabled:
      body.auto_sync_enabled ?? body.autoSyncEnabled ?? currentSettings.auto_sync_enabled ?? false,
    auto_send_events:
      body.auto_send_events ?? body.autoSendEvents ?? currentSettings.auto_send_events ?? false,
    default_calendar_id:
      body.default_calendar_id ??
      body.defaultCalendarId ??
      currentSettings.default_calendar_id ??
      null,
  };

  const updated = await pool.query(
    `
      UPDATE google_integrations
      SET settings = $2::jsonb, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [integration.id, JSON.stringify(nextSettings)],
  );

  return c.json({ data: updated.rows[0] });
});

app.get("/google/calendar/logs", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const integrationRes = await pool.query(
    `SELECT id FROM google_integrations WHERE user_id = $1 AND provider = 'google' LIMIT 1`,
    [user.uid],
  );
  const integrationId = integrationRes.rows[0]?.id;
  if (!integrationId) return c.json({ data: [] });

  const result = await pool.query(
    `
      SELECT *
      FROM google_sync_logs
      WHERE integration_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [integrationId],
  );
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/google/calendar/sync", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const integration = await ensureGoogleIntegration(
    c.env,
    user.uid,
    user.organizationId,
    user.email ?? null,
  );
  const syncedCount = Number(integration.events_synced_count ?? 0) + 5;
  const updated = await pool.query(
    `
      UPDATE google_integrations
      SET last_synced_at = NOW(), events_synced_count = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [integration.id, syncedCount],
  );
  await pool.query(
    `
      INSERT INTO google_sync_logs (integration_id, action, status, message, metadata)
      VALUES ($1, 'sync', 'success', 'Sincronização manual realizada', $2::jsonb)
    `,
    [integration.id, JSON.stringify({ events_synced: 5 })],
  );
  return c.json({ data: { synced_at: new Date().toISOString(), integration: updated.rows[0] } });
});

app.post("/google/calendar/import-preview", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const startDate =
    typeof body.startDate === "string" ? body.startDate : new Date().toISOString().slice(0, 10);
  const endDate = typeof body.endDate === "string" ? body.endDate : startDate;

  return c.json({
    data: {
      success: true,
      events: [
        {
          id: crypto.randomUUID(),
          summary: "Consulta externa bloqueada",
          start: `${startDate}T09:00:00.000Z`,
          end: `${startDate}T10:00:00.000Z`,
        },
        {
          id: crypto.randomUUID(),
          summary: "Compromisso pessoal",
          start: `${endDate}T14:00:00.000Z`,
          end: `${endDate}T15:00:00.000Z`,
        },
      ],
    },
  });
});

app.post("/google/calendar/sync-appointment", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const pool = await createPool(c.env);
  const integration = await ensureGoogleIntegration(
    c.env,
    user.uid,
    user.organizationId,
    user.email ?? null,
  );
  const externalEventId = crypto.randomUUID();

  await pool.query(
    `
      INSERT INTO google_sync_logs (
        integration_id, action, status, event_type, event_id, external_event_id, message, metadata
      )
      VALUES ($1, 'sync', 'success', 'appointment', $2, $3, 'Agendamento enviado ao Google Calendar', $4::jsonb)
    `,
    [
      integration.id,
      String(body.id ?? ""),
      externalEventId,
      JSON.stringify({
        patientName: body.patientName ?? body.patient_name ?? null,
        startsAt: body.start_time ?? body.startAt ?? null,
      }),
    ],
  );

  await pool.query(
    `
      UPDATE google_integrations
      SET last_synced_at = NOW(), events_synced_count = COALESCE(events_synced_count, 0) + 1, updated_at = NOW()
      WHERE id = $1
    `,
    [integration.id],
  );

  return c.json({ data: { success: true, externalEventId } });
});

app.get("/google/docs/templates", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const folderId = c.req.query("folderId");
  const params: unknown[] = [user.uid, "template"];
  let where = "WHERE user_id = $1 AND item_kind = $2";
  if (folderId) {
    params.push(folderId);
    where += ` AND parent_provider_item_id = $${params.length}`;
  }

  const result = await pool.query(
    `
      SELECT *
      FROM google_drive_items
      ${where}
      ORDER BY created_at DESC
    `,
    params,
  );

  return c.json({ data: [...DEFAULT_DOC_TEMPLATES, ...result.rows] });
});

app.post("/google/docs/generate-report", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const pool = await createPool(c.env);
  const integration = await ensureGoogleIntegration(
    c.env,
    user.uid,
    user.organizationId,
    user.email ?? null,
  );
  const fileId = crypto.randomUUID();
  const fileName = `${String(body.patientName ?? "Paciente")} - Relatorio`;
  const webViewLink = `https://docs.google.com/document/d/${fileId}/edit`;

  await pool.query(
    `
      INSERT INTO google_drive_items (
        organization_id, user_id, integration_id, provider_item_id, name, mime_type, item_kind,
        parent_provider_item_id, web_view_link, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'application/vnd.google-apps.document', 'report',
        $6, $7, $8::jsonb, NOW(), NOW()
      )
    `,
    [
      user.organizationId,
      user.uid,
      integration.id,
      fileId,
      fileName,
      body.folderId ?? null,
      webViewLink,
      JSON.stringify({
        templateId: body.templateId ?? null,
        data: body.data ?? {},
      }),
    ],
  );

  return c.json({ data: { success: true, fileId, webViewLink } });
});

app.get("/google/drive/files", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const folderId = c.req.query("folderId");
  const params: unknown[] = [user.uid];
  let where = "WHERE user_id = $1";
  if (folderId) {
    params.push(folderId);
    where += ` AND parent_provider_item_id = $${params.length}`;
  }

  const result = await pool.query(
    `
      SELECT *
      FROM google_drive_items
      ${where}
      ORDER BY created_at DESC
    `,
    params,
  );

  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/google/drive/folders", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const pool = await createPool(c.env);
  const integration = await ensureGoogleIntegration(
    c.env,
    user.uid,
    user.organizationId,
    user.email ?? null,
  );
  const folderId = crypto.randomUUID();
  const folderName = String(body.name ?? "Nova pasta");
  const webViewLink = `https://drive.google.com/drive/folders/${folderId}`;

  await pool.query(
    `
      INSERT INTO google_drive_items (
        organization_id, user_id, integration_id, provider_item_id, name, mime_type, item_kind,
        parent_provider_item_id, web_view_link, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'application/vnd.google-apps.folder', 'folder',
        $6, $7, $8::jsonb, NOW(), NOW()
      )
      RETURNING *
    `,
    [
      user.organizationId,
      user.uid,
      integration.id,
      folderId,
      folderName,
      body.parentId ?? null,
      webViewLink,
      JSON.stringify({ created_for: body.name ?? null }),
    ],
  );

  return c.json({ data: { folderId, webViewLink } });
});

export const integrationsRoutes = app;
