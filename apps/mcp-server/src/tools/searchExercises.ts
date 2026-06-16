import { z } from "zod";
import { fetchApi } from "../apiClient";

export const searchExercisesSchema = z.object({
  q: z.string().min(2, "consulta muito curta"),
  limit: z.number().int().min(1).max(50).optional(),
});
export type SearchExercisesArgs = z.infer<typeof searchExercisesSchema>;

export async function searchExercises(apiUrl: string, token: string, args: SearchExercisesArgs) {
  const qs = new URLSearchParams({ q: args.q });
  if (args.limit) qs.set("limit", String(args.limit));
  return fetchApi(apiUrl, token, `/api/exercises?${qs.toString()}`);
}
