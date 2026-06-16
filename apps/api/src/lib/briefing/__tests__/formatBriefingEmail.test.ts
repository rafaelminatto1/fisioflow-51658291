import { describe, it, expect } from "vitest";
import { formatBriefingEmail } from "../formatBriefingEmail";
import type { Briefing } from "../buildBriefing";

const briefing: Briefing = {
  date: "2026-06-16",
  total: 2,
  countsByStatus: { agendado: 1, atendido: 1 },
  appointmentsToday: [],
  noShowsYesterday: 1,
  inactivePatients: 4,
  summary: "resumo",
};

describe("formatBriefingEmail", () => {
  it("builds subject and html with the day's data", () => {
    const { subject, html } = formatBriefingEmail(briefing);
    expect(subject).toContain("2026-06-16");
    expect(html).toContain("agendado");
    expect(html).toContain("Faltas ontem: <strong>1</strong>");
    expect(html).toContain("inativos (30 dias+): <strong>4</strong>");
  });

  it("shows a fallback when there are no appointments", () => {
    const { html } = formatBriefingEmail({ ...briefing, total: 0, countsByStatus: {} });
    expect(html).toContain("Sem atendimentos agendados");
  });
});
