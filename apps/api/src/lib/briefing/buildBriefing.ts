export type BriefingAppointment = {
  id: string;
  startTime: string | null;
  status: string;
  patientId: string | null;
};

export type BriefingRaw = {
  date: string;
  appointmentsToday: BriefingAppointment[];
  noShowsYesterday: number;
  inactivePatients: number;
};

export type Briefing = {
  date: string;
  total: number;
  countsByStatus: Record<string, number>;
  appointmentsToday: BriefingAppointment[];
  noShowsYesterday: number;
  inactivePatients: number;
  summary: string;
};

export function buildBriefing(raw: BriefingRaw): Briefing {
  const countsByStatus: Record<string, number> = {};
  for (const a of raw.appointmentsToday) {
    countsByStatus[a.status] = (countsByStatus[a.status] ?? 0) + 1;
  }
  const total = raw.appointmentsToday.length;
  const summary =
    `Hoje: ${total} ${total === 1 ? "atendimento" : "atendimentos"} agendado(s). ` +
    `Faltas ontem: ${raw.noShowsYesterday}. ` +
    `Pacientes inativos (30d+): ${raw.inactivePatients}.`;

  return {
    date: raw.date,
    total,
    countsByStatus,
    appointmentsToday: raw.appointmentsToday,
    noShowsYesterday: raw.noShowsYesterday,
    inactivePatients: raw.inactivePatients,
    summary,
  };
}
