import { z } from "zod";
import { fetchApi } from "../apiClient";

export const getPatientHistorySchema = z.object({
  patientId: z.string().uuid("patientId deve ser UUID"),
});
export type GetPatientHistoryArgs = z.infer<typeof getPatientHistorySchema>;

export async function getPatientHistory(apiUrl: string, token: string, args: GetPatientHistoryArgs) {
  const patient = await fetchApi(apiUrl, token, `/api/patients/${args.patientId}`);
  const sessionsResp = await fetchApi<{ data?: unknown[] }>(
    apiUrl,
    token,
    `/api/sessions?patientId=${args.patientId}`,
  );
  return { patient, sessions: sessionsResp?.data ?? [] };
}
