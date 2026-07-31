import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PlateauAlertCard } from "../PlateauAlertCard";
import type { PlateauCriterios, PlateauSignal } from "@/hooks/clinical/usePlateauSignals";

const criterios: PlateauCriterios = {
  conduta: "4 sessões consecutivas com a mesma conduta e região (acima do p95 do histórico)",
  dor: "variação de dor menor que 1 ponto na EVA (MCID, Salaffi et al. 2004)",
  carga: "nenhuma variação de carga em kg no período",
  eixos: "exige 2 eixos: só repetição de conduta gerou 51% de falso positivo",
};

function makeSignal(overrides: Partial<PlateauSignal> = {}): PlateauSignal {
  return {
    patientId: "p1",
    patientName: "Maria Silva",
    signature: ["cinesioterapia", "lombar"],
    consecutiveSessions: 5,
    firstDate: "2026-05-02",
    lastDate: "2026-06-10",
    loadStalled: true,
    painStalled: true,
    confirmingAxes: 3,
    status: "confirmado",
    ...overrides,
  };
}

describe("PlateauAlertCard", () => {
  it("mostra os critérios que justificam o alerta", () => {
    render(<PlateauAlertCard signal={makeSignal()} criterios={criterios} />);

    expect(screen.getByText(/Por que este alerta apareceu/i)).toBeInTheDocument();
    expect(screen.getByText(criterios.conduta)).toBeInTheDocument();
    expect(screen.getByText(criterios.dor)).toBeInTheDocument();
    expect(screen.getByText(criterios.carga)).toBeInTheDocument();
    expect(screen.getByText(criterios.eixos)).toBeInTheDocument();
  });

  it("distingue carga não medida (null) de carga que progrediu (false)", () => {
    const { rerender } = render(
      <PlateauAlertCard signal={makeSignal({ loadStalled: null })} criterios={criterios} />,
    );

    const naoMedido = screen.getByTestId("eixo-carga");
    expect(naoMedido).toHaveAttribute("data-estado", "nao_medido");
    expect(within(naoMedido).getByText(/não medida/i)).toBeInTheDocument();

    rerender(
      <PlateauAlertCard
        signal={makeSignal({ loadStalled: false, status: "progredindo", confirmingAxes: 1 })}
        criterios={criterios}
      />,
    );

    const progrediu = screen.getByTestId("eixo-carga");
    expect(progrediu).toHaveAttribute("data-estado", "progrediu");
    expect(within(progrediu).getByText(/progrediu/i)).toBeInTheDocument();
    // Os dois estados não podem produzir o mesmo texto.
    expect(within(progrediu).queryByText(/não medida/i)).not.toBeInTheDocument();
  });

  it("distingue dor não medida de dor que variou", () => {
    const { rerender } = render(
      <PlateauAlertCard signal={makeSignal({ painStalled: null })} criterios={criterios} />,
    );
    expect(screen.getByTestId("eixo-dor")).toHaveAttribute("data-estado", "nao_medido");

    rerender(<PlateauAlertCard signal={makeSignal({ painStalled: false })} criterios={criterios} />);
    expect(screen.getByTestId("eixo-dor")).toHaveAttribute("data-estado", "progrediu");
  });

  it("exibe paciente, período e conduta repetida", () => {
    render(<PlateauAlertCard signal={makeSignal()} criterios={criterios} />);

    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText(/5 sessões consecutivas/i)).toBeInTheDocument();
    expect(screen.getByText(/02\/05\/2026/)).toBeInTheDocument();
    expect(screen.getByText("cinesioterapia")).toBeInTheDocument();
  });

  it("dispara onVerPaciente com o id do paciente", () => {
    const onVerPaciente = vi.fn();
    render(
      <PlateauAlertCard signal={makeSignal()} criterios={criterios} onVerPaciente={onVerPaciente} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir prontuário/i }));
    expect(onVerPaciente).toHaveBeenCalledWith("p1");
  });
});
