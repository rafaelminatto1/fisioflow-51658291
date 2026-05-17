import type { Env } from "../types/env";

export interface AxiomLog {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  [key: string]: any;
}

export function redactPII(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(redactPII);

  const sensitiveKeys = ["cpf", "phone", "email", "patientName", "fullName", "patientId", "name", "password"];
  const redacted = { ...data };

  for (const key in redacted) {
    if (sensitiveKeys.includes(key) && redacted[key]) {
      redacted[key] = "[REDACTED]";
    } else if (typeof redacted[key] === "object") {
      redacted[key] = redactPII(redacted[key]);
    }
  }
  return redacted;
}

/**
 * Envia logs para o Axiom em segundo plano (usando ctx.waitUntil).
 */
export async function logToAxiom(env: Env, ctx: ExecutionContext, data: AxiomLog) {
  const token = env.AXIOM_TOKEN;
  const orgId = env.AXIOM_ORG_ID;
  const dataset = env.AXIOM_DATASET || "fisioflow-logs";

  const redactedData = redactPII(data);

  if (!token || !orgId) {
    // Se não houver token, apenas loga no console
    console.log(`[LocalLog] ${redactedData.level.toUpperCase()}: ${redactedData.message}`, redactedData);
    return;
  }

  const axiomEndpoint = `https://api.axiom.co/v1/datasets/${dataset}/ingest`;

  // Adiciona metadados úteis
  const payload = [
    {
      _time: new Date().toISOString(),
      environment: env.ENVIRONMENT || "production",
      ...redactedData,
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
