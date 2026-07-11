import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EvolutionHeaderV3 } from "../EvolutionHeaderV3";

const baseProps = {
  patient: { id: "p1", full_name: "Maria Silva" } as any,
  appointment: { id: "a1", appointment_date: new Date().toISOString() } as any,
  treatmentDuration: "2 meses",
  evolutionStats: {
    totalEvolutions: 1,
    completedGoals: 0,
    totalGoals: 0,
    avgGoalProgress: 0,
    activePathologiesCount: 0,
    totalMeasurements: 0,
    completionRate: 100,
  },
  onComplete: vi.fn(),
  isSaving: false,
  isCompleting: false,
  autoSaveEnabled: true,
  toggleAutoSave: vi.fn(),
  lastSavedAt: null,
  onShowTemplateModal: vi.fn(),
  onShowKeyboardHelp: vi.fn(),
};

describe("EvolutionHeaderV3 — botão de ditado", () => {
  it("renderiza o botão Ditar e dispara onShowAIScribe ao clicar", () => {
    const onShowAIScribe = vi.fn();
    render(
      <MemoryRouter>
        <EvolutionHeaderV3 {...baseProps} onShowAIScribe={onShowAIScribe} />
      </MemoryRouter>,
    );
    const btn = screen.getByRole("button", { name: /ditar/i });
    fireEvent.click(btn);
    expect(onShowAIScribe).toHaveBeenCalledTimes(1);
  });
});
