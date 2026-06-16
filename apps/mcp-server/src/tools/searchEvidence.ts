import { z } from "zod";
import { fetchApi } from "../apiClient";

export const searchEvidenceSchema = z.object({
  q: z.string().min(3, "consulta muito curta"),
  limit: z.number().int().min(1).max(50).optional(),
});
export type SearchEvidenceArgs = z.infer<typeof searchEvidenceSchema>;

export async function searchEvidence(apiUrl: string, token: string, args: SearchEvidenceArgs) {
  const qs = new URLSearchParams({ q: args.q });
  if (args.limit) qs.set("limit", String(args.limit));
  return fetchApi<{ count: number; data: unknown[] }>(
    apiUrl,
    token,
    `/api/evidence/search?${qs.toString()}`,
  );
}
