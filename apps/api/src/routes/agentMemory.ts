import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";
import {
  buildAgentMemoryProfile,
  isAgentMemoryConfigured,
  recallAgentMemory,
  rememberAgentMemory,
} from "../lib/agentMemory";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/status", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json({
    configured: isAgentMemoryConfigured(c.env),
    profile: buildAgentMemoryProfile({ organizationId: user.organizationId }),
  });
});

app.post("/remember", requireAuth, async (c) => {
  const user = c.get("user");
  if (!canUseMemory(user.role)) {
    return c.json({ error: "Acesso restrito a profissionais da clinica" }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const content = String(body.content ?? "").trim();
  if (content.length < 8) return c.json({ error: "content muito curto" }, 400);

  const result = await rememberAgentMemory(c.env, {
    organizationId: user.organizationId,
    patientId: safeString(body.patientId),
    therapistId: safeString(body.therapistId),
    sessionId: safeString(body.sessionId),
    profileTypes: parseProfileTypes(body.profileTypes),
    content,
  });

  return c.json(result, result.configured ? 201 : 503);
});

app.post("/recall", requireAuth, async (c) => {
  const user = c.get("user");
  if (!canUseMemory(user.role)) {
    return c.json({ error: "Acesso restrito a profissionais da clinica" }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const query = String(body.query ?? "").trim();
  if (query.length < 3) return c.json({ error: "query muito curta" }, 400);

  const result = await recallAgentMemory(c.env, {
    organizationId: user.organizationId,
    patientId: safeString(body.patientId),
    therapistId: safeString(body.therapistId),
    query,
  });

  return c.json(result, result.configured ? 200 : 503);
});

function canUseMemory(role?: string | null): boolean {
  return ["admin", "owner", "fisioterapeuta", "professional"].includes(String(role ?? ""));
}

function safeString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function parseProfileTypes(
  value: unknown,
): Array<"organization" | "patient" | "professional"> | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set(["organization", "patient", "professional"]);
  const types = value.filter(
    (item): item is "organization" | "patient" | "professional" =>
      typeof item === "string" && allowed.has(item),
  );
  return types.length ? types : undefined;
}

export { app as agentMemoryRoutes };
