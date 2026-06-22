import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AtendimentosTab } from "../tabs/AtendimentosTab";

const addType = vi.fn();

vi.mock("@/hooks/useAppointmentTypes", () => ({
  useAppointmentTypes: () => ({
    types: [],
    isLoading: false,
    addType,
    updateType: vi.fn(),
    removeType: vi.fn(),
    toggleActive: vi.fn(),
    duplicateType: vi.fn(),
  }),
}));

vi.mock("@/hooks/useStatusConfig", () => ({
  useStatusConfig: () => ({
    allStatusRows: [],
    updateStatus: vi.fn(),
    deleteStatus: vi.fn(),
    createStatus: vi.fn(),
    isLoading: false,
    isSaving: false,
  }),
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("AtendimentosTab", () => {
  it("clicar 'Novo tipo' chama addType", () => {
    wrap(<AtendimentosTab registerHandle={vi.fn()} />);
    fireEvent.click(screen.getByText("Novo tipo"));
    expect(addType).toHaveBeenCalledOnce();
  });
});
