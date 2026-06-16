import { z } from "zod";
import { fetchApi } from "../apiClient";

export const scheduleSessionSchema = z.object({
  patientId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date deve ser YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime deve ser HH:MM"),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  notes: z.string().max(2000).optional(),
});
export type ScheduleSessionArgs = z.infer<typeof scheduleSessionSchema>;

export async function scheduleSession(apiUrl: string, token: string, args: ScheduleSessionArgs) {
  return fetchApi(apiUrl, token, `/api/appointments`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}
