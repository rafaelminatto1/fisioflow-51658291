import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth, requireRole } from "../../lib/auth";
import { writeEvent } from "../../lib/analytics";
import { summarizeQueueTask, type QueueTask } from "../../queue";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
app.use("*", requireRole("admin"));

app.get("/", async (c) => {
  const user = c.get("user");

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

const replaySchema = z.object({
  task: z
    .object({
      type: z.string().min(1),
      payload: z.record(z.string(), z.unknown()),
    })
    .required(),
});

app.post("/replay", zValidator("json", replaySchema), async (c) => {
  const user = c.get("user");
  const { task } = c.req.valid("json") as { task: QueueTask };

  const summary = summarizeQueueTask(task);

  if (!summary.replayable) {
    writeEvent(c.env, {
      event: "dlq_replay_rejected",
      orgId: user.organizationId,
      route: "/api/admin/dlq/replay",
      method: c.req.method,
      status: 422,
    });
    return c.json({ error: `Task type ${task.type} is not replayable`, summary }, 422);
  }

  try {
    await c.env.BACKGROUND_QUEUE.send({
      type: task.type,
      payload: {
        ...task.payload,
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
