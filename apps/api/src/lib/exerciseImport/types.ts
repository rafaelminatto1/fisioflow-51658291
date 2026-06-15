import { z } from "zod";

export const FreeExerciseDbRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  force: z.string().nullable().optional(),
  level: z.string().optional(),
  mechanic: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  primaryMuscles: z.array(z.string()).default([]),
  secondaryMuscles: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  category: z.string().optional(),
  images: z.array(z.string()).default([]),
});

export type FreeExerciseDbRecord = z.infer<typeof FreeExerciseDbRecordSchema>;

export interface ExerciseCandidate {
  dedupKey: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  sourceLicense: string;
  name: string;
  nameEn: string;
  difficulty: "iniciante" | "intermediario" | "avancado" | null;
  musclesPrimary: string[];
  musclesSecondary: string[];
  equipment: string[];
  bodyParts: string[];
  instructions: string;
  category: string | null;
  imageUrls: string[];
  raw: unknown;
}
