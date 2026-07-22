import { z } from "zod";
import { getRawSql } from "../lib/db";
import { runSearch } from "../routes/evidence";
import { searchAiSearch } from "../lib/cloudflareAiSearch";
import { runAi } from "../lib/ai-native";
import { WORKERS_AI_MODELS } from "../lib/workersAi";
import type { CopilotTool } from "../lib/copilot/types";
import type { Env } from "../types/env";

/**
 * PubMed é indexado em inglês. O modelo de chat frequentemente envia a query em
 * PT-BR (com ou sem acentos), retornando zero resultados. Normalizamos sempre para
 * keywords clínicas em inglês via um modelo rápido antes de consultar.
 */
async function toEnglishQuery(env: Env, q: string): Promise<string> {
  try {
    const res = (await runAi(env, WORKERS_AI_MODELS.llama_3_1_8b, {
      messages: [
        {
          role: "system",
          content:
            "You translate a medical search query into concise English keywords for a PubMed search. " +
            "If the input is already English, return it unchanged. Output ONLY the query text — no quotes, no explanation.",
        },
        { role: "user", content: q },
      ],
    })) as { response?: string; choices?: Array<{ message?: { content?: string } }> };
    const text = res.response ?? res.choices?.[0]?.message?.content ?? "";
    const translated = text.trim().replace(/^["']|["']$/g, "").split("\n")[0].trim();
    return translated.length >= 3 ? translated : q;
  } catch {
    return q;
  }
}

export function buildRegistry(): CopilotTool[] {
  return [
    {
      name: "search_evidence",
      description: "Busca evidência científica (PubMed) por palavra-chave clínica.",
      parameters: z.object({
        q: z.string().min(3),
        limit: z.coerce.number().int().min(1).max(20).optional(),
      }),
      execute: async (ctx, args) => {
        const q = await toEnglishQuery(ctx.env, String(args.q));
        return runSearch(ctx.env, { ...args, q });
      },
    },
    {
      name: "search_clinical_knowledge",
      description:
        "Busca na base de conhecimento clínico da clínica (wiki e protocolos indexados). " +
        "Use para fundamentar condutas em protocolos internos. Retorna trechos com o título da fonte para citação.",
      parameters: z.object({
        q: z.string().min(3),
        limit: z.coerce.number().int().min(1).max(10).optional(),
      }),
      execute: async (ctx, args) => {
        if (!ctx.env.AI_SEARCH) return { sources: [] };
        try {
          const { sources } = await searchAiSearch(ctx.env, {
            query: String(args.q),
            maxNumResults: Math.min(Number(args.limit ?? 6), 10),
            // reranking já é default-on no helper; recupera mais candidatos p/ reordenar.
          });
          return {
            sources: sources.map((s) => ({
              title: (s.metadata?.title as string) ?? s.filename,
              source: (s.metadata?.source as string) ?? "kb",
              score: s.score ?? null,
              content: s.content ?? "",
            })),
          };
        } catch {
          return { sources: [] };
        }
      },
    },
    {
      name: "search_exercises",
      description: "Busca exercícios na biblioteca da clínica.",
      parameters: z.object({
        q: z.string().min(2),
        limit: z.coerce.number().int().min(1).max(20).optional(),
      }),
      execute: async (ctx, args) => {
        const sql = getRawSql(ctx.env, "read");
        const limit = Math.min(Number(args.limit ?? 10), 20);
        const res = await sql(
          `SELECT id, name, difficulty, body_parts, equipment
             FROM exercises
            WHERE (organization_id = $1 OR is_public = true) AND is_active = true
              AND to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(name_en,''))
                  @@ websearch_to_tsquery('portuguese', $2)
            LIMIT $3`,
          [ctx.user.organizationId, String(args.q), limit],
        );
        return (res as { rows?: unknown[] }).rows ?? [];
      },
    },
    {
      name: "get_patient_history",
      description: "Histórico clínico de um paciente (dados + últimas sessões).",
      parameters: z.object({ patientId: z.string().uuid() }),
      execute: async (ctx, args) => {
        const sql = getRawSql(ctx.env, "read");
        const patient = await sql(`SELECT * FROM patients WHERE id = $1 AND organization_id = $2`, [
          args.patientId,
          ctx.user.organizationId,
        ]);
        const sessions = await sql(
          `SELECT id, date, observacao FROM sessions
            WHERE patient_id = $1 AND organization_id = $2
            ORDER BY date DESC LIMIT 10`,
          [args.patientId, ctx.user.organizationId],
        );
        return {
          patient: (patient as { rows?: unknown[] }).rows?.[0] ?? null,
          sessions: (sessions as { rows?: unknown[] }).rows ?? [],
        };
      },
    },
    {
      name: "schedule_session",
      description: "Agenda uma sessão/consulta para um paciente.",
      parameters: z.object({
        patientId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
        notes: z.string().max(2000).optional(),
      }),
      execute: async (ctx, args) => {
        const res = await fetch(`${ctx.baseUrl}/api/appointments`, {
          method: "POST",
          headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { error: `Falha ao agendar: ${res.status}`, detail: data };
        return data;
      },
    },
  ];
}
