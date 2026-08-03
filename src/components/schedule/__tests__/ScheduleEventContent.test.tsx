import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScheduleEventContent } from "../ScheduleEventContent";

const base = {
  title: "Ana Júlia",
  timeText: "08:00 - 09:00",
  isAllDay: false,
  isGroup: false,
  isTask: false,
  colors: { background: "transparent", accent: "#2563eb", text: "inherit" },
  isSelected: false,
};

describe("ScheduleEventContent — conteúdo condicional", () => {
  it("mostra telefone quando show.phone e phone presentes", () => {
    render(
      <ScheduleEventContent
        {...base}
        phone="11999990000"
        show={{ duration: false, type: false, phone: true }}
      />,
    );
    expect(screen.getByText(/11999990000/)).toBeInTheDocument();
  });
  it("oculta telefone quando show.phone=false", () => {
    render(
      <ScheduleEventContent
        {...base}
        phone="11999990000"
        show={{ duration: false, type: false, phone: false }}
      />,
    );
    expect(screen.queryByText(/11999990000/)).toBeNull();
  });
  it("mostra duração quando show.duration", () => {
    render(
      <ScheduleEventContent
        {...base}
        durationLabel="50min"
        show={{ duration: true, type: false, phone: false }}
      />,
    );
    expect(screen.getByText(/50min/)).toBeInTheDocument();
  });
});

describe("ScheduleEventContent — pendências clínicas", () => {
  it("não desenha nada quando não há pendência — badge onipresente vira ruído", () => {
    const { container } = render(<ScheduleEventContent {...base} />);
    expect(container.querySelector(".fc-event-pendencies")).toBeNull();
  });

  it("não desenha nada com lista vazia", () => {
    const { container } = render(<ScheduleEventContent {...base} pendencyFlags={[]} />);
    expect(container.querySelector(".fc-event-pendencies")).toBeNull();
  });

  it("expõe o critério no tooltip, não só o ícone", () => {
    render(
      <ScheduleEventContent
        {...base}
        pendencyFlags={["sem_evolucao"]}
        pendencyTitle="Sem evolução: atendimento já realizado e nenhuma evolução escrita"
      />,
    );
    expect(
      screen.getByLabelText(/Sem evolução: atendimento já realizado/),
    ).toBeInTheDocument();
  });

  it("agrupa os dois sinais num único selo, sem texto — visão de semana é apertada", () => {
    const { container } = render(
      <ScheduleEventContent
        {...base}
        pendencyFlags={["sem_evolucao", "plato"]}
        pendencyTitle="Sem evolução\nPlatô"
      />,
    );
    const badge = container.querySelector(".fc-event-pendencies");
    expect(badge).not.toBeNull();
    expect(badge?.querySelectorAll("svg")).toHaveLength(2);
    expect(badge?.textContent).toBe("");
  });
});
