const STATUS_MAP: Record<string, { status: string; createsSession: boolean }> = {
  "evolução": { status: "atendido", createsSession: true },
  "evolucao": { status: "atendido", createsSession: true },
  "avaliação": { status: "avaliacao", createsSession: true },
  "avaliacao": { status: "avaliacao", createsSession: true },
  "atendido": { status: "atendido", createsSession: true },
  "presença": { status: "presenca_confirmada", createsSession: true },
  "presenca": { status: "presenca_confirmada", createsSession: true },
  "faltou": { status: "faltou", createsSession: false },
  "não atendido": { status: "nao_atendido", createsSession: false },
  "nao atendido": { status: "nao_atendido", createsSession: false },
  "agendado": { status: "agendado", createsSession: false },
  "cancelado": { status: "cancelado", createsSession: false },
  "remarcar": { status: "remarcar", createsSession: false },
};

export function mapTipoToAppointmentStatus(tipo: string): { status: string; createsSession: boolean } {
  return STATUS_MAP[(tipo ?? "").trim().toLowerCase()] ?? { status: "nao_atendido", createsSession: false };
}

export function mapTipoToAppointmentType(tipo: string): "evaluation" | "session" {
  const t = (tipo ?? "").trim().toLowerCase();
  return t === "avaliação" || t === "avaliacao" ? "evaluation" : "session";
}

export function parseZenfisioDateTime(
  dataCompleta: string | undefined,
  dataFallback: string | undefined,
): { date: string; startTime: string | null } | null {
  const source = (dataCompleta ?? dataFallback ?? "").trim();
  if (!source) return null;
  const match = source.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  const day = Number(dd), month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return {
    date: `${yyyy}-${mm}-${dd}`,
    startTime: hh && min ? `${hh}:${min}` : null,
  };
}
