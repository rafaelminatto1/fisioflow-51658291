import { format, endOfWeek, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Clock3, Users } from "lucide-react";
import { normalizeStatus } from "./shared/appointment-status";

interface WeeklyScheduleSummaryAppointment {
  status?: string;
  isGroup?: boolean;
  is_group?: boolean;
}

interface WeeklyScheduleSummaryProps {
  currentDate: Date;
  appointments: WeeklyScheduleSummaryAppointment[];
}

export function WeeklyScheduleSummary({ currentDate, appointments }: WeeklyScheduleSummaryProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekEnd = endOfWeek(currentDate, { locale: ptBR });

  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(
    (appt) => normalizeStatus(String(appt.status || "agendado")) === "presenca_confirmada",
  ).length;
  const pendingAppointments = appointments.filter(
    (appt) => normalizeStatus(String(appt.status || "agendado")) === "agendado",
  ).length;
  const cancelledAppointments = appointments.filter(
    (appt) => normalizeStatus(String(appt.status || "agendado")) === "cancelado",
  ).length;
  const groupAppointments = appointments.filter(
    (appt) => Boolean(appt.isGroup ?? appt.is_group),
  ).length;

  return (
    <section className="mb-4 rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/30 p-6 shadow-lg shadow-slate-200/20 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/30 dark:border-slate-800/60 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-800/30 dark:shadow-slate-950/20 dark:hover:shadow-slate-950/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
          <div className="group rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 px-5 py-4 text-sm text-slate-700 shadow-md shadow-slate-200/40 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800/80 dark:from-slate-900 dark:to-slate-800/50 dark:text-slate-100 dark:shadow-slate-950/40 dark:hover:shadow-slate-950/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-4 w-4" />
              Semana Ativa
            </div>
            <p className="mt-3 text-3xl font-light text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-mono, ui-monospace)' }}>{totalAppointments}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">agendamentos</p>
          </div>

          <div className="group rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-5 py-4 text-sm text-slate-700 shadow-md shadow-emerald-200/40 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-200/60 dark:border-emerald-800/80 dark:from-emerald-900 dark:to-emerald-800/50 dark:text-slate-100 dark:shadow-emerald-950/40 dark:hover:shadow-emerald-950/60">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Confirmados
            </div>
            <p className="mt-3 text-3xl font-light text-emerald-700 dark:text-emerald-300" style={{ fontFamily: 'var(--font-mono, ui-monospace)' }}>{confirmedAppointments}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-600/70 dark:text-emerald-400/70">sessões</p>
          </div>

          <div className="group rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 to-sky-100/50 px-5 py-4 text-sm text-slate-700 shadow-md shadow-sky-200/40 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-sky-200/60 dark:border-sky-800/80 dark:from-sky-900 dark:to-sky-800/50 dark:text-slate-100 dark:shadow-sky-950/40 dark:hover:shadow-sky-950/60">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Clock3 className="h-4 w-4" />
              Em Espera
            </div>
            <p className="mt-3 text-3xl font-light text-sky-700 dark:text-sky-300" style={{ fontFamily: 'var(--font-mono, ui-monospace)' }}>{pendingAppointments}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-600/70 dark:text-sky-400/70">pendentes</p>
          </div>

          <div className="group rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 to-indigo-100/50 px-5 py-4 text-sm text-slate-700 shadow-md shadow-indigo-200/40 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-indigo-200/60 dark:border-indigo-800/80 dark:from-indigo-900 dark:to-indigo-800/50 dark:text-slate-100 dark:shadow-indigo-950/40 dark:hover:shadow-indigo-950/60">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
              Grupos
            </div>
            <p className="mt-3 text-3xl font-light text-indigo-700 dark:text-indigo-300" style={{ fontFamily: 'var(--font-mono, ui-monospace)' }}>{groupAppointments}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-600/70 dark:text-indigo-400/70">blocos</p>
          </div>
        </div>
      </div>
    </section>
  );
}
