import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { getRawSql, createDb } from "../lib/db";
import { patients } from "@fisioflow/db";
import { eq } from "drizzle-orm";

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

    // Passo 3: Analisar Volume de Atividade (Wearables)
    const activityVolume = await step.do("analyze-activity", async () => {
      const db = getRawSql(this.env, "read");
      const stats = await db`
				SELECT AVG(value) as avg_steps
				FROM wearable_data
				WHERE patient_id = ${patientId}::uuid
				  AND data_type = 'steps'
				  AND timestamp > NOW() - INTERVAL '30 days'
			`;
      return Number(stats.rows[0]?.avg_steps || 0);
    });

    // Passo 4: Gerar Predição de Trajetória e Recuperação via Gemini
    const trajectory = await step.do("ai-trajectory-prediction", async () => {
      const sql = getRawSql(this.env, "read");
      const patientRes = await sql`SELECT condition, diagnosis FROM patients WHERE id = ${patientId}::uuid`;
      const patient = patientRes.rows[0];

      const prompt = `Você é um especialista em prognóstico clínico de fisioterapia.
			Analise este paciente (Gêmeo Digital):
			- Diagnóstico: ${patient?.diagnosis || "Não informado"}
			- Condição: ${patient?.condition || "Não informada"}
			- Aderência às sessões: ${adherence}%
			- Tendência de dor: ${painTrend}
			- Média de passos diários (Wearable): ${activityVolume}

			Com base em protocolos de reabilitação padrão ouro, preveja:
			1. Nível de Risco de Abandono (low, medium, high)
			2. Semanas estimadas para a alta (número inteiro)
			3. Score de Confiança da predição (0-100)

			Retorne APENAS um JSON: {"risk": "...", "recoveryWeeks": 12, "confidence": 85}`;

      const response = await this.env.AI.run("@cf/google/gemini-1.5-flash", {
        prompt,
      });

      try {
        const jsonMatch = (response as any).response.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch?.[0] ?? (response as any).response);
      } catch (e) {
        return { risk: "low", recoveryWeeks: 8, confidence: 50 };
      }
    });

    // Passo 5: Persistir no Digital Twin (Neon)
    await step.do("save-to-digital-twin", async () => {
      const sql = getRawSql(this.env, "write");
      await sql`
				INSERT INTO patient_longitudinal_summary (
					organization_id, patient_id, adherence_score, ai_risk_level, 
          predicted_recovery_weeks, confidence_score,
          last_ai_assessment_at, updated_at
				) VALUES (
					${organizationId}::uuid, ${patientId}::uuid, ${adherence}, ${trajectory.risk}, 
          ${trajectory.recoveryWeeks}, ${trajectory.confidence},
          NOW(), NOW()
				)
				ON CONFLICT (patient_id) DO UPDATE SET
					adherence_score = EXCLUDED.adherence_score,
					ai_risk_level = EXCLUDED.ai_risk_level,
          predicted_recovery_weeks = EXCLUDED.predicted_recovery_weeks,
          confidence_score = EXCLUDED.confidence_score,
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
