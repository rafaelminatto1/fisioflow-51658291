import { z } from "zod";
import { getRawSql } from "../lib/db";
import { runSearch } from "../routes/evidence";
import { runAi } from "../lib/ai-native";
import { WORKERS_AI_MODELS } from "../lib/workersAi";
import type { CopilotTool } from "../lib/copilot/types";
import type { Env } from "../types/env";

const ASCII_ONLY = /^[\x00-\x7F]*$/;

/** PubMed é indexado em inglês; traduz queries não-inglesas para keywords clínicas. */
async function toEnglishQuery(env: Env, q: string): Promise<string> {
  if (ASCII_ONLY.test(q)) return q; // já parece inglês (sem acentos)
  try {
    const res = (await runAi(env, WORKERS_AI_MODELS.llama_3_1_8b, {
      messages: [
        {
          role: "system",
          content:
            "Translate the medical search query to concise English keywords for PubMed. Output ONLY the query text, no quotes, no explanation.",
        },
        { role: "user", content: q },
      ],
    })) as { response?: string };
    const translated = (res.response ?? "").trim().replace(/^["']|["']$/g, "");
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
