export type HonorificGender = "M" | "F" | null;

export function normalizeHonorificGender(value: unknown): HonorificGender {
  if (typeof value !== "string") return null;
  const first = value.trim().toLowerCase()[0];
  if (first === "m") return "M";
  if (first === "f") return "F";
  return null;
}

export function doctorTitle(gender?: HonorificGender): "Dr." | "Dra." {
  return gender === "F" ? "Dra." : "Dr.";
}

export function honorificName(name: string, gender?: HonorificGender): string {
  return `${doctorTitle(gender)} ${name.trim() || "-"}`;
}

export function patientReference(name: string, gender?: HonorificGender): string {
  const article = gender === "M" ? "do paciente" : gender === "F" ? "da paciente" : "do paciente";
  return `${article} ${name.trim() || "-"}`;
}
