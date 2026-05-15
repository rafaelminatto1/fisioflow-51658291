import type { Env } from "../../types/env";
import { broadcastToOrg } from "../realtime";

/**
 * Dispara notificação de renovação de pacote quando o paciente atinge a penúltima sessão.
 * Objetivo: Estabilizar o ciclo financeiro e garantir retenção.
 */
export async function triggerPackageRenewalNotification(
  env: Env,
  organizationId: string,
  patientId: string,
  patientName: string,
  remainingSessions: number,
  packageName: string,
) {
  console.log(
    `[RenewalGate] Triggering notification for ${patientName} (${remainingSessions} sessions left)`,
  );

  const message =
    remainingSessions === 1
      ? `Atenção: O paciente ${patientName} tem apenas 1 sessão restante no pacote "${packageName}". Sugerimos abordar a renovação hoje.`
      : `Lembrete: O pacote "${packageName}" de ${patientName} está chegando ao fim (${remainingSessions} sessões restantes).`;

  // 1. Notificação em Tempo Real para os Admins/Fisioterapeutas online
  await broadcastToOrg(env, organizationId, {
    type: "PACKAGE_RENEWAL_ALERT",
    payload: {
      patientId,
      patientName,
      packageName,
      remainingSessions,
      message,
      severity: remainingSessions === 1 ? "high" : "medium",
    },
  }).catch((err) => console.error("[RenewalGate] WebSocket broadcast failed:", err));

  // 2. Log de Analytics para acompanhamento de métricas de conversão
  if (env.ANALYTICS) {
    env.ANALYTICS.writeDataPoint({
      blobs: ["/financial/renewal-gate", "NOTIFICATION", organizationId, patientId],
      doubles: [remainingSessions, 200, 0],
      indexes: [organizationId],
    });
  }
}
