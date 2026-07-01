const TZ = "America/Sao_Paulo";

export type AppointmentLike = {
  id?: string;
  patientName?: string;
  patient_name?: string;
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:MM or HH:MM:SS
  start_time?: string;
  endTime?: string;
  end_time?: string;
  durationMinutes?: number;
  duration?: number;
  notes?: string;
};

/** Extrai "YYYY-MM-DD" de uma data-only ou de um timestamp ISO (Appointment.date
 *  é um Date que o JSON serializa como "2026-07-01T00:00:00.000Z"). */
function dateOnly(d: string): string {
  return d.slice(0, 10);
}

/** Extrai "HH:MM" de "HH:MM", "HH:MM:SS" ou de um timestamp ISO ("...THH:MM:SS"). */
function hhmm(t: string): string {
  const timePart = t.includes("T") ? (t.split("T")[1] ?? "") : t;
  return timePart.length >= 5 ? timePart.slice(0, 5) : timePart;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = hhmm(time).split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor((total % 1440) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export type GoogleCalendarEvent = {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
};

export function appointmentToGoogleEvent(appt: AppointmentLike): GoogleCalendarEvent {
  const name = appt.patientName ?? appt.patient_name ?? "Paciente";
  const date = dateOnly(appt.date ?? "");
  const start = hhmm(appt.startTime ?? appt.start_time ?? "08:00");
  const end =
    appt.endTime || appt.end_time
      ? hhmm((appt.endTime ?? appt.end_time)!)
      : addMinutes(start, Number(appt.durationMinutes ?? appt.duration ?? 60));

  return {
    summary: `Atendimento — ${name}`,
    description: `FisioFlow${appt.id ? ` · #${appt.id}` : ""}${appt.notes ? `\n${appt.notes}` : ""}`,
    start: { dateTime: `${date}T${start}:00`, timeZone: TZ },
    end: { dateTime: `${date}T${end}:00`, timeZone: TZ },
  };
}
