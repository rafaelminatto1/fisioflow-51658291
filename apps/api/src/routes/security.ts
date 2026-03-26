import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const parseArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

function generateBackupCodes(): string[] {
  return Array.from({ length: 10 }, () =>
    Math.random().toString(36).substring(2, 10).toUpperCase(),
  );
}

function generateOtpCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function generateTotpSecret(): string {
  let secret = '';
  for (let i = 0; i < 32; i += 1) {
    secret += BASE32_ALPHABET.charAt(Math.floor(Math.random() * BASE32_ALPHABET.length));
  }
  return secret;
}

function base32Decode(base32: string): Uint8Array {
  const normalized = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits = normalized
    .split('')
    .map((char) => {
      const index = BASE32_ALPHABET.indexOf(char);
      if (index === -1) throw new Error(`Invalid Base32 character: ${char}`);
      return index.toString(2).padStart(5, '0');
    })
    .join('');

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const secretBytes = base32Decode(secret);
  const codeInt = Number.parseInt(code, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeStep = 30;

  for (let offset = -1; offset <= 1; offset += 1) {
    let counter = Math.floor((currentTime + offset * timeStep) / timeStep);
    const counterBytes = new Uint8Array(8);
    for (let i = 7; i >= 0; i -= 1) {
      counterBytes[i] = counter & 0xff;
      counter >>= 8;
    }

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      secretBytes as unknown as ArrayBuffer,
      { name: 'HMAC', hash: { name: 'SHA-1' } } as HmacImportParams,
      false,
      ['sign'],
    );

    const signature = new Uint8Array(
      await crypto.subtle.sign('HMAC', hmacKey, counterBytes),
    );
    const dynamicOffset = signature[signature.length - 1] & 0x0f;
    const binary =
      ((signature[dynamicOffset] & 0x7f) << 24) |
      ((signature[dynamicOffset + 1] & 0xff) << 16) |
      ((signature[dynamicOffset + 2] & 0xff) << 8) |
      (signature[dynamicOffset + 3] & 0xff);

    if (binary % 1000000 === codeInt) return true;
  }

  return false;
}

async function logSecurityEvent(
  env: Env,
  userId: string,
  organizationId: string,
  eventType: string,
  severity: 'info' | 'warning' | 'error',
  metadata: Record<string, unknown> = {},
) {
  const pool = createPool(env);
  await pool.query(
    `
      INSERT INTO security_events (user_id, organization_id, event_type, severity, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [userId, organizationId, eventType, severity, JSON.stringify(metadata)],
  );
}

app.use('*', requireAuth);

app.get('/mfa/settings', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM mfa_settings WHERE user_id = $1 LIMIT 1`,
    [user.uid],
  );
  return c.json({ data: result.rows[0] ?? null });
});

app.get('/lgpd-consents', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      SELECT id, user_id, organization_id, consent_type, granted, granted_at, revoked_at, version, created_at, updated_at
      FROM lgpd_consents
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [user.uid],
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.put('/lgpd-consents/:consentType', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const consentType = c.req.param('consentType');
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const granted = Boolean(body.granted);
  const version = typeof body.version === 'string' && body.version.trim() ? body.version.trim() : '1.0';

  const result = await pool.query(
    `
      INSERT INTO lgpd_consents (
        user_id,
        organization_id,
        consent_type,
        granted,
        granted_at,
        revoked_at,
        version,
        created_at,
        updated_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        CASE WHEN $4 THEN NOW() ELSE NULL END,
        CASE WHEN $4 THEN NULL ELSE NOW() END,
        $5,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, consent_type)
      DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        granted = EXCLUDED.granted,
        granted_at = CASE WHEN EXCLUDED.granted THEN NOW() ELSE lgpd_consents.granted_at END,
        revoked_at = CASE WHEN EXCLUDED.granted THEN NULL ELSE NOW() END,
        version = EXCLUDED.version,
        updated_at = NOW()
      RETURNING id, user_id, organization_id, consent_type, granted, granted_at, revoked_at, version, created_at, updated_at
    `,
    [user.uid, user.organizationId, consentType, granted, version],
  );

  await logSecurityEvent(
    c.env,
    user.uid,
    user.organizationId,
    granted ? 'lgpd_consent_granted' : 'lgpd_consent_revoked',
    'info',
    { consentType, version },
  );

  return c.json({ data: result.rows[0] ?? null });
});

app.post('/mfa/enable', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const method = String(body.method ?? 'email');
  const backupCodes = generateBackupCodes();

  const result = await pool.query(
    `
      INSERT INTO mfa_settings (
        user_id, organization_id, mfa_enabled, mfa_method, backup_codes, last_used_at, created_at, updated_at
      ) VALUES (
        $1, $2, true, $3, $4, NOW(), NOW(), NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        mfa_enabled = true,
        mfa_method = EXCLUDED.mfa_method,
        backup_codes = EXCLUDED.backup_codes,
        last_used_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `,
    [user.uid, user.organizationId, method, backupCodes],
  );

  await logSecurityEvent(c.env, user.uid, user.organizationId, 'mfa_enabled', 'info', { method });
  return c.json({ data: result.rows[0], backupCodes });
});

app.post('/mfa/disable', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      UPDATE mfa_settings
      SET mfa_enabled = false,
          mfa_method = null,
          backup_codes = ARRAY[]::text[],
          pending_otp_code = null,
          pending_otp_expires_at = null,
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `,
    [user.uid],
  );
  await logSecurityEvent(c.env, user.uid, user.organizationId, 'mfa_disabled', 'warning');
  return c.json({ data: result.rows[0] ?? null });
});

app.post('/mfa/send-otp', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await pool.query(
    `
      INSERT INTO mfa_settings (
        user_id, organization_id, mfa_enabled, backup_codes, pending_otp_code, pending_otp_expires_at, created_at, updated_at
      ) VALUES (
        $1, $2, false, ARRAY[]::text[], $3, $4, NOW(), NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        pending_otp_code = EXCLUDED.pending_otp_code,
        pending_otp_expires_at = EXCLUDED.pending_otp_expires_at,
        updated_at = NOW()
    `,
    [user.uid, user.organizationId, code, expiresAt],
  );

  await logSecurityEvent(c.env, user.uid, user.organizationId, 'mfa_otp_sent', 'info');
  return c.json({
    data: {
      success: true,
      expiresAt,
      ...(c.env.ENVIRONMENT !== 'production' ? { debugCode: code } : {}),
    },
  });
});

app.post('/mfa/verify-otp', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = String(body.code ?? '').toUpperCase();

  const result = await pool.query(`SELECT * FROM mfa_settings WHERE user_id = $1 LIMIT 1`, [user.uid]);
  const settings = result.rows[0];
  if (!settings) return c.json({ error: 'Configuração MFA não encontrada' }, 404);

  const backupCodes = parseArray(settings.backup_codes);
  const validOtp =
    settings.pending_otp_code === code &&
    settings.pending_otp_expires_at &&
    new Date(settings.pending_otp_expires_at).getTime() > Date.now();

  if (validOtp) {
    await pool.query(
      `
        UPDATE mfa_settings
        SET pending_otp_code = null,
            pending_otp_expires_at = null,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE user_id = $1
      `,
      [user.uid],
    );
    await logSecurityEvent(c.env, user.uid, user.organizationId, 'mfa_otp_verified', 'info');
    return c.json({ data: { verified: true } });
  }

  if (backupCodes.includes(code)) {
    const remaining = backupCodes.filter((item) => item !== code);
    await pool.query(
      `
        UPDATE mfa_settings
        SET backup_codes = $2,
            last_used_at = NOW(),
            updated_at = NOW()
        WHERE user_id = $1
      `,
      [user.uid, remaining],
    );
    await logSecurityEvent(c.env, user.uid, user.organizationId, 'mfa_backup_code_used', 'warning');
    return c.json({ data: { verified: true } });
  }

  return c.json({ error: 'Código inválido ou expirado' }, 400);
});

app.post('/mfa/enroll', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const secret = generateTotpSecret();
  const factorId = crypto.randomUUID();
  const friendlyName = String(body.friendlyName ?? 'Authenticator App');
  const qrCode = `otpauth://totp/FisioFlow:${user.email ?? user.uid}?secret=${secret}&issuer=FisioFlow`;

  await pool.query(
    `
      INSERT INTO mfa_enrollments (
        user_id, organization_id, factor_id, type, friendly_name, secret, verified, created_at
      ) VALUES (
        $1, $2, $3, 'totp', $4, $5, false, NOW()
      )
    `,
    [user.uid, user.organizationId, factorId, friendlyName, secret],
  );

  return c.json({ data: { qrCode, secret, factorId } });
});

app.post('/mfa/enroll/verify', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const factorId = String(body.factorId ?? '');
  const code = String(body.code ?? '');

  const result = await pool.query(
    `SELECT * FROM mfa_enrollments WHERE user_id = $1 AND factor_id = $2 LIMIT 1`,
    [user.uid, factorId],
  );
  const enrollment = result.rows[0];
  if (!enrollment) return c.json({ error: 'MFA enrollment not found' }, 404);

  const valid = await verifyTotpCode(String(enrollment.secret ?? ''), code);
  if (!valid) return c.json({ error: 'Invalid verification code' }, 400);

  await pool.query(
    `
      UPDATE mfa_enrollments
      SET verified = true, verified_at = NOW()
      WHERE id = $1
    `,
    [enrollment.id],
  );

  await pool.query(
    `
      INSERT INTO mfa_settings (
        user_id, organization_id, mfa_enabled, mfa_method, created_at, updated_at
      ) VALUES ($1, $2, true, 'totp', NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET mfa_enabled = true, mfa_method = 'totp', updated_at = NOW()
    `,
    [user.uid, user.organizationId],
  );

  return c.json({ data: { verified: true } });
});

app.get('/mfa/factors', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const result = await pool.query(
    `
      SELECT id, factor_id, type, friendly_name, verified, created_at, verified_at
      FROM mfa_enrollments
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [user.uid],
  );
  try { return c.json({ data: result.rows || result }); } catch { return c.json({ data: [] }); }
});

app.delete('/mfa/factors/:factorId', async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const { factorId } = c.req.param();
  await pool.query(
    `DELETE FROM mfa_enrollments WHERE user_id = $1 AND factor_id = $2`,
    [user.uid, factorId],
  );
  await pool.query(
    `
      UPDATE mfa_settings
      SET mfa_enabled = false, mfa_method = null, updated_at = NOW()
      WHERE user_id = $1
    `,
    [user.uid],
  );
  return c.json({ data: { success: true } });
});

export const securityRoutes = app;
