import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SOAPFormPanel } from "../SOAPFormPanel";

vi.mock("@/components/ai/MagicTextarea", () => ({
  MagicTextarea: ({
    value,
    onValueChange,
    placeholder,
    onFocus,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
    onFocus?: () => void;
  }) => (
    <textarea
      aria-label={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      onFocus={onFocus}
    />
  ),
}));

vi.mock("../ConductReplication", () => ({
  ConductReplication: ({ onSelectConduct }: { onSelectConduct: (conduct: string) => void }) => (
    <button type="button" onClick={() => onSelectConduct("Conduta replicada")}>
      Replicar Conduta
    </button>
  ),
}));

vi.mock("@/components/ai/SOAPAssistant", () => ({
  SOAPAssistant: ({
    onSOAPGenerated,
  }: {
    onSOAPGenerated: (data: Record<string, string>) => void;
  }) => (
    <button type="button" onClick={() => onSOAPGenerated({ assessment: "Gerado por IA" })}>
      Gerar SOAP
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="soap-assistant-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SOAPFormPanel", () => {
  const baseData = {
    subjective: "Dor ao subir escadas",
    objective: "",
    assessment: "",
    plan: "",
  };

  const onChange = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
    onSave.mockClear();
  });

  it("renders progress and save state", () => {
    render(
      <SOAPFormPanel
        patientId="patient-1"
        data={baseData}
        onChange={onChange}
        onSave={onSave}
        autoSaveEnabled
        lastSaved={new Date(2026, 2, 21, 10, 15)}
      />,
    );

    expect(screen.getByText("Registro SOAP")).toBeInTheDocument();
    expect(screen.getByText("1/4 campos")).toBeInTheDocument();
    expect(screen.getByText(/Salvo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("merges replicated conducts and assistant suggestions into the current SOAP", () => {
    render(
      <SOAPFormPanel patientId="patient-1" data={baseData} onChange={onChange} showReplication />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Replicar Conduta" }));
    expect(onChange).toHaveBeenCalledWith({
      ...baseData,
      plan: "Conduta replicada",
    });

    fireEvent.click(screen.getByRole("button", { name: /assistente soap/i }));
    expect(screen.getByTestId("soap-assistant-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Gerar SOAP" }));
    expect(onChange).toHaveBeenCalledWith({
      ...baseData,
      assessment: "Gerado por IA",
    });
  });
});
