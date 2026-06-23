import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AparenciaTab } from "../AparenciaTab";

vi.mock("@/api/v2/base", () => ({ request: vi.fn().mockResolvedValue({ data: null }) }));

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AparenciaTab registerHandle={() => {}} />
    </QueryClientProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe("AparenciaTab — ajustes finos", () => {
  it("expande 'Ajustes finos' e mostra os sliders de Fonte/Espaçamento/Opacidade", () => {
    renderTab();
    fireEvent.click(screen.getByText(/Ajustes finos/i));
    expect(screen.getByLabelText(/Fonte/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Espaçamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opacidade/i)).toBeInTheDocument();
  });

  it("mover o slider de Fonte persiste fontScale na visão ativa", () => {
    renderTab();
    fireEvent.click(screen.getByText(/Ajustes finos/i));
    fireEvent.change(screen.getByLabelText(/Fonte/i), { target: { value: "8" } });
    const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
    expect(saved.week.fontScale).toBe(8);
  });
});

describe("AparenciaTab — presets", () => {
  it("clicar no preset Denso aplica os valores na visão ativa", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Denso/i }));
    const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
    expect(saved.week.cardSize).toBe("small");
    expect(saved.week.heightScale).toBe(2);
    expect(saved.week.fontScale).toBe(4);
    expect(saved.week.paddingScale).toBe(2);
  });
});

describe("AparenciaTab — seção global", () => {
  it("alternar 'Mostrar telefone' persiste display.showPhone", () => {
    renderTab();
    const sw = screen.getByLabelText(/Mostrar telefone/i);
    fireEvent.click(sw);
    const saved = JSON.parse(localStorage.getItem("agenda_appearance_v2")!);
    expect(saved.display.showPhone).toBe(true);
  });
});

describe("AparenciaTab — preview", () => {
  it("preview aplica opacidade da visão ativa", () => {
    localStorage.setItem(
      "agenda_appearance_v2",
      JSON.stringify({
        global: { cardSize: "medium", heightScale: 5, fontScale: 5, opacity: 100 },
        week: { opacity: 40 },
      }),
    );
    renderTab();
    const preview = screen.getByTestId("aparencia-preview") as HTMLElement;
    expect(preview.style.opacity).toBe("0.4");
  });
});
