import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

type Bindings = {
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  OLLAMA_ENDPOINT: string;
  GOOGLE_AI_URL: string;
  GOOGLE_AI_KEY: string;
  NEON_AUTH_JWKS_URL: string;
  NEON_AUTH_ISSUER?: string;
  NEON_AUTH_AUDIENCE?: string;
};

type Variables = {
  user: {
    id: string;
    organizationId: string;
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * LGPD Log Redactor - Masks sensitive patient data (PII) in logs
 */
function redactPII(data: any): any {
  if (!data || typeof data !== "object") return data;
  
  const sensitiveKeys = ["patientId", "patientName", "fullName", "email", "phone", "cpf"];
  const redacted = { ...data };

  for (const key of sensitiveKeys) {
    if (redacted[key]) {
      redacted[key] = "[REDACTED]";
    }
  }

  return redacted;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

app.use("*", async (c, next) => {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  return cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? ""),
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })(c, next);
});

app.use("/v1/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Missing token" }, 401);
  }

  try {
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(c.env.NEON_AUTH_JWKS_URL));
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: c.env.NEON_AUTH_ISSUER,
      audience: c.env.NEON_AUTH_AUDIENCE,
    });

    const userId = (payload.sub as string) || (payload as any).userId;
    const orgId = (payload as any).orgId || (payload as any).organizationId;

    if (!userId || !orgId) {
      return c.json({ error: "Invalid token payload" }, 401);
    }

    c.set("user", { id: userId, organizationId: orgId });
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
});

app.get("/health", (c) => c.json({ status: "ok", environment: c.env.ENVIRONMENT }));

app.post("/v1/chat/completions", async (c) => {
  const body = await c.req.json();
  const model: string = body.model || "gemini-2.0-flash";
  const user = c.get("user");
  const start = Date.now();

  let targetUrl = "";
  let provider = "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (model.startsWith("ollama/") || model.startsWith("llama") || model.startsWith("mistral")) {
    provider = "ollama";
    targetUrl = `${c.env.OLLAMA_ENDPOINT}/api/chat`;
  } else {
    provider = "google";
    const modelName = model.replace("google/", "");
    targetUrl = `${c.env.GOOGLE_AI_URL}/${modelName}:generateContent?key=${c.env.GOOGLE_AI_KEY}`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const latencyMs = Date.now() - start;

    let promptTokens = 0;
    let completionTokens = 0;
    if (provider === "google" && (data as any).usageMetadata) {
      promptTokens = (data as any).usageMetadata.promptTokenCount ?? 0;
      completionTokens = (data as any).usageMetadata.candidatesTokenCount ?? 0;
    }

    console.log(JSON.stringify({
      event: "ai_usage",
      org: user.organizationId,
      user: user.id,
      model,
      provider,
      latencyMs,
      status: response.status,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    }));

    return c.json(data, response.status as any);
  } catch (error: any) {
    const user = c.get("user");
    console.error(JSON.stringify({
      event: "ai_error",
      org: user?.organizationId,
      user: user?.id,
      error: error.message
    }));
    return c.json({ error: "Failed to route AI request" }, 500);
  }
});

export default app;
