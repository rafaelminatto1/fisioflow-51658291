import { createMiddleware } from "hono/factory";
import type { Env } from "../types/env";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Middleware Cloudflare Turnstile — proteção anti-bot para rotas públicas.
 *
 * Verifica o token `cf-turnstile-response` no body ou header da requisição.
 * Se TURNSTILE_SECRET_KEY não estiver configurado, passa sem verificar (dev local).
 *
 * Uso:
 *   app.post('/public-booking', turnstileVerify, async (c) => { ... })
 *
 * Frontend deve incluir o widget Turnstile e enviar o token:
 *   - Via body JSON: { "cf-turnstile-response": "TOKEN" }
 *   - Via header:    CF-Turnstile-Response: TOKEN
 */
export const turnstileVerify = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const secretKey = c.env.TURNSTILE_SECRET_KEY;

  // Dev local / staging sem secret configurado: bypass
  if (!secretKey) {
    return next();
  }

  // Extrai token do header ou body
  let token = c.req.header("CF-Turnstile-Response");

  if (!token) {
    // Tenta ler do body sem consumir o stream (clone)
    try {
      const cloned = c.req.raw.clone();
      const contentType = c.req.header("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const body = (await cloned.json()) as Record<string, unknown>;
        token = body["cf-turnstile-response"] as string | undefined;
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await cloned.formData();
        token = form.get("cf-turnstile-response") as string | undefined;
      }
    } catch {
      // Corpo vazio ou inválido — token não encontrado
    }
  }

  if (!token) {
    return c.json({ error: "Token Turnstile obrigatório" }, 400);
  }

  // Verifica com API Cloudflare
  const ip = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For") ?? "";

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  let success = false;
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    success = data.success === true;

    if (!success) {
      console.warn("[Turnstile] Verification failed:", data["error-codes"]);
    }
  } catch (err) {
    console.error("[Turnstile] API error:", err);
    // Fail open — se a API da Cloudflare falhar, não bloqueia usuário legítimo
    return next();
  }

  if (!success) {
    return c.json({ error: "Verificação anti-bot falhou. Tente novamente." }, 403);
  }

  return next();
});

/**
 * Verificação manual do token Turnstile (para usar em handlers sem middleware).
 * Retorna true se válido.
 */
export async function verifyTurnstileToken(
  secretKey: string,
  token: string,
  ip?: string,
): Promise<boolean> {
  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: formData });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return true; // Fail open
  }
}
