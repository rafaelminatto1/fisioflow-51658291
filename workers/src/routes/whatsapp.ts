import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

const DEFAULT_TEMPLATES = [
  {
    id: 'confirmacao_agendamento',
    name: 'Confirmacao de agendamento',
    template_key: 'confirmacao_agendamento',
    content: 'Ola {{name}}, sua sessao com {{therapist}} foi confirmada para {{date}} as {{time}}.',
    variables: ['name', 'therapist', 'date', 'time'],
    category: 'appointment',
    status: 'ativo',
  },
  {
    id: 'lembrete_sessao',
    name: 'Lembrete de sessao',
    template_key: 'lembrete_sessao',
    content: 'Lembrete: sua sessao sera as {{time}} com {{therapist}}.',
    variables: ['time', 'therapist'],
    category: 'reminder',
    status: 'ativo',
  },
  {
    id: 'cancelamento',
    name: 'Cancelamento',
    template_key: 'cancelamento',
    content: 'Sua sessao do dia {{date}} foi cancelada. Entre em contato para reagendar.',
    variables: ['date'],
    category: 'appointment',
    status: 'ativo',
  },
  {
    id: 'prescricao',
    name: 'Prescricao',
    template_key: 'prescricao',
    content: 'Sua prescricao esta disponivel em {{link}}.',
    variables: ['link'],
    category: 'clinical',
    status: 'ativo',
  },
  {
    id: 'solicitar_confirmacao',
    name: 'Solicitar confirmacao',
    template_key: 'solicitar_confirmacao',
    content: 'Ola {{name}}, confirme sua sessao em {{date}} as {{time}}.',
    variables: ['name', 'date', 'time'],
    category: 'appointment',
    status: 'ativo',
  },
  {
    id: 'oferta_vaga',
    name: 'Oferta de vaga',
    template_key: 'oferta_vaga',
    content: 'Temos uma vaga em {{date}} as {{time}} com {{therapist}}. Responda em ate {{expires}} horas.',
    variables: ['date', 'time', 'therapist', 'expires'],
    category: 'waitlist',
    status: 'ativo',
  },
] as const;

async function loadOrganizationSettings(pool: ReturnType<typeof createPool>, organizationId: string) {
  try {
    const result = await pool.query(
      `SELECT settings FROM organizations WHERE id = $1 LIMIT 1`,
      [organizationId],
    );
    const raw = result.rows[0]?.settings;
    if (!raw || typeof raw !== 'object') return {};
    return raw as Record<string, unknown>;
  } catch (error) {
    console.error('[whatsapp] loadOrganizationSettings fallback:', error);
    return {};
  }
}

app.get('/config', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const config = (settings.whatsapp_config as Record<string, unknown>) ?? { enabled: false };
  return c.json({ data: config });
});

app.get('/templates', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const rawTemplates = (settings.whatsapp_templates as unknown[]) ?? DEFAULT_TEMPLATES;
  const templates = Array.isArray(rawTemplates) && rawTemplates.length > 0 ? rawTemplates : DEFAULT_TEMPLATES;
  return c.json({ data: templates });
});

app.put('/templates/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as { content?: string; status?: string };
  if (!body.content && !body.status) {
    return c.json({ error: 'Nenhum campo para atualizar' }, 400);
  }

  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const existingTemplates = Array.isArray(settings.whatsapp_templates)
    ? [...(settings.whatsapp_templates as Array<Record<string, unknown>>)]
    : DEFAULT_TEMPLATES.map((template) => ({ ...template }));

  const currentIndex = existingTemplates.findIndex((template) => String(template.id) === id);
  if (currentIndex === -1) {
    return c.json({ error: 'Template nao encontrado' }, 404);
  }

  existingTemplates[currentIndex] = {
    ...existingTemplates[currentIndex],
    ...(body.content !== undefined ? { content: body.content } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    updated_at: new Date().toISOString(),
  };

  const nextSettings = {
    ...settings,
    whatsapp_templates: existingTemplates,
  };

  await pool.query(
    `UPDATE organizations SET settings = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(nextSettings), user.organizationId],
  );

  return c.json({ data: existingTemplates[currentIndex] });
});

const parseMetadata = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value as Record<string, unknown>;
};

const toDateString = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10);
  }
  return null;
};

app.get('/messages', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { appointmentId, patientId, limit = '50' } = c.req.query();

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];
  if (patientId) {
    params.push(patientId);
    conditions.push(`patient_id = $${params.length}`);
  }
  if (appointmentId) {
    params.push(appointmentId);
    conditions.push(`metadata->>'appointment_id' = $${params.length}`);
  }

  params.push(Number(limit));

  const result = await pool.query(
    `
      SELECT id, patient_id, message, type, status, metadata, created_at, updated_at
      FROM whatsapp_messages
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `,
    params,
  );

  const rows = result.rows.map((row) => {
    const metadata = parseMetadata(row.metadata);
    return {
      id: row.id,
      appointment_id: metadata?.appointment_id ?? null,
      patient_id: row.patient_id,
      message_type: metadata?.message_type ?? row.type,
      message_content: row.message,
      status: row.status,
      sent_at: row.created_at?.toISOString?.() ?? null,
      delivered_at: metadata?.delivered_at ?? null,
      read_at: metadata?.read_at ?? null,
      response_received_at: metadata?.response_received_at ?? null,
      response_content: metadata?.response_content ?? null,
      metadata,
      created_at: row.created_at?.toISOString?.() ?? null,
      updated_at: row.updated_at?.toISOString?.() ?? null,
    };
  });

  return c.json({ data: rows });
});

app.get('/webhook-logs', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { limit = '100' } = c.req.query();

  const result = await pool.query(
    `
      SELECT id, patient_id, message, type, status, metadata, created_at
      FROM whatsapp_messages
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [user.organizationId, Number(limit)],
  );

  const rows = result.rows.map((row) => {
    const metadata = parseMetadata(row.metadata);
    return {
      id: row.id,
      event_type: metadata.event_type ?? row.status ?? 'message_updated',
      phone_number: metadata.to_phone ?? null,
      message_content: row.message ?? null,
      processed: metadata.processed ?? true,
      payload: metadata,
      created_at: row.created_at?.toISOString?.() ?? null,
      patient_id: row.patient_id ?? null,
    };
  });

  return c.json({ data: rows });
});

app.post('/messages', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as {
    appointment_id?: string;
    patient_id?: string;
    message_type?: string;
    message_content: string;
    from_phone?: string;
    to_phone?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.message_content) {
    return c.json({ error: 'message_content is required' }, 400);
  }

  const result = await pool.query(
    `
      INSERT INTO whatsapp_messages (
        organization_id,
        patient_id,
        from_phone,
        to_phone,
        message,
        type,
        status,
        message_id,
        metadata,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
      RETURNING *
    `,
    [
      user.organizationId,
      body.patient_id ?? null,
      body.from_phone ?? 'clinic',
      body.to_phone ?? 'patient',
      body.message_content,
      body.message_type ?? 'text',
      body.status ?? 'sent',
      null,
      JSON.stringify({
        ...(body.metadata ?? {}),
        appointment_id: body.appointment_id ?? null,
        message_type: body.message_type,
      }),
    ],
  );

  const inserted = result.rows[0];
  return c.json({
    data: {
      ...inserted,
      metadata: parseMetadata(inserted.metadata),
    },
  }, 201);
});

app.get('/pending-confirmations', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { limit = '100' } = c.req.query();

  const today = new Date().toISOString().split('T')[0];

  const result = await pool.query(
    `
      SELECT a.id, a.patient_id, a.therapist_id, a.date, a.start_time, a.status,
             p.full_name, p.phone
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      WHERE a.organization_id = $1
        AND a.date >= $2
        AND a.status IN ('scheduled', 'agendado')
      ORDER BY a.date ASC, a.start_time ASC
      LIMIT $3
    `,
    [user.organizationId, today, Number(limit)],
  );

  const rows = result.rows.map((row) => ({
    appointment_id: row.id,
    appointment_date: toDateString(row.date),
    appointment_time: row.start_time,
    confirmation_status: 'pending',
    patient: row.patient_id
      ? {
          id: row.patient_id,
          name: row.full_name ?? null,
          phone: row.phone ?? null,
        }
      : null,
    therapist_id: row.therapist_id,
  }));

  return c.json({ data: rows });
});

export { app as whatsappRoutes };
