import { useQuery } from "@tanstack/react-query";
import { getWikiPages, getWikiPageById, type ApiWikiPage } from "@/lib/api";

export type { ApiWikiPage };

export function useWikiPages(params?: { search?: string; category?: string; limit?: number }) {
  return useQuery({
    queryKey: ["wiki-pages", params],
    queryFn: () => getWikiPages(params),
    staleTime: 10 * 60 * 1000,
  });
}

export function useWikiPage(id: string | undefined) {
  return useQuery({
    queryKey: ["wiki-page", id],
    queryFn: () => getWikiPageById(id!),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
  });
}
