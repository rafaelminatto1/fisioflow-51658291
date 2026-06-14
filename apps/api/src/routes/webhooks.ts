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
import { Hono } from "hono";
import type { Env } from "../types/env";
import { createPool } from "../lib/db";
import { createResend } from "../lib/email";

const app = new Hono<{ Bindings: Env }>();

// ===== VERIFICAÇÃO DE ASSINATURA =====

interface JwkKey {
  kid: string;
  kty: string;
  crv?: string;
  x?: string;
}

// Promise singleton evita fetches simultâneos (race condition em Workers)
let jwksCachePromise: Promise<{ keys: JwkKey[] }> | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

async function getJwks(jwksUrl: string): Promise<{ keys: JwkKey[] }> {
  if (jwksCachePromise && Date.now() - jwksCacheTime < JWKS_CACHE_TTL_MS) {
    return jwksCachePromise;
  }
  jwksCacheTime = Date.now();
  jwksCachePromise = fetch(jwksUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`JWKS fetch falhou: ${res.status}`);
      return res.json() as Promise<{ keys: JwkKey[] }>;
    })
    .catch((err) => {
      jwksCachePromise = null; // permite retry no próximo request
      throw err;
    });
  return jwksCachePromise;
}

async function verifyWebhookSignature(
  rawBody: string,
  headers: Record<string, string>,
  jwksUrl: string,
): Promise<boolean> {
  try {
    const signature = headers["x-neon-signature"];
    const kid = headers["x-neon-signature-kid"];
    const timestamp = headers["x-neon-timestamp"];

    if (!signature || !kid || !timestamp) return false;

    // Rejeitar requests com mais de 5 minutos (replay attacks)
    if (Math.abs(Date.now() - parseInt(timestamp, 10)) > 5 * 60 * 1000) return false;

    const jwks = await getJwks(jwksUrl);
    const jwk = jwks.keys.find((k) => k.kid === kid);
    if (!jwk || !jwk.x) return false;

    // Importar chave pública Ed25519
    const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "Ed25519" }, false, [
      "verify",
    ]);

    // Reconstruir signing input (JWS detached, double base64url)
    const [headerB64, emptyPayload, signatureB64] = signature.split(".");
    if (emptyPayload !== "") return false;

    const payloadB64 = btoa(rawBody).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const signaturePayload = `${timestamp}.${payloadB64}`;
    const signaturePayloadB64 = btoa(signaturePayload)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const signingInput = `${headerB64}.${signaturePayloadB64}`;

    // Decodificar assinatura Ed25519
    const sigBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const dataBytes = new TextEncoder().encode(signingInput);

    return crypto.subtle.verify("Ed25519", publicKey, sigBytes, dataBytes);
  } catch {
    return false;
  }
}

// ===== HANDLER PRINCIPAL =====

app.post("/neon-auth", async (c) => {
  const jwksUrl = c.env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    return c.json({ error: "NEON_AUTH_JWKS_URL não configurado" }, 500);
  }

  // Ler body raw antes de qualquer parse (obrigatório para verificação de assinatura)
  const rawBody = await c.req.text();

  // Verificar assinatura EdDSA
  // Headers é um objeto Fetch API — Object.entries() retorna [] nele; usar forEach()
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const isValid = await verifyWebhookSignature(rawBody, headers, jwksUrl);
  if (!isValid) {
    console.warn("[Webhook] Assinatura inválida — rejeitando request");
    return c.json({ error: "Assinatura inválida" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Payload inválido" }, 400);
  }

  const eventType: string = payload.event_type ?? "";

  // ===== user.created: criar perfil automático =====
  if (eventType === "user.created") {
    const user = payload.user;
    if (!user?.id || !user?.email) {
      return c.json({ ok: true }); // Ignora eventos sem dados do usuário
    }

    const escHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const userName = escHtml(user.name || user.email.split("@")[0] || "Usuário");
    const safeEmail = escHtml(user.email);
    try {
      const pool = createPool(c.env);
      // Cria perfil com role='pending' — admin deve aprovar antes de liberar acesso
      await pool.query(
        `INSERT INTO profiles (id, user_id, full_name, email, role, roles, organization_id, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'pending', ARRAY['pending'], '00000000-0000-0000-0000-000000000001', NOW(), NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, userName, user.email],
      );
      console.log(`[Webhook] Perfil pendente criado para user ${user.id} (${user.email})`);
    } catch (err: any) {
      console.error("[Webhook] Erro ao criar perfil:", err.message);
    }

    // Notifica admin por email (non-blocking)
    try {
      const resend = createResend(c.env);
      if (resend) {
        const adminEmail = c.env.ADMIN_NOTIFICATION_EMAIL ?? "";
        const from = c.env.RESEND_FROM_EMAIL ?? "FisioFlow <noreply@moocafisio.com.br>";
        await resend.emails.send({
          from,
          to: adminEmail,
          subject: `[FisioFlow] Novo cadastro aguardando aprovação: ${userName}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <div style="background:#2563eb;padding:20px 24px;">
                <h2 style="color:#fff;margin:0;font-size:18px;">Novo Cadastro Pendente</h2>
              </div>
              <div style="padding:24px;">
                <p style="color:#374151;margin-top:0;">Um novo usuário se cadastrou no FisioFlow e aguarda sua aprovação para ter acesso ao sistema.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;background:#f9fafb;font-weight:600;color:#6b7280;width:120px;">Nome</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;">${userName}</td></tr>
                  <tr><td style="padding:8px;background:#f9fafb;font-weight:600;color:#6b7280;">Email</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;">${safeEmail}</td></tr>
                  <tr><td style="padding:8px;background:#f9fafb;font-weight:600;color:#6b7280;">Data</td><td style="padding:8px;">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>
                </table>
                <p style="color:#374151;">Acesse o painel administrativo para definir o papel deste usuário e liberar o acesso:</p>
                <a href="https://fisioflow.pages.dev/admin/usuarios-pendentes" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">Aprovar Usuário</a>
              </div>
              <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                <p style="color:#9ca3af;font-size:12px;margin:0;">FisioFlow — Sistema de Gestão de Fisioterapia</p>
              </div>
            </div>
          `,
        });
        console.log(`[Webhook] Email de notificação enviado para ${adminEmail}`);
      }
    } catch (emailErr: any) {
      console.warn("[Webhook] Falha ao enviar email de notificação:", emailErr.message);
    }

    return c.json({ ok: true });
  }

  // ===== user.before_create: validação de signup (extensível) =====
  if (eventType === "user.before_create") {
    // Por default, permite todos os signups
    // Para restringir por domínio, adicionar lógica aqui
    return c.json({ allowed: true });
  }

  // Eventos desconhecidos: aceitar com 200 para evitar retry desnecessário
  return c.json({ ok: true });
});

export { app as webhooksRoutes };
