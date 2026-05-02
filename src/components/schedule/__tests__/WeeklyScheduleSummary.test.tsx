import { render, screen } from "@testing-library/react";
import { WeeklyScheduleSummary } from "../WeeklyScheduleSummary";
import { describe, expect, it } from "vitest";

const appointments = [
  { status: "confirmado", date: "2026-05-01", time: "09:00" },
  { status: "agendado", date: "2026-05-02", time: "10:00" },
  { status: "cancelado", date: "2026-05-03", time: "11:00" },
  { status: "confirmado", date: "2026-05-04", time: "14:00", is_group: true },
];

describe("WeeklyScheduleSummary", () => {
  it("renders weekly period and appointment metrics", () => {
    render(
      <WeeklyScheduleSummary currentDate={new Date("2026-05-01T10:00:00")} appointments={appointments} />,
    );

    expect(screen.getByText(/Semana ativa/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmados/i)).toBeInTheDocument();
    expect(screen.getByText(/Em espera/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Grupos/i).length).toBeGreaterThan(0);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
