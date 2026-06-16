import type { Briefing } from "./buildBriefing";

export function formatBriefingEmail(briefing: Briefing): { subject: string; html: string } {
  const subject = `Briefing do dia — ${briefing.date}`;
  const statusRows = Object.entries(briefing.countsByStatus)
    .map(([s, n]) => `<li>${s}: <strong>${n}</strong></li>`)
    .join("");
  const html = `
    <h2>Bom dia! Seu briefing de ${briefing.date}</h2>
    <p>${briefing.summary}</p>
    <h3>Agenda de hoje (${briefing.total})</h3>
    <ul>${statusRows || "<li>Sem atendimentos agendados.</li>"}</ul>
    <h3>Atenção</h3>
    <ul>
      <li>Faltas ontem: <strong>${briefing.noShowsYesterday}</strong></li>
      <li>Pacientes inativos (30 dias+): <strong>${briefing.inactivePatients}</strong></li>
    </ul>
    <hr><p><small>FisioFlow — Morning Briefing</small></p>
  `;
  return { subject, html };
}
