/**
 * SessionSummaryWorkflow — Resumo SOAP → WhatsApp paciente
 *
 * Disparado via Queue ao finalizar uma sessão.
 * Steps: busca SOAP → callAI (summary_paciente, proximos_passos, exercicios_casa)
 *         → salva em session_summaries → envia WhatsApp ao paciente.
 */
import { z } from "zod";
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { neon } from "@neondatabase/serverless";
import { callAI } from "../lib/ai/callAI";

const SessionSummarySchema = z.object({
  summary_paciente: z.string(),
  proximos_passos: z.string().optional().default(""),
  exercicios_casa: z.string().nullable().optional(),
});

export type SessionSummaryParams = {
  sessionId: string;
  patientId: string;
  orgId: string;
};

export class SessionSummaryWorkflow extends WorkflowEntrypoint<Env, SessionSummaryParams> {
  async run(event: WorkflowEvent<SessionSummaryParams>, step: WorkflowStep) {
    const { sessionId, patientId, orgId } = event.payload;

    const url = this.env.NEON_URL || this.env.HYPERDRIVE?.connectionString;
    if (!url) {
      console.warn("[SessionSummaryWorkflow] No DB URL configured.");
      return { ok: false, reason: "no-db" };
    }

    const sql = neon(url);

    // Step 1: Fetch SOAP data and patient phone
    const sessionData = await step.do("fetch-session", async () => {
      const rows = await sql`
        SELECT
          s.subjective, s.objective, s.assessment, s.plan,
          p.full_name AS patient_name,
          p.phone AS patient_phone
        FROM sessions s
        LEFT JOIN patients p ON p.id = s.patient_id
        WHERE s.id = ${sessionId}
        LIMIT 1
      `;
      return rows[0] as {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        patient_name?: string;
        patient_phone?: string;
      } | undefined;
    });

    if (!sessionData) {
      console.warn(`[SessionSummaryWorkflow] Session ${sessionId} not found.`);
      return { ok: false, reason: "session-not-found" };
    }

    // Step 2: Generate AI summary
    const aiSummary = await step.do("generate-summary", async () => {
      const soapText = [
        sessionData.subjective && `Subjetivo: ${sessionData.subjective}`,
        sessionData.objective && `Objetivo: ${sessionData.objective}`,
        sessionData.assessment && `Avaliação: ${sessionData.assessment}`,
        sessionData.plan && `Plano: ${sessionData.plan}`,
      ]
        .filter(Boolean)
        .join("\n");

      const prompt = `Você é um fisioterapeuta. Resuma a consulta abaixo para o paciente em linguagem simples e acolhedora.

SOAP da sessão:
${soapText}

Retorne SOMENTE JSON válido:
{
  "summary_paciente": "resumo em 2-3 frases simples para o paciente entender",
  "proximos_passos": "o que o paciente deve fazer até a próxima consulta",
  "exercicios_casa": "exercícios domiciliares se houver, ou null"
}`;

      const result = await callAI(this.env, {
        task: "session-summary",
        prompt,
        organizationId: orgId,
      });

      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = SessionSummarySchema.safeParse(JSON.parse(jsonMatch[0]));
        if (parsed.success) return parsed.data;
      }
      return { summary_paciente: result.content, proximos_passos: "", exercicios_casa: null };
    });

    // Step 3: Save to session_summaries table (create if not exists handled gracefully)
    await step.do("save-summary", async () => {
      await sql`
        INSERT INTO session_summaries (session_id, patient_id, org_id, summary_paciente, proximos_passos, exercicios_casa, created_at)
        VALUES (${sessionId}, ${patientId}, ${orgId}, ${aiSummary.summary_paciente}, ${aiSummary.proximos_passos}, ${aiSummary.exercicios_casa ?? ""}, NOW())
        ON CONFLICT (session_id) DO UPDATE
          SET summary_paciente = EXCLUDED.summary_paciente,
              proximos_passos = EXCLUDED.proximos_passos,
              exercicios_casa = EXCLUDED.exercicios_casa
      `.catch((err) => {
        // Table may not exist yet — non-critical, just log
        console.warn("[SessionSummaryWorkflow] Could not save summary:", err?.message);
      });
    });

    // Step 4: Send WhatsApp to patient
    if (sessionData.patient_phone && this.env.BACKGROUND_QUEUE) {
      await step.do("send-whatsapp", async () => {
        const messageText = [
          `Olá, ${sessionData.patient_name || "paciente"}! 👋`,
          `Resumo da sua consulta de hoje:`,
          aiSummary.summary_paciente,
          aiSummary.proximos_passos ? `\nPróximos passos: ${aiSummary.proximos_passos}` : "",
          aiSummary.exercicios_casa ? `\nExercícios em casa: ${aiSummary.exercicios_casa}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        await this.env.BACKGROUND_QUEUE.send({
          type: "SEND_WHATSAPP",
          payload: {
            to: sessionData.patient_phone!,
            templateName: "session_summary",
            languageCode: "pt_BR",
            bodyParameters: [{ type: "text", text: messageText }],
            organizationId: orgId,
            patientId,
            messageText,
            appointmentId: "",
          },
        }).catch((err) => {
          console.warn("[SessionSummaryWorkflow] WhatsApp queue failed:", err?.message);
        });
      });
    }

    return { ok: true, sessionId, patientName: sessionData.patient_name };
  }
}
