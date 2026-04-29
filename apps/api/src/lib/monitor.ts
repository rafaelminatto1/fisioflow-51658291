import type { Env } from "../types/env";

const DEFAULT_HEALTH_URL = "https://api-pro.moocafisio.com.br/api/health/ready";
const RENOTIFY_INTERVAL_MS = 30 * 60 * 1000; // re-alerta a cada 30min se ainda estiver down
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

export async function runHealthMonitor(env: Env): Promise<void> {
  const kv = env.FISIOFLOW_CONFIG!;
  const topic = env.MONITOR_NTFY_TOPIC ?? "fisioflow-monitor";
  const url = env.MONITOR_HEALTH_URL ?? DEFAULT_HEALTH_URL;

  // --- 1. Verificar saúde ---
  let isHealthy = false;
  let statusCode = 0;
  let latencyMs = 0;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const t0 = Date.now();
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    latencyMs = Date.now() - t0;
    statusCode = res.status;
    isHealthy = res.status === 200;
  } catch {
    isHealthy = false;
  }

  // --- 2. Ler estado anterior do KV ---
  const [lastStatus, downSince, lastNotifyStr] = await Promise.all([
    kv.get("monitor:status"),
    kv.get("monitor:down_since"),
    kv.get("monitor:last_notify_at"),
  ]);

  const now = Date.now();
  const lastNotifyAt = lastNotifyStr ? parseInt(lastNotifyStr, 10) : 0;
  const wasOk = !lastStatus || lastStatus === "ok";

  // --- 3. Reagir à mudança de estado ---
  if (!isHealthy) {
    if (wasOk) {
      // Transição ok → down: primeiro alerta
      await Promise.all([
        kv.put("monitor:status", "down"),
        kv.put("monitor:down_since", new Date().toISOString()),
        kv.put("monitor:last_notify_at", String(now)),
      ]);
      await notify(
        topic,
        "🚨 FisioFlow API FORA DO AR",
        `Status: ${statusCode || "timeout (>8s)"}\nURL: ${url}\nHora: ${brTime()}`,
        "urgent",
      );
      console.error(`[Monitor] API DOWN — status=${statusCode}`);
    } else if (now - lastNotifyAt > RENOTIFY_INTERVAL_MS) {
      // Ainda down — re-notifica a cada 30min para não esquecermos
      await kv.put("monitor:last_notify_at", String(now));
      await notify(
        topic,
        "⚠️ FisioFlow API AINDA FORA",
        `Fora desde: ${brTime(downSince)}\nStatus: ${statusCode || "timeout"}\nURL: ${url}`,
        "high",
      );
      console.warn(`[Monitor] API still down since ${downSince}`);
    }
  } else {
    if (!wasOk) {
      // Transição down → ok: alerta de recuperação
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
    // Se já estava ok: silencioso — sem log de spam
  }
}
