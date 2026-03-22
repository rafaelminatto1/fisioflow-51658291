/**
 * Neon Auth Webhooks — handler no Cloudflare Worker
 *
 * Eventos suportados:
 * - user.created  → cria perfil automaticamente no banco após signup
 * - user.before_create → validação de domínio (opcional)
 *
 * Configuração via Neon API:
 *   PUT /projects/{id}/branches/{id}/auth/webhooks
 *   { "enabled": true, "webhook_url": "https://fisioflow-api.rafalegollas.workers.dev/api/webhooks/neon-auth", "enabled_events": ["user.created"] }
 *
 * Verificação de assinatura: EdDSA (Ed25519) via JWKS do Neon Auth.
 */
import { Hono } from 'hono';
import type { Env } from '../types/env';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env }>();

// ===== VERIFICAÇÃO DE ASSINATURA =====

interface JwkKey {
  kid: string;
  kty: string;
  crv?: string;
  x?: string;
}

let jwksCache: { keys: JwkKey[] } | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function getJwks(jwksUrl: string): Promise<{ keys: JwkKey[] }> {
  if (jwksCache && Date.now() - jwksCacheTime < JWKS_CACHE_TTL_MS) return jwksCache;
  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error(`JWKS fetch falhou: ${res.status}`);
  jwksCache = (await res.json()) as { keys: JwkKey[] };
  jwksCacheTime = Date.now();
  return jwksCache;
}

async function verifyWebhookSignature(
  rawBody: string,
  headers: Record<string, string>,
  jwksUrl: string
): Promise<boolean> {
  try {
    const signature = headers['x-neon-signature'];
    const kid = headers['x-neon-signature-kid'];
    const timestamp = headers['x-neon-timestamp'];

    if (!signature || !kid || !timestamp) return false;

    // Rejeitar requests com mais de 5 minutos (replay attacks)
    if (Math.abs(Date.now() - parseInt(timestamp, 10)) > 5 * 60 * 1000) return false;

    const jwks = await getJwks(jwksUrl);
    const jwk = jwks.keys.find((k) => k.kid === kid);
    if (!jwk || !jwk.x) return false;

    // Importar chave pública Ed25519
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    // Reconstruir signing input (JWS detached, double base64url)
    const [headerB64, emptyPayload, signatureB64] = signature.split('.');
    if (emptyPayload !== '') return false;

    const payloadB64 = btoa(rawBody)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const signaturePayload = `${timestamp}.${payloadB64}`;
    const signaturePayloadB64 = btoa(signaturePayload)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const signingInput = `${headerB64}.${signaturePayloadB64}`;

    // Decodificar assinatura Ed25519
    const sigBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );
    const dataBytes = new TextEncoder().encode(signingInput);

    return crypto.subtle.verify('Ed25519', publicKey, sigBytes, dataBytes);
  } catch {
    return false;
  }
}

// ===== HANDLER PRINCIPAL =====

app.post('/neon-auth', async (c) => {
  const jwksUrl = c.env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    return c.json({ error: 'NEON_AUTH_JWKS_URL não configurado' }, 500);
  }

  // Ler body raw antes de qualquer parse (obrigatório para verificação de assinatura)
  const rawBody = await c.req.text();

  // Verificar assinatura EdDSA
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(c.req.raw.headers)) {
    headers[key.toLowerCase()] = value as string;
  }

  const isValid = await verifyWebhookSignature(rawBody, headers, jwksUrl);
  if (!isValid) {
    console.warn('[Webhook] Assinatura inválida — rejeitando request');
    return c.json({ error: 'Assinatura inválida' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  const eventType: string = payload.event_type ?? '';

  // ===== user.created: criar perfil automático =====
  if (eventType === 'user.created') {
    const user = payload.user;
    if (!user?.id || !user?.email) {
      return c.json({ ok: true }); // Ignora eventos sem dados do usuário
    }

    try {
      const pool = await createPool(c.env);
      // Upsert do perfil: cria se não existir, ignora se já existir
      await pool.query(
        `INSERT INTO profiles (id, user_id, full_name, role, organization_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'fisioterapeuta', '00000000-0000-0000-0000-000000000001', NOW(), NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, user.name || user.email.split('@')[0] || 'Usuário']
      );
      console.log(`[Webhook] Perfil criado para user ${user.id} (${user.email})`);
    } catch (err: any) {
      // Não retornar erro — evento non-blocking, Neon Auth não vai retentar
      console.error('[Webhook] Erro ao criar perfil:', err.message);
    }

    return c.json({ ok: true });
  }

  // ===== user.before_create: validação de signup (extensível) =====
  if (eventType === 'user.before_create') {
    // Por default, permite todos os signups
    // Para restringir por domínio, adicionar lógica aqui
    return c.json({ allowed: true });
  }

  // Eventos desconhecidos: aceitar com 200 para evitar retry desnecessário
  return c.json({ ok: true });
});

export { app as webhooksRoutes };
