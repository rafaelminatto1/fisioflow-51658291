import { patientsApi } from "@/api/v2/patients";
import { auditApi } from "@/api/v2";
import { AppError } from "@/lib/errors/AppError";
import { ErrorHandler } from "@/lib/errors/ErrorHandler";
import type { PatientRow } from "@/types/workers";
import type { Patient } from "@/types";

// Service result wrapper
interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeBirthDate = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }

  const str = normalizeString(value);
  if (!str) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().split("T")[0];
};

const normalizeIsoDateTime = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  const str = normalizeString(value);
  if (!str) return new Date().toISOString();

  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

const normalizeGender = (value: unknown): "masculino" | "feminino" | "outro" => {
  const raw = normalizeString(value)?.toLowerCase();
  if (!raw) return "outro";

  if (raw === "m" || raw === "masculino" || raw === "male" || raw === "homem") {
    return "masculino";
  }
  if (raw === "f" || raw === "feminino" || raw === "female" || raw === "mulher") {
    return "feminino";
  }
  return "outro";
};

const normalizeStatus = (value: unknown): string => {
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

  return statusMap[raw] || String(value);
};

/**
 * Service to handle Patient business logic and data access
 * Centralized for Neon DB & Cloudflare Workers
 */
export const PatientService = {
  /**
   * Map database patient record to application Patient type
   */
  mapToApp(dbPatient: PatientRow | any): Patient {
    const fullName = dbPatient.full_name || dbPatient.name || "Sem nome";
    const birthDate = normalizeBirthDate(dbPatient.date_of_birth || dbPatient.birth_date);
    const createdAt = normalizeIsoDateTime(dbPatient.created_at);
    const updatedAt = normalizeIsoDateTime(dbPatient.updated_at);

    return {
      id: String(dbPatient.id),
      full_name: fullName,
      name: fullName,
      email: dbPatient.email || null,
      phone: dbPatient.phone || null,
      cpf: dbPatient.cpf || null,
      birthDate: birthDate || "",
      birth_date: birthDate,
      gender: normalizeGender(dbPatient.gender),
      mainCondition: dbPatient.main_condition || dbPatient.observations || "",
      main_condition: dbPatient.main_condition || "",
      observations: dbPatient.notes || dbPatient.observations || null,
      status: normalizeStatus(dbPatient.status),
      progress: typeof dbPatient.progress === "number" ? dbPatient.progress : 0,
      incomplete_registration: Boolean(dbPatient.incomplete_registration),
      createdAt,
      created_at: createdAt,
      updatedAt,
      updated_at: updatedAt,
    } as unknown as Patient;
  },

  /**
   * Fetch active patients for an organization
   */
  async getActivePatients(organizationId: string): Promise<ServiceResult<Patient[]>> {
    if (!organizationId) throw AppError.badRequest("Organization ID is required");

    try {
      const response = await patientsApi.list({ limit: 200, minimal: true });
      const patients = (response.data || []).map((p) => this.mapToApp(p));
      return { data: patients, error: null };
    } catch (error) {
      ErrorHandler.handle(error, "PatientService.getActivePatients");
      return {
        data: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  /**
   * Fetch a single patient by ID
   */
  async getPatientById(id: string): Promise<ServiceResult<Patient>> {
    if (!id) throw AppError.badRequest("Patient ID is required");

    try {
      const response = await patientsApi.get(id);
      const mapped = this.mapToApp(response.data);
      return { data: mapped, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  /**
   * Create a new patient
   */
  async createPatient(patient: Partial<PatientRow>): Promise<ServiceResult<Patient>> {
    try {
      const response = await patientsApi.create(patient);
      const mapped = this.mapToApp(response.data);

      // Log de auditoria: Criação de Paciente
      try {
        await auditApi.create({
          action: "INSERT",
          entity_type: "patients",
          entity_id: mapped.id,
          metadata: {
            name: mapped.full_name,
            email: mapped.email,
            status: mapped.status,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {
        /* silent fail */
      }

      return { data: mapped, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  /**
   * Update a patient
   */
  async updatePatient(id: string, updates: Partial<PatientRow>): Promise<ServiceResult<Patient>> {
    try {
      const response = await patientsApi.update(id, updates);
      const mapped = this.mapToApp(response.data);

      // Log de auditoria: Atualização de Paciente
      try {
        await auditApi.create({
          action: "UPDATE",
          entity_type: "patients",
          entity_id: id,
          metadata: {
            name: mapped.full_name,
            updates: Object.keys(updates),
            timestamp: new Date().toISOString(),
          },
        });
      } catch {
        /* silent fail */
      }

      return { data: mapped, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  /**
   * Delete a patient
   */
  async deletePatient(id: string): Promise<ServiceResult<null>> {
    try {
      // Pegamos o nome antes de deletar para o log ficar rico
      const patientBefore = await this.getPatientById(id);
      const name = patientBefore.data?.full_name || id;

      await patientsApi.delete(id);

      // Log de auditoria: Exclusão de Paciente
      try {
        await auditApi.create({
          action: "DELETE",
          entity_type: "patients",
          entity_id: id,
          metadata: {
            name: name,
            timestamp: new Date().toISOString(),
          },
        });
      } catch {
        /* silent fail */
      }

      return { data: null, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};
