import { activityLabApi } from "@/api/v2";
import type {
  ActivityLabClinic,
  ActivityLabPatient,
  ActivityLabSession,
} from "@/types/activityLab";

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const sortPatientsByName = (patients: ActivityLabPatient[]) =>
  [...patients].sort((a, b) => {
    const aName = (a.full_name || a.name || "").toLowerCase();
    const bName = (b.full_name || b.name || "").toLowerCase();
    return aName.localeCompare(bName, "pt-BR");
  });

const filterPatientsByTerm = (patients: ActivityLabPatient[], term: string) => {
  const normalizedTerm = normalizeSearch(term);
  const numericTerm = term.replace(/\D/g, "");

  return patients.filter((patient) => {
    const patientName = normalizeSearch(patient.full_name || patient.name || "");
    const patientCpf = (patient.cpf || "").replace(/\D/g, "");

    return (
      patientName.includes(normalizedTerm) ||
      (numericTerm ? patientCpf.includes(numericTerm) : false)
    );
  });
};

function mapPatient(id: string, data: Record<string, unknown>): ActivityLabPatient {
  return {
    id,
    full_name: String(data.full_name ?? data.name ?? ""),
    birth_date: String(data.birth_date ?? ""),
    gender: String(data.gender ?? "masculino")
      .toLowerCase()
      .startsWith("f")
      ? "feminino"
      : "masculino",
    phone: String(data.phone ?? ""),
    email: String(data.email ?? ""),
    cpf: String(data.cpf ?? ""),
    status: String(data.status ?? "active").toLowerCase() === "inactive" ? "inactive" : "active",
    is_active: data.is_active !== false,
    created_at: String(data.created_at ?? new Date().toISOString()),
    updated_at: String(data.updated_at ?? new Date().toISOString()),
    main_condition: String(data.main_condition ?? data.notes ?? ""),
    organization_id: String(data.organization_id ?? ""),
    incomplete_registration: Boolean(data.incomplete_registration),
    source: "activity_lab",
  };
}

function mapSession(id: string, data: Record<string, unknown>): ActivityLabSession {
  const rawForceData = Array.isArray(data.raw_force_data)
    ? (data.raw_force_data as Array<{ value: number; timestamp: number }>)
    : [];

  return {
    id,
    patient_id: String(data.patient_id ?? ""),
    patientId: String(data.patient_id ?? ""),
    protocol_name: String(data.protocol_name ?? "Protocolo Desconhecido"),
    protocolName: String(data.protocol_name ?? "Protocolo Desconhecido"),
    body_part: String(data.body_part ?? "N/A"),
    bodyPart: String(data.body_part ?? "N/A"),
    side: String(data.side ?? "LEFT") === "RIGHT" ? "RIGHT" : "LEFT",
    test_type: "isometric",
    created_at: String(data.created_at ?? new Date().toISOString()),
    createdAt: String(data.created_at ?? new Date().toISOString()),
    updated_at: String(data.updated_at ?? new Date().toISOString()),
    peak_force: Number(data.peak_force ?? 0),
    peakForce: Number(data.peak_force ?? 0),
    avg_force: Number(data.avg_force ?? 0),
    avgForce: Number(data.avg_force ?? 0),
    duration: Number(data.duration ?? 0),
    rfd: Number(data.rfd ?? 0),
    rateOfForceDevelopment: Number(data.rfd ?? 0),
    sensitivity: Number(data.sensitivity ?? 3),
    raw_force_data: rawForceData,
    rawForceData: rawForceData,
    sample_rate: Number(data.sample_rate ?? 80),
    sampleRate: Number(data.sample_rate ?? 80),
    device_model: String(data.device_model ?? "Tindeq"),
    deviceModel: String(data.device_model ?? "Tindeq"),
    device_firmware: String(data.device_firmware ?? ""),
    deviceFirmware: String(data.device_firmware ?? ""),
    device_battery: Number(data.device_battery ?? 0),
    deviceBattery: Number(data.device_battery ?? 0),
    measurement_mode: "isometric",
    measurementMode: "isometric",
    is_simulated: Boolean(data.is_simulated),
    isSimulated: Boolean(data.is_simulated),
    notes: String(data.notes ?? ""),
    organization_id: String(data.organization_id ?? ""),
    source: "activity_lab",
  };
}

export const activityLabService = {
  async getPatients(searchTerm?: string): Promise<ActivityLabPatient[]> {
    const term = searchTerm?.trim();
    const response = await activityLabApi.patients.list({
      search: term || undefined,
      limit: term ? 200 : 500,
    });

    const mapped = (response.data ?? [])
      .map((row) => mapPatient(String(row.id ?? ""), row as unknown as Record<string, unknown>))
      .filter((patient) => !!patient.id);

    if (!term || mapped.length > 0) {
      return sortPatientsByName(mapped);
    }

    const fallback = await activityLabApi.patients.list({ limit: 2000 });
    const fallbackMapped = (fallback.data ?? [])
      .map((row) => mapPatient(String(row.id ?? ""), row as unknown as Record<string, unknown>))
      .filter((patient) => !!patient.id);

    return sortPatientsByName(filterPatientsByTerm(fallbackMapped, term));
  },

  async getPatientById(id: string): Promise<ActivityLabPatient | null> {
    const response = await activityLabApi.patients.get(id);
    if (!response.data) return null;
    return mapPatient(
      String(response.data.id),
      response.data as unknown as Record<string, unknown>,
    );
  },

  async getSessionsByPatient(patientId: string): Promise<ActivityLabSession[]> {
    const response = await activityLabApi.sessions.listByPatient(patientId);
    return (response.data ?? []).map((row) =>
      mapSession(String(row.id), row as unknown as Record<string, unknown>),
    );
  },

  async getSessionById(id: string): Promise<ActivityLabSession | null> {
    const response = await activityLabApi.sessions.get(id);
    if (!response.data) return null;
    return mapSession(
      String(response.data.id),
      response.data as unknown as Record<string, unknown>,
    );
  },

  async getClinicProfile(): Promise<ActivityLabClinic | null> {
    const response = await activityLabApi.clinic.get();
    const row = response.data;
    if (!row) return null;

    return {
      id: "profile",
      clinic_name: String(row.clinic_name ?? ""),
      professional_name: String(row.professional_name ?? ""),
      registration_number: String(row.registration_number ?? ""),
      updated_at: String(row.updated_at ?? new Date().toISOString()),
      source: "activity_lab",
    };
  },
};
