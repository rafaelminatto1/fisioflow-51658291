import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { aiUsage } from "@fisioflow/db";
import { createRemoteJWKSet, jwtVerify } from "jose";

type Bindings = {
  ENVIRONMENT: string;
  OLLAMA_ENDPOINT: string;
  GOOGLE_AI_URL: string;
  GOOGLE_AI_KEY: string;
  HYPERDRIVE: Hyperdrive;
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

// Cache para JWKS
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

// Middleware de CORS
app.use("*", cors({
  origin: (origin) => origin,
  allowMethods: ["POST", "GET", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
}));

// Middleware de Autenticação Simplificado (Sem DB lookup para performance)
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
  } catch (e) {
    console.error("Auth validation failed:", e);
    return c.json({ error: "Unauthorized" }, 401);
  }
});

// Rota de Health Check
app.get("/health", (c) => c.json({ status: "ok", environment: c.env.ENVIRONMENT }));

// Proxy de IA Inteligente
app.post("/v1/chat/completions", async (c) => {
  const body = await c.req.json();
  const model = body.model || "gemini-1.5-flash";
  const user = c.get("user");
  const start = Date.now();
  
  // Roteamento de Provedor
  let targetUrl = "";
  let provider = "";
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (model.includes("ollama") || model.includes("llama") || model.includes("mistral")) {
    provider = "ollama";
    targetUrl = `${c.env.OLLAMA_ENDPOINT}/api/chat`;
  } else {
    provider = "google";
    targetUrl = `${c.env.GOOGLE_AI_URL}/${model}:generateContent?key=${c.env.GOOGLE_AI_KEY}`;
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const latency = Date.now() - start;

    // Extração de tokens da resposta (Simplificada)
    let promptTokens = 0;
    let completionTokens = 0;

    if (provider === "google" && data.usageMetadata) {
      promptTokens = data.usageMetadata.promptTokenCount || 0;
      completionTokens = data.usageMetadata.candidatesTokenCount || 0;
    }

    // Log Assíncrono
    c.executionCtx.waitUntil(
      logAiUsage(c.env.HYPERDRIVE.connectionString, {
        organizationId: user.organizationId,
        userId: user.id,
        model,
        provider,
        latencyMs: latency,
        status: response.status,
        promptTokens, 
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      })
    );

    return c.json(data, response.status as any);
  } catch (error: any) {
    console.error("AI Gateway Error:", error);
    return c.json({ error: "Failed to route AI request", details: error.message }, 500);
  }
});

async function logAiUsage(connectionString: string, data: any) {
  try {
    const sql = postgres(connectionString);
    const db = drizzle(sql);
    await db.insert(aiUsage).values({
      organizationId: data.organizationId,
      userId: data.userId,
      model: data.model,
      provider: data.provider,
      latencyMs: data.latencyMs,
      status: data.status,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
    });
    await sql.end();
  } catch (e) {
    console.error("Failed to log AI usage to DB:", e);
  }
}

export default app;
