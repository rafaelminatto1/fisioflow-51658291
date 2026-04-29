import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { writeEvent } from "../../lib/analytics";
import { summarizeQueueTask, type QueueTask } from "../../queue";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.json({ error: "Acesso restrito a administradores" }, 403);
  }

  writeEvent(c.env, {
    event: "dlq_list_viewed",
    orgId: user.organizationId,
    route: "/api/admin/dlq",
    method: c.req.method,
    status: 200,
  });

  return c.json({
    message:
      "Cloudflare Queues DLQ is managed via the Cloudflare dashboard and API. " +
      "Use 'wrangler queues list' and 'wrangler queues consumer list' to inspect DLQ state. " +
      "This endpoint provides replay orchestration via POST /api/admin/dlq/replay.",
    dlqQueues: ["fisioflow-tasks-dlq", "fisioflow-tasks-dlq-staging"],
  });
});

app.post("/replay", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.role !== "admin") {
    return c.json({ error: "Acesso restrito a administradores" }, 403);
  }

  const body = (await c.req.json().catch(() => ({}))) as { task?: QueueTask };
  if (!body.task || !body.task.type || !body.task.payload) {
    return c.json({ error: "Campo 'task' com type e payload é obrigatório" }, 400);
  }

  const summary = summarizeQueueTask(body.task);

  if (!summary.replayable) {
    writeEvent(c.env, {
      event: "dlq_replay_rejected",
      orgId: user.organizationId,
      route: "/api/admin/dlq/replay",
      method: c.req.method,
      status: 422,
    });
    return c.json(
      { error: `Task type ${body.task.type} is not replayable`, summary },
      422,
    );
  }

  try {
    await c.env.BACKGROUND_QUEUE.send({
      ...body.task,
      payload: {
        ...body.task.payload,
        _replay: {
          replayedAt: new Date().toISOString(),
          replayedBy: user.uid,
          idempotencyKey: summary.idempotencyKey,
        },
      },
    });

    writeEvent(c.env, {
      event: "dlq_replay_queued",
      orgId: user.organizationId,
      route: "/api/admin/dlq/replay",
      method: c.req.method,
      status: 200,
      value: 1,
    });

    return c.json({
      success: true,
      message: "Task re-enqueued for replay",
      summary,
    });
  } catch (err: any) {
    writeEvent(c.env, {
      event: "dlq_replay_failed",
      orgId: user.organizationId,
      route: "/api/admin/dlq/replay",
      method: c.req.method,
      status: 500,
    });

    return c.json({ error: `Failed to re-enqueue: ${err.message}` }, 500);
  }
});

export { app as dlqReplayRoutes };
