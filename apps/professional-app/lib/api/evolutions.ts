import { fetchApi } from "./client";
import type { ApiResponse, ApiEvolution } from "@/types/api";

function normalizeEvolution(apiEvolution: any): ApiEvolution {
  const normalized: ApiEvolution = {
    ...apiEvolution,
    id: String(apiEvolution.id),
    patient_id: String(apiEvolution.patient_id ?? apiEvolution.patientId ?? ""),
    therapist_id: String(
      apiEvolution.therapist_id ?? apiEvolution.therapistId ?? apiEvolution.created_by ?? "",
    ),
    appointment_id: apiEvolution.appointment_id ?? apiEvolution.appointmentId,
    date:
      apiEvolution.date ??
      apiEvolution.session_date ??
      apiEvolution.record_date ??
      apiEvolution.created_at ??
      new Date().toISOString(),
    subjective: apiEvolution.subjective ?? apiEvolution.chief_complaint ?? "",
    objective:
      typeof apiEvolution.objective === "string"
        ? apiEvolution.objective
        : apiEvolution.objective
          ? JSON.stringify(apiEvolution.objective)
          : "",
    assessment: apiEvolution.assessment ?? apiEvolution.medical_history ?? "",
    plan: apiEvolution.plan ?? apiEvolution.lifestyle_habits ?? "",
    pain_level:
      apiEvolution.pain_level ??
      apiEvolution.painLevel ??
      apiEvolution.pain_level_after ??
      apiEvolution.pain_level_before ??
      0,
    attachments: Array.isArray(apiEvolution.attachments) ? apiEvolution.attachments : [],
    observations: apiEvolution.observations,
    exercises_performed: Array.isArray(apiEvolution.exercises_performed)
      ? apiEvolution.exercises_performed
      : [],
    pain_level_before: apiEvolution.pain_level_before,
    pain_level_after: apiEvolution.pain_level_after,
    created_at: apiEvolution.created_at ?? apiEvolution.date ?? new Date().toISOString(),
    updated_at: apiEvolution.updated_at ?? apiEvolution.created_at ?? new Date().toISOString(),
  };

  return normalized;
}

export async function getEvolutions(patientId: string): Promise<ApiEvolution[]> {
  const response = await fetchApi<ApiResponse<ApiEvolution[]>>(
    "/api/evolution/treatment-sessions",
    {
      params: { patientId, limit: 100 },
    },
  );
  return (response.data || []).map(normalizeEvolution);
}

export async function getEvolutionById(id: string): Promise<ApiEvolution | null> {
  try {
    const response = await fetchApi<ApiResponse<ApiEvolution>>(
      `/api/evolution/treatment-sessions/${encodeURIComponent(id)}`,
    );
    if (!response.data) return null;
    return normalizeEvolution(response.data);
  } catch {
    return null;
  }
}

export async function createEvolution(data: Partial<ApiEvolution>): Promise<ApiEvolution> {
  if (!data.patient_id) {
    throw new Error("patient_id é obrigatório");
  }

  const response = await fetchApi<ApiResponse<ApiEvolution>>("/api/evolution/treatment-sessions", {
    method: "POST",
    data: {
      patient_id: data.patient_id,
      therapist_id: data.therapist_id,
      appointment_id: data.appointment_id ?? null,
      session_date: data.date,
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      exercises_performed: data.exercises_performed ?? [],
      pain_level_before: data.pain_level ?? 0,
      pain_level_after: data.pain_level ?? 0,
      attachments: data.attachments ?? [],
    },
  });

  if (response.error) throw new Error(response.error);
  return normalizeEvolution(response.data);
}

export async function updateEvolution(
  id: string,
  data: Partial<ApiEvolution>,
): Promise<ApiEvolution> {
  const response = await fetchApi<ApiResponse<ApiEvolution>>(
    `/api/evolution/treatment-sessions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      data: {
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        observations: data.observations,
        pain_level_before: data.pain_level,
        pain_level_after: data.pain_level,
        session_date: data.date,
        attachments: data.attachments ?? [],
      },
    },
  );

  if (response.error) throw new Error(response.error);
  return normalizeEvolution(response.data);
}

export async function deleteEvolution(id: string): Promise<{ ok: boolean }> {
  const response = await fetchApi<{ ok?: boolean }>(
    `/api/evolution/treatment-sessions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return { ok: Boolean(response.ok) };
}

export async function duplicateEvolution(id: string): Promise<ApiEvolution> {
  const source = await getEvolutionById(id);
  if (!source || !source.patient_id) {
    throw new Error("Evolução original não encontrada");
  }

  return createEvolution({
    patient_id: source.patient_id,
    date: new Date().toISOString(),
    subjective: source.subjective,
    objective: source.objective,
    assessment: source.assessment,
    plan: source.plan,
    pain_level: source.pain_level,
    attachments: source.attachments ?? [],
    exercises_performed: source.exercises_performed ?? [],
  });
}
