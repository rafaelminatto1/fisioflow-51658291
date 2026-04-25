import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wikiService } from "@/lib/services/wikiService";
import { toast } from "sonner";
import type { WikiPage } from "@/types/wiki";
import {
  buildTriageDropPlan,
  calculateAverageTimeInColumnDays,
  calculateLeadTimeDays,
  countDoneThisWeek,
  filterTriagePages,
  getTriageStatus,
  sortByTriageOrder,
  type TriageFilters,
  type TriageStatus,
} from "@/features/wiki/triage/triageUtils";
import type { DropResult } from "@hello-pangea/dnd";

const TRIAGE_WIP_LIMITS: Record<TriageStatus, number> = {
  backlog: 30,
  "in-progress": 10,
  done: 999,
};

export function useWikiTriage(
  pages: WikiPage[],
  currentOrganizationId?: string | null,
  currentUserId?: string | null,
) {
  const queryClient = useQueryClient();
  const [triageTemplateFilter, setTriageTemplateFilter] = useState<string>("all");
  const [triageOwnerFilter, setTriageOwnerFilter] = useState<string>("all");
  const [triageTagFilter, setTriageTagFilter] = useState<string>("");
  const [triageTextFilter, setTriageTextFilter] = useState<string>("");

  const { data: triageEvents = [] } = useQuery({
    queryKey: ["wiki-triage-events", currentOrganizationId],
    queryFn: () =>
      currentOrganizationId
        ? wikiService.listTriageEvents(currentOrganizationId, 20)
        : Promise.resolve([]),
    enabled: !!currentOrganizationId,
  });

  const triagePages = useMemo(
    () => pages.filter((page) => page.category === "triage" || page.tags.includes("triage")),
    [pages],
  );

  const triageFilters = useMemo<TriageFilters>(
    () => ({
      templateId: triageTemplateFilter,
      ownerId: triageOwnerFilter,
      tagQuery: triageTagFilter,
      textQuery: triageTextFilter,
    }),
    [triageTemplateFilter, triageOwnerFilter, triageTagFilter, triageTextFilter],
  );

  const filteredTriagePages = useMemo(
    () => filterTriagePages(triagePages, triageFilters),
    [triagePages, triageFilters],
  );

  const triageBuckets = useMemo<Record<TriageStatus, WikiPage[]>>(() => {
    const buckets = {
      backlog: [] as WikiPage[],
      "in-progress": [] as WikiPage[],
      done: [] as WikiPage[],
    };

    filteredTriagePages.forEach((page) => {
      const status = getTriageStatus(page);
      buckets[status].push(page);
    });

    buckets.backlog.sort(sortByTriageOrder);
    buckets["in-progress"].sort(sortByTriageOrder);
    buckets.done.sort(sortByTriageOrder);

    return buckets;
  }, [filteredTriagePages]);

  const allTriageBuckets = useMemo<Record<TriageStatus, WikiPage[]>>(() => {
    const buckets = {
      backlog: [] as WikiPage[],
      "in-progress": [] as WikiPage[],
      done: [] as WikiPage[],
    };

    triagePages.forEach((page) => {
      buckets[getTriageStatus(page)].push(page);
    });
    buckets.backlog.sort(sortByTriageOrder);
    buckets["in-progress"].sort(sortByTriageOrder);
    buckets.done.sort(sortByTriageOrder);
    return buckets;
  }, [triagePages]);

  const triageOwnerOptions = useMemo(
    () => Array.from(new Set(triagePages.map((page) => page.created_by).filter(Boolean))).sort(),
    [triagePages],
  );

  const hasActiveTriageFilters = useMemo(
    () =>
      triageTemplateFilter !== "all" ||
      triageOwnerFilter !== "all" ||
      triageTagFilter.trim().length > 0 ||
      triageTextFilter.trim().length > 0,
    [triageTemplateFilter, triageOwnerFilter, triageTagFilter, triageTextFilter],
  );

  const triageMetrics = useMemo(() => {
    const avgBacklog = calculateAverageTimeInColumnDays(triagePages, "backlog");
    const avgInProgress = calculateAverageTimeInColumnDays(triagePages, "in-progress");
    const avgDone = calculateAverageTimeInColumnDays(triagePages, "done");
    const leadTime = calculateLeadTimeDays(triagePages);
    const doneThisWeek = countDoneThisWeek(triagePages);
    return { avgBacklog, avgInProgress, avgDone, leadTime, doneThisWeek };
  }, [triagePages]);

  const wipAlerts = useMemo(
    () => ({
      backlog: triageBuckets.backlog.length > TRIAGE_WIP_LIMITS.backlog,
      "in-progress": triageBuckets["in-progress"].length > TRIAGE_WIP_LIMITS["in-progress"],
      done: triageBuckets.done.length > TRIAGE_WIP_LIMITS.done,
    }),
    [triageBuckets],
  );

  const buildTriageEventPayloads = (
    updates: Array<{ id: string; triage_order: number; tags: string[] }>,
    source: "drag" | "quick-action",
    reason?: string,
  ) => {
    const beforeMap = new Map(triagePages.map((page) => [page.id, page]));
    return updates
      .map((update) => {
        const before = beforeMap.get(update.id);
        if (!before) return null;

        const fromStatus = getTriageStatus(before);
        const afterStatus = getTriageStatus({ tags: update.tags } as Pick<WikiPage, "tags">);
        if (fromStatus === afterStatus) return null;

        return {
          page_id: before.id,
          page_title: before.title,
          template_id: before.template_id,
          from_status: fromStatus,
          to_status: afterStatus,
          previous_order: before.triage_order,
          next_order: update.triage_order,
          source,
          reason,
        };
      })
      .filter((event): event is NonNullable<typeof event> => Boolean(event));
  };

  const handleTriageDragEnd = async (result: DropResult) => {
    if (!currentOrganizationId || !currentUserId) return;
    if (!result.destination) return;
    if (hasActiveTriageFilters) {
      toast.error("Desative os filtros para reordenar o board.");
      return;
    }

    const sourceStatus = result.source.droppableId as TriageStatus;
    const destinationStatus = result.destination.droppableId as TriageStatus;
    if (sourceStatus === destinationStatus && result.source.index === result.destination.index)
      return;

    try {
      const updates = buildTriageDropPlan({
        draggableId: result.draggableId,
        sourceStatus,
        destinationStatus,
        destinationIndex: result.destination.index,
        buckets: triageBuckets,
      });
      if (updates.length === 0) return;

      await wikiService.updateTriageOrdering(currentOrganizationId, currentUserId, updates);
      const events = buildTriageEventPayloads(updates, "drag", "card-moved");
      await wikiService.recordTriageEvents(currentOrganizationId, currentUserId, events);

      await queryClient.invalidateQueries({
        queryKey: ["wiki-pages", currentOrganizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["wiki-triage-events", currentOrganizationId],
      });
      toast.success("Triagem atualizada.");
    } catch (error) {
      console.error("Erro ao mover card da triagem:", error);
      toast.error("Não foi possível atualizar o status da triagem.");
    }
  };

  const handleQuickStatusChange = async (page: WikiPage, destinationStatus: TriageStatus) => {
    if (!currentOrganizationId || !currentUserId) return;
    const sourceStatus = getTriageStatus(page);
    if (sourceStatus === destinationStatus) return;

    const updates = buildTriageDropPlan({
      draggableId: page.id,
      sourceStatus,
      destinationStatus,
      destinationIndex: allTriageBuckets[destinationStatus].length,
      buckets: allTriageBuckets,
    });

    if (updates.length === 0) return;

    try {
      await wikiService.updateTriageOrdering(currentOrganizationId, currentUserId, updates);
      const events = buildTriageEventPayloads(updates, "quick-action", "quick-status-change");
      await wikiService.recordTriageEvents(currentOrganizationId, currentUserId, events);
      await queryClient.invalidateQueries({
        queryKey: ["wiki-pages", currentOrganizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["wiki-triage-events", currentOrganizationId],
      });
      toast.success("Status atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar status rápido:", error);
      toast.error("Não foi possível atualizar o status.");
    }
  };

  return {
    triagePages,
    triageBuckets,
    triageEvents,
    triageMetrics,
    wipAlerts,
    triageFilters: {
      template: triageTemplateFilter,
      owner: triageOwnerFilter,
      tag: triageTagFilter,
      text: triageTextFilter,
    },
    setTriageFilters: {
      setTemplate: setTriageTemplateFilter,
      setOwner: setTriageOwnerFilter,
      setTag: setTriageTagFilter,
      setText: setTriageTextFilter,
    },
    triageOwnerOptions,
    hasActiveTriageFilters,
    handleTriageDragEnd,
    handleQuickStatusChange,
  };
}
