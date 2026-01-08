/**
 * PROM Snapshots (SEED)
 * - Dados fictícios (para DEV/UI). Sem PII.
 * - Estrutura simples: measures = Record<metricKey, number|null>
 * - Compatível com keys do seu metricRegistry:
 *   prom.acl_rsi_0_100, prom.ikdc_0_100, prom.visa_p_0_100, prom.odi_0_100
 */

export type PromCollectedBy = "PATIENT" | "CLINICIAN";
export type PromSource = "FORM_WEB" | "WHATSAPP" | "IN_CLINIC_TABLET" | "IMPORT";

export interface PromSnapshot {
    snapshot_id: string;
    patient_id: string;
    session_id?: string;

    captured_at: string; // ISO datetime (UTC ok)
    collected_by: PromCollectedBy;
    source: PromSource;

    // opcional: guardar versão do instrumento se você quiser auditoria
    instrument_versions?: Partial<{
        acl_rsi: "SHORT" | "FULL";
        ikdc: "2000";
        visa_p: "ORIGINAL";
        odi: "ODI_2_1A";
    }>;

    measures: Record<string, number | null>;

    notes?: string;
    tags?: string[];
}

export const PROM_SNAPSHOTS_SEED: PromSnapshot[] = [
    // ----------------------------
    // ACL / LCA — Paciente A
    // ----------------------------
    {
        snapshot_id: "promsnap_acl_001_a",
        patient_id: "pat_acl_001",
        session_id: "sess_2025_12_01",
        captured_at: "2025-12-01T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "FORM_WEB",
        instrument_versions: { acl_rsi: "SHORT", ikdc: "2000" },
        measures: {
            "prom.acl_rsi_0_100": 52,
            "prom.ikdc_0_100": 54
        },
        notes: "Pré início do bloco de controle motor + força.",
        tags: ["acl", "baseline"]
    },
    {
        snapshot_id: "promsnap_acl_001_b",
        patient_id: "pat_acl_001",
        session_id: "sess_2026_01_05",
        captured_at: "2026-01-05T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "IN_CLINIC_TABLET",
        instrument_versions: { acl_rsi: "SHORT", ikdc: "2000" },
        measures: {
            "prom.acl_rsi_0_100": 72,
            "prom.ikdc_0_100": 78
        },
        notes: "Após 5 semanas. Relata mais confiança e menos receio em tarefas específicas.",
        tags: ["acl", "reassess"]
    },

    // ----------------------------
    // ACL / LCA — Paciente B (evolução mais sutil)
    // ----------------------------
    {
        snapshot_id: "promsnap_acl_002_a",
        patient_id: "pat_acl_002",
        session_id: "sess_2025_11_18",
        captured_at: "2025-11-18T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "FORM_WEB",
        instrument_versions: { acl_rsi: "SHORT", ikdc: "2000" },
        measures: {
            "prom.acl_rsi_0_100": 66,
            "prom.ikdc_0_100": 70
        },
        notes: "Já ativo; queixa principal é confiança em mudança de direção.",
        tags: ["acl", "baseline"]
    },
    {
        snapshot_id: "promsnap_acl_002_b",
        patient_id: "pat_acl_002",
        session_id: "sess_2026_01_03",
        captured_at: "2026-01-03T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "WHATSAPP",
        instrument_versions: { acl_rsi: "SHORT", ikdc: "2000" },
        measures: {
            "prom.acl_rsi_0_100": 73,
            "prom.ikdc_0_100": 76
        },
        notes: "Evolução moderada; ainda refere receio em aceleração/frenagem.",
        tags: ["acl", "reassess"]
    },

    // ----------------------------
    // Tendinopatia Patelar — Paciente C
    // ----------------------------
    {
        snapshot_id: "promsnap_pat_001_a",
        patient_id: "pat_patellar_001",
        session_id: "sess_2025_12_03",
        captured_at: "2025-12-03T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "FORM_WEB",
        instrument_versions: { visa_p: "ORIGINAL" },
        measures: {
            "prom.visa_p_0_100": 55
        },
        notes: "Dor em saltos/corrida; piora com volume.",
        tags: ["patellar_tendinopathy", "baseline"]
    },
    {
        snapshot_id: "promsnap_pat_001_b",
        patient_id: "pat_patellar_001",
        session_id: "sess_2026_01_06",
        captured_at: "2026-01-06T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "IN_CLINIC_TABLET",
        instrument_versions: { visa_p: "ORIGINAL" },
        measures: {
            "prom.visa_p_0_100": 82
        },
        notes: "Refere melhora importante na tolerância à carga; retorno progressivo.",
        tags: ["patellar_tendinopathy", "reassess"]
    },

    // ----------------------------
    // Tendinopatia Patelar — Paciente D (melhora parcial)
    // ----------------------------
    {
        snapshot_id: "promsnap_pat_002_a",
        patient_id: "pat_patellar_002",
        session_id: "sess_2025_11_25",
        captured_at: "2025-11-25T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "FORM_WEB",
        instrument_versions: { visa_p: "ORIGINAL" },
        measures: {
            "prom.visa_p_0_100": 63
        },
        notes: "Melhor nos dias sem treino; piora em escadas após treino.",
        tags: ["patellar_tendinopathy", "baseline"]
    },
    {
        snapshot_id: "promsnap_pat_002_b",
        patient_id: "pat_patellar_002",
        session_id: "sess_2026_01_07",
        captured_at: "2026-01-07T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "WHATSAPP",
        instrument_versions: { visa_p: "ORIGINAL" },
        measures: {
            "prom.visa_p_0_100": 74
        },
        notes: "Evolução ok, mas ainda com flare em aumento de volume.",
        tags: ["patellar_tendinopathy", "reassess"]
    },

    // ----------------------------
    // Lombalgia — Paciente E (ODI em %)
    // ----------------------------
    {
        snapshot_id: "promsnap_lbp_001_a",
        patient_id: "pat_lbp_001",
        session_id: "sess_2025_12_02",
        captured_at: "2025-12-02T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "FORM_WEB",
        instrument_versions: { odi: "ODI_2_1A" },
        measures: {
            "prom.odi_0_100": 38
        },
        notes: "Limitação moderada em sentar/levantar e flexão sustentada.",
        tags: ["low_back_pain", "baseline"]
    },
    {
        snapshot_id: "promsnap_lbp_001_b",
        patient_id: "pat_lbp_001",
        session_id: "sess_2026_01_04",
        captured_at: "2026-01-04T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "IN_CLINIC_TABLET",
        instrument_versions: { odi: "ODI_2_1A" },
        measures: {
            "prom.odi_0_100": 24
        },
        notes: "Redução clara da incapacidade; tolera mais tempo sentado.",
        tags: ["low_back_pain", "reassess"]
    },

    // ----------------------------
    // Lombalgia — Paciente F (mudança pequena)
    // ----------------------------
    {
        snapshot_id: "promsnap_lbp_002_a",
        patient_id: "pat_lbp_002",
        session_id: "sess_2025_12_10",
        captured_at: "2025-12-10T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "FORM_WEB",
        instrument_versions: { odi: "ODI_2_1A" },
        measures: {
            "prom.odi_0_100": 28
        },
        notes: "Queixa intermitente; piora com estresse/sono ruim.",
        tags: ["low_back_pain", "baseline"]
    },
    {
        snapshot_id: "promsnap_lbp_002_b",
        patient_id: "pat_lbp_002",
        session_id: "sess_2026_01_07",
        captured_at: "2026-01-07T13:00:00.000Z",
        collected_by: "PATIENT",
        source: "WHATSAPP",
        instrument_versions: { odi: "ODI_2_1A" },
        measures: {
            "prom.odi_0_100": 25
        },
        notes: "Melhora leve; ainda oscilando por carga e rotina.",
        tags: ["low_back_pain", "reassess"]
    }
];

export default PROM_SNAPSHOTS_SEED;

export function getLatestPromByPatient(seed: PromSnapshot[]) {
    const map = new Map<string, PromSnapshot>();
    for (const s of seed) {
        const prev = map.get(s.patient_id);
        if (!prev || new Date(s.captured_at).getTime() > new Date(prev.captured_at).getTime()) {
            map.set(s.patient_id, s);
        }
    }
    return map;
}
