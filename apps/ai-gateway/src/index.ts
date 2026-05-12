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
  ANALYTICS?: AnalyticsEngineDataset;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
};

type Variables = {
  user: {
    id: string;
    organizationId: string;
  };
};

// Cost per 1M tokens (USD). Updated May 2026 — adjust if pricing changes.
const MODEL_COST: Record<string, { input: number; output: number }> = {
  "gemini-2.0-flash":         { input: 0.075,  output: 0.30  },
  "gemini-2.0-flash-lite":    { input: 0.0375, output: 0.15  },
  "gemini-1.5-flash":         { input: 0.075,  output: 0.30  },
  "gemini-1.5-flash-8b":      { input: 0.0375, output: 0.15  },
  "gemini-1.5-pro":           { input: 1.25,   output: 5.00  },
  "gemini-2.5-pro":           { input: 1.25,   output: 10.00 },
  "gemini-2.5-flash":         { input: 0.15,   output: 0.60  },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const key = Object.keys(MODEL_COST).find((k) => model.includes(k)) ?? "";
  const pricing = MODEL_COST[key];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

function redactPII(data: any): any {
  if (!data || typeof data !== "object") return data;
  const sensitiveKeys = ["patientId", "patientName", "fullName", "email", "phone", "cpf"];
  const redacted = { ...data };
  for (const key of sensitiveKeys) {
    if (redacted[key]) redacted[key] = "[REDACTED]";
  }
  return redacted;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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

  if (!token) return c.json({ error: "Missing token" }, 401);

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
    if (!userId || !orgId) return c.json({ error: "Invalid token payload" }, 401);

    c.set("user", { id: userId, organizationId: orgId });
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
});

app.get("/health", (c) =>
  c.json({ status: "ok", environment: c.env.ENVIRONMENT }),
);

app.post("/v1/chat/completions", async (c) => {
  const body = await c.req.json();
  const rawModel: string = body.model || "gemini-2.0-flash";
  const user = c.get("user");
  const start = Date.now();

  let targetUrl = "";
  let provider = "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (rawModel.startsWith("ollama/") || rawModel.startsWith("llama") || rawModel.startsWith("mistral")) {
    provider = "ollama";
    targetUrl = `${c.env.OLLAMA_ENDPOINT}/api/chat`;
  } else {
    provider = "google";
    const modelName = rawModel.replace("google/", "");
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
    } else if ((data as any).usage) {
      promptTokens = (data as any).usage.prompt_tokens ?? 0;
      completionTokens = (data as any).usage.completion_tokens ?? 0;
    }

    const totalTokens = promptTokens + completionTokens;
    const estimatedCostUSD = estimateCost(rawModel, promptTokens, completionTokens);

    // Write usage event to Analytics Engine (non-blocking)
    if (c.env.ANALYTICS) {
      c.env.ANALYTICS.writeDataPoint({
        blobs: [user.organizationId, user.id, rawModel, provider, String(response.status)],
        doubles: [latencyMs, promptTokens, completionTokens, totalTokens, estimatedCostUSD],
        indexes: [user.organizationId],
      });
    }

    console.log(JSON.stringify(redactPII({
      event: "ai_usage",
      org: user.organizationId,
      model: rawModel,
      provider,
      latencyMs,
      status: response.status,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUSD: estimatedCostUSD.toFixed(6),
    })));

    return c.json(data, response.status as any);
  } catch (error: any) {
    console.error(JSON.stringify({
      event: "ai_error",
      org: user?.organizationId,
      error: error.message,
    }));
    return c.json({ error: "Failed to route AI request" }, 500);
  }
});

// GET /v1/usage?days=7 — query cost summary per org via Analytics Engine SQL API
app.get("/v1/usage", async (c) => {
  const user = c.get("user");
  const days = Math.min(30, Math.max(1, parseInt(c.req.query("days") ?? "7")));

  const accountId = c.env.CF_ACCOUNT_ID;
  const apiToken = c.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    return c.json({ error: "Analytics query not configured" }, 503);
  }

  // Analytics Engine SQL API — reads from fisioflow_ai_usage dataset
  // blob1=orgId, blob3=model, blob4=provider, double1=latencyMs,
  // double2=promptTokens, double3=completionTokens, double5=estimatedCostUSD
  const sql = `
    SELECT
      blob3 AS model,
      SUM(double2) AS input_tokens,
      SUM(double3) AS output_tokens,
      SUM(double4) AS total_tokens,
      SUM(double5) AS estimated_cost_usd,
      COUNT() AS requests
    FROM fisioflow_ai_usage
    WHERE timestamp > NOW() - INTERVAL '${days}' DAY
      AND blob1 = '${user.organizationId}'
    GROUP BY blob3
    ORDER BY estimated_cost_usd DESC
  `.trim();

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "text/plain" },
        body: sql,
      },
    );
    const json = await res.json() as any;
    if (!res.ok) return c.json({ error: "Analytics query failed", detail: json }, 500);

    const rows: any[] = json.data ?? [];
    const totalCost = rows.reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0);
    const totalTokens = rows.reduce((s, r) => s + Number(r.total_tokens ?? 0), 0);

    return c.json({
      organizationId: user.organizationId,
      periodDays: days,
      summary: { totalCostUSD: totalCost, totalTokens },
      byModel: rows.map((r) => ({
        model: r.model,
        requests: Number(r.requests),
        inputTokens: Number(r.input_tokens),
        outputTokens: Number(r.output_tokens),
        totalTokens: Number(r.total_tokens),
        estimatedCostUSD: Number(r.estimated_cost_usd),
      })),
    });
  } catch (err: any) {
    return c.json({ error: "Failed to query analytics", detail: err.message }, 500);
  }
});

export default app;
