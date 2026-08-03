import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClinicPendingPanel } from "../ClinicPendingPanel";

const usePatientPendingFilters = vi.fn();

vi.mock("@/hooks/patients/usePatientPendingFilters", () => ({
  usePatientPendingFilters: () => usePatientPendingFilters(),
}));

/** Contagens reais medidas em produção (03/ago/2026). */
const FILTROS = [
  {
    key: "semTelefone",
    label: "Sem telefone",
    criterio: "phone nulo ou vazio — bloqueia lembrete, confirmação e reativação por WhatsApp",
    count: 997,
  },
  {
    key: "semAvaliacaoEmReabilitacao",
    label: "Em reabilitação, sem avaliação",
    criterio: "exercício prescrito em ao menos 25% das sessões e sem avaliação com conteúdo",
    count: 157,
  },
  {
    key: "atendimentoSemEvolucao",
    label: "Com atendimento sem evolução",
    criterio: "agendamento 'atendido' sem nenhuma sessão ativa vinculada",
    count: 565,
  },
  {
    key: "ativoSemProximaSessao",
    label: "Ativo sem próxima sessão",
    criterio: "atendido nos últimos 60 dias e sem agendamento futuro",
    count: 165,
  },
  {
    key: "candidatoAlta",
    label: "Candidato a alta",
    criterio: "sem sessão há mais de 90 dias, sem retorno marcado e sem alta registrada",
    count: 613,
  },
  {
    key: "platoConfirmado",
    label: "Platô confirmado",
    criterio: "4 sessões com a mesma conduta, confirmadas por carga ou dor estagnada",
    count: 0,
  },
];

function comDados(overrides: Partial<Record<string, unknown>> = {}) {
  usePatientPendingFilters.mockReturnValue({
    data: { data: FILTROS, meta: { total: 1022, contrato: "mesmo predicado" } },
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

describe("ClinicPendingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    comDados();
  });

  it("mostra as seis pendências com a contagem ao lado do rótulo", () => {
    render(<ClinicPendingPanel value={null} onChange={vi.fn()} />);

    expect(screen.getByText("Sem telefone")).toBeInTheDocument();
    expect(screen.getByText("997")).toBeInTheDocument();
    expect(screen.getByText("Candidato a alta")).toBeInTheDocument();
    expect(screen.getByText("613")).toBeInTheDocument();
    expect(screen.getByText("Platô confirmado")).toBeInTheDocument();
  });

  it("expõe o critério de cada filtro em texto", () => {
    render(<ClinicPendingPanel value={null} onChange={vi.fn()} />);

    for (const filtro of FILTROS) {
      expect(screen.getByText(filtro.criterio)).toBeInTheDocument();
    }
  });

  it("clicar no tile aplica o filtro na lista em vez de abrir diálogo", async () => {
    const onChange = vi.fn();
    render(<ClinicPendingPanel value={null} onChange={onChange} />);

    const botoes = screen.getAllByRole("button", { name: /Filtrar lista/i });
    await userEvent.click(botoes[0]);

    expect(onChange).toHaveBeenCalledWith("semTelefone");
    // O painel não pode voltar a abrir um caminho paralelo para os mesmos nomes.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicar no filtro já aplicado remove o filtro", async () => {
    const onChange = vi.fn();
    render(<ClinicPendingPanel value="candidatoAlta" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: /Filtro aplicado/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  /**
   * Regra explícita do painel: contagem zero NÃO some. Esconder a opção faz a
   * pessoa concluir que o indicador não existe, quando o que existe é a boa
   * notícia de não haver pendência.
   */
  it("contagem zero fica visível e desabilitada, nunca escondida", () => {
    render(<ClinicPendingPanel value={null} onChange={vi.fn()} />);

    expect(screen.getByText("Platô confirmado")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();

    const botao = screen.getByRole("button", { name: /Sem pendência/i });
    expect(botao).toBeDisabled();
  });

  it("oferece remoção do filtro ativo fora dos tiles", async () => {
    const onChange = vi.fn();
    render(<ClinicPendingPanel value="semTelefone" onChange={onChange} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Remover filtro de pendência/i }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("sem filtro ativo não mostra o botão de remoção", () => {
    render(<ClinicPendingPanel value={null} onChange={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: /Remover filtro de pendência/i }),
    ).not.toBeInTheDocument();
  });

  it("erro de carga não derruba a lista de pacientes abaixo", () => {
    usePatientPendingFilters.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<ClinicPendingPanel value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/Não foi possível carregar as pendências/i)).toBeInTheDocument();
  });

  it("durante o carregamento os tiles existem, sem sumir do layout", () => {
    usePatientPendingFilters.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<ClinicPendingPanel value={null} onChange={vi.fn()} />);
    expect(screen.getAllByText("Carregando…")).toHaveLength(6);
  });
});
