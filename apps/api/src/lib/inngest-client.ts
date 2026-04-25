import type { Env } from "../types/env";

export async function triggerInngestEvent(
  env: Env,
  ctx: ExecutionContext,
  eventName: string,
  data: Record<string, any>,
  user?: { id?: string; email?: string },
) {
  if (!env.BACKGROUND_QUEUE) {
    console.warn("[Queue] BACKGROUND_QUEUE not bound. Skipping event:", eventName);
    return;
  }

  const payload = {
    type: eventName,
    data,
    user: user || {},
    timestamp: Date.now(),
  };

  ctx.waitUntil(
    env.BACKGROUND_QUEUE.send(payload).catch((err: Error) => {
      console.error("[Queue] Failed to send event:", eventName, err);
    }),
  );
}
