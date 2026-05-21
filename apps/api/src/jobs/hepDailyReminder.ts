import type { Env } from "../types/env";
import { sendPushToUser } from "../lib/webpush";

interface ReminderResult {
  candidates: number;
  pushed: number;
  failed: number;
}

export async function sendHepDailyReminders(env: Env, pool: any): Promise<ReminderResult> {
  const result: ReminderResult = { candidates: 0, pushed: 0, failed: 0 };

  const rows = await pool.query(
    `SELECT DISTINCT p.id AS patient_id, p.user_id, p.full_name
       FROM patients p
       JOIN exercise_plans ep ON ep.patient_id = p.id
      WHERE p.is_active = true
        AND p.user_id IS NOT NULL
        AND ep.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM exercise_sessions es
           WHERE es.patient_id = p.id
             AND es.completed = true
             AND es.created_at >= (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')
        )
        AND EXISTS (
          SELECT 1 FROM push_subscriptions ps
           WHERE ps.user_id = p.user_id::text AND ps.active = true
        )`,
  );

  result.candidates = rows.rows.length;

  for (const row of rows.rows) {
    try {
      const firstName = String(row.full_name || "").split(" ")[0] || "Olá";
      await sendPushToUser(
        String(row.user_id),
        {
          title: "Hora dos seus exercícios 💪",
          body: `${firstName}, mantenha sua sequência hoje! Abra o app para ver os exercícios.`,
          data: { type: "hep-reminder", patientId: row.patient_id },
          tag: "hep-reminder",
        },
        env,
      );
      result.pushed++;
    } catch (err) {
      console.error("[hepDailyReminder] push failed:", row.patient_id, err);
      result.failed++;
    }
  }

  return result;
}
