/**
 * Converte o início/fim de um drag/resize do FullCalendar nos parâmetros de
 * reagendamento (data, horário e DURAÇÃO em minutos).
 *
 * Bug corrigido: o reschedule usava sempre `appointment.duration` (a duração
 * antiga) e o callback descartava o `endIso` — então RESIZE mudava o evento na
 * tela mas voltava ao tamanho original após o refetch. Aqui a duração é
 * recalculada a partir do fim quando disponível.
 */
export type RescheduleParams = {
  date: string;
  time: string;
  durationMinutes: number;
};

export function rescheduleParamsFromDrag(
  startIso: string,
  endIso: string | undefined | null,
  fallbackDuration: number,
): RescheduleParams | null {
  const m = startIso.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (!m) return null;

  const date = m[1];
  const time = m[2] || "";
  let durationMinutes = fallbackDuration;

  const em = endIso?.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (em && time) {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(`${em[1]}T${em[2]}:00`);
    const diff = Math.round((end.getTime() - start.getTime()) / 60000);
    if (diff > 0) durationMinutes = diff;
  }

  return { date, time, durationMinutes };
}
