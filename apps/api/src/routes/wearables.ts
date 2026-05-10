import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Data CRUD ────────────────────────────────────────────────────────────────

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId, dataType, source, limit, from, to } = c.req.query();
  const db = createPool(c.env);

  let sql = `SELECT * FROM wearable_data WHERE organization_id = $1`;
  const params: unknown[] = [user.organizationId];
  let idx = 2;

  if (patientId) { sql += ` AND patient_id = $${idx++}`; params.push(patientId); }
  if (dataType) { sql += ` AND data_type = $${idx++}`; params.push(dataType); }
  if (source) { sql += ` AND source = $${idx++}`; params.push(source); }
  if (from) { sql += ` AND timestamp >= $${idx++}`; params.push(from); }
  if (to) { sql += ` AND timestamp <= $${idx++}`; params.push(to); }

  sql += " ORDER BY timestamp DESC";
  if (limit) { sql += ` LIMIT $${idx++}`; params.push(Number(limit)); }

  const result = await db.query(sql, params);
  return c.json({ data: result.rows });
});

// GET /api/wearables/patient/:patientId/summary — latest per data_type for a patient
app.get("/patient/:patientId/summary", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  if (!isUuid(patientId)) return c.json({ error: "ID inválido" }, 400);

  const db = createPool(c.env);
  const result = await db.query(
    `SELECT DISTINCT ON (source, data_type)
       id, source, data_type, value, unit, timestamp, metadata
     FROM wearable_data
     WHERE organization_id = $1 AND patient_id = $2
     ORDER BY source, data_type, timestamp DESC`,
    [user.organizationId, patientId],
  );

  // Also get connected integrations
  const integrations = await db.query(
    `SELECT provider, connected_at, last_synced_at, is_active
     FROM wearable_oauth_tokens
     WHERE patient_id = $1`,
    [patientId],
  );

  return c.json({ data: { readings: result.rows, integrations: integrations.rows } });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    patient_id: string;
    source: string;
    data_type: string;
    value: number;
    unit?: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
  }>();
  const db = createPool(c.env);

  const result = await db.query(
    `INSERT INTO wearable_data (organization_id, patient_id, source, data_type, value, unit, timestamp, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      user.organizationId, body.patient_id, body.source, body.data_type,
      body.value, body.unit ?? null, body.timestamp ?? new Date().toISOString(),
      body.metadata ? JSON.stringify(body.metadata) : null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

// POST /api/wearables/sync — bulk upsert from patient mobile app (HealthKit/Health Connect)
app.post("/sync", requireAuth, async (c) => {
  const user = c.get("user");
  const { patient_id, entries } = await c.req.json<{
    patient_id: string;
    entries: Array<{
      source: string;
      data_type: string;
      value: number;
      unit?: string;
      timestamp: string;
      metadata?: Record<string, unknown>;
    }>;
  }>();

  if (!patient_id || !entries?.length) {
    return c.json({ error: "patient_id e entries são obrigatórios" }, 400);
  }

  const db = createPool(c.env);
  let synced = 0;

  for (const e of entries) {
    await db.query(
      `INSERT INTO wearable_data (organization_id, patient_id, source, data_type, value, unit, timestamp, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [
        user.organizationId, patient_id, e.source, e.data_type,
        e.value, e.unit ?? null, e.timestamp,
        e.metadata ? JSON.stringify(e.metadata) : null,
      ],
    );
    synced++;
  }

  return c.json({ data: { synced } });
});

app.post("/bulk", requireAuth, async (c) => {
  const user = c.get("user");
  const { entries } = await c.req.json<{
    entries: Array<{
      patient_id: string;
      source: string;
      data_type: string;
      value: number;
      unit?: string;
      timestamp?: string;
    }>;
  }>();
  const db = createPool(c.env);

  const inserted = await Promise.all(
    entries.map((e) =>
      db.query(
        `INSERT INTO wearable_data (organization_id, patient_id, source, data_type, value, unit, timestamp)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [user.organizationId, e.patient_id, e.source, e.data_type, e.value, e.unit ?? null, e.timestamp ?? new Date().toISOString()],
      ),
    ),
  );
  return c.json({ data: inserted.map((r) => r.rows[0]) }, 201);
});

// ─── OAuth — Connected Integrations ──────────────────────────────────────────

// GET /api/wearables/integrations — list patient's connected providers
app.get("/integrations", requireAuth, async (c) => {
  const user = c.get("user");
  const { patient_id } = c.req.query();
  if (!patient_id) return c.json({ error: "patient_id obrigatório" }, 400);

  const db = createPool(c.env);
  const result = await db.query(
    `SELECT provider, connected_at, last_synced_at, is_active, provider_user_id
     FROM wearable_oauth_tokens
     WHERE organization_id = $1 AND patient_id = $2`,
    [user.organizationId, patient_id],
  );
  return c.json({ data: result.rows });
});

// DELETE /api/wearables/integrations/:provider — disconnect a provider
app.delete("/integrations/:provider", requireAuth, async (c) => {
  const user = c.get("user");
  const { provider } = c.req.param();
  const { patient_id } = c.req.query();
  if (!patient_id) return c.json({ error: "patient_id obrigatório" }, 400);

  const db = createPool(c.env);
  await db.query(
    `UPDATE wearable_oauth_tokens SET is_active = false
     WHERE organization_id = $1 AND patient_id = $2 AND provider = $3`,
    [user.organizationId, patient_id, provider],
  );
  return c.json({ success: true });
});

// ─── Garmin OAuth ─────────────────────────────────────────────────────────────

app.get("/oauth/garmin/start", requireAuth, async (c) => {
  const clientId = c.env.GARMIN_CLIENT_ID;
  if (!clientId) return c.json({ error: "Garmin não configurado" }, 503);

  const { patient_id } = c.req.query();
  const redirectBase = c.env.WEARABLE_OAUTH_REDIRECT_BASE ?? "https://app.moocafisio.com.br";
  const _redirectUri = `${redirectBase}/api/wearables/oauth/garmin/callback`;
  const state = btoa(JSON.stringify({ patient_id, org: c.get("user").organizationId }));

  // Garmin uses OAuth 1.0a — for OAuth 2.0-like flow, redirect to request token endpoint
  // Using Garmin Connect API v1 OAuth
  const authUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=REQUEST_TOKEN&state=${state}`;

  return c.json({ data: { url: authUrl, note: "Garmin uses OAuth 1.0a — requires server-side request token first" } });
});

// ─── Strava OAuth ────────────────────────────────────────────────────────────

app.get("/oauth/strava/start", requireAuth, async (c) => {
  const clientId = c.env.STRAVA_CLIENT_ID;
  if (!clientId) return c.json({ error: "Strava não configurado" }, 503);

  const { patient_id } = c.req.query();
  const user = c.get("user");
  const redirectBase = c.env.WEARABLE_OAUTH_REDIRECT_BASE ?? "https://app.moocafisio.com.br";
  const redirectUri = encodeURIComponent(`${redirectBase}/api/wearables/oauth/strava/callback`);
  const state = btoa(JSON.stringify({ patient_id, org: user.organizationId }));
  const scope = "read,activity:read_all,profile:read_all";

  const authUrl =
    `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}&response_type=code&approval_prompt=auto` +
    `&scope=${scope}&state=${state}`;

  return c.json({ data: { url: authUrl } });
});

app.get("/oauth/strava/callback", async (c) => {
  const { code, state, error } = c.req.query();
  const redirectBase = c.env.WEARABLE_OAUTH_REDIRECT_BASE ?? "https://app.moocafisio.com.br";

  if (error || !code || !state) {
    return Response.redirect(`${redirectBase}/portal/integrations?error=strava_denied`, 302);
  }

  try {
    const { patient_id, org } = JSON.parse(atob(state));
    const clientId = c.env.STRAVA_CLIENT_ID!;
    const clientSecret = c.env.STRAVA_CLIENT_SECRET!;

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code" }),
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) {
      return Response.redirect(`${redirectBase}/portal/integrations?error=strava_token`, 302);
    }

    const db = createPool(c.env);
    await db.query(
      `INSERT INTO wearable_oauth_tokens
         (organization_id, patient_id, provider, access_token, refresh_token, token_expires_at, provider_user_id)
       VALUES ($1, $2, 'strava', $3, $4, $5, $6)
       ON CONFLICT (patient_id, provider) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         is_active = true,
         connected_at = NOW()`,
      [org, patient_id, tokenData.access_token, tokenData.refresh_token ?? null,
       tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toISOString() : null,
       String(tokenData.athlete?.id ?? "")],
    );

    return Response.redirect(`${redirectBase}/portal/integrations?connected=strava`, 302);
  } catch {
    return Response.redirect(`${redirectBase}/portal/integrations?error=strava_error`, 302);
  }
});

// ─── Oura OAuth ───────────────────────────────────────────────────────────────

app.get("/oauth/oura/start", requireAuth, async (c) => {
  const clientId = c.env.OURA_CLIENT_ID;
  if (!clientId) return c.json({ error: "Oura não configurado" }, 503);

  const { patient_id } = c.req.query();
  const user = c.get("user");
  const redirectBase = c.env.WEARABLE_OAUTH_REDIRECT_BASE ?? "https://app.moocafisio.com.br";
  const redirectUri = encodeURIComponent(`${redirectBase}/api/wearables/oauth/oura/callback`);
  const state = btoa(JSON.stringify({ patient_id, org: user.organizationId }));

  const authUrl =
    `https://cloud.ouraring.com/oauth/authorize?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}&response_type=code&scope=personal+daily+heartrate+workout+session` +
    `&state=${state}`;

  return c.json({ data: { url: authUrl } });
});

app.get("/oauth/oura/callback", async (c) => {
  const { code, state, error } = c.req.query();
  const redirectBase = c.env.WEARABLE_OAUTH_REDIRECT_BASE ?? "https://app.moocafisio.com.br";

  if (error || !code || !state) {
    return Response.redirect(`${redirectBase}/portal/integrations?error=oura_denied`, 302);
  }

  try {
    const { patient_id, org } = JSON.parse(atob(state));
    const clientId = c.env.OURA_CLIENT_ID!;
    const clientSecret = c.env.OURA_CLIENT_SECRET!;
    const redirectUri = `${redirectBase}/api/wearables/oauth/oura/callback`;

    const tokenRes = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }),
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) {
      return Response.redirect(`${redirectBase}/portal/integrations?error=oura_token`, 302);
    }

    const db = createPool(c.env);
    await db.query(
      `INSERT INTO wearable_oauth_tokens
         (organization_id, patient_id, provider, access_token, refresh_token)
       VALUES ($1, $2, 'oura', $3, $4)
       ON CONFLICT (patient_id, provider) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         is_active = true,
         connected_at = NOW()`,
      [org, patient_id, tokenData.access_token, tokenData.refresh_token ?? null],
    );

    return Response.redirect(`${redirectBase}/portal/integrations?connected=oura`, 302);
  } catch {
    return Response.redirect(`${redirectBase}/portal/integrations?error=oura_error`, 302);
  }
});

// ─── Pull latest data from connected providers ────────────────────────────────

app.post("/sync-provider", requireAuth, async (c) => {
  const user = c.get("user");
  const { patient_id, provider } = await c.req.json<{ patient_id: string; provider: string }>();
  if (!patient_id || !provider) return c.json({ error: "patient_id e provider são obrigatórios" }, 400);

  const db = createPool(c.env);
  const tokenResult = await db.query(
    `SELECT access_token, refresh_token, token_expires_at
     FROM wearable_oauth_tokens
     WHERE organization_id = $1 AND patient_id = $2 AND provider = $3 AND is_active = true`,
    [user.organizationId, patient_id, provider],
  );

  if (tokenResult.rows.length === 0) return c.json({ error: "Integração não encontrada" }, 404);

  const { access_token } = tokenResult.rows[0];
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  let synced = 0;

  if (provider === "strava") {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(Date.now() / 1000 - 7 * 86400)}&per_page=30`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    const activities = await res.json() as any[];

    for (const act of activities ?? []) {
      const entries = [
        { data_type: "distance", value: act.distance, unit: "m" },
        { data_type: "duration", value: act.moving_time, unit: "s" },
        { data_type: "heart_rate_avg", value: act.average_heartrate, unit: "bpm" },
        { data_type: "heart_rate_max", value: act.max_heartrate, unit: "bpm" },
        { data_type: "elevation", value: act.total_elevation_gain, unit: "m" },
      ].filter((e) => e.value != null && e.value > 0);

      for (const e of entries) {
        await db.query(
          `INSERT INTO wearable_data (organization_id, patient_id, source, data_type, value, unit, timestamp, metadata)
           VALUES ($1, $2, 'strava', $3, $4, $5, $6, $7)
           ON CONFLICT DO NOTHING`,
          [user.organizationId, patient_id, e.data_type, e.value, e.unit,
           act.start_date, JSON.stringify({ activity_type: act.type, activity_name: act.name, activity_id: act.id })],
        );
        synced++;
      }
    }
  } else if (provider === "oura") {
    const [sleepRes, hrRes] = await Promise.all([
      fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${since}`, { headers: { Authorization: `Bearer ${access_token}` } }),
      fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${since}T00:00:00`, { headers: { Authorization: `Bearer ${access_token}` } }),
    ]);
    const sleepData = await sleepRes.json() as any;
    const _hrData = await hrRes.json() as any;

    for (const s of sleepData?.data ?? []) {
      const entries = [
        { data_type: "sleep_duration", value: s.total_sleep_duration, unit: "s" },
        { data_type: "sleep_efficiency", value: s.efficiency, unit: "%" },
        { data_type: "hrv", value: s.average_hrv, unit: "ms" },
        { data_type: "resting_hr", value: s.lowest_heart_rate, unit: "bpm" },
        { data_type: "readiness", value: s.readiness_score_delta, unit: "score" },
      ].filter((e) => e.value != null && e.value > 0);
      for (const e of entries) {
        await db.query(
          `INSERT INTO wearable_data (organization_id, patient_id, source, data_type, value, unit, timestamp, metadata)
           VALUES ($1, $2, 'oura', $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [user.organizationId, patient_id, e.data_type, e.value, e.unit, s.bedtime_start, JSON.stringify({ sleep_id: s.id })],
        );
        synced++;
      }
    }
  }

  await db.query(
    `UPDATE wearable_oauth_tokens SET last_synced_at = NOW()
     WHERE organization_id = $1 AND patient_id = $2 AND provider = $3`,
    [user.organizationId, patient_id, provider],
  );

  return c.json({ data: { synced } });
});

// ─── Remote Therapeutic Monitoring (RTM) ──────────────────────────────────────

// GET /api/wearables/rtm/status/:patientId — Activity Score and Trends
app.get("/rtm/status/:patientId", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = c.req.param();
  const db = createPool(c.env);

  // Get current week volume vs previous week
  const currentWeek = await db.query(
    `SELECT data_type, SUM(value) as total, unit
     FROM wearable_data
     WHERE patient_id = $1 AND organization_id = $2
       AND timestamp >= NOW() - INTERVAL '7 days'
     GROUP BY data_type, unit`,
    [patientId, user.organizationId]
  );

  const prevWeek = await db.query(
    `SELECT data_type, SUM(value) as total, unit
     FROM wearable_data
     WHERE patient_id = $1 AND organization_id = $2
       AND timestamp BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
     GROUP BY data_type, unit`,
    [patientId, user.organizationId]
  );

  // Simple Score Calculation (0-100)
  // Base meta: 50k steps/week, 150min activity/week
  let score = 50;
  const steps = currentWeek.rows.find(r => r.data_type === 'steps')?.total || 0;
  if (steps > 0) score = Math.min(100, Math.round((Number(steps) / 50000) * 100));

  return c.json({
    data: {
      score,
      trends: {
        current: currentWeek.rows,
        previous: prevWeek.rows
      },
      status: score > 70 ? 'active' : (score > 30 ? 'moderate' : 'low')
    }
  });
});

// POST /api/wearables/rtm/milestones/sync — Check and register achievements
app.post("/rtm/milestones/sync", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId } = await c.req.json<{ patientId: string }>();
  const db = createPool(c.env);

  // Check for 100k total steps milestone
  const totalSteps = await db.query(
    `SELECT SUM(value) as total FROM wearable_data 
     WHERE patient_id = $1 AND data_type = 'steps'`,
    [patientId]
  );

  const total = Number(totalSteps.rows[0]?.total || 0);
  let milestoneReached = null;

  if (total >= 100000) {
    const exists = await db.query(
      `SELECT id FROM patient_achievements WHERE patient_id = $1 AND type = 'steps_100k'`,
      [patientId]
    );
    if (exists.rows.length === 0) {
      milestoneReached = "steps_100k";
      await db.query(
        `INSERT INTO patient_achievements (patient_id, organization_id, type, title, metadata)
         VALUES ($1, $2, 'steps_100k', 'Caminhante de Elite (100k passos)', $3)`,
        [patientId, user.organizationId, JSON.stringify({ total_steps: total })]
      );

      // Trigger Celebration Workflow
      if (c.env.WORKFLOW_WEARABLE_ACTIVITY) {
        await c.env.WORKFLOW_WEARABLE_ACTIVITY.create({
          id: `milestone-${patientId}-${Date.now()}`,
          params: {
            patientId,
            organizationId: user.organizationId,
            alertType: 'milestone_reached',
            milestoneTitle: 'Caminhante de Elite (100k passos)'
          }
        });
      }
    }
  }

  return c.json({ data: { totalSteps: total, milestoneReached } });
});

export { app as wearablesRoutes };
