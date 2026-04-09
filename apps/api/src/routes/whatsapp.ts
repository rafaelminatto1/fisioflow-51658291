import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthUser } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

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
        ...body.metadata,
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
        AND a.status IN ('scheduled', 'confirmed')
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

// ===== WEBHOOK (entrada de mensagens do Meta) =====

/** Verifica assinatura HMAC-SHA256 do Meta/WhatsApp */
async function verifyMetaSignature(
  appSecret: string,
  rawBody: string,
  signature: string | undefined,
): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expectedHex = 'sha256=' + Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (expectedHex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// GET /api/whatsapp/webhook — validação do token pelo Meta
app.get('/webhook', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const verifyToken = (c.env as any).WHATSAPP_VERIFY_TOKEN ?? 'fisioflow_webhook_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return c.json({ error: 'Token de verificação inválido' }, 403);
});

type IntentType = 'schedule' | 'cancel' | 'reschedule' | 'question' | 'other';

interface ParsedIntent {
  type: IntentType;
  entities: Record<string, unknown>;
}

function classifyIntentLocal(text: string): ParsedIntent {
  const lower = text.toLowerCase();
  if (/agendar|marcar|consulta|horário|disponível/.test(lower)) return { type: 'schedule', entities: {} };
  if (/cancelar|desmarcar/.test(lower)) return { type: 'cancel', entities: {} };
  if (/remarcar|reagendar|mudar horário/.test(lower)) return { type: 'reschedule', entities: {} };
  if (/\?|como|quando|onde|qual|dúvida|informação/.test(lower)) return { type: 'question', entities: {} };
  return { type: 'other', entities: {} };
}

async function sendWhatsAppReply(env: Env, to: string, text: string): Promise<void> {
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  const token = env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) return;

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
}

// POST /api/whatsapp/webhook — receber mensagens do Meta
app.post('/webhook', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256');
  const appSecret = (c.env as any).WHATSAPP_APP_SECRET as string | undefined;

  // Validar HMAC se APP_SECRET estiver configurado
  if (appSecret) {
    const valid = await verifyMetaSignature(appSecret, rawBody, signature);
    if (!valid) {
      console.warn('[WhatsApp Webhook] Assinatura HMAC inválida — descartando payload');
      return c.json({ error: 'Assinatura inválida' }, 401);
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  // Confirmar recebimento ao Meta imediatamente (exigido pela API)
  c.executionCtx?.waitUntil(processWhatsAppWebhook(body, c.env));

  return c.json({ status: 'ok' });
});

async function processWhatsAppWebhook(body: Record<string, unknown>, env: Env): Promise<void> {
  try {
    const entry = (body.entry as any[])?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages as any[];

    if (!messages?.length) return;

    const msg = messages[0];
    const from: string = msg.from ?? '';
    const text: string = msg.text?.body ?? '';

    if (!from || !text) return;

    const intent = classifyIntentLocal(text);

    let reply = '';
    switch (intent.type) {
      case 'schedule':
        reply = 'Olá! Gostaria de agendar uma consulta? Por favor, informe seu nome completo e preferência de horário (manhã/tarde) para verificarmos disponibilidade.';
        break;
      case 'cancel':
        reply = 'Entendido! Para cancelar sua consulta, preciso do seu CPF ou data do agendamento. Pode informar?';
        break;
      case 'reschedule':
        reply = 'Claro! Para remarcar, preciso do seu CPF e da nova data/horário desejado. Pode informar?';
        break;
      case 'question':
        reply = 'Olá! Em que posso ajudar? Posso informar sobre agendamentos, horários e serviços da clínica.';
        break;
      default:
        reply = 'Olá! Sou o assistente da clínica. Posso ajudar com agendamentos, cancelamentos ou informações. Como posso ajudar?';
    }

    await sendWhatsAppReply(env, from, reply);
  } catch (err) {
    console.error('[WhatsApp Webhook] Erro ao processar mensagem:', err);
  }
}

app.post('/send-template', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as {
    patient_id: string;
    template_key: string;
    variables: Record<string, string>;
    appointment_id?: string;
  };

  const { patient_id, template_key, variables, appointment_id } = body;
  if (!patient_id || !template_key) {
    return c.json({ error: 'patient_id e template_key são obrigatórios' }, 400);
  }

  // 1. Buscar paciente para pegar o telefone
  const patientRes = await pool.query('SELECT full_name, phone FROM patients WHERE id = $1 LIMIT 1', [patient_id]);
  const patient = patientRes.rows[0];
  if (!patient?.phone) {
    return c.json({ error: 'Paciente não possui telefone cadastrado' }, 400);
  }

  // 2. Buscar template
  const settings = await loadOrganizationSettings(pool, user.organizationId);
  const templates = (settings.whatsapp_templates as any[]) ?? DEFAULT_TEMPLATES;
  const template = templates.find((t: any) => t.template_key === template_key);
  
  if (!template) {
    return c.json({ error: 'Template não encontrado' }, 404);
  }

  // 3. Processar variáveis no conteúdo
  let content = template.content;
  for (const [key, val] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), val);
  }

  // 4. Enviar via Meta API (Simulado ou Real dependendo das envs)
  const phoneId = c.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = c.env.WHATSAPP_ACCESS_TOKEN;

  let status = 'sent';
  let messageId = null;

  if (phoneId && token) {
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: patient.phone.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: template_key,
            language: { code: 'pt_BR' },
            components: [
              {
                type: 'body',
                parameters: template.variables.map((v: string) => ({
                  type: 'text',
                  text: variables[v] || '',
                })),
              },
            ],
          },
        }),
      });
      const metaData = await metaRes.json() as any;
      messageId = metaData.messages?.[0]?.id;
    } catch (e) {
      console.error('[WhatsApp] Error sending Meta template:', e);
      status = 'failed';
    }
  }

  // 5. Salvar na tabela de mensagens
  await pool.query(
    `INSERT INTO whatsapp_messages (
      organization_id, patient_id, from_phone, to_phone, message, type, status, message_id, metadata, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
    [
      user.organizationId,
      patient_id,
      'clinic',
      patient.phone,
      content,
      'template',
      status,
      messageId,
      JSON.stringify({ appointment_id, template_key, variables }),
    ],
  );

  return c.json({ success: status === 'sent', content, messageId });
});

export { app as whatsappRoutes };
