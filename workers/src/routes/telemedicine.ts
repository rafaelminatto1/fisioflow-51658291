import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
type Pool = ReturnType<typeof createPool>;

function buildMeetingUrl(roomCode: string) {
  return `https://meet.jit.si/fisioflow-${String(roomCode).toLowerCase()}`;
}

let telemedicineSchemaReady: Promise<void> | null = null;

async function ensureTelemedicineSchema(pool: Pool) {
  if (!telemedicineSchemaReady) {
    telemedicineSchemaReady = (async () => {
      const statements = [
        `CREATE TABLE IF NOT EXISTS telemedicine_rooms (
          id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
          organization_id TEXT NOT NULL,
          patient_id TEXT NOT NULL,
          therapist_id TEXT,
          appointment_id TEXT,
          room_code TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'aguardando',
          scheduled_at TIMESTAMPTZ,
          started_at TIMESTAMPTZ,
          ended_at TIMESTAMPTZ,
          duration_minutes INTEGER,
          recording_url TEXT,
          meeting_provider TEXT,
          meeting_url TEXT,
          notas TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS organization_id TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS patient_id TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS therapist_id TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS appointment_id TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS room_code TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aguardando'`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS duration_minutes INTEGER`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS recording_url TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS meeting_provider TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS meeting_url TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS notas TEXT`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `ALTER TABLE IF EXISTS telemedicine_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `CREATE INDEX IF NOT EXISTS idx_telemedicine_rooms_org_created_at ON telemedicine_rooms (organization_id, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_telemedicine_rooms_org_status ON telemedicine_rooms (organization_id, status)`,
      ];

      for (const statement of statements) {
        await pool.query(statement);
      }
    })().catch((error) => {
      telemedicineSchemaReady = null;
      throw error;
    });
  }

  await telemedicineSchemaReady;
}

app.get('/rooms', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureTelemedicineSchema(pool);

    const result = await pool.query(
      `
        SELECT
          tr.*,
          json_build_object('name', p.full_name, 'email', p.email, 'phone', p.phone) AS patients,
          json_build_object('full_name', prof.full_name) AS profiles
        FROM telemedicine_rooms tr
        LEFT JOIN patients p ON p.id = tr.patient_id
        LEFT JOIN profiles prof ON prof.id = tr.therapist_id
        WHERE tr.organization_id = $1
        ORDER BY tr.created_at DESC
      `,
      [user.organizationId],
    );

    try { return c.json({ data: result.rows || result }); } catch (_error) { return c.json({ data: [] }); }
  } catch (error) {
    console.error('[Telemedicine/List] Error:', error);
    return c.json({ data: [] });
  }
});

app.get('/rooms/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureTelemedicineSchema(pool);

    const result = await pool.query(
      `
        SELECT
          tr.*,
          json_build_object('name', p.full_name, 'email', p.email, 'phone', p.phone) AS patients,
          json_build_object('full_name', prof.full_name) AS profiles
        FROM telemedicine_rooms tr
        LEFT JOIN patients p ON p.id = tr.patient_id
        LEFT JOIN profiles prof ON prof.id = tr.therapist_id
        WHERE tr.id = $1 AND tr.organization_id = $2
        LIMIT 1
      `,
      [id, user.organizationId],
    );

    if (!result.rows.length) return c.json({ error: 'Sala não encontrada' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[Telemedicine/Get] Error:', error);
    return c.json({ error: 'Erro ao carregar sala' }, 500);
  }
});

app.post('/rooms', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    await ensureTelemedicineSchema(pool);
    const body = (await c.req.json()) as Record<string, unknown>;

    if (!body.patient_id) return c.json({ error: 'patient_id é obrigatório' }, 400);

    const roomCode = String(body.room_code ?? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase());
    const meetingProvider = String(body.meeting_provider ?? 'jitsi');
    const meetingUrl = String(body.meeting_url ?? buildMeetingUrl(roomCode));

    const result = await pool.query(
      `
        INSERT INTO telemedicine_rooms (
          organization_id, patient_id, therapist_id, appointment_id, room_code, status,
          scheduled_at, started_at, ended_at, duration_minutes, recording_url, meeting_provider,
          meeting_url, notas, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
        RETURNING *
      `,
      [
        user.organizationId,
        body.patient_id,
        body.therapist_id ?? user.uid,
        body.appointment_id ?? null,
        roomCode,
        body.status ?? 'aguardando',
        body.scheduled_at ?? null,
        body.started_at ?? null,
        body.ended_at ?? null,
        body.duration_minutes != null ? Number(body.duration_minutes) : null,
        body.recording_url ?? null,
        meetingProvider,
        meetingUrl,
        body.notas ?? null,
      ],
    );

    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error('[Telemedicine/Create] Error:', error);
    return c.json({ error: 'Erro ao criar sala de telemedicina' }, 500);
  }
});

app.post('/rooms/:id/start', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureTelemedicineSchema(pool);

    const currentResult = await pool.query(
      `
        SELECT id, room_code, status, meeting_provider, meeting_url
        FROM telemedicine_rooms
        WHERE id = $1 AND organization_id = $2
        LIMIT 1
      `,
      [id, user.organizationId],
    );

    const current = currentResult.rows[0];
    if (!current) return c.json({ error: 'Sala não encontrada' }, 404);

    const meetingProvider = current.meeting_provider ?? 'jitsi';
    const meetingUrl = current.meeting_url ?? buildMeetingUrl(current.room_code);

    const result = await pool.query(
      `
        UPDATE telemedicine_rooms
        SET
          status = 'ativo',
          started_at = COALESCE(started_at, NOW()),
          meeting_provider = $1,
          meeting_url = $2,
          updated_at = NOW()
        WHERE id = $3 AND organization_id = $4
        RETURNING *
      `,
      [meetingProvider, meetingUrl, id, user.organizationId],
    );

    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[Telemedicine/Start] Error:', error);
    return c.json({ error: 'Erro ao iniciar sala de telemedicina' }, 500);
  }
});

app.put('/rooms/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  try {
    await ensureTelemedicineSchema(pool);
    const body = (await c.req.json()) as Record<string, unknown>;

    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];

    if (body.status !== undefined) { params.push(body.status); sets.push(`status = $${params.length}`); }
    if (body.scheduled_at !== undefined) { params.push(body.scheduled_at); sets.push(`scheduled_at = $${params.length}`); }
    if (body.started_at !== undefined) { params.push(body.started_at); sets.push(`started_at = $${params.length}`); }
    if (body.ended_at !== undefined) { params.push(body.ended_at); sets.push(`ended_at = $${params.length}`); }
    if (body.duration_minutes !== undefined) { params.push(body.duration_minutes != null ? Number(body.duration_minutes) : null); sets.push(`duration_minutes = $${params.length}`); }
    if (body.recording_url !== undefined) { params.push(body.recording_url); sets.push(`recording_url = $${params.length}`); }
    if (body.meeting_provider !== undefined) { params.push(body.meeting_provider); sets.push(`meeting_provider = $${params.length}`); }
    if (body.meeting_url !== undefined) { params.push(body.meeting_url); sets.push(`meeting_url = $${params.length}`); }
    if (body.notas !== undefined) { params.push(body.notas); sets.push(`notas = $${params.length}`); }
    if (body.appointment_id !== undefined) { params.push(body.appointment_id); sets.push(`appointment_id = $${params.length}`); }

    params.push(id, user.organizationId);
    const result = await pool.query(
      `
        UPDATE telemedicine_rooms
        SET ${sets.join(', ')}
        WHERE id = $${params.length - 1} AND organization_id = $${params.length}
        RETURNING *
      `,
      params,
    );

    if (!result.rows.length) return c.json({ error: 'Sala não encontrada' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[Telemedicine/Update] Error:', error);
    return c.json({ error: 'Erro ao atualizar sala de telemedicina' }, 500);
  }
});

// ===== LIVEKIT TOKEN GENERATION =====

/**
 * POST /api/telemedicine/livekit-token
 * Gera tokens JWT para profissional e paciente entrarem na sala LiveKit.
 *
 * Body: { room_id: string, identity: string, role: 'therapist' | 'patient', display_name?: string }
 *
 * Nota: requer LIVEKIT_API_KEY e LIVEKIT_API_SECRET configurados via `wrangler secret put`.
 * SDK: livekit-server-sdk (não disponível no Workers Edge runtime) — geramos JWT manualmente.
 */
async function generateLiveKitToken(
  apiKey: string,
  apiSecret: string,
  opts: {
    roomName: string;
    identity: string;
    name?: string;
    canPublish: boolean;
    canSubscribe: boolean;
    isAdmin?: boolean;
    ttl?: number;
  },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = opts.ttl ?? 3600; // 1 hora por padrão

  const videoGrant = {
    roomJoin: true,
    room: opts.roomName,
    canPublish: opts.canPublish,
    canSubscribe: opts.canSubscribe,
    ...(opts.isAdmin ? { roomAdmin: true } : {}),
  };

  const payload = {
    iss: apiKey,
    sub: opts.identity,
    name: opts.name ?? opts.identity,
    iat: now,
    nbf: now,
    exp: now + ttl,
    video: videoGrant,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signingInput}.${sig}`;
}

app.post('/livekit-token', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as {
    room_id?: string;
    identity?: string;
    role?: 'therapist' | 'patient';
    display_name?: string;
  };

  const apiKey = (c.env as any).LIVEKIT_API_KEY;
  const apiSecret = (c.env as any).LIVEKIT_API_SECRET;
  const livekitUrl = (c.env as any).LIVEKIT_URL ?? 'wss://your-livekit-url.livekit.cloud';

  if (!apiKey || !apiSecret) {
    return c.json({ error: 'LiveKit não configurado. Defina LIVEKIT_API_KEY e LIVEKIT_API_SECRET via wrangler secret put.' }, 503);
  }

  const roomName = body.room_id ?? `fisioflow-${user.organizationId}-${Date.now()}`;
  const identity = body.identity ?? user.uid;
  const role = body.role ?? 'therapist';
  const displayName = body.display_name ?? identity;

  const token = await generateLiveKitToken(apiKey, apiSecret, {
    roomName,
    identity,
    name: displayName,
    canPublish: true,
    canSubscribe: true,
    isAdmin: role === 'therapist',
    ttl: 7200, // 2 horas
  });

  return c.json({
    data: {
      token,
      room_name: roomName,
      livekit_url: livekitUrl,
      identity,
      role,
    },
  });
});

export { app as telemedicineRoutes };
