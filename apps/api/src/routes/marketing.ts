import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const DEFAULT_REVIEW_MESSAGE =
  'Olá {nome}! Esperamos que esteja ótimo. Gostaríamos de saber sua opinião sobre nosso atendimento: {review_link}';

const DEFAULT_BIRTHDAY_MESSAGE =
  'Olá {nome}! Desejamos um feliz aniversário! 🎉';

function safeJsonArray(value: unknown, fallback: unknown[] = []): unknown[] {
  return Array.isArray(value) ? value : fallback;
}

app.get('/consents/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { patientId } = c.req.param();

  const result = await pool.query(
    `SELECT patient_id, organization_id, social_media, educational_material, website,
            signed_at, signed_by, signature_ip, expires_at, is_active, revoked_at
       FROM marketing_consents
      WHERE patient_id = $1 AND organization_id = $2`,
    [patientId, user.organizationId],
  );

  return c.json({ data: result.rows[0] ?? null });
});

app.put('/consents/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { patientId } = c.req.param();
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO marketing_consents (
        patient_id, organization_id, social_media, educational_material, website,
        signed_at, signed_by, signature_ip, expires_at, is_active, revoked_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9,$10,NOW())
      ON CONFLICT (patient_id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        social_media = EXCLUDED.social_media,
        educational_material = EXCLUDED.educational_material,
        website = EXCLUDED.website,
        signed_at = NOW(),
        signed_by = EXCLUDED.signed_by,
        signature_ip = EXCLUDED.signature_ip,
        expires_at = EXCLUDED.expires_at,
        is_active = EXCLUDED.is_active,
        revoked_at = EXCLUDED.revoked_at,
        updated_at = NOW()
      RETURNING patient_id, organization_id, social_media, educational_material, website,
                signed_at, signed_by, signature_ip, expires_at, is_active, revoked_at`,
    [
      patientId,
      user.organizationId,
      Boolean(body.social_media),
      Boolean(body.educational_material),
      Boolean(body.website),
      String(body.signed_by ?? user.uid),
      body.signature_ip ?? null,
      body.expires_at ?? null,
      body.is_active ?? true,
      body.revoked_at ?? null,
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.post('/consents/:patientId/revoke', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { patientId } = c.req.param();

  const result = await pool.query(
    `UPDATE marketing_consents
        SET is_active = false, revoked_at = NOW(), updated_at = NOW()
      WHERE patient_id = $1 AND organization_id = $2
      RETURNING patient_id, organization_id, social_media, educational_material, website,
                signed_at, signed_by, signature_ip, expires_at, is_active, revoked_at`,
    [patientId, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Consentimento não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.get('/review-config', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');

  const result = await pool.query(
    `SELECT organization_id, enabled, trigger_status, message_template, delay_hours, google_place_id
       FROM marketing_review_configs
      WHERE organization_id = $1`,
    [user.organizationId],
  );

  return c.json({
    data: result.rows[0] ?? {
      organization_id: user.organizationId,
      enabled: false,
      trigger_status: ['alta', 'concluido'],
      message_template: DEFAULT_REVIEW_MESSAGE,
      delay_hours: 24,
      google_place_id: null,
    },
  });
});

app.put('/review-config', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO marketing_review_configs (
        organization_id, enabled, trigger_status, message_template, delay_hours, google_place_id, updated_at
      ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        trigger_status = EXCLUDED.trigger_status,
        message_template = EXCLUDED.message_template,
        delay_hours = EXCLUDED.delay_hours,
        google_place_id = EXCLUDED.google_place_id,
        updated_at = NOW()
      RETURNING organization_id, enabled, trigger_status, message_template, delay_hours, google_place_id`,
    [
      user.organizationId,
      Boolean(body.enabled),
      JSON.stringify(safeJsonArray(body.trigger_status, ['alta', 'concluido'])),
      String(body.message_template ?? DEFAULT_REVIEW_MESSAGE),
      Number(body.delay_hours ?? 24),
      body.google_place_id ?? null,
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.get('/birthday-config', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');

  const result = await pool.query(
    `SELECT organization_id, enabled, message_template, send_whatsapp, send_email
       FROM marketing_birthday_configs
      WHERE organization_id = $1`,
    [user.organizationId],
  );

  return c.json({
    data: result.rows[0] ?? {
      organization_id: user.organizationId,
      enabled: false,
      message_template: DEFAULT_BIRTHDAY_MESSAGE,
      send_whatsapp: true,
      send_email: false,
    },
  });
});

app.put('/birthday-config', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO marketing_birthday_configs (
        organization_id, enabled, message_template, send_whatsapp, send_email, updated_at
      ) VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        message_template = EXCLUDED.message_template,
        send_whatsapp = EXCLUDED.send_whatsapp,
        send_email = EXCLUDED.send_email,
        updated_at = NOW()
      RETURNING organization_id, enabled, message_template, send_whatsapp, send_email`,
    [
      user.organizationId,
      Boolean(body.enabled),
      String(body.message_template ?? DEFAULT_BIRTHDAY_MESSAGE),
      body.send_whatsapp ?? true,
      body.send_email ?? false,
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.get('/recall-campaigns', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');

  const result = await pool.query(
    `SELECT id, organization_id, name, description, days_without_visit, message_template, enabled, created_at
       FROM marketing_recall_campaigns
      WHERE organization_id = $1 AND deleted = false
      ORDER BY created_at DESC`,
    [user.organizationId],
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/recall-campaigns', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO marketing_recall_campaigns (
        organization_id, name, description, days_without_visit, message_template, enabled, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
      RETURNING id, organization_id, name, description, days_without_visit, message_template, enabled, created_at`,
    [
      user.organizationId,
      String(body.name ?? ''),
      String(body.description ?? ''),
      Number(body.days_without_visit ?? 180),
      String(body.message_template ?? ''),
      body.enabled ?? true,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/recall-campaigns/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json() as Record<string, unknown>;
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  for (const [field, column] of [
    ['name', 'name'],
    ['description', 'description'],
    ['days_without_visit', 'days_without_visit'],
    ['message_template', 'message_template'],
    ['enabled', 'enabled'],
  ] as const) {
    if (body[field] !== undefined) {
      params.push(body[field]);
      sets.push(`${column} = $${params.length}`);
    }
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE marketing_recall_campaigns
        SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length} AND deleted = false
      RETURNING id, organization_id, name, description, days_without_visit, message_template, enabled, created_at`,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Campanha não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/recall-campaigns/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { id } = c.req.param();

  await pool.query(
    `UPDATE marketing_recall_campaigns
        SET deleted = true, deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId],
  );

  return c.json({ ok: true });
});

app.get('/referrals/stats', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');

  const [codesRes, redemptionsRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total_codes,
              COUNT(*) FILTER (
                WHERE max_uses IS NULL OR uses < max_uses
              )::int AS active_codes
         FROM referral_codes
        WHERE organization_id = $1`,
      [user.organizationId],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total_redemptions
         FROM referral_redemptions
        WHERE organization_id = $1`,
      [user.organizationId],
    ),
  ]);

  return c.json({
    data: {
      totalCodes: codesRes.rows[0]?.total_codes ?? 0,
      activeCodes: codesRes.rows[0]?.active_codes ?? 0,
      totalRedemptions: redemptionsRes.rows[0]?.total_redemptions ?? 0,
      pendingRewards: 0,
      topReferrers: [],
    },
  });
});

app.post('/referrals', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO referral_codes (
        patient_id, organization_id, code, reward_type, reward_value, referrer_reward,
        uses, max_uses, expires_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,0,$7,$8,NOW())
      RETURNING id, patient_id, organization_id, code, reward_type, reward_value,
                referrer_reward, uses, max_uses, expires_at, created_at`,
    [
      body.patient_id,
      user.organizationId,
      String(body.code),
      String(body.reward_type ?? 'discount'),
      Number(body.reward_value ?? 0),
      body.referrer_reward ? JSON.stringify(body.referrer_reward) : null,
      body.max_uses ?? null,
      body.expires_at ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.get('/referrals/code/:code', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { code } = c.req.param();

  const result = await pool.query(
    `SELECT id, patient_id, organization_id, code, reward_type, reward_value,
            referrer_reward, uses, max_uses, expires_at, created_at
       FROM referral_codes
      WHERE organization_id = $1 AND UPPER(code) = UPPER($2)`,
    [user.organizationId, code],
  );

  return c.json({ data: result.rows[0] ?? null });
});

app.get('/referrals/patient/:patientId', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { patientId } = c.req.param();

  const result = await pool.query(
    `SELECT id, patient_id, organization_id, code, reward_type, reward_value,
            referrer_reward, uses, max_uses, expires_at, created_at
       FROM referral_codes
      WHERE organization_id = $1 AND patient_id = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [user.organizationId, patientId],
  );

  return c.json({ data: result.rows[0] ?? null });
});

app.post('/referrals/redeem', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;
  const code = String(body.code ?? '').toUpperCase();
  const newPatientId = String(body.new_patient_id ?? '');

  const referralRes = await pool.query(
    `SELECT id, patient_id, organization_id, code, reward_type, reward_value,
            referrer_reward, uses, max_uses, expires_at, created_at
       FROM referral_codes
      WHERE organization_id = $1 AND UPPER(code) = $2`,
    [user.organizationId, code],
  );

  const referral = referralRes.rows[0];
  if (!referral) return c.json({ data: { success: false, error: 'Código inválido' } }, 200);
  if (referral.max_uses && referral.uses >= referral.max_uses) {
    return c.json({ data: { success: false, error: 'Código já atingiu limite de usos' } }, 200);
  }
  if (referral.expires_at && new Date(referral.expires_at).getTime() < Date.now()) {
    return c.json({ data: { success: false, error: 'Código expirado' } }, 200);
  }

  await pool.query('BEGIN');
  try {
    await pool.query(
      'UPDATE referral_codes SET uses = uses + 1, last_used_at = NOW() WHERE id = $1',
      [referral.id],
    );
    await pool.query(
      `INSERT INTO referral_redemptions (
          referral_id, organization_id, referrer_patient_id, new_patient_id, redeemed_at
        ) VALUES ($1,$2,$3,$4,NOW())`,
      [referral.id, user.organizationId, referral.patient_id, newPatientId],
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  return c.json({
    data: {
      success: true,
      reward:
        referral.reward_type === 'discount'
          ? `${Number(referral.reward_value)}% de desconto`
          : `${Number(referral.reward_value)} sessões grátis`,
    },
  });
});

app.get('/fisiolink', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const result = await pool.query(
    `SELECT organization_id, slug, whatsapp_number, google_maps_url, phone,
            show_before_after, show_reviews, custom_message, theme, primary_color
       FROM fisio_links
      WHERE organization_id = $1`,
    [user.organizationId],
  );

  return c.json({ data: result.rows[0] ?? null });
});

app.put('/fisiolink', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO fisio_links (
        organization_id, slug, whatsapp_number, google_maps_url, phone, show_before_after,
        show_reviews, custom_message, theme, primary_color, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      ON CONFLICT (organization_id) DO UPDATE SET
        slug = EXCLUDED.slug,
        whatsapp_number = EXCLUDED.whatsapp_number,
        google_maps_url = EXCLUDED.google_maps_url,
        phone = EXCLUDED.phone,
        show_before_after = EXCLUDED.show_before_after,
        show_reviews = EXCLUDED.show_reviews,
        custom_message = EXCLUDED.custom_message,
        theme = EXCLUDED.theme,
        primary_color = EXCLUDED.primary_color,
        updated_at = NOW()
      RETURNING organization_id, slug, whatsapp_number, google_maps_url, phone,
                show_before_after, show_reviews, custom_message, theme, primary_color`,
    [
      user.organizationId,
      String(body.slug ?? user.organizationId),
      body.whatsapp_number ?? null,
      body.google_maps_url ?? null,
      body.phone ?? null,
      body.show_before_after ?? true,
      body.show_reviews ?? true,
      body.custom_message ?? null,
      body.theme ?? 'clinical',
      body.primary_color ?? '#3b82f6',
    ],
  );

  return c.json({ data: result.rows[0] });
});

app.get('/fisiolink/:slug/analytics', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { slug } = c.req.param();

  const result = await pool.query(
    `SELECT button, COUNT(*)::int AS clicks
       FROM fisio_link_analytics
      WHERE slug = $1
      GROUP BY button`,
    [slug],
  );

  const clicksByButton = Object.fromEntries(result.rows.map((row) => [row.button, row.clicks]));
  const totalClicks = result.rows.reduce((sum, row) => sum + Number(row.clicks ?? 0), 0);
  return c.json({ data: { totalClicks, clicksByButton } });
});

app.get('/exports', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const patientId = c.req.query('patientId');

  const params: unknown[] = [user.organizationId];
  let patientClause = '';
  if (patientId) {
    params.push(patientId);
    patientClause = ` AND me.patient_id = $${params.length}`;
  }

  const result = await pool.query(
    `SELECT me.id, me.patient_id, me.organization_id, me.export_type, me.file_path, me.file_url,
            me.is_anonymized, me.metrics_overlay, me.created_at, p.name AS patient_name
       FROM marketing_exports me
       LEFT JOIN patients p ON p.id = me.patient_id
      WHERE me.organization_id = $1 AND me.deleted = false${patientClause}
      ORDER BY me.created_at DESC`,
    params,
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.get('/content-calendar', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');

  const result = await pool.query(
    `SELECT id, title, description, type, status, date::text AS date, hashtags, image_url, created_at, updated_at
       FROM content_calendar
      WHERE organization_id = $1
      ORDER BY date ASC NULLS LAST, created_at DESC`,
    [user.organizationId],
  );

  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/content-calendar', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO content_calendar (
        organization_id, title, description, type, status, date, hashtags, image_url, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      RETURNING id, title, description, type, status, date::text AS date, hashtags, image_url, created_at, updated_at`,
    [
      user.organizationId,
      String(body.title ?? ''),
      String(body.description ?? ''),
      String(body.type ?? 'post'),
      String(body.status ?? 'idea'),
      body.date ?? null,
      body.hashtags ?? null,
      body.image_url ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/content-calendar/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { id } = c.req.param();
  const body = await c.req.json() as Record<string, unknown>;
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  for (const [field, column] of [
    ['title', 'title'],
    ['description', 'description'],
    ['type', 'type'],
    ['status', 'status'],
    ['date', 'date'],
    ['hashtags', 'hashtags'],
    ['image_url', 'image_url'],
  ] as const) {
    if (body[field] !== undefined) {
      params.push(body[field]);
      sets.push(`${column} = $${params.length}`);
    }
  }

  params.push(id, user.organizationId);
  const result = await pool.query(
    `UPDATE content_calendar
        SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND organization_id = $${params.length}
      RETURNING id, title, description, type, status, date::text AS date, hashtags, image_url, created_at, updated_at`,
    params,
  );

  if (!result.rows.length) return c.json({ error: 'Conteúdo não encontrado' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/content-calendar/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { id } = c.req.param();

  await pool.query(
    'DELETE FROM content_calendar WHERE id = $1 AND organization_id = $2',
    [id, user.organizationId],
  );
  return c.json({ ok: true });
});

app.post('/exports', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const body = await c.req.json() as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO marketing_exports (
        organization_id, patient_id, export_type, file_path, file_url,
        is_anonymized, metrics_overlay, asset_a_id, asset_b_id, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,NOW())
      RETURNING id, patient_id, organization_id, export_type, file_path, file_url,
                is_anonymized, metrics_overlay, created_at`,
    [
      user.organizationId,
      body.patient_id,
      body.export_type ?? 'video_comparison',
      body.file_path,
      body.file_url,
      body.is_anonymized ?? true,
      JSON.stringify(safeJsonArray(body.metrics_overlay, [])),
      body.asset_a_id ?? null,
      body.asset_b_id ?? null,
    ],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.delete('/exports/:id', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const { id } = c.req.param();

  const result = await pool.query(
    `UPDATE marketing_exports
        SET deleted = true, deleted_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING id, file_path`,
    [id, user.organizationId],
  );

  if (!result.rows.length) return c.json({ error: 'Exportação não encontrada' }, 404);
  return c.json({ data: result.rows[0] });
});

app.get('/roi', requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const user = c.get('user');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  if (!startDate || !endDate) {
    return c.json({ error: 'startDate e endDate são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `SELECT COUNT(*)::int AS total_leads,
            COUNT(*) FILTER (
              WHERE status = 'ativo'
                 OR LOWER(COALESCE(status, '')) = 'active'
            )::int AS converted_leads
       FROM patients
      WHERE organization_id = $1
        AND created_at >= $2::timestamptz
        AND created_at <= $3::timestamptz`,
    [user.organizationId, startDate, endDate],
  );

  const totalLeads = result.rows[0]?.total_leads ?? 0;
  const convertedLeads = result.rows[0]?.converted_leads ?? 0;
  return c.json({ data: { totalLeads, convertedLeads } });
});

app.get('/public/fisiolink/:slug', async (c) => {
  const pool = await createPool(c.env);
  const { slug } = c.req.param();

  const result = await pool.query(
    `SELECT organization_id, slug, whatsapp_number, google_maps_url, phone,
            show_before_after, show_reviews, custom_message, theme, primary_color
       FROM fisio_links
      WHERE slug = $1`,
    [slug],
  );

  return c.json({ data: result.rows[0] ?? null });
});

app.post('/public/fisiolink/:slug/click', async (c) => {
  const pool = await createPool(c.env);
  const { slug } = c.req.param();
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

  const orgRes = await pool.query('SELECT organization_id FROM fisio_links WHERE slug = $1', [slug]);
  const organizationId = orgRes.rows[0]?.organization_id ?? null;

  await pool.query(
    `INSERT INTO fisio_link_analytics (organization_id, slug, button, clicked_at)
     VALUES ($1,$2,$3,NOW())`,
    [organizationId, slug, String(body.button ?? 'unknown')],
  );

  return c.json({ ok: true });
});

export { app as marketingRoutes };
