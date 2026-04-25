const DEFAULT_ML_SALT = "fisioflow-ml-salt";

export function getAgeGroup(birthDate?: string | Date | null): string {
  if (!birthDate) return "unknown";
  const date = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const age = new Date().getFullYear() - date.getFullYear();
  if (age < 18) return "0-17";
  if (age <= 30) return "18-30";
  if (age <= 50) return "31-50";
  if (age <= 65) return "51-65";
  return "65+";
}

export function determineOutcomeCategory(
  totalSessions: number,
  painReduction: number,
  functionalImprovement: number,
): "success" | "partial" | "poor" {
  if (painReduction >= 50 || functionalImprovement >= 40) return "success";
  if (painReduction >= 20 || functionalImprovement >= 15) return "partial";
  return "poor";
}

export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function hashPatientId(patientId: string, salt?: string): Promise<string> {
  if (!patientId) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(`${patientId}${salt ?? DEFAULT_ML_SALT}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
