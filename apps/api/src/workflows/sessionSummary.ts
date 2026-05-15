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
          s.subjective->>'notes' as subjective,
          s.assessment->>'notes' as assessment,
          s.plan->>'notes' as plan,
          p.full_name AS patient_name,
          p.phone AS patient_phone
        FROM sessions s
        LEFT JOIN patients p ON p.id = s.patient_id
        WHERE s.id = ${sessionId}
        LIMIT 1
      `;
      return rows[0] as
        | {
            subjective?: string;
            objective?: string;
            assessment?: string;
            plan?: string;
            patient_name?: string;
            patient_phone?: string;
          }
        | undefined;
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

      const prompt = `Você é um assistente de fisioterapia de alto nível. Sua tarefa é criar um resumo acolhedor e profissional para o paciente, baseado no registro SOAP da sessão.

SOAP da sessão:
${soapText}

Instruções:
1. "summary_paciente": Explique em 2-3 frases simples o que foi trabalhado hoje e a evolução observada. Use um tom encorajador.
2. "proximos_passos": Liste as recomendações principais (ex: gelo, repouso, cuidados).
3. "exercicios_casa": Liste os exercícios específicos para o paciente fazer em casa. Se não houver, use null.

Retorne SOMENTE JSON válido no formato:
{
  "summary_paciente": "...",
  "proximos_passos": "...",
  "exercicios_casa": "..."
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

      // Step 5: Check milestones and request referral
      await step.do("check-referral-milestone", async () => {
        const countRes = await sql`
          SELECT COUNT(*)::int as total
          FROM sessions
          WHERE patient_id = ${patientId}
        `;
        const totalSessions = countRes[0]?.total || 0;

        // Milestone: 10 sessions
        if (totalSessions === 10) {
          // Get or create referral code
          const codeRes = await sql`
            SELECT code FROM referral_codes 
            WHERE patient_id = ${patientId} 
            ORDER BY created_at DESC LIMIT 1
          `;

          let code = codeRes[0]?.code;
          if (!code) {
            code = `FISIO${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            await sql`
              INSERT INTO referral_codes (patient_id, organization_id, code, reward_type, reward_value)
              VALUES (${patientId}, ${orgId}, ${code}, 'discount', 10)
            `;
          }

          const referralMessage = `Parabéns, ${sessionData.patient_name}! 🎉 Você completou 10 sessões conosco!\n\nEstamos adorando sua evolução. Sabia que você pode ajudar um amigo e ainda ganhar benefícios? Compartilhe seu código de indicação *${code}* com alguém. Se essa pessoa começar o tratamento, vocês dois ganham 10% de desconto na próxima renovação! 🎁`;

          await this.env
            .BACKGROUND_QUEUE!.send({
              type: "SEND_WHATSAPP",
              payload: {
                to: sessionData.patient_phone!,
                templateName: "referral_request",
                languageCode: "pt_BR",
                bodyParameters: [{ type: "text", text: referralMessage }],
                organizationId: orgId,
                patientId,
                messageText: referralMessage,
                appointmentId: "",
              },
            })
            .catch(() => {});
        }

        // Milestone: Billing Alert for Admins (Every 10 sessions)
        if (totalSessions % 10 === 0 && totalSessions > 0) {
          const billingMessage = `🚨 [FATURAMENTO] O paciente ${sessionData.patient_name} completou ${totalSessions} sessões. Por favor, verifique a emissão da NFS-e de renovação ou cobrança de ciclo.`;

          await this.env
            .BACKGROUND_QUEUE!.send({
              type: "INTERNAL_NOTIFICATION",
              payload: {
                title: "Gatilho de Faturamento (10 sessões)",
                body: billingMessage,
                organizationId: orgId,
                type: "billing",
                metadata: { patientId, sessionCount: totalSessions },
              },
            })
            .catch(() => {});
        }
      });
    }

    // Step 6: Trigger Digital Twin recalculation
    await step.do("trigger-digital-twin", async () => {
      if (this.env.WORKFLOW_DIGITAL_TWIN) {
        await this.env.WORKFLOW_DIGITAL_TWIN.create({
          id: `twin-${patientId}-${Date.now()}`,
          params: { patientId },
        }).catch((err) => {
          console.warn("[SessionSummaryWorkflow] Digital Twin trigger failed:", err?.message);
        });
      }
    });

    // Step 7: Analyze for Clinic Wiki (Knowledge Capture)
    await step.do("analyze-for-wiki", async () => {
      try {
        const { runThinkingModel } = await import("../lib/ai-native");
        const prompt = `
          Analise esta evolução clínica (SOAP) do paciente ${sessionData.patient_name}:
          S: ${sessionData.subjective}
          O: ${sessionData.objective}
          A: ${sessionData.assessment}
          P: ${sessionData.plan}

          Este caso apresenta um insight clínico único, uma conduta rara de sucesso ou um aprendizado que deveria ser compartilhado com a equipe na Wiki da clínica?
          Se SIM, gere um rascunho de artigo clínico (JSON).
          Se NÃO, retorne {"worthCapturing": false}.

          FORMATO SE SIM:
          {
            "worthCapturing": true,
            "title": "Caso Clínico: [Título]",
            "content": "[Markdown rico com descrição do caso, conduta e resultado]",
            "category": "Estudos de Caso"
          }
        `.trim();

        const aiWiki = await runThinkingModel(this.env, {
          prompt,
          model: "gemini-1.5-flash",
          temperature: 0.3,
          responseFormat: "json",
        });

        const jsonMatch = aiWiki.content.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch?.[0] ?? aiWiki.content);

        if (data.worthCapturing) {
          const { surgicalSyncWiki } = await import("../routes/aiSearch");

          // Salvar na tabela wiki_pages (rascunho)
          const wikiId = crypto.randomUUID();
          await sql`
            INSERT INTO wiki_pages (id, organization_id, title, content, is_public, created_by)
            VALUES (${wikiId}::uuid, ${orgId}::uuid, ${data.title}, ${data.content}, false, 'ai_autocapture')
          `;

          // Indexar no Vectorize
          await surgicalSyncWiki(this.env, { id: wikiId, ...data });

          console.log(`[Auto-Wiki] Captured unique clinical insight for org ${orgId}`);
        }
      } catch (e) {
        console.warn("[SessionSummaryWorkflow] Wiki capture failed:", e);
      }
    });

    return { ok: true, sessionId, patientName: sessionData.patient_name };
  }
}
