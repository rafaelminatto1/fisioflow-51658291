import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AparenciaTab } from "../tabs/AparenciaTab";
import type { TabSaveHandle } from "../types";

const applyToAllViews = vi.fn();
const resetAll = vi.fn();

vi.mock("@/hooks/useAgendaAppearancePersistence", () => ({
  useAgendaAppearancePersistence: () => ({
    appearance: { cardSize: "medium", heightScale: 5 },
    applyToAllViews,
    resetAll,
    isSyncing: false,
    lastSyncedAt: null,
  }),
}));

beforeEach(() => {
  applyToAllViews.mockClear();
  resetAll.mockClear();
});

describe("AparenciaTab", () => {
  it("renderiza e registra handle não-dirty (auto-save)", () => {
    const handles: (TabSaveHandle | null)[] = [];
    render(<AparenciaTab registerHandle={(h) => handles.push(h)} />);
    expect(screen.getByText("Aparência da Agenda")).toBeInTheDocument();
    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(false);
  });

  it("escolher densidade aplica a TODAS as visões (applyToAllViews)", () => {
    render(<AparenciaTab registerHandle={() => {}} />);
    fireEvent.click(screen.getByText("Compacto"));
    expect(applyToAllViews).toHaveBeenCalledWith({ cardSize: "small" });
  });

  it("Restaurar padrões chama resetAll", () => {
    render(<AparenciaTab registerHandle={() => {}} />);
    fireEvent.click(screen.getByText("Restaurar padrões"));
    expect(resetAll).toHaveBeenCalledTimes(1);
  });
});
