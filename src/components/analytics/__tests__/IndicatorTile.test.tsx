import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IndicatorTile } from "../IndicatorTile";

describe("IndicatorTile", () => {
  it("sempre oferece ver lista, inclusive quando o valor é zero", () => {
    const onVerLista = vi.fn();
    render(<IndicatorTile label="Agendamentos sem evolução" value={0} onVerLista={onVerLista} />);

    const botao = screen.getByRole("button", { name: /ver lista/i });
    fireEvent.click(botao);
    expect(onVerLista).toHaveBeenCalledTimes(1);
  });

  it("oferece ver lista mesmo quando o indicador não tem valor calculável", () => {
    render(<IndicatorTile label="Intervalo médio" value={null} onVerLista={vi.fn()} />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver lista/i })).toBeInTheDocument();
  });

  it("formata número em pt-BR e aplica a unidade", () => {
    render(<IndicatorTile label="Faltas" value={12.5} unit="%" onVerLista={vi.fn()} />);
    expect(screen.getByText("12,5%")).toBeInTheDocument();
  });

  it("mostra o critério de cálculo quando fornecido", () => {
    render(
      <IndicatorTile
        label="Taxa de falta"
        value={9}
        criterio="faltou sobre atendido + faltas (cancelado excluído dos dois lados)"
        onVerLista={vi.fn()}
      />,
    );
    expect(screen.getByText(/cancelado excluído/i)).toBeInTheDocument();
  });

  it("mantém o acesso à lista durante o carregamento", () => {
    render(<IndicatorTile label="Faltas" value={null} isLoading onVerLista={vi.fn()} />);

    expect(screen.getByLabelText("Carregando")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ver lista/i })).toBeInTheDocument();
  });
});
