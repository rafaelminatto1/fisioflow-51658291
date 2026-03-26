/**
 * Testes unitários para useTemplateUIStore
 * Validates: Requirements 4.1, 5.2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useTemplateUIStore } from "./useTemplateUIStore";

const initialState = {
  selectedTemplateId: null,
  activeProfile: "all" as const,
  searchQuery: "",
  applyFlowOpen: false,
  createFlowOpen: false,
  createFlowSourceId: null,
};

beforeEach(() => {
  useTemplateUIStore.setState(initialState);
});

describe("useTemplateUIStore", () => {
  describe("estado inicial", () => {
    it("deve ter todos os campos com valores padrão corretos", () => {
      const state = useTemplateUIStore.getState();
      expect(state.selectedTemplateId).toBeNull();
      expect(state.activeProfile).toBe("all");
      expect(state.searchQuery).toBe("");
      expect(state.applyFlowOpen).toBe(false);
      expect(state.createFlowOpen).toBe(false);
      expect(state.createFlowSourceId).toBeNull();
    });
  });

  describe("setSelectedTemplate", () => {
    it("deve atualizar selectedTemplateId com um id", () => {
      useTemplateUIStore.getState().setSelectedTemplate("template-123");
      expect(useTemplateUIStore.getState().selectedTemplateId).toBe("template-123");
    });

    it("deve limpar selectedTemplateId quando null é passado", () => {
      useTemplateUIStore.getState().setSelectedTemplate("template-123");
      useTemplateUIStore.getState().setSelectedTemplate(null);
      expect(useTemplateUIStore.getState().selectedTemplateId).toBeNull();
    });
  });

  describe("setActiveProfile", () => {
    it("deve atualizar activeProfile", () => {
      useTemplateUIStore.getState().setActiveProfile("ortopedico");
      expect(useTemplateUIStore.getState().activeProfile).toBe("ortopedico");
    });
  });

  describe("setSearchQuery", () => {
    it("deve atualizar searchQuery", () => {
      useTemplateUIStore.getState().setSearchQuery("lombalgia");
      expect(useTemplateUIStore.getState().searchQuery).toBe("lombalgia");
    });
  });

  describe("openApplyFlow / closeApplyFlow", () => {
    it("openApplyFlow deve setar applyFlowOpen = true", () => {
      useTemplateUIStore.getState().openApplyFlow();
      expect(useTemplateUIStore.getState().applyFlowOpen).toBe(true);
    });

    it("closeApplyFlow deve setar applyFlowOpen = false", () => {
      useTemplateUIStore.getState().openApplyFlow();
      useTemplateUIStore.getState().closeApplyFlow();
      expect(useTemplateUIStore.getState().applyFlowOpen).toBe(false);
    });
  });

  describe("openCreateFlow", () => {
    it("sem sourceId deve setar createFlowOpen = true e createFlowSourceId = null", () => {
      useTemplateUIStore.getState().openCreateFlow();
      const state = useTemplateUIStore.getState();
      expect(state.createFlowOpen).toBe(true);
      expect(state.createFlowSourceId).toBeNull();
    });

    it("com sourceId deve setar createFlowOpen = true e createFlowSourceId com o valor", () => {
      useTemplateUIStore.getState().openCreateFlow("some-id");
      const state = useTemplateUIStore.getState();
      expect(state.createFlowOpen).toBe(true);
      expect(state.createFlowSourceId).toBe("some-id");
    });
  });

  describe("closeCreateFlow", () => {
    it("deve setar createFlowOpen = false e resetar createFlowSourceId = null", () => {
      useTemplateUIStore.getState().openCreateFlow();
      useTemplateUIStore.getState().closeCreateFlow();
      const state = useTemplateUIStore.getState();
      expect(state.createFlowOpen).toBe(false);
      expect(state.createFlowSourceId).toBeNull();
    });

    it("após openCreateFlow('some-id') deve limpar createFlowSourceId", () => {
      useTemplateUIStore.getState().openCreateFlow("some-id");
      expect(useTemplateUIStore.getState().createFlowSourceId).toBe("some-id");

      useTemplateUIStore.getState().closeCreateFlow();
      const state = useTemplateUIStore.getState();
      expect(state.createFlowOpen).toBe(false);
      expect(state.createFlowSourceId).toBeNull();
    });
  });
});
