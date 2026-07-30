import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, requireRole, type AuthVariables } from "../lib/auth";
import { sendInvitationEmail } from "../lib/email";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Um convite pendente define o papel com que o perfil nasce no signup
// (webhook user.created). Só admin pode criar/ver/alterar convites.
const requireAdmin = requireRole("admin");

// Espelha a allowlist de POST /profile/admin/approve/:profileId
const ALLOWED_INVITE_ROLES = [
  "admin",
  "fisioterapeuta",
  "estagiario",
  "paciente",
  "parceiro",
  "recepcionista",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown): string | null {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();
  return EMAIL_RE.test(email) ? email : null;
}

interface InvitationRow {
  email: string;
  role: string;
  token: string;
  expires_at?: string;
}

// Entrega o link do convite por e-mail. Nunca lança: o convite vale por si só
// (o link também pode ser copiado na tela de admin), então falha de e-mail é
// reportada como email_sent=false em vez de derrubar a criação.
async function deliverInvitationEmail(
  env: Env,
  invitation: InvitationRow,
  invitedByEmail?: string,
): Promise<boolean> {
  const baseUrl = env.PAGES_URL ?? "https://moocafisio.com.br";
  const inviteUrl = `${baseUrl}/auth?invite=${invitation.token}&mode=register`;

  try {
    await sendInvitationEmail(env, invitation.email, {
      role: invitation.role,
      inviteUrl,
      expiresAt: invitation.expires_at,
      invitedByEmail,
    });
    return true;
  } catch (err: any) {
    console.error("[Invitations] Falha ao enviar e-mail do convite:", err?.message);
    return false;
  }
}

app.get("/", requireAuth, requireAdmin, async (c) => {
  const user = c.get("user");
  const db = await createPool(c.env);
  const result = await db.query(
    `SELECT * FROM user_invitations WHERE organization_id = $1 ORDER BY created_at DESC`,
    [user.organizationId],
  );
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.post("/", requireAuth, requireAdmin, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}) as any);

  const email = normalizeEmail(body?.email);
  if (!email) return c.json({ error: "email inválido" }, 400);

  const role = String(body?.role ?? "fisioterapeuta")
    .trim()
    .toLowerCase();
  if (!ALLOWED_INVITE_ROLES.includes(role)) return c.json({ error: "role inválido" }, 400);

  const db = await createPool(c.env);

  // Check for pending invitation with same email
  const existing = await db.query(
    `SELECT id FROM user_invitations WHERE organization_id = $1 AND email = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [user.organizationId, email],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    return c.json({ error: "Já existe um convite pendente para este email" }, 409);
  }

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const result = await db.query(
    `INSERT INTO user_invitations (organization_id, email, role, token, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [user.organizationId, email, role, token, user.uid, expiresAt.toISOString()],
  );

  const invitation = result.rows[0];
  const emailSent = await deliverInvitationEmail(c.env, invitation, user.email);

  return c.json({ data: invitation, email_sent: emailSent }, 201);
});

app.post("/:id/resend", requireAuth, requireAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createPool(c.env);

  const result = await db.query(
    `SELECT * FROM user_invitations
      WHERE id = $1 AND organization_id = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [id, user.organizationId],
  );
  if (!result.rowCount) {
    return c.json({ error: "Convite não encontrado, já usado ou expirado" }, 404);
  }

  const invitation = result.rows[0];
  const emailSent = await deliverInvitationEmail(c.env, invitation, user.email);
  if (!emailSent) return c.json({ error: "Falha ao enviar o e-mail do convite" }, 502);

  return c.json({ data: invitation, email_sent: true });
});

app.patch("/:id", requireAuth, requireAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}) as any);

  let email: string | null = null;
  if (body?.email !== undefined && body?.email !== null) {
    email = normalizeEmail(body.email);
    if (!email) return c.json({ error: "email inválido" }, 400);
  }

  let role: string | null = null;
  if (body?.role !== undefined && body?.role !== null) {
    role = String(body.role).trim().toLowerCase();
    if (!ALLOWED_INVITE_ROLES.includes(role)) return c.json({ error: "role inválido" }, 400);
  }

  const db = await createPool(c.env);

  const result = await db.query(
    `UPDATE user_invitations SET email = COALESCE($1, email), role = COALESCE($2, role),
       expires_at = COALESCE($3, expires_at)
     WHERE id = $4 AND organization_id = $5 AND used_at IS NULL RETURNING *`,
    [email, role, body?.expires_at ?? null, id, user.organizationId],
  );
  if (!result.rowCount) return c.json({ error: "Not found or already used" }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete("/:id", requireAuth, requireAdmin, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const db = await createPool(c.env);
  await db.query(`DELETE FROM user_invitations WHERE id = $1 AND organization_id = $2`, [
    id,
    user.organizationId,
  ]);
  return c.json({ ok: true });
});

// Validate token (public - for onboarding flow)
app.get("/validate/:token", async (c) => {
  const token = c.req.param("token");
  const db = await createPool(c.env);
  const result = await db.query(
    `SELECT * FROM user_invitations WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [token],
  );
  if (!result.rowCount) return c.json({ error: "Token inválido ou expirado" }, 404);
  return c.json({ data: result.rows[0] });
});

// Mark invitation as used
app.post("/use/:token", async (c) => {
  const token = c.req.param("token");
  const db = await createPool(c.env);
  const result = await db.query(
    `UPDATE user_invitations SET used_at = NOW() WHERE token = $1 AND used_at IS NULL AND expires_at > NOW() RETURNING *`,
    [token],
  );
  if (!result.rowCount) return c.json({ error: "Token inválido ou expirado" }, 404);
  return c.json({ data: result.rows[0] });
});

export { app as invitationsRoutes };
