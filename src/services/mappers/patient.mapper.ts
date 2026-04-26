import type { PatientRow } from "@/types/workers";
import type { Patient } from "@/types";

// ─── Normalizers ────────────────────────────────────────────────────────────

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBirthDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  const str = normalizeString(value);
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().split("T")[0];
}

function normalizeIsoDateTime(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const str = normalizeString(value);
  if (!str) return new Date().toISOString();
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function normalizeGender(value: unknown): "masculino" | "feminino" | "outro" {
  const raw = normalizeString(value)?.toLowerCase();
  if (!raw) return "outro";
  if (raw === "m" || raw === "masculino" || raw === "male" || raw === "homem") return "masculino";
  if (raw === "f" || raw === "feminino" || raw === "female" || raw === "mulher") return "feminino";
  return "outro";
}

function normalizeStatus(value: unknown): string {
  const raw = normalizeString(value)?.toLowerCase();
  if (!raw) return "Inicial";
  const statusMap: Record<string, string> = {
    active: "Em Tratamento",
    ativo: "Em Tratamento",
    "em tratamento": "Em Tratamento",
    em_tratamento: "Em Tratamento",
    in_progress: "Em Tratamento",
    initial: "Inicial",
    inicial: "Inicial",
    inactive: "Inicial",
    inativo: "Inicial",
    novo: "Inicial",
    recuperacao: "Recuperação",
    recuperação: "Recuperação",
    recovery: "Recuperação",
    concluido: "Concluído",
    concluído: "Concluído",
    completed: "Concluído",
    alta: "Alta",
    discharged: "Alta",
    arquivado: "Arquivado",
    archived: "Arquivado",
  };
  return statusMap[raw] ?? String(value);
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

/**
 * Maps a database `PatientRow` (snake_case) to the application `Patient` type (camelCase).
 *
 * @param row - The raw database row from the patients table.
 * @returns A fully-typed `Patient` object with all fields normalized.
 */
export function mapPatientRow(row: PatientRow): Patient {
  const fullName = row.full_name || row.name || "Sem nome";
  const birthDate = normalizeBirthDate(row.birth_date ?? row.date_of_birth);
  const createdAt = normalizeIsoDateTime(row.created_at);
  const updatedAt = normalizeIsoDateTime(row.updated_at);

  return {
    id: String(row.id),
    name: fullName,
    full_name: fullName,
    email: row.email ?? null,
    phone: row.phone ?? null,
    cpf: row.cpf ?? null,
    birthDate,
    birth_date: birthDate || undefined,
    gender: normalizeGender(row.gender),
    mainCondition: row.main_condition ?? row.mainCondition ?? "",
    main_condition: row.main_condition ?? undefined,
    observations: row.notes ?? null,
    status: normalizeStatus(row.status),
    progress: typeof row.progress === "number" ? row.progress : 0,
    incomplete_registration: false,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
    health_insurance: row.health_insurance ?? undefined,
  };
}
