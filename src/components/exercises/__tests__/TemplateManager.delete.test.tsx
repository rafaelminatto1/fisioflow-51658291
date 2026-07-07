/**
 * Testes de confirmação de exclusão de template (TemplateManager)
 * Task 5 — hoje o botão de excluir era um no-op; agora dispara delete real
 * após confirmação no AlertDialog exibido pelo TemplateDetailPanel.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TemplateManager } from "../TemplateManager";
import { useTemplateUIStore } from "@/stores/useTemplateUIStore";
import type { ExerciseTemplate } from "@/types/workers";

const { deleteMock, customTemplate } = vi.hoisted(() => {
  const customTemplate: ExerciseTemplate = {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Protocolo Ombro Personalizado",
    description: null,
    category: null,
    conditionName: null,
    templateVariant: null,
    clinicalNotes: null,
    contraindications: null,
    precautions: null,
    progressionNotes: null,
    evidenceLevel: null,
    bibliographicReferences: [],
    isActive: true,
    isPublic: false,
    organizationId: "org-1",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    templateType: "custom",
    patientProfile: "ortopedico",
    sourceTemplateId: null,
    isDraft: false,
    exerciseCount: 0,
  };
  return { deleteMock: vi.fn().mockResolvedValue({ data: null }), customTemplate };
});

import React from "react";

vi.mock("@/api/v2", () => ({
  templatesApi: {
    list: vi.fn().mockResolvedValue({ data: [customTemplate] }),
    get: vi.fn().mockResolvedValue({ data: customTemplate }),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock("../TemplateDetailPanel", () => {
  return {
    TemplateDetailPanel: ({ template, onDelete }: any) => {
      const [open, setOpen] = React.useState(false);
      if (!template) return null;
      return (
        <div>
          <button>Editar</button>
          <button onClick={() => setOpen(true)}>
            <svg className="lucide-trash-2" />
          </button>
          {open && (
            <div>
              <span>Excluir template?</span>
              <button onClick={onDelete}>Confirmar Exclusão</button>
            </div>
          )}
        </div>
      );
    }
  };
});

function renderManager() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TemplateManager />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  deleteMock.mockClear();
  useTemplateUIStore.setState({
    selectedTemplateId: null,
    activeProfile: "all",
    searchQuery: "",
    applyFlowOpen: false,
    createFlowOpen: false,
    createFlowSourceId: null,
  });
});

describe("TemplateManager — confirmação de exclusão", () => {
  it("abrir o diálogo de confirmação não chama templatesApi.delete imediatamente", async () => {
    renderManager();

    fireEvent.click(await screen.findByTestId("template-name"));

    // botão de lixeira é um ghost/icon button sem texto acessível; localizamos pelo ícone
    await screen.findByText("Editar");
    const buttons = screen.getAllByRole("button");
    const trashButton = buttons.find((b) => b.querySelector("svg.lucide-trash-2"));
    expect(trashButton).toBeTruthy();
    fireEvent.click(trashButton!);

    expect(await screen.findByText("Excluir template?")).toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("confirmar a exclusão chama templatesApi.delete com o id do template selecionado", async () => {
    renderManager();

    fireEvent.click(await screen.findByTestId("template-name"));

    await screen.findByText("Editar");
    const buttons = screen.getAllByRole("button");
    const trashButton = buttons.find((b) => b.querySelector("svg.lucide-trash-2"));
    fireEvent.click(trashButton!);

    await screen.findByText("Excluir template?");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar Exclusão" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(customTemplate.id));
  });
});
