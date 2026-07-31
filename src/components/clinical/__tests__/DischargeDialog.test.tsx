import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { DischargeDialog } from "../DischargeDialog";
import { request } from "@/api/v2/base";

vi.mock("@/api/v2/base", () => ({ request: vi.fn() }));

const requestMock = vi.mocked(request);

const REASONS = [
  { value: "alta_objetivo_atingido", label: "Alta — objetivo atingido" },
  { value: "alta_maximo_funcional", label: "Alta — máximo funcional atingido" },
  { value: "interrompido_paciente", label: "Interrompido pelo paciente" },
];

const SUGGESTION = {
  baselineSummary: "LB: dor 7/10 ao subir escada, ADM flexão 90°",
  painInitial: 7,
  painFinal: 2,
  sessionsCount: 14,
  firstSessionAt: "2026-03-02",
  lastSessionAt: "2026-06-20",
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockImplementation(async (path: string) => {
    if (path.includes("/discharge/reasons")) return { data: REASONS } as never;
    if (path.includes("/discharge/suggestion")) return { data: SUGGESTION } as never;
    return { data: { id: "d1" } } as never;
  });
});

describe("DischargeDialog", () => {
  it("pré-preenche linha de base e EVA a partir da sugestão", async () => {
    render(
      <DischargeDialog open onOpenChange={vi.fn()} patientId="p1" patientName="Maria Silva" />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/linha de base/i)).toHaveValue(SUGGESTION.baselineSummary);
    });
    expect(screen.getByLabelText(/EVA inicial/i)).toHaveValue(7);
    expect(screen.getByLabelText(/EVA final/i)).toHaveValue(2);
    expect(screen.getByText(/14 sessões registradas/)).toBeInTheDocument();
  });

  it("lista os motivos vindos do servidor e exige um antes de registrar", async () => {
    render(<DischargeDialog open onOpenChange={vi.fn()} patientId="p1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText("Alta — objetivo atingido")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /registrar alta/i })).toBeDisabled();
  });

  it("envia o motivo escolhido e os campos confirmados", async () => {
    const onOpenChange = vi.fn();
    render(
      <DischargeDialog open onOpenChange={onOpenChange} patientId="p1" sessionId="s9" />,
      { wrapper },
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Alta — máximo funcional atingido")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Alta — máximo funcional atingido"));
    fireEvent.change(screen.getByLabelText(/situação na alta/i), {
      target: { value: "Sem dor, subindo escada sem apoio" },
    });

    const botao = screen.getByRole("button", { name: /registrar alta/i });
    await waitFor(() => expect(botao).toBeEnabled());
    fireEvent.click(botao);

    await waitFor(() => {
      const post = requestMock.mock.calls.find(
        ([path, init]) => path === "/api/clinical/discharge" && init?.method === "POST",
      );
      expect(post).toBeTruthy();
      const body = JSON.parse(String(post![1]!.body));
      expect(body.patientId).toBe("p1");
      expect(body.sessionId).toBe("s9");
      expect(body.reason).toBe("alta_maximo_funcional");
      expect(body.painInitial).toBe(7);
      expect(body.painFinal).toBe(2);
      expect(body.finalSummary).toBe("Sem dor, subindo escada sem apoio");
    });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("não cria um segundo scroll dentro do modal", async () => {
    const { baseElement } = render(
      <DischargeDialog open onOpenChange={vi.fn()} patientId="p1" />,
      { wrapper },
    );

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    const scrollers = baseElement.querySelectorAll(".overflow-y-auto");
    // O DialogContent do projeto já fornece o único scroller do modal.
    expect(scrollers.length).toBeLessThanOrEqual(1);
  });
});
