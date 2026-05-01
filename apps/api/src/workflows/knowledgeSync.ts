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
    const { syncTarget = "all" } = event.payload;

    if (!this.env.AI_SEARCH) {
      console.warn("[KnowledgeSyncWorkflow] AI_SEARCH binding not configured, skipping.");
      return { synced: 0 };
    }

    const url = this.env.NEON_URL || this.env.HYPERDRIVE?.connectionString;
    if (!url) return { synced: 0 };

    let totalSynced = 0;

    // 1. Sincronizar Protocolos
    if (syncTarget === "all" || syncTarget === "protocols") {
      const protocols = (await step.do("fetch-protocols", async (): Promise<any[]> => {
        const sql = neon(url);
        const rows = await sql`
          SELECT ep.id, ep.name, ep.description, ep.category, ep.difficulty,
                 ep.estimated_duration, ep.is_active,
                 json_agg(
                   json_build_object('exercise_id', pe.exercise_id, 'sets', pe.sets,
                     'reps', pe.reps, 'rest_time', pe.rest_time, 'notes', pe.notes)
                 ) FILTER (WHERE pe.exercise_id IS NOT NULL) AS exercises
          FROM exercise_protocols ep
          LEFT JOIN protocol_exercises pe ON pe.protocol_id = ep.id
          WHERE ep.is_active = true
          GROUP BY ep.id
          LIMIT 200
        `;
        return rows as any[];
      })) as any[];

      for (const protocol of protocols) {
        const id = String(protocol.id);
        const name = String(protocol.name ?? "");
        const category = String(protocol.category ?? "geral");
        const description = String(protocol.description ?? "");
        const exerciseList = Array.isArray(protocol.exercises) ? protocol.exercises : [];

        const markdown =
          `# Protocolo: ${name}\n\n` +
          `**Categoria:** ${category}\n` +
          `**Dificuldade:** ${protocol.difficulty ?? "N/A"}\n` +
          `**Duração estimada:** ${protocol.estimated_duration ?? "N/A"} min\n\n` +
          `## Descrição\n${description}\n\n` +
          `## Exercícios (${exerciseList.length})\n` +
          exerciseList
            .map(
              (e: any) =>
                `- ID: ${e.exercise_id} | ${e.sets ?? 3}x${e.reps ?? 10} | Descanso: ${e.rest_time ?? 30}s`,
            )
            .join("\n");

        await step.do(`index-protocol-${id}`, async () => {
          try {
            await this.env.AI_SEARCH!.items.upload(`protocols/${id}.md`, markdown, {
              metadata: { source: "protocol", title: name, category },
            });
            totalSynced++;
          } catch (err) {
            console.error(`[KnowledgeSyncWorkflow] Protocol ${id} failed:`, err);
          }
        });
      }
    }

    // 2. Sincronizar Exercícios
    if (syncTarget === "all" || syncTarget === "exercises") {
      const exercises = (await step.do("fetch-exercises", async (): Promise<any[]> => {
        const sql = neon(url);
        const rows = await sql`
          SELECT e.id, e.name, e.description, e.instructions, e.category_id,
                 ec.name AS category_name, e.difficulty, e.muscle_groups,
                 e.equipment, e.contraindications
          FROM exercises e
          LEFT JOIN exercise_categories ec ON ec.id = e.category_id
          LIMIT 300
        `;
        return rows as any[];
      })) as any[];

      for (const exercise of exercises) {
        const id = String(exercise.id);
        const name = String(exercise.name ?? "");
        const category = String(exercise.category_name ?? exercise.category_id ?? "geral");
        const description = String(exercise.description ?? "");
        const instructions = String(exercise.instructions ?? "");
        const muscleGroups = Array.isArray(exercise.muscle_groups)
          ? (exercise.muscle_groups as string[]).join(", ")
          : String(exercise.muscle_groups ?? "");

        const markdown =
          `# Exercício: ${name}\n\n` +
          `**Categoria:** ${category}\n` +
          `**Dificuldade:** ${exercise.difficulty ?? "N/A"}\n` +
          `**Grupos musculares:** ${muscleGroups}\n` +
          `**Equipamento:** ${exercise.equipment ?? "Nenhum"}\n\n` +
          `## Descrição\n${description}\n\n` +
          (instructions ? `## Instruções\n${instructions}\n\n` : "") +
          (exercise.contraindications
            ? `## Contraindicações\n${exercise.contraindications}\n`
            : "");

        await step.do(`index-exercise-${id}`, async () => {
          try {
            await this.env.AI_SEARCH!.items.upload(`exercises/${id}.md`, markdown, {
              metadata: { source: "exercise", title: name, category },
            });
            totalSynced++;
          } catch (err) {
            console.error(`[KnowledgeSyncWorkflow] Exercise ${id} failed:`, err);
          }
        });
      }
    }

    console.log(`[KnowledgeSyncWorkflow] Done. totalSynced=${totalSynced}`);
    return { synced: totalSynced };
  }
}
