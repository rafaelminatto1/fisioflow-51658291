import { createPool } from "../db";
import { broadcastToOrg } from "../realtime";
import type { Env } from "../../types/env";

/**
 * Triggers a financial notification when a patient reaches a session milestone (e.g., 10th session).
 */
export async function triggerFiscalCycleNotification(
  env: Env,
  orgId: string,
  patientId: string,
  patientName: string,
  sessionCount: number,
) {
  const db = await createPool(env);

  try {
    // 1. Find all admins in the organization
    const adminsRes = await db.query<{ user_id: string }>(
      `SELECT user_id FROM profiles WHERE organization_id = $1 AND role = 'admin'`,
      [orgId],
    );

    const admins = adminsRes.rows;
    if (admins.length === 0) return;

    const title = "🔔 Marco de 10 Sessões Atingido";
    const message = `O paciente ${patientName} completou ${sessionCount} sessões. Deseja emitir a NFS-e agora ou adicionar como tarefa pendente?`;
    const link = `/financial/nfse?patientId=${patientId}`;
    const metadata = {
      patientId,
      sessionCount,
      type: "FISCAL_MILESTONE",
      actions: [
        { label: "Emitir NF", url: `/api/nfse/generate?patientId=${patientId}` },
        {
          label: "Criar Tarefa",
          url: `/api/tasks`,
          method: "POST",
          body: {
            titulo: `Emitir NF: ${patientName} (${sessionCount} sessões)`,
            patient_id: patientId,
          },
        },
      ],
    };

    // 2. Insert notifications for all admins
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
         VALUES ($1, $2, 'fiscal_trigger', $3, $4, $5, $6::jsonb)`,
        [orgId, admin.user_id, title, message, link, JSON.stringify(metadata)],
      );

      // 3. Broadcast real-time
      await broadcastToOrg(env, orgId, {
        type: "NOTIFICATION_RECEIVED",
        payload: {
          userId: admin.user_id,
          title,
          message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    console.log(
      `[FiscalTrigger] Notification sent to ${admins.length} admins for patient ${patientId}`,
    );
  } catch (error) {
    console.error("[FiscalTrigger] Error triggering notification:", error);
  }
}
