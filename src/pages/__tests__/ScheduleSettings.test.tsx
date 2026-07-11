import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScheduleSettings from "@/pages/ScheduleSettings";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

vi.mock("@/components/schedule/settings/tabs/FuncionamentoTab", () => ({
  FuncionamentoTab: () => <div data-testid="tab-funcionamento" />,
}));
vi.mock("@/components/schedule/settings/tabs/AtendimentosTab", () => ({
  AtendimentosTab: () => <div data-testid="tab-atendimentos" />,
}));
vi.mock("@/components/schedule/settings/tabs/DisponibilidadeTab", () => ({
  DisponibilidadeTab: () => <div data-testid="tab-disponibilidade" />,
}));
vi.mock("@/components/schedule/settings/tabs/PoliticasTab", () => ({
  PoliticasTab: () => <div data-testid="tab-politicas" />,
}));
vi.mock("@/components/schedule/settings/tabs/AparenciaTab", () => ({
  AparenciaTab: () => <div data-testid="tab-aparencia" />,
}));
vi.mock("@/components/schedule/settings/OverviewStrip", () => ({
  OverviewStrip: () => <div data-testid="overview" />,
}));

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <ScheduleSettings />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ScheduleSettings shell", () => {
  it("renderiza o título e as 5 abas da navegação", () => {
    renderAt("/agenda/settings");
    expect(screen.getByText("Configurações")).toBeInTheDocument();
    expect(screen.getAllByText("Funcionamento").length).toBeGreaterThan(0);
    expect(screen.getByText("Atendimentos")).toBeInTheDocument();
    expect(screen.getByText("Disponibilidade")).toBeInTheDocument();
    expect(screen.getByText("Políticas")).toBeInTheDocument();
    expect(screen.getByText("Aparência")).toBeInTheDocument();
  });

  it("aba legada ?tab=horarios cai em Funcionamento sem crash", () => {
    renderAt("/agenda/settings?tab=horarios");
    expect(screen.getByTestId("tab-funcionamento")).toBeInTheDocument();
  });

  it("aba legada ?tab=visual cai em Aparência sem crash", () => {
    renderAt("/agenda/settings?tab=visual");
    expect(screen.getByTestId("tab-aparencia")).toBeInTheDocument();
  });
});
