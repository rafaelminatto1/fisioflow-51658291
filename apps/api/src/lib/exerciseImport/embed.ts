import { WORKERS_AI_MODELS } from "../workersAi";

type EmbedInput = { name: string; musclesPrimary: string[]; instructions: string };
type RunAi = (model: string, input: unknown) => Promise<{ data?: number[][] }>;

export function buildEmbeddingText(e: EmbedInput): string {
  return [e.name, e.musclesPrimary.join(", "), e.instructions].filter(Boolean).join("\n");
}

export async function embedExercise(e: EmbedInput, runAi: RunAi): Promise<number[] | null> {
  const res = await runAi(WORKERS_AI_MODELS.embeddings_bge_m3, { text: [buildEmbeddingText(e)] });
  return res?.data?.[0] ?? null;
}
