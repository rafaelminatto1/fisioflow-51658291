import { fetchApi } from "./client";
import type { ApiResponse } from "@/types/api";

export interface ApiWikiPage {
  id: string;
  organization_id?: string;
  title: string;
  content?: string;
  category_id?: string | null;
  category?: string | null;
  tags?: string[];
  author_id?: string;
  status: "published" | "draft" | "archived";
  view_count?: number;
  created_at: string;
  updated_at: string;
}

export async function getWikiPages(params?: {
  search?: string;
  category?: string;
  limit?: number;
}): Promise<ApiWikiPage[]> {
  const response = await fetchApi<ApiResponse<ApiWikiPage[]>>("/api/wiki", {
    params: params as any,
  });
  return response.data || [];
}

export async function getWikiPageById(id: string): Promise<ApiWikiPage> {
  const response = await fetchApi<ApiResponse<ApiWikiPage>>(`/api/wiki/${encodeURIComponent(id)}`);
  if (!response.data) throw new Error("Página não encontrada");
  return response.data;
}
