import type { Env } from "../types/env";

const DEFAULT_HEALTH_URL = "https://api-pro.moocafisio.com.br/api/health";
const RENOTIFY_INTERVAL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

async function notify(topic: string, title: string, body: string, priority: "urgent" | "high" | "default") {
  const tags =
    priority === "urgent" ? "rotating_light,warning" :
    priority === "high"   ? "warning" :
                            "white_check_mark";
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: {
        Title: title,
        Priority: priority,
        Tags: tags,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body,
    });
  } catch (err) {
    console.error("[Monitor] ntfy.sh notification failed:", err);
  }
}

function brTime(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function pingUrl(url: string): Promise<{ healthy: boolean; status: number; latencyMs: number }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const t0 = Date.now();
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return { healthy: res.status === 200, status: res.status, latencyMs: Date.now() - t0 };
  } catch {
    return { healthy: false, status: 0, latencyMs: 0 };
  }
}

export async function runHealthMonitor(env: Env): Promise<void> {
  const kv = env.FISIOFLOW_CONFIG!;
  const topic = env.MONITOR_NTFY_TOPIC ?? "fisioflow-monitor";
  const apiUrl = env.MONITOR_HEALTH_URL ?? DEFAULT_HEALTH_URL;

  // --- Verificar API principal ---
  const { healthy: isHealthy, status: statusCode, latencyMs } = await pingUrl(apiUrl);

  const [lastStatus, downSince, lastNotifyStr] = await Promise.all([
    kv.get("monitor:status"),
    kv.get("monitor:down_since"),
    kv.get("monitor:last_notify_at"),
  ]);

  const now = Date.now();
  const lastNotifyAt = lastNotifyStr ? parseInt(lastNotifyStr, 10) : 0;
  const wasOk = !lastStatus || lastStatus === "ok";

  if (!isHealthy) {
    if (wasOk) {
      await Promise.all([
        kv.put("monitor:status", "down"),
        kv.put("monitor:down_since", new Date().toISOString()),
        kv.put("monitor:last_notify_at", String(now)),
      ]);
      await notify(
        topic,
        "🚨 FisioFlow API FORA DO AR",
        `Status: ${statusCode || "timeout (>8s)"}\nURL: ${apiUrl}\nHora: ${brTime()}`,
        "urgent",
      );
      console.error(`[Monitor] API DOWN — status=${statusCode}`);
    } else if (now - lastNotifyAt > RENOTIFY_INTERVAL_MS) {
      await kv.put("monitor:last_notify_at", String(now));
      await notify(
        topic,
        "⚠️ FisioFlow API AINDA FORA",
        `Fora desde: ${brTime(downSince)}\nStatus: ${statusCode || "timeout"}\nURL: ${apiUrl}`,
        "high",
      );
      console.warn(`[Monitor] API still down since ${downSince}`);
    }
  } else {
    if (!wasOk) {
      await Promise.all([
        kv.put("monitor:status", "ok"),
        kv.delete("monitor:down_since"),
        kv.put("monitor:last_notify_at", String(now)),
      ]);
      await notify(
        topic,
        "✅ FisioFlow API Recuperada",
        `API voltou ao ar\nLatência: ${latencyMs}ms\nFora desde: ${brTime(downSince)}`,
        "default",
      );
      console.log(`[Monitor] API recovered — latency=${latencyMs}ms`);
    }
  }

  // --- Verificar AI Gateway (sem state tracking, alerta simples) ---
  const aiGatewayUrl = (env as any).MONITOR_AI_GATEWAY_URL as string | undefined;
  if (aiGatewayUrl) {
    const { healthy: gwHealthy, status: gwStatus } = await pingUrl(aiGatewayUrl);
    if (!gwHealthy) {
      const lastGwNotifyStr = await kv.get("monitor:ai_gateway_last_notify");
      const lastGwNotify = lastGwNotifyStr ? parseInt(lastGwNotifyStr, 10) : 0;
      if (now - lastGwNotify > RENOTIFY_INTERVAL_MS) {
        await kv.put("monitor:ai_gateway_last_notify", String(now));
        await notify(
          topic,
          "⚠️ FisioFlow AI Gateway FORA",
          `Status: ${gwStatus || "timeout"}\nURL: ${aiGatewayUrl}\nHora: ${brTime()}`,
          "high",
        );
        console.warn(`[Monitor] AI Gateway down — status=${gwStatus}`);
      }
    } else {
      await kv.delete("monitor:ai_gateway_last_notify");
    }
  }
}
