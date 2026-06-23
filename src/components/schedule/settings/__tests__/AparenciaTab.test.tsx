import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AparenciaTab } from "../tabs/AparenciaTab";
import type { TabSaveHandle } from "../types";

const applyToAllViews = vi.fn();
const resetAll = vi.fn();
const setCardSize = vi.fn();
const setDisplay = vi.fn();

const DEFAULT_DISPLAY = {
  showDuration: true,
  showType: true,
  showPhone: false,
  nowIndicator: true,
  businessHours: true,
  hideSunday: true,
};

vi.mock("@/hooks/useAgendaAppearancePersistence", () => ({
  useAgendaAppearancePersistence: () => ({
    appearance: { cardSize: "medium", heightScale: 5, fontScale: 5, paddingScale: 5, opacity: 100 },
    applyToAllViews,
    resetAll,
    setCardSize,
    setDisplay,
    display: DEFAULT_DISPLAY,
    isSyncing: false,
    lastSyncedAt: null,
  }),
}));

beforeEach(() => {
  applyToAllViews.mockClear();
  resetAll.mockClear();
  setCardSize.mockClear();
  setDisplay.mockClear();
});

describe("AparenciaTab", () => {
  it("renderiza e registra handle não-dirty (auto-save)", () => {
    const handles: (TabSaveHandle | null)[] = [];
    render(<AparenciaTab registerHandle={(h) => handles.push(h)} />);
    expect(screen.getByText("Aparência da Agenda")).toBeInTheDocument();
    const last = handles.filter(Boolean).pop();
    expect(last?.isDirty).toBe(false);
  });

  it("escolher densidade aplica na visão ativa (setCardSize) — modelo por-visão", () => {
    render(<AparenciaTab registerHandle={() => {}} />);
    fireEvent.click(screen.getByText("Compacto"));
    expect(setCardSize).toHaveBeenCalledWith("small");
  });

  it("Restaurar padrões chama resetAll", () => {
    render(<AparenciaTab registerHandle={() => {}} />);
    fireEvent.click(screen.getByText("Restaurar padrões"));
    expect(resetAll).toHaveBeenCalledTimes(1);
  });
});
