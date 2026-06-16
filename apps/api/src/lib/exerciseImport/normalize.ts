export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function dedupKey(name: string, primaryMuscles: string[], equipment: string[]): string {
  const muscles = [...primaryMuscles].map((m) => m.toLowerCase().trim()).sort().join(",");
  const equip = [...equipment].map((e) => e.toLowerCase().trim()).sort().join(",");
  return `${normalizeName(name)}|${muscles}|${equip}`;
}
