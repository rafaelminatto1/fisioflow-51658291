/**
 * useAgendaAppearancePersistence
 *
 * Wraps `useAgendaAppearance` and adds cloud persistence via
 * GET/PUT /api/v1/user/agenda-appearance (Cloudflare Workers + Neon PostgreSQL).
 *
 * Features:
 * - Loads appearance profile from server on mount (TanStack Query 5)
 * - Merges server data with local state (server wins)
 * - Removes legacy localStorage keys after first successful sync
 * - Debounces writes to server (800ms) to avoid excessive requests during slider adjustments
 * - Optimistic update: updates local state before server response
 * - Rollback on failure + error toast via sonner
 * - Falls back to localStorage when server is unavailable
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { debounce } from "lodash-es";
import { toast } from "sonner";
import {
  useAgendaAppearance,
  type AgendaView,
  type UseAgendaAppearanceResult,
  type AgendaViewAppearance,
} from "@/hooks/useAgendaAppearance";
import { request } from "@/api/v2/base";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgendaAppearanceState {
  global: AgendaViewAppearance;
  day?: Partial<AgendaViewAppearance>;
  week?: Partial<AgendaViewAppearance>;
  month?: Partial<AgendaViewAppearance>;
}

interface GetAppearanceResponse {
  data: AgendaAppearanceState | null;
}

interface PutAppearanceResponse {
  data: { updatedAt: string };
}

export interface UseAgendaAppearancePersistenceResult extends UseAgendaAppearanceResult {
  isSyncing: boolean;
  isOffline: boolean;
  lastSyncedAt: Date | null;
  syncError: Error | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const AGENDA_APPEARANCE_QUERY_KEY = ["agenda-appearance"] as const;

const LEGACY_KEYS_TO_REMOVE = [
  "agenda_appearance_v2",
  "agenda_card_size",
  "agenda_card_height_multiplier",
  "agenda_card_font_scale",
  "agenda_card_opacity",
] as const;

const DEBOUNCE_MS = 800;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Merges server profile with local state, server wins.
 *
 * For every field present in serverProfile, the server value takes priority.
 * Local-only fields (not present in server) are preserved.
 *
 * Requirements 3.3 — server data takes priority over local state.
 */
export function mergeAppearanceState(
  serverProfile: AgendaAppearanceState,
  localState: AgendaAppearanceState,
): AgendaAppearanceState {
  return {
    // Server global wins over local global
    global: { ...localState.global, ...serverProfile.global },
    // For per-view overrides: if server has a value for the view, server wins
    // If server has undefined for a view, keep local (server hasn't set it)
    day:
      serverProfile.day !== undefined
        ? { ...(localState.day ?? {}), ...serverProfile.day }
        : localState.day,
    week:
      serverProfile.week !== undefined
        ? { ...(localState.week ?? {}), ...serverProfile.week }
        : localState.week,
    month:
      serverProfile.month !== undefined
        ? { ...(localState.month ?? {}), ...serverProfile.month }
        : localState.month,
  };
}

function removeLegacyKeys(): void {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS_TO_REMOVE) {
    localStorage.removeItem(key);
  }
}

/**
 * Writes state directly to localStorage and dispatches a storage event
 * so that useAgendaAppearance (which listens to storage events) picks it up.
 */
function applyStateViaStorage(state: AgendaAppearanceState): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(state);
  localStorage.setItem("agenda_appearance_v2", serialized);
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "agenda_appearance_v2",
      newValue: serialized,
    }),
  );
}

// ─── API functions ────────────────────────────────────────────────────────────

async function fetchAppearance(): Promise<AgendaAppearanceState | null> {
  const res = await request<GetAppearanceResponse>("/api/v1/user/agenda-appearance");
  return res.data;
}

async function putAppearance(state: AgendaAppearanceState): Promise<PutAppearanceResponse> {
  return request<PutAppearanceResponse>("/api/v1/user/agenda-appearance", {
    method: "PUT",
    body: JSON.stringify(state),
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook signature: `useAgendaAppearancePersistence(view: AgendaView = "day")`
 *
 * Extends `useAgendaAppearance` with cloud persistence.
 */
export function useAgendaAppearancePersistence(
  view: AgendaView = "day",
): UseAgendaAppearancePersistenceResult {
  const queryClient = useQueryClient();
  const baseHook = useAgendaAppearance(view);

  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const legacyRemovedRef = useRef(false);

  // Keep a ref to the latest raw state so the debounced save always uses fresh data
  const rawRef = useRef<AgendaAppearanceState>(baseHook.raw);
  useEffect(() => {
    rawRef.current = baseHook.raw;
  }, [baseHook.raw]);

  // ─── GET on mount ──────────────────────────────────────────────────────────
  const {
    data: serverData,
    isLoading: isQueryLoading,
    isError: isQueryError,
  } = useQuery({
    queryKey: AGENDA_APPEARANCE_QUERY_KEY,
    queryFn: fetchAppearance,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    staleTime: 5 * 60 * 1000,
  });

  // When server data arrives, merge with local state (server wins)
  useEffect(() => {
    if (serverData === undefined) return; // still loading

    if (serverData === null) {
      // New user — no server data yet; mark as online
      setIsOffline(false);
      setLastSyncedAt(new Date());
      // Remove legacy keys even for new users (first sync)
      if (!legacyRemovedRef.current) {
        removeLegacyKeys();
        legacyRemovedRef.current = true;
      }
      return;
    }

    // Merge server data into local state (server wins)
    const localRaw = rawRef.current;
    const merged = mergeAppearanceState(serverData, localRaw);

    // Apply merged state via localStorage + storage event
    // This triggers useAgendaAppearance's storage listener to re-read state
    applyStateViaStorage(merged);

    setIsOffline(false);
    setLastSyncedAt(new Date());

    // Remove legacy keys after first successful sync
    if (!legacyRemovedRef.current) {
      removeLegacyKeys();
      legacyRemovedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverData]);

  // Handle query error (server unavailable → offline mode)
  useEffect(() => {
    if (isQueryError) {
      setIsOffline(true);
    }
  }, [isQueryError]);

  // ─── PUT mutation with optimistic update ──────────────────────────────────
  const mutation = useMutation({
    mutationFn: putAppearance,
    onMutate: async (newState: AgendaAppearanceState) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: AGENDA_APPEARANCE_QUERY_KEY });

      // Snapshot previous server state for rollback
      const previousState = queryClient.getQueryData<AgendaAppearanceState | null>(
        AGENDA_APPEARANCE_QUERY_KEY,
      );

      // Optimistically update the query cache
      queryClient.setQueryData(AGENDA_APPEARANCE_QUERY_KEY, newState);

      return { previousState };
    },
    onError: (err, _newState, context) => {
      // Rollback: restore previous server state in cache
      if (context?.previousState !== undefined) {
        queryClient.setQueryData(AGENDA_APPEARANCE_QUERY_KEY, context.previousState);

        // Restore localStorage to previous state so the UI reverts
        if (context.previousState) {
          applyStateViaStorage(context.previousState);
        }
      }

      const error = err instanceof Error ? err : new Error(String(err));
      setSyncError(error);

      toast.error("Não foi possível salvar as configurações. Tente novamente.");
    },
    onSuccess: (data) => {
      setSyncError(null);
      setLastSyncedAt(new Date(data.data.updatedAt));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: AGENDA_APPEARANCE_QUERY_KEY });
    },
  });

  // ─── Debounced save ────────────────────────────────────────────────────────
  // Uses rawRef so it always captures the latest state at fire time
  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        mutation.mutate(rawRef.current);
      }, DEBOUNCE_MS),
    // mutation.mutate is stable; rawRef is a ref (stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // ─── Wrapped setters ──────────────────────────────────────────────────────
  // Each setter calls the base hook setter and then schedules a debounced save.

  const setCardSize = useCallback(
    (cardSize: Parameters<UseAgendaAppearanceResult["setCardSize"]>[0]) => {
      baseHook.setCardSize(cardSize);
      debouncedSave();
    },
    [baseHook, debouncedSave],
  );

  const setHeightScale = useCallback(
    (scale: number) => {
      baseHook.setHeightScale(scale);
      debouncedSave();
    },
    [baseHook, debouncedSave],
  );

  const setFontScale = useCallback(
    (scale: number) => {
      baseHook.setFontScale(scale);
      debouncedSave();
    },
    [baseHook, debouncedSave],
  );

  const setOpacity = useCallback(
    (value: number) => {
      baseHook.setOpacity(value);
      debouncedSave();
    },
    [baseHook, debouncedSave],
  );

  const setAll = useCallback(
    (next: Partial<AgendaViewAppearance>) => {
      baseHook.setAll(next);
      debouncedSave();
    },
    [baseHook, debouncedSave],
  );

  const applyToAllViews = useCallback(
    (values: Partial<AgendaViewAppearance>) => {
      baseHook.applyToAllViews(values);
      debouncedSave();
    },
    [baseHook, debouncedSave],
  );

  const resetView = useCallback(() => {
    baseHook.resetView();
    debouncedSave();
  }, [baseHook, debouncedSave]);

  const resetAll = useCallback(() => {
    baseHook.resetAll();
    debouncedSave();
  }, [baseHook, debouncedSave]);

  const isSyncing = isQueryLoading || mutation.isPending;

  return {
    // Spread base hook values
    view: baseHook.view,
    appearance: baseHook.appearance,
    fontPercentage: baseHook.fontPercentage,
    slotHeightPx: baseHook.slotHeightPx,
    cssVariables: baseHook.cssVariables,
    hasOverrideForView: baseHook.hasOverrideForView,
    raw: baseHook.raw,

    // Wrapped setters (trigger debounced save)
    setCardSize,
    setHeightScale,
    setFontScale,
    setOpacity,
    setAll,
    applyToAllViews,
    resetView,
    resetAll,

    // Persistence state
    isSyncing,
    isOffline,
    lastSyncedAt,
    syncError,
  };
}
