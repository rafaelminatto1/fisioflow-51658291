import type { MeasurementItem } from "@/components/evolution/v2-improved/types";

/**
 * Detalhe de dor (Chegada/Saída/Qualidade/Localização) é persistido sem migração
 * reaproveitando o array `measurements` (JSONB que faz round-trip na rota
 * `apps/api/src/routes/sessions.ts`). Usamos um `measurement_type` reservado para
 * que essas entradas NÃO apareçam na lista genérica de Medições.
 */
export const PAIN_DETAIL_TYPE = "__pain_detail__";

const NAME_ARRIVAL = "EVA Chegada";
const NAME_DISCHARGE = "EVA Saída";
const NAME_QUALITY = "Qualidade da dor";
const NAME_LOCATION = "Localização da dor";
const NAME_LOCATION_MEMBERS = "Membros de dor";
const NAME_IS_INDIVIDUAL = "Modo dor individual";

export type PainQualityIntensity = "leve" | "moderada" | "intensa";

export interface PainQualityItem {
  type: string;
  intensity: PainQualityIntensity;
}

export interface PainLocationMember {
  member: string;
  arrival?: number;
  discharge?: number;
}

export interface PainDetail {
  arrival?: number;
  discharge?: number;
  quality: PainQualityItem[];
  location?: string;
  locationMembers?: PainLocationMember[];
  isIndividualPain?: boolean;
}

/** Qualidades de dor disponíveis no medidor (Layout E). */
export const PAIN_QUALITY_OPTIONS = [
  "Pontada",
  "Peso",
  "Queimação",
  "Latejante",
] as const;

export const PAIN_QUALITY_INTENSITIES: PainQualityIntensity[] = ["leve", "moderada", "intensa"];

/** Regiões anatômicas mais comuns para autocomplete em fisioterapia */
export const COMMON_ANATOMICAL_REGIONS = [
  "Ombro D",
  "Ombro E",
  "Cervical",
  "Torácica",
  "Lombar",
  "Sacroilíaca",
  "Quadril D",
  "Quadril E",
  "Coxa D",
  "Coxa E",
  "Joelho D",
  "Joelho E",
  "Panturrilha D",
  "Panturrilha E",
  "Tornozelo D",
  "Tornozelo E",
  "Pé D",
  "Pé E",
  "Cotovelo D",
  "Cotovelo E",
  "Punho D",
  "Punho E",
  "Mão D",
  "Mão E",
  "Mandíbula / ATM",
] as const;

export function isPainDetailMeasurement(m: { measurement_type?: string } | null | undefined): boolean {
  return !!m && m.measurement_type === PAIN_DETAIL_TYPE;
}

/** Remove as entradas internas de detalhe de dor de uma lista de measurements. */
export function stripPainDetail<T extends { measurement_type?: string }>(measurements: T[] = []): T[] {
  return measurements.filter((m) => !isPainDetailMeasurement(m));
}

function toLevel(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return undefined;
  return Math.max(0, Math.min(10, n));
}

/** Lê o detalhe de dor a partir das measurements reservadas. */
export function parsePainDetail(
  measurements: MeasurementItem[] = [],
  fallbackPainScale?: number | null,
): PainDetail {
  const detail: PainDetail = { quality: [], locationMembers: [] };

  for (const m of measurements) {
    if (m.measurement_type !== PAIN_DETAIL_TYPE) continue;
    switch (m.measurement_name) {
      case NAME_ARRIVAL:
        detail.arrival = toLevel(m.value);
        break;
      case NAME_DISCHARGE:
        detail.discharge = toLevel(m.value);
        break;
      case NAME_LOCATION:
        detail.location = m.value || undefined;
        break;
      case NAME_LOCATION_MEMBERS:
        try {
          if (m.value) {
            const parsed = JSON.parse(m.value);
            if (Array.isArray(parsed)) {
              detail.locationMembers = parsed.map((item: any) => ({
                member: typeof item === "string" ? item : item.member,
                arrival: toLevel(item?.arrival),
                discharge: toLevel(item?.discharge),
              }));
            }
          }
        } catch {
          // ignore json parse error
        }
        break;
      case NAME_IS_INDIVIDUAL:
        detail.isIndividualPain = m.value === "true";
        break;
      case NAME_QUALITY: {
        const cd = m.custom_data ?? {};
        detail.quality = Object.entries(cd)
          .filter(([, v]) => PAIN_QUALITY_INTENSITIES.includes(v as PainQualityIntensity))
          .map(([type, intensity]) => ({ type, intensity: intensity as PainQualityIntensity }));
        break;
      }
    }
  }

  // Se não houver locationMembers estruturado, mas houver location string legada
  if ((!detail.locationMembers || detail.locationMembers.length === 0) && detail.location) {
    detail.locationMembers = detail.location
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((member) => ({ member }));
  }

  // Se houver locationMembers mas não houver location string, gera concatenada
  if (detail.locationMembers && detail.locationMembers.length > 0 && !detail.location) {
    detail.location = detail.locationMembers.map((m) => m.member).join(", ");
  }

  // Saída cai no pain_scale canônico quando ainda não há entrada explícita.
  if (detail.discharge === undefined && fallbackPainScale != null) {
    detail.discharge = toLevel(fallbackPainScale);
  }
  return detail;
}

function makeMeasurement(name: string, value: string, custom_data: Record<string, string> = {}): MeasurementItem {
  return {
    id: `paindetail_${name}`,
    measurement_type: PAIN_DETAIL_TYPE,
    measurement_name: name,
    value,
    unit: "/10",
    notes: "",
    custom_data,
    completed: false,
  };
}

/**
 * Reescreve as measurements substituindo as entradas reservadas de dor pelo
 * `detail` informado. Mantém intactas as measurements clínicas reais.
 */
export function writePainDetail(
  measurements: MeasurementItem[] = [],
  detail: PainDetail,
): MeasurementItem[] {
  const clinical = stripPainDetail(measurements);
  const reserved: MeasurementItem[] = [];

  if (detail.arrival != null) reserved.push(makeMeasurement(NAME_ARRIVAL, String(detail.arrival)));
  if (detail.discharge != null)
    reserved.push(makeMeasurement(NAME_DISCHARGE, String(detail.discharge)));

  const locationMembers = detail.locationMembers || [];
  const locationString = detail.location?.trim() || locationMembers.map((m) => m.member).join(", ");

  if (locationString) {
    reserved.push(makeMeasurement(NAME_LOCATION, locationString));
  }

  if (locationMembers.length > 0) {
    reserved.push(makeMeasurement(NAME_LOCATION_MEMBERS, JSON.stringify(locationMembers)));
  }

  if (detail.isIndividualPain !== undefined) {
    reserved.push(makeMeasurement(NAME_IS_INDIVIDUAL, String(detail.isIndividualPain)));
  }

  if (detail.quality && detail.quality.length > 0) {
    const cd: Record<string, string> = {};
    for (const q of detail.quality) cd[q.type] = q.intensity;
    reserved.push(makeMeasurement(NAME_QUALITY, "", cd));
  }

  return [...clinical, ...reserved];
}

// ---------------------------------------------------------------------------
// Sinais vitais condicionais
// ---------------------------------------------------------------------------

/** Idade (em anos) acima da qual sinais vitais passam a ser relevantes por padrão. */
export const VITALS_AGE_THRESHOLD = 60;

const RISK_PATHOLOGY_KEYWORDS = [
  "hipertens",
  "pressão alta",
  "pressao alta",
  "cardíac",
  "cardiac",
  "coração",
  "coracao",
  "arritm",
  "insufici",
  "diabet",
  "dpoc",
  "copd",
  "asma",
  "respirat",
  "pulmon",
  "obes",
  "renal",
  "avc",
  "anticoagul",
];

function computeAge(patient: any): number | undefined {
  const raw =
    patient?.birth_date ?? patient?.birthDate ?? patient?.dataNascimento ?? patient?.data_nascimento;
  if (typeof patient?.age === "number") return patient.age;
  if (!raw) return undefined;
  const birth = new Date(raw);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function hasRiskPathology(pathologies: any[] = []): boolean {
  return pathologies.some((p) => {
    const text = `${p?.name ?? p?.nome ?? p?.title ?? p ?? ""}`.toLowerCase();
    return RISK_PATHOLOGY_KEYWORDS.some((kw) => text.includes(kw));
  });
}

function hasRecordedVitals(measurements: { measurement_type?: string }[] = []): boolean {
  return measurements.some((m) => m.measurement_type === "Sinais Vitais");
}

/**
 * Sinais vitais só aparecem quando fazem sentido clinicamente:
 * já foram registrados alguma vez, OU paciente com patologia de risco, OU idade ≥ limite.
 */
export function shouldShowVitals(
  patient: any,
  pathologies: any[] = [],
  historicalMeasurements: { measurement_type?: string }[] = [],
  options?: { ageThreshold?: number },
): boolean {
  const ageThreshold = options?.ageThreshold ?? VITALS_AGE_THRESHOLD;
  if (hasRecordedVitals(historicalMeasurements)) return true;
  if (hasRiskPathology(pathologies)) return true;
  const age = computeAge(patient);
  if (age != null && age >= ageThreshold) return true;
  return false;
}
