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
  const match = source.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?\s*$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  const day = Number(dd), month = Number(mm), year = Number(yyyy);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  if (hh && min) {
    const hour = Number(hh), minute = Number(min);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  }

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }

  return {
    date: `${yyyy}-${mm}-${dd}`,
    startTime: hh && min ? `${hh}:${min}` : null,
  };
}

export type ScraperRecord = {
  data?: string;
  data_completa?: string;
  tipo: string;
  conteudo_texto?: string;
  appointment_id?: string;
};
export type ScraperPatient = { paciente_nome: string; paciente_id: string; historico: ScraperRecord[] };

export type LegacyEvolutionPayload = {
  date: string;
  startTime?: string;
  observacao?: string;
  appointmentStatus: string;
  appointmentType: "evaluation" | "session";
};
export type LegacyPatientPayload = {
  fullName: string;
  legacyId: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  evolutions: LegacyEvolutionPayload[];
};

function splitCsvLine(line: string): string[] {
  return line.split(";").map((cell) => cell.replace(/^"|"$/g, "").trim());
}

export function parseCsvDemographics(csvText: string): Map<string, { birthDate?: string; gender?: string; phone?: string }> {
  const lines = csvText.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const header = splitCsvLine(lines[0]);
  const idx = (name: string) => header.indexOf(name);
  const iCode = idx("Código"), iBirth = idx("Data de nascimento"), iSexo = idx("Sexo"), iCel = idx("Celular");
  const map = new Map<string, { birthDate?: string; gender?: string; phone?: string }>();
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const code = cells[iCode];
    if (!code) continue;
    map.set(code, {
      birthDate: cells[iBirth] || undefined,
      gender: cells[iSexo] || undefined,
      phone: cells[iCel] || undefined,
    });
  }
  return map;
}

export function buildLegacyPatient(
  p: ScraperPatient,
  demo?: { birthDate?: string; gender?: string; phone?: string },
): LegacyPatientPayload | null {
  const evolutions: LegacyEvolutionPayload[] = [];
  for (const rec of p.historico ?? []) {
    const dt = parseZenfisioDateTime(rec.data_completa, rec.data);
    if (!dt) continue;
    const { status, createsSession } = mapTipoToAppointmentStatus(rec.tipo);
    const text = (rec.conteudo_texto ?? "").trim();
    evolutions.push({
      date: dt.date,
      startTime: dt.startTime ?? undefined,
      observacao: createsSession && text ? text : undefined,
      appointmentStatus: status,
      appointmentType: mapTipoToAppointmentType(rec.tipo),
    });
  }
  if (evolutions.length === 0) return null;
  return {
    fullName: p.paciente_nome.trim(),
    legacyId: p.paciente_id,
    birthDate: demo?.birthDate,
    gender: demo?.gender,
    phone: demo?.phone,
    evolutions,
  };
}
