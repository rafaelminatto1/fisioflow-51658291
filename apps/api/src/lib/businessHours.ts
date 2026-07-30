/** Horário de funcionamento da clínica em America/Sao_Paulo. */
export function isWithinBusinessHours(date: Date): boolean {
  // Intl garante o fuso correto sem depender do TZ do runtime (workerd = UTC).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (hour === 24) hour = 0; // Intl pode devolver "24" à meia-noite
  if (weekday === "Sun") return false;
  if (weekday === "Sat") return hour >= 7 && hour < 13;
  return hour >= 7 && hour < 21; // Mon–Fri
}
