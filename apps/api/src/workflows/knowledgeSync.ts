/**
 * KnowledgeSyncWorkflow — Sincroniza protocolos + exercícios do Neon → AI Search
 *
 * Cron: Segunda-feira 03h BRT (06h UTC)
 * Lógica: exporta todos os protocolos e exercícios como markdown e faz upsert no AI Search
 * Upsert por ID para nunca duplicar
 */
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env } from "../types/env";
import { neon } from "@neondatabase/serverless";

export type KnowledgeSyncParams = {
  triggerType: "cron" | "manual";
  syncTarget?: "protocols" | "exercises" | "all";
};

export class KnowledgeSyncWorkflow extends WorkflowEntrypoint<Env, KnowledgeSyncParams> {
  async run(event: WorkflowEvent<KnowledgeSyncParams>, step: WorkflowStep) {
    const { syncTarget = "all", triggerType } = event.payload;
    // Default to "all" when triggered via schedule (no payload)
    const effectiveSyncTarget = triggerType ? syncTarget : "all";

    if (!this.env.AI_SEARCH) {
      console.warn("[KnowledgeSyncWorkflow] AI_SEARCH binding not configured, skipping.");
      return { synced: 0 };
    }

    const url = this.env.NEON_URL || this.env.HYPERDRIVE?.connectionString;
    if (!url) return { synced: 0 };

    let totalSynced = 0;

    // 1. Sincronizar Protocolos
    if (effectiveSyncTarget === "all" || effectiveSyncTarget === "protocols") {
      const protocols = (await step.do("fetch-protocols", async (): Promise<any[]> => {
        const sql = neon(url);
        const rows = await sql`
          SELECT ep.id, ep.name, ep.description, ep.condition_name, ep.protocol_type,
                 ep.evidence_level, ep.weeks_total, ep.objectives, ep.contraindications,
                 json_agg(
                   json_build_object(
                     'exercise_id', pe.exercise_id,
                     'phase_week_start', pe.phase_week_start,
                     'phase_week_end', pe.phase_week_end,
                     'sets', pe.sets_recommended,
                     'reps', pe.reps_recommended,
                     'duration_seconds', pe.duration_seconds,
                     'frequency_per_week', pe.frequency_per_week,
                     'notes', pe.progression_notes
                   )
                 ) FILTER (WHERE pe.exercise_id IS NOT NULL) AS exercises
          FROM exercise_protocols ep
          LEFT JOIN protocol_exercises pe ON pe.protocol_id = ep.id
          WHERE ep.is_active = true
          GROUP BY ep.id
          LIMIT 200
        `;
        return rows as any[];
      })) as any[];

      const docs = protocols.map((protocol): KnowledgeDocument => {
        const id = String(protocol.id);
        const name = String(protocol.name ?? "");
        const category = String(protocol.protocol_type ?? protocol.condition_name ?? "geral");
        const description = String(protocol.description ?? "");
        const exerciseList = Array.isArray(protocol.exercises) ? protocol.exercises : [];

        const markdown =
          `# Protocolo: ${name}\n\n` +
          `**Condição:** ${protocol.condition_name ?? "N/A"}\n` +
          `**Tipo:** ${category}\n` +
          `**Nível de evidência:** ${protocol.evidence_level ?? "N/A"}\n` +
          `**Duração:** ${protocol.weeks_total ?? "N/A"} semanas\n\n` +
          `## Descrição\n${description}\n\n` +
          (protocol.objectives ? `## Objetivos\n${protocol.objectives}\n\n` : "") +
          (protocol.contraindications
            ? `## Contraindicações\n${protocol.contraindications}\n\n`
            : "") +
          `## Exercícios (${exerciseList.length})\n` +
          exerciseList
            .map(
              (e: any) =>
                `- ID: ${e.exercise_id} | semanas ${e.phase_week_start ?? "?"}-${e.phase_week_end ?? "?"} | ${e.sets ?? 3}x${e.reps ?? 10} | frequência: ${e.frequency_per_week ?? "N/A"}/semana`,
            )
            .join("\n");

        return {
          id,
          filename: `protocols/${id}.md`,
          markdown,
          metadata: { source: "protocols", title: name, category },
        };
      });

      const result = await indexDocumentsInBatches(step, "protocols", docs, async (doc) => {
        await withAiSearchUploadTimeout(
          this.env.AI_SEARCH!.items.upload(doc.filename, truncateForAiSearch(doc.markdown), {
            metadata: doc.metadata,
          }),
        );
      });
      totalSynced += result.synced;
    }

    // 2. Sincronizar Exercícios
    if (effectiveSyncTarget === "all" || effectiveSyncTarget === "exercises") {
      const exercises = (await step.do("fetch-exercises", async (): Promise<any[]> => {
        const sql = neon(url);
        const rows = await sql`
          SELECT e.id, e.name, e.description, e.instructions, e.category_id,
                 ec.name AS category_name, e.difficulty, e.muscles_primary,
                 e.muscles_secondary, e.body_parts, e.equipment, e.precautions
          FROM exercises e
          LEFT JOIN exercise_categories ec ON ec.id = e.category_id
          WHERE e.is_active = true
          LIMIT 300
        `;
        return rows as any[];
      })) as any[];

      const docs = exercises.map((exercise): KnowledgeDocument => {
        const id = String(exercise.id);
        const name = String(exercise.name ?? "");
        const category = String(exercise.category_name ?? exercise.category_id ?? "geral");
        const description = String(exercise.description ?? "");
        const instructions = String(exercise.instructions ?? "");
        const primaryMuscles = Array.isArray(exercise.muscles_primary)
          ? (exercise.muscles_primary as string[]).join(", ")
          : String(exercise.muscles_primary ?? "");
        const secondaryMuscles = Array.isArray(exercise.muscles_secondary)
          ? (exercise.muscles_secondary as string[]).join(", ")
          : String(exercise.muscles_secondary ?? "");
        const equipment = Array.isArray(exercise.equipment)
          ? (exercise.equipment as string[]).join(", ")
          : String(exercise.equipment ?? "");

        const markdown =
          `# Exercício: ${name}\n\n` +
          `**Categoria:** ${category}\n` +
          `**Dificuldade:** ${exercise.difficulty ?? "N/A"}\n` +
          `**Músculos primários:** ${primaryMuscles || "N/A"}\n` +
          `**Músculos secundários:** ${secondaryMuscles || "N/A"}\n` +
          `**Equipamento:** ${equipment || "Nenhum"}\n\n` +
          `## Descrição\n${description}\n\n` +
          (instructions ? `## Instruções\n${instructions}\n\n` : "") +
          (exercise.precautions
            ? `## Precauções\n${exercise.precautions}\n`
            : "");

        return {
          id,
          filename: `exercises/${id}.md`,
          markdown,
          metadata: { source: "exercises", title: name, category },
        };
      });

      const result = await indexDocumentsInBatches(step, "exercises", docs, async (doc) => {
        await withAiSearchUploadTimeout(
          this.env.AI_SEARCH!.items.upload(doc.filename, truncateForAiSearch(doc.markdown), {
            metadata: doc.metadata,
          }),
        );
      });
      totalSynced += result.synced;
    }

    console.log(`[KnowledgeSyncWorkflow] Done. totalSynced=${totalSynced}`);
    return { synced: totalSynced };
  }
}

type KnowledgeDocument = {
  id: string;
  filename: string;
  markdown: string;
  metadata: Record<string, unknown>;
};

type BatchResult = {
  synced: number;
  failed: number;
  failures: Array<{ id: string; error: string }>;
};

async function indexDocumentsInBatches(
  step: WorkflowStep,
  label: string,
  docs: KnowledgeDocument[],
  upload: (doc: KnowledgeDocument) => Promise<void>,
  batchSize = 10,
): Promise<BatchResult> {
  const total: BatchResult = { synced: 0, failed: 0, failures: [] };

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const result = await step.do(`index-${label}-batch-${batchNumber}`, async () => {
      const outcomes = await Promise.all(
        batch.map(async (doc) => {
          try {
            await upload(doc);
            return { id: doc.id, ok: true as const };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[KnowledgeSyncWorkflow] ${label} ${doc.id} failed:`, message);
            return { id: doc.id, ok: false as const, error: message };
          }
        }),
      );

      const failures = outcomes
        .filter((item): item is { id: string; ok: false; error: string } => !item.ok)
        .map(({ id, error }) => ({ id, error }));

      return {
        synced: outcomes.length - failures.length,
        failed: failures.length,
        failures,
      };
    });

    total.synced += result.synced;
    total.failed += result.failed;
    total.failures.push(...result.failures);
  }

  return total;
}

function truncateForAiSearch(markdown: string, maxChars = 24000): string {
  if (markdown.length <= maxChars) return markdown;
  return `${markdown.slice(0, maxChars)}\n\n[Conteudo truncado para indexacao]`;
}

async function withAiSearchUploadTimeout<T>(upload: Promise<T>, timeoutMs = 30_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      upload,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("ai_search_upload_timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
