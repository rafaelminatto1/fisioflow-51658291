import { FreeExerciseDbRecordSchema, type ExerciseCandidate } from "./types";
import { dedupKey } from "./normalize";

const RAW_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const REPO_URL = "https://github.com/yuhonas/free-exercise-db";

const LEVEL_MAP: Record<string, ExerciseCandidate["difficulty"]> = {
  beginner: "iniciante",
  intermediate: "intermediario",
  expert: "avancado",
};

export function mapFreeExerciseDb(input: unknown): ExerciseCandidate {
  const rec = FreeExerciseDbRecordSchema.parse(input);
  const equipment = rec.equipment ? [rec.equipment] : [];
  return {
    dedupKey: dedupKey(rec.name, rec.primaryMuscles, equipment),
    source: "free-exercise-db",
    sourceId: rec.id,
    sourceUrl: `${REPO_URL}/blob/main/exercises/${rec.id}/exercise.json`,
    sourceLicense: "Unlicense",
    name: rec.name,
    nameEn: rec.name,
    difficulty: rec.level ? LEVEL_MAP[rec.level] ?? null : null,
    musclesPrimary: rec.primaryMuscles,
    musclesSecondary: rec.secondaryMuscles,
    equipment,
    bodyParts: rec.primaryMuscles,
    instructions: rec.instructions.join("\n"),
    category: rec.category ?? null,
    imageUrls: rec.images.map((img) => `${RAW_BASE}/${img}`),
    raw: rec,
  };
}
