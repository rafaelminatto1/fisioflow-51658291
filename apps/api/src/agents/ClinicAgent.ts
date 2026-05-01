import { Agent, callable } from "agents";
import type { Env } from "../types/env";
import { callAI } from "../lib/ai/callAI";

type ClinicState = {
  orgId: string;
  lastBriefingAt: string | null;
  lastSummaryAt: string | null;
  pendingAlerts: string[];
};

/**
 * ClinicAgent — Agente autônomo da clínica
 * Crons: briefing manhã 07h30, resumo dia 18h30, alerta pacientes sumidos segunda 09h
 * Skills: reagendamento automático via WhatsApp, resumo clínico diário
 */
export class ClinicAgent extends Agent<Env, ClinicState> {
  initialState: ClinicState = {
    orgId: "",
    pendingAlerts: [],
    lastBriefingAt: null,
    lastSummaryAt: null,
  };

  @callable()
  async setOrgId({ orgId }: { orgId: string }) {
    await this.setState({ ...this.state, orgId });
    return { ok: true };
  }

  @callable()
  async runMorningBriefing() {
    const orgId = this.state.orgId;
    const prompt = `Você é um assistente de clínica de fisioterapia. Gere um briefing matinal conciso para a equipe clínica da organização ${orgId || "atual"}. Inclua: lembretes de consultas do dia, pacientes em risco de abandono, e prioridades. Máximo 150 palavras. Responda em português.`;

    const result = await callAI(this.env, {
      task: "clinic-briefing",
      prompt,
      organizationId: orgId,
    });

    await this.setState({ ...this.state, lastBriefingAt: new Date().toISOString() });

    return { briefing: result.content, generatedAt: new Date().toISOString() };
  }

  @callable()
  async runDailySummary() {
    const orgId = this.state.orgId;
    const prompt = `Gere um resumo do dia para a clínica de fisioterapia ${orgId || "atual"}. Inclua: consultas realizadas, evoluções registradas, pendências e próximos passos. Máximo 200 palavras. Responda em português.`;

    const result = await callAI(this.env, {
      task: "clinic-summary",
      prompt,
      organizationId: orgId,
    });

    await this.setState({ ...this.state, lastSummaryAt: new Date().toISOString() });

    return { summary: result.content, generatedAt: new Date().toISOString() };
  }

  @callable()
  async checkMissingPatients() {
    const orgId = this.state.orgId;

    // Query patients who missed appointments in the last 30 days via Neon
    let missingPatients: Array<{ name: string; last_appointment: string }> = [];
    try {
      const { neon } = await import("@neondatabase/serverless");
      const url = this.env.NEON_URL || this.env.HYPERDRIVE?.connectionString;
      if (url) {
        const sql = neon(url);
        const rows = await sql`
          SELECT p.full_name AS name, MAX(a.appointment_date::text) AS last_appointment
          FROM patients p
          LEFT JOIN appointments a ON a.patient_id = p.id
            AND a.org_id = ${orgId}
            AND a.status = 'realizada'
          WHERE p.org_id = ${orgId}
          GROUP BY p.id, p.full_name
          HAVING MAX(a.appointment_date) < NOW() - INTERVAL '30 days'
            OR MAX(a.appointment_date) IS NULL
          LIMIT 10
        `;
        missingPatients = rows as any;
      }
    } catch {
      // non-critical
    }

    const alerts = missingPatients.map(
      (p) => `${p.name} (última consulta: ${p.last_appointment || "nunca"})`,
    );

    await this.setState({ ...this.state, pendingAlerts: alerts });

    return { missingPatients: alerts, count: alerts.length };
  }

  @callable()
  async handleWhatsAppReschedule({ patientName, requestedDate }: { patientName: string; requestedDate: string }) {
    const prompt = `Um paciente chamado "${patientName}" solicitou reagendamento via WhatsApp para "${requestedDate}". Gere uma resposta amigável confirmando que a equipe vai verificar a disponibilidade e entrar em contato em breve. Máximo 80 palavras. Em português, tom cordial.`;

    const result = await callAI(this.env, {
      task: "whatsapp-reschedule",
      prompt,
      organizationId: this.state.orgId,
    });

    return { response: result.content };
  }
}
