import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";
import {
  checkAudioTranscriptionBudget,
  deleteAudioTranscriptionBudget,
  getAudioTranscriptionMonthlyUsage,
  listAudioTranscriptionBudgets,
  upsertAudioTranscriptionBudget,
} from "../../lib/audioTranscriptionBudget";
import { isAgentMemoryConfigured } from "../../lib/agentMemory";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
app.use("*", async (c, next) => {
  const user = c.get("user");
  if (!["admin", "owner"].includes(String(user.role ?? ""))) {
    return c.json({ error: "admin_only" }, 403);
  }
  await next();
});

app.get("/status", async (c) => {
  const user = c.get("user");
  const [aiSearchStats, errorItems, budgets, usage, budgetCheck] = await Promise.all([
    getAiSearchStats(c.env),
    listAiSearchErrorItems(c.env, 25),
    listAudioTranscriptionBudgets(c.env, user.organizationId),
    getAudioTranscriptionMonthlyUsage(c.env, user.organizationId),
    checkAudioTranscriptionBudget(c.env, {
      organizationId: user.organizationId,
      professionalUserId: user.uid,
      requestedSeconds: 60,
    }),
  ]);

  return c.json({
    data: {
      aiSearch: {
        configured: Boolean(c.env.AI_SEARCH),
        stats: aiSearchStats,
        errorItems,
      },
      workflows: {
        wikiSync: Boolean(c.env.WORKFLOW_WIKI_SYNC),
        knowledgeSync: Boolean(c.env.WORKFLOW_KNOWLEDGE_SYNC),
      },
      agentMemory: {
        configured: isAgentMemoryConfigured(c.env),
        bindingPresent: Boolean(c.env.AGENT_MEMORY),
      },
      transcriptionBudget: {
        budgets,
        usage,
        currentUserCheck: budgetCheck,
      },
    },
  });
});

app.post("/workflows/:name/trigger", async (c) => {
  const name = c.req.param("name");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = `${name}-manual-${Date.now()}`;

  if (name === "wiki-sync") {
    if (!c.env.WORKFLOW_WIKI_SYNC) return c.json({ error: "wiki-sync not configured" }, 503);
    const instance = await c.env.WORKFLOW_WIKI_SYNC.create({
      id,
      params: { triggerType: "manual", ...body },
    });
    return c.json({ data: { id, instance } }, 202);
  }

  if (name === "knowledge-sync") {
    if (!c.env.WORKFLOW_KNOWLEDGE_SYNC) {
      return c.json({ error: "knowledge-sync not configured" }, 503);
    }
    const syncTarget =
      body.syncTarget === "protocols" || body.syncTarget === "exercises" ? body.syncTarget : "all";
    const instance = await c.env.WORKFLOW_KNOWLEDGE_SYNC.create({
      id,
      params: { triggerType: "manual", syncTarget },
    });
    return c.json({ data: { id, instance } }, 202);
  }

  return c.json({ error: "unknown_workflow" }, 404);
});

app.post("/ai-search/cleanup-errors", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const dryRun = body.dryRun !== false;
  const limit = clampInt(body.limit, 1, 500, 100);
  const items = await listAiSearchErrorItems(c.env, limit);
  if (!c.env.AI_SEARCH) return c.json({ error: "AI Search not configured" }, 503);

  const deleted: Array<{ id: string; filename?: string }> = [];
  const failed: Array<{ id: string; error: string }> = [];
  if (!dryRun) {
    for (const item of items.items) {
      try {
        await c.env.AI_SEARCH.items.delete(item.id);
        deleted.push({ id: item.id, filename: item.filename });
      } catch (error) {
        failed.push({ id: item.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return c.json({
    data: {
      dryRun,
      matched: items.items.length,
      deleted,
      failed,
      note:
        items.items.length === 0
          ? "Nenhum item com status de erro foi retornado pelo binding. O contador pode ser backlog interno do AI Search."
          : undefined,
    },
  });
});

app.post("/ai-search/reindex", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const cleanup = body.cleanupErrors !== false;
  let cleanupResult: unknown = null;

  if (cleanup) {
    const items = await listAiSearchErrorItems(c.env, 500);
    const deleted: string[] = [];
    if (c.env.AI_SEARCH) {
      for (const item of items.items) {
        await c.env.AI_SEARCH.items.delete(item.id).then(() => deleted.push(item.id)).catch(() => {});
      }
    }
    cleanupResult = { matched: items.items.length, deleted: deleted.length };
  }

  const workflows: Record<string, unknown> = {};
  if (c.env.WORKFLOW_WIKI_SYNC) {
    workflows.wiki = await c.env.WORKFLOW_WIKI_SYNC.create({
      id: `wiki-sync-manual-${Date.now()}`,
      params: { triggerType: "manual" },
    });
  }
  if (c.env.WORKFLOW_KNOWLEDGE_SYNC) {
    workflows.knowledge = await c.env.WORKFLOW_KNOWLEDGE_SYNC.create({
      id: `knowledge-sync-manual-${Date.now()}`,
      params: { triggerType: "manual", syncTarget: "all" },
    });
  }

  return c.json({ data: { cleanup: cleanupResult, workflows } }, 202);
});

app.get("/transcription-budget", async (c) => {
  const user = c.get("user");
  const [budgets, usage, check] = await Promise.all([
    listAudioTranscriptionBudgets(c.env, user.organizationId),
    getAudioTranscriptionMonthlyUsage(c.env, user.organizationId),
    checkAudioTranscriptionBudget(c.env, {
      organizationId: user.organizationId,
      professionalUserId: user.uid,
      requestedSeconds: Number(c.req.query("requestedSeconds") ?? 60),
    }),
  ]);
  return c.json({ data: { budgets, usage, check } });
});

app.put("/transcription-budget", async (c) => {
  const user = c.get("user");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const monthlyLimitMinutes = clampInt(body.monthlyLimitMinutes, 0, 100_000, 1200);
  const warnAtPercent = clampInt(body.warnAtPercent, 1, 100, 80);
  const row = await upsertAudioTranscriptionBudget(c.env, {
    organizationId: user.organizationId,
    professionalUserId: safeString(body.professionalUserId),
    monthlyLimitMinutes,
    warnAtPercent,
    hardStop: body.hardStop !== false,
  });
  return c.json({ data: row });
});

app.delete("/transcription-budget", async (c) => {
  const user = c.get("user");
  const deleted = await deleteAudioTranscriptionBudget(c.env, {
    organizationId: user.organizationId,
    professionalUserId: c.req.query("professionalUserId"),
  });
  return c.json({ data: { deleted } });
});

async function getAiSearchStats(env: Env): Promise<unknown> {
  if (typeof env.AI_SEARCH?.stats !== "function") return null;
  try {
    return await env.AI_SEARCH.stats();
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function listAiSearchErrorItems(
  env: Env,
  limit: number,
): Promise<{ items: Array<{ id: string; filename?: string; status?: string }> }> {
  if (!env.AI_SEARCH) return { items: [] };
  const statuses = ["error", "errored", "failed"];
  const byId = new Map<string, { id: string; filename?: string; status?: string }>();
  for (const status of statuses) {
    try {
      const page = await env.AI_SEARCH.items.list({ per_page: limit, status });
      const items = page.result ?? page.items ?? [];
      for (const item of items) {
        if (!item.id) continue;
        byId.set(item.id, {
          id: item.id,
          filename: item.filename ?? ("key" in item ? item.key : undefined),
          status: item.status,
        });
      }
    } catch {
      // Some beta versions only support unfiltered list.
    }
  }
  return { items: Array.from(byId.values()).slice(0, limit) };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function safeString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

export { app as cloudflareControlRoutes };
