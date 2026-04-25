import type { Env } from "../types/env";

export interface AxiomLog {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  [key: string]: any;
}

/**
 * Envia logs para o Axiom em segundo plano (usando ctx.waitUntil).
 */
export async function logToAxiom(env: Env, ctx: ExecutionContext, data: AxiomLog) {
  const token = env.AXIOM_TOKEN;
  const orgId = env.AXIOM_ORG_ID;
  const dataset = env.AXIOM_DATASET || "fisioflow-logs";

  if (!token || !orgId) {
    // Se não houver token, apenas loga no console
    console.log(`[LocalLog] ${data.level.toUpperCase()}: ${data.message}`, data);
    return;
  }

  const axiomEndpoint = `https://api.axiom.co/v1/datasets/${dataset}/ingest`;

  // Adiciona metadados úteis
  const payload = [
    {
      _time: new Date().toISOString(),
      environment: env.ENVIRONMENT || "production",
      ...data,
    },
  ];

  // Executa em segundo plano para não travar a resposta para o usuário
  ctx.waitUntil(
    fetch(axiomEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Axiom-Org-ID": orgId,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("[Axiom Error] Falha ao enviar log:", err);
    }),
  );
}
