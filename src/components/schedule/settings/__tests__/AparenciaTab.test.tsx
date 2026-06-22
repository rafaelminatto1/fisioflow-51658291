import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AparenciaTab } from "../tabs/AparenciaTab";
import type { TabSaveHandle } from "../types";

const setCardSize = vi.fn();

vi.mock("@/hooks/useAgendaAppearancePersistence", () => ({
  useAgendaAppearancePersistence: () => ({
    appearance: { cardSize: "medium", heightScale: 5 },
    setCardSize,
    setHeightScale: vi.fn(),
    resetView: vi.fn(),
    resetAll: vi.fn(),
    isSyncing: false,
    lastSyncedAt: null,
  }),
}));

beforeEach(() => setCardSize.mockClear());

describe("AparenciaTab", () => {
  it("renderiza e registra handle não-dirty (auto-save)", () => {
    const handles: (TabSaveHandle | null)[] = [];
    render(<AparenciaTab registerHandle={(h) => handles.push(h)} />);
    expect(screen.getByText("Aparência da Agenda")).toBeInTheDocument();
    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(false);
  });

  it("escolher densidade chama setCardSize", () => {
    render(<AparenciaTab registerHandle={() => {}} />);
    fireEvent.click(screen.getByText("Compacto"));
    expect(setCardSize).toHaveBeenCalledWith("small");
  });
});
