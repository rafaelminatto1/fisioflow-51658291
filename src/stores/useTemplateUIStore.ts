/**
 * Zustand store para gerenciamento de estado de UI dos templates de exercício
 * @module stores/useTemplateUIStore
 */

// =====================================================================
// STORE STATE
// =====================================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PatientProfileCategory } from "@/types/workers";

interface TemplateUIStore {
  // State
  selectedTemplateId: string | null;
  activeProfile: PatientProfileCategory | "all";
  searchQuery: string;
  applyFlowOpen: boolean;
  createFlowOpen: boolean;
  createFlowSourceId: string | null;

  // Actions
  setSelectedTemplate: (id: string | null) => void;
  setActiveProfile: (p: PatientProfileCategory | "all") => void;
  setSearchQuery: (q: string) => void;
  openApplyFlow: () => void;
  closeApplyFlow: () => void;
  openCreateFlow: (sourceId?: string) => void;
  closeCreateFlow: () => void;
}

// =====================================================================
// STORE
// =====================================================================

export const useTemplateUIStore = create<TemplateUIStore>()(
  devtools(
    (set) => ({
      // Initial state
      selectedTemplateId: null,
      activeProfile: "all",
      searchQuery: "",
      applyFlowOpen: false,
      createFlowOpen: false,
      createFlowSourceId: null,

      // Actions
      setSelectedTemplate: (id) => set({ selectedTemplateId: id }),

      setActiveProfile: (p) => set({ activeProfile: p }),

      setSearchQuery: (q) => set({ searchQuery: q }),

      openApplyFlow: () => set({ applyFlowOpen: true }),

      closeApplyFlow: () => set({ applyFlowOpen: false }),

      openCreateFlow: (sourceId) =>
        set({
          createFlowOpen: true,
          createFlowSourceId: sourceId ?? null,
        }),

      closeCreateFlow: () =>
        set({
          createFlowOpen: false,
          createFlowSourceId: null,
        }),
    }),
    { name: "TemplateUIStore" },
  ),
);

// =====================================================================
// SELECTORS
// =====================================================================

export const selectSelectedTemplateId = (state: TemplateUIStore) => state.selectedTemplateId;

export const selectActiveProfile = (state: TemplateUIStore) => state.activeProfile;

export const selectSearchQuery = (state: TemplateUIStore) => state.searchQuery;

export const selectApplyFlowOpen = (state: TemplateUIStore) => state.applyFlowOpen;

export const selectCreateFlowOpen = (state: TemplateUIStore) => state.createFlowOpen;

export const selectCreateFlowSourceId = (state: TemplateUIStore) => state.createFlowSourceId;

// =====================================================================
// EXPORTS
// =====================================================================

export default useTemplateUIStore;
