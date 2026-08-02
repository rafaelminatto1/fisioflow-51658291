import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { curationService } from "@/features/wiki/services/curationService";
import type { CurationQueueFilters } from "@/features/wiki/types/curation";
import { hasEditorialCapability } from "@/features/wiki/curation/curationUtils";

type RequestError = Error & {
  status?: number;
  payload?: { error?: string; code?: string };
};

export function getCurationErrorMessage(error: unknown): string {
  const apiError = error as RequestError;
  if (apiError.status === 409) {
    const code = apiError.payload?.code ?? apiError.payload?.error;
    return code === "VERSION_CONFLICT"
      ? "Este item foi alterado por outra pessoa. Os dados foram atualizados."
      : "Esta ação não é mais válida para o estado atual do item.";
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a ação.";
}

export function useWikiCurationCapabilities() {
  const query = useQuery({
    queryKey: ["wiki-curation-capabilities"],
    queryFn: curationService.capabilities,
    staleTime: 60_000,
    retry: false,
  });
  const capabilities = query.data?.data.capabilities ?? [];
  return {
    ...query,
    capabilities,
    canManageLibrary: hasEditorialCapability(capabilities),
  };
}

export function useWikiCuration(
  filters: CurationQueueFilters,
  selectedItemId?: string | null,
) {
  const queryClient = useQueryClient();
  const capabilitiesQuery = useWikiCurationCapabilities();
  const queueKey = ["wiki-curation-queue", filters] as const;

  const queueQuery = useInfiniteQuery({
    queryKey: queueKey,
    queryFn: ({ pageParam }) => curationService.queue(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor || undefined,
    enabled: capabilitiesQuery.canManageLibrary,
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: ["wiki-curation-item", selectedItemId],
    queryFn: () => curationService.detail(selectedItemId!),
    enabled: capabilitiesQuery.canManageLibrary && Boolean(selectedItemId),
    retry: false,
  });

  const refreshAfterMutation = async (itemId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["wiki-curation-queue"] }),
      queryClient.invalidateQueries({
        queryKey: ["wiki-curation-item", itemId],
      }),
    ]);
  };

  const transitionMutation = useMutation({
    mutationFn: curationService.transition,
    onSettled: (_data, _error, input) => refreshAfterMutation(input.item.id),
  });
  const assignmentMutation = useMutation({
    mutationFn: curationService.assign,
    onSettled: (_data, _error, input) => refreshAfterMutation(input.item.id),
  });

  return {
    capabilities: capabilitiesQuery.capabilities,
    canManageLibrary: capabilitiesQuery.canManageLibrary,
    capabilitiesLoading: capabilitiesQuery.isLoading,
    capabilitiesError: capabilitiesQuery.error,
    items: queueQuery.data?.pages.flatMap((page) => page.data) ?? [],
    counts: queueQuery.data?.pages[0]?.meta.counts ?? {},
    queueQuery,
    detail: detailQuery.data?.data,
    detailQuery,
    transition: transitionMutation.mutateAsync,
    transitionPending: transitionMutation.isPending,
    assign: assignmentMutation.mutateAsync,
    assignmentPending: assignmentMutation.isPending,
  };
}
