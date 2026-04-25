import { fetchApi, cleanRequestData } from "./client";
import type { ApiResponse, ApiExercise } from "@/types/api";

function normalizeExerciseDifficulty(difficulty?: string): ApiExercise["difficulty"] {
  switch (difficulty) {
    case "iniciante":
      return "easy";
    case "intermediario":
      return "medium";
    case "avancado":
      return "hard";
    default:
      return difficulty;
  }
}

function normalizeExercise(apiExercise: any): ApiExercise {
  const bodyParts = apiExercise.bodyParts ?? apiExercise.body_parts ?? [];
  const indicatedPathologies =
    apiExercise.indicated_pathologies ?? apiExercise.pathologiesIndicated ?? [];
  const contraindicatedPathologies =
    apiExercise.contraindicated_pathologies ?? apiExercise.pathologiesContraindicated ?? [];
  const scientificReferences = apiExercise.scientific_references ?? apiExercise.references ?? [];

  return {
    ...apiExercise,
    category: apiExercise.category ?? apiExercise.categoryName ?? apiExercise.categoryId ?? "Geral",
    difficulty: normalizeExerciseDifficulty(apiExercise.difficulty),
    image_url: apiExercise.image_url ?? apiExercise.imageUrl,
    imageUrl: apiExercise.imageUrl ?? apiExercise.image_url,
    video_url: apiExercise.video_url ?? apiExercise.videoUrl,
    videoUrl: apiExercise.videoUrl ?? apiExercise.video_url,
    created_at: apiExercise.created_at ?? apiExercise.createdAt,
    createdAt: apiExercise.createdAt ?? apiExercise.created_at,
    updated_at: apiExercise.updated_at ?? apiExercise.updatedAt,
    updatedAt: apiExercise.updatedAt ?? apiExercise.updated_at,
    instructions: Array.isArray(apiExercise.instructions) ? apiExercise.instructions : [],
    body_parts: bodyParts,
    bodyParts,
    tags: Array.isArray(apiExercise.tags) ? apiExercise.tags : [],
    indicated_pathologies: indicatedPathologies,
    contraindicated_pathologies: contraindicatedPathologies,
    precaution_level: apiExercise.precaution_level,
    precaution_notes: apiExercise.precaution_notes ?? apiExercise.precautions,
    scientific_references: scientificReferences,
  };
}

export async function getExercises(options?: {
  category?: string;
  difficulty?: string;
  search?: string;
  bodyPart?: string;
  equipment?: string;
  page?: number;
  limit?: number;
  favorites?: string;
}): Promise<{
  data: ApiExercise[];
  meta: { total: number; pages: number; page: number; limit: number };
}> {
  const response = await fetchApi<ApiResponse<{ data: ApiExercise[]; meta: any }>>(
    "/api/exercises",
    {
      params: {
        category: options?.category,
        difficulty: options?.difficulty,
        bodyPart: options?.bodyPart,
        equipment: options?.equipment,
        q: options?.search,
        page: options?.page,
        limit: options?.limit || 100,
        favorites: options?.favorites,
      },
    },
  );

  const data = (response.data?.data || []).map(normalizeExercise);
  const meta = response.data?.meta || {
    total: data.length,
    pages: 1,
    page: options?.page || 1,
    limit: options?.limit || 100,
  };

  return { data, meta };
}

export async function getExerciseById(id: string): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(
    `/api/exercises/${encodeURIComponent(id)}`,
  );
  if (!response.data) throw new Error("Exercício não encontrado");
  return normalizeExercise(response.data);
}

export async function createExercise(data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>("/api/exercises", {
    method: "POST",
    data: cleanRequestData({
      ...data,
      imageUrl: data.imageUrl ?? data.image_url,
      videoUrl: data.videoUrl ?? data.video_url,
    }),
  });
  if (response.error) throw new Error(response.error);
  return normalizeExercise(response.data);
}

export async function updateExercise(id: string, data: Partial<ApiExercise>): Promise<ApiExercise> {
  const response = await fetchApi<ApiResponse<ApiExercise>>(
    `/api/exercises/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      data: cleanRequestData({
        ...data,
        imageUrl: data.imageUrl ?? data.image_url,
        videoUrl: data.videoUrl ?? data.video_url,
      }),
    },
  );
  if (response.error) throw new Error(response.error);
  return normalizeExercise(response.data);
}

export async function deleteExercise(id: string): Promise<{ ok: boolean }> {
  return fetchApi<{ ok: boolean }>(`/api/exercises/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function favoriteExercise(id: string): Promise<{ ok: boolean }> {
  return fetchApi<{ ok: boolean }>(`/api/exercises/${encodeURIComponent(id)}/favorite`, {
    method: "POST",
  });
}

export async function unfavoriteExercise(id: string): Promise<{ ok: boolean }> {
  return fetchApi<{ ok: boolean }>(`/api/exercises/${encodeURIComponent(id)}/favorite`, {
    method: "DELETE",
  });
}

export async function getMyFavoriteExercises(): Promise<ApiExercise[]> {
  const response = await fetchApi<ApiResponse<ApiExercise[]>>("/api/exercises/favorites/me");
  return (response.data || []).map(normalizeExercise);
}
