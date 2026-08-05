import { Hono } from "hono";
import type { Env } from "../types/env";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);

// O device token é sempre gravado para o usuário autenticado e a org do token.
// userId/tenantId vindos do body são ignorados — aceitá-los permitiria registrar
// um token em nome de outro usuário ou de outra organização.
app.post("/", async (c) => {
  const user = c.get("user");
  const db = await createPool(c.env);
  try {
    const body = await c.req.json();
    const { token, deviceInfo, active = true } = body;
    const platform = deviceInfo?.platform;
    const deviceModel = deviceInfo?.model;
    const osVersion = deviceInfo?.osVersion;
    const appVersion = deviceInfo?.appVersion;

    if (!token) {
      return c.json({ error: "token é obrigatório" }, 400);
    }

    const result = await db.query(
      `INSERT INTO fcm_tokens (token, user_id, tenant_id, platform, device_model, os_version, app_version, active, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (token) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       tenant_id = EXCLUDED.tenant_id,
       platform = EXCLUDED.platform,
       device_model = EXCLUDED.device_model,
       os_version = EXCLUDED.os_version,
       app_version = EXCLUDED.app_version,
       active = EXCLUDED.active,
       updated_at = NOW() RETURNING *`,
      [
        token,
        user.uid,
        user.organizationId,
        platform,
        deviceModel,
        osVersion,
        appVersion,
        active,
      ],
    );

    return c.json({ success: true, data: result.rows?.[0] || (result as any)[0] });
  } catch (error: any) {
    console.error("[FCMTokens/Post] Error:", error.message);
    return c.json({ error: "Erro ao salvar token", details: error.message }, 500);
  }
});

app.delete("/:token", async (c) => {
  const user = c.get("user");
  const db = await createPool(c.env);
  const { token } = c.req.param();
  try {
    const result = await db.query(
      `UPDATE fcm_tokens SET active = false, updated_at = NOW()
        WHERE token = $1 AND user_id = $2 RETURNING *`,
      [token, user.uid],
    );
    const row = result.rows?.[0] || (result as any)[0];
    if (!row) {
      return c.json({ error: "Token não encontrado" }, 404);
    }
    return c.json({ success: true, data: row });
  } catch (error: any) {
    console.error("[FCMTokens/Delete] Error:", error.message);
    return c.json({ error: "Erro ao desativar token", details: error.message }, 500);
  }
});

app.get("/user/:userId", async (c) => {
  const user = c.get("user");
  const db = await createPool(c.env);
  const { userId } = c.req.param();
  try {
    const result = await db.query(
      `SELECT token FROM fcm_tokens
        WHERE user_id = $1 AND tenant_id = $2 AND active = true`,
      [userId, user.organizationId],
    );
    const rows = result.rows || (result as any);
    return c.json({ data: rows.map((r: any) => r.token) });
  } catch (error: any) {
    return c.json({ error: "Erro ao buscar tokens do usuário", details: error.message }, 500);
  }
});

// Sempre a org do usuário autenticado — o :tenantId da URL é ignorado de propósito.
app.get("/tenant/:tenantId", async (c) => {
  const user = c.get("user");
  const db = await createPool(c.env);
  try {
    const result = await db.query(
      `SELECT token FROM fcm_tokens WHERE tenant_id = $1 AND active = true`,
      [user.organizationId],
    );
    const rows = result.rows || (result as any);
    return c.json({ data: rows.map((r: any) => r.token) });
  } catch (error: any) {
    return c.json({ error: "Erro ao buscar tokens do tenant", details: error.message }, 500);
  }
});

export { app as fcmTokensRoutes };
