import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { getRawSql, createDb } from "../lib/db";
import { sessions, patients, patientLongitudinalSummary } from "@fisioflow/db";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Workflow: Patient Digital Twin Analysis
 * Analisa o comportamento longitudinal do paciente e gera predições.
 */
export class PatientDigitalTwinWorkflow extends WorkflowEntrypoint<Env, { patientId: string }> {
  async run(event: WorkflowEvent<{ patientId: string }>, step: WorkflowStep) {
    const { patientId } = event.payload;
    const organizationId = await this.getOrganizationId(patientId);

    if (!organizationId) return;

    // Passo 1: Analisar Aderência (Frequência vs Agendado)
    const adherence = await step.do("calculate-adherence", async () => {
      const db = getRawSql(this.env, "read");
      const stats = await db`
				SELECT
					COUNT(*) as total,
					COUNT(*) FILTER (WHERE status = 'atendido') as attended,
					COUNT(*) FILTER (WHERE status = 'falta') as no_show
				FROM appointments
				WHERE patient_id = ${patientId}::uuid
				AND date > NOW() - INTERVAL '90 days'
			`;

      const row = stats.rows[0];
      const total = Number(row.total || 0);
      if (total === 0) return 100;

      return (Number(row.attended || 0) / total) * 100;
    });

    // Passo 2: Analisar Tendência de Dor (Longitudinal)
    const painTrend = await step.do("analyze-pain-trend", async () => {
      const db = getRawSql(this.env, "read");
      const history = await db`
				SELECT pain_level_before as pain
				FROM patient_session_metrics
				WHERE patient_id = ${patientId}::uuid
				ORDER BY session_date DESC
				LIMIT 10
			`;

      if (history.rows.length < 2) return "stable";

      const latest = Number(history.rows[0].pain);
      const oldest = Number(history.rows[history.rows.length - 1].pain);

      if (latest < oldest) return "improving";
      if (latest > oldest) return "worsening";
      return "stable";
    });

    // Passo 3: Gerar Predição de Risco via Gemini
    const riskAssessment = await step.do("ai-risk-prediction", async () => {
      const prompt = `Analise os dados deste paciente de fisioterapia:
			- Aderência às sessões: ${adherence}%
			- Tendência de dor: ${painTrend}

			Classifique o risco de abandono do tratamento em: low, medium, high.
			Responda apenas a palavra da classificação.`;

      const response = await this.env.AI.run("@cf/google/gemini-1.5-flash", {
        prompt,
      });

      return (response as any).response.toLowerCase().includes("high")
        ? "high"
        : (response as any).response.toLowerCase().includes("medium")
          ? "medium"
          : "low";
    });

    // Passo 4: Persistir no Digital Twin (Neon)
    await step.do("save-to-digital-twin", async () => {
      const sql = getRawSql(this.env, "write");
      await sql`
				INSERT INTO patient_longitudinal_summary (
					organization_id, patient_id, adherence_score, ai_risk_level, last_ai_assessment_at, updated_at
				) VALUES (
					${organizationId}::uuid, ${patientId}::uuid, ${adherence}, ${riskAssessment}, NOW(), NOW()
				)
				ON CONFLICT (patient_id) DO UPDATE SET
					adherence_score = EXCLUDED.adherence_score,
					ai_risk_level = EXCLUDED.ai_risk_level,
					last_ai_assessment_at = NOW(),
					updated_at = NOW();
			`;
    });
  }

  private async getOrganizationId(patientId: string): Promise<string | null> {
    const db = createDb(this.env, "read");
    const result = await db
      .select({ orgId: patients.organizationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    return result[0]?.orgId || null;
  }
}
