import { createPool } from "../lib/db";
import { Env } from "../types/env";

export interface RTMAlert {
  patientId: string;
  type: "pain_spike" | "compliance_drop" | "low_activity";
  severity: "low" | "medium" | "high";
  message: string;
  data: any;
}

/**
 * RTM Alerts Service — Proactive Clinical Monitoring
 */
export class RTMAlertsService {
  /**
   * Evaluates recent data for all active patients and triggers alerts
   */
  static async processDailyAlerts(env: Env, organizationId: string): Promise<number> {
    const db = createPool(env);
    let alertsTriggered = 0;

    // 1. Detect Pain Spikes (Pain > 7 in last 24h)
    const painSpikes = await db.query(
      `SELECT p.id as patient_id, p.full_name, s.value as pain_level
       FROM patients p
       JOIN wearable_data s ON s.patient_id = p.id
       WHERE p.organization_id = $1 
         AND s.data_type = 'pain_level' 
         AND s.value >= 7
         AND s.timestamp >= NOW() - INTERVAL '24 hours'
       ORDER BY s.timestamp DESC`,
      [organizationId],
    );

    for (const row of painSpikes.rows) {
      await this.triggerAlert(env, {
        patientId: row.patient_id,
        type: "pain_spike",
        severity: "high",
        message: `ALERTA: Paciente ${row.full_name} relatou dor nível ${row.pain_level} nas últimas 24h.`,
        data: { painLevel: row.pain_level },
      });
      alertsTriggered++;
    }

    // 2. Detect Activity Drop (> 40% drop vs previous week)
    const activityDrops = await db.query(
      `WITH weekly_avg AS (
         SELECT patient_id, 
                AVG(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN value ELSE NULL END) as current_week,
                AVG(CASE WHEN timestamp BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days' THEN value ELSE NULL END) as prev_week
         FROM wearable_data
         WHERE organization_id = $1 AND data_type = 'steps'
         GROUP BY patient_id
       )
       SELECT w.*, p.full_name
       FROM weekly_avg w
       JOIN patients p ON p.id = w.patient_id
       WHERE w.current_week < (w.prev_week * 0.6) -- 40% drop
         AND w.prev_week > 1000 -- Avoid false positives for inactive patients`,
      [organizationId],
    );

    for (const row of activityDrops.rows) {
      await this.triggerAlert(env, {
        patientId: row.patient_id,
        type: "compliance_drop",
        severity: "medium",
        message: `ATENÇÃO: Queda brusca de atividade para ${row.full_name} (-${Math.round((1 - row.current_week / row.prev_week) * 100)}%).`,
        data: { current: row.current_week, previous: row.prev_week },
      });
      alertsTriggered++;
    }

    // 3. AI Anomaly Detection (Predictive Clinical Guard)
    const activePatients = await db.query(
      `SELECT id, full_name FROM patients WHERE organization_id = $1 AND status = 'ativo'`,
      [organizationId],
    );

    for (const patient of activePatients.rows) {
      const recentData = await db.query(
        `SELECT data_type, value, timestamp FROM wearable_data 
         WHERE patient_id = $1 AND timestamp >= NOW() - INTERVAL '7 days'
         ORDER BY timestamp ASC`,
        [patient.id],
      );

      if (recentData.rows.length > 5) {
        try {
          const { runThinkingModel } = await import("../lib/ai-native");
          const prompt = `
            Você é um assistente de monitoramento remoto de pacientes (RTM).
            Analise os dados desta última semana do paciente ${patient.full_name}:
            ${JSON.stringify(recentData.rows)}

            Identifique se há alguma anomalia preocupante (ex: picos de FC em repouso, queda na qualidade do sono, ou inatividade total repentina).
            Responda APENAS um JSON: {"anomalyDetected": true/false, "severity": "low/medium/high", "reason": "..."}
          `.trim();

          const aiResponse = await runThinkingModel(env, {
            prompt,
            model: "gemini-1.5-flash",
            temperature: 0.1,
            responseFormat: "json",
          });

          const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
          const analysis = JSON.parse(jsonMatch?.[0] ?? aiResponse.content);

          if (analysis.anomalyDetected) {
            await this.triggerAlert(env, {
              patientId: patient.id,
              type: "low_activity", // Generico para anomalia
              severity: analysis.severity,
              message: `IA: ${analysis.reason}`,
              data: { ai_analysis: analysis },
            });
            alertsTriggered++;
          }
        } catch (e) {
          console.warn(`[RTM/AI] Failed to analyze patient ${patient.id}`, e);
        }
      }
    }

    return alertsTriggered;
  }

  private static async triggerAlert(env: Env, alert: RTMAlert) {
    // Save to DB for historical record
    const db = createPool(env);
    await db.query(
      `INSERT INTO clinical_alerts (patient_id, type, severity, message, data, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [alert.patientId, alert.type, alert.severity, alert.message, JSON.stringify(alert.data)],
    );

    // Note: Inngest trigger requires ExecutionContext — log for now, notifications handled by cron
    console.log(JSON.stringify({ event: "rtm_alert", ...alert }));
  }
}
