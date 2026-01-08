/* ============================================================================
  Goal Profiles (SEED)
  - Use como base inicial: você pode duplicar e ajustar por paciente / patologia.
  - Metas de vídeo (gait/squat/romberg) usam melhora relativa/absoluta (mais robusto).
  - PROMs usam cut-offs / MCID quando há boa referência.
============================================================================ */

export type TestType = "GAIT" | "SQUAT_OVERHEAD" | "ROMBERG" | "CUSTOM" | "AUTO";

export type TargetMode =
    | "CUT_OFF"
    | "IMPROVEMENT_ABS"
    | "IMPROVEMENT_PCT"
    | "RANGE"
    | "CUSTOM";

export type GoalStatus = "MET" | "PARTIAL" | "NOT_MET" | "NA";

export interface GoalTarget {
    key: string; // metricRegistry key, ex: "prom.acl_rsi_0_100", "squat.knee_valgus_deg_peak_L"

    label?: string; // opcional (override do registry)
    mode: TargetMode;

    // CUT_OFF / RANGE:
    min?: number;
    max?: number;

    // IMPROVEMENT_*:
    // “melhora” sempre segue a directionality do registry no engine.
    // Ex: LOWER_IS_BETTER => delta (B-A) negativo é melhora.
    minDeltaAbs?: number;
    minDeltaPct?: number;

    // Flags:
    isOptional?: boolean; // não derruba o "overall"
    notes?: string;
}

export interface GoalProfile {
    id: string;
    name: string;
    description: string;

    applicableTests: TestType[];

    // Qualidade mínima do comparativo (confidence) para avaliar metas
    qualityGate?: {
        minAnalysisConfidence0_100?: number; // default recomendado: 60
    };

    targets: GoalTarget[];

    clinicianNotesTemplate?: string; // texto curto p/ profissional
    patientNotesTemplate?: string; // texto curto p/ paciente

    evidence?: Array<{
        label: string;
        source: string; // referência textual (sem link obrigatório)
    }>;

    // UX
    defaultPinnedMetricKeys?: string[]; // o que abrir primeiro no GoalPanel
    tags?: string[];
}

/** ---------------------------------------------------------------------------
 * SEED PROFILES
 * ------------------------------------------------------------------------ */

export const GOAL_PROFILES_SEED: GoalProfile[] = [
    {
        id: "acl_rts_readiness",
        name: "LCA / ACL — Prontidão para Retorno ao Esporte (template)",
        description:
            "Template para acompanhar prontidão (psicológica + controle motor) no antes/depois. Use como guia, não como critério único.",
        applicableTests: ["GAIT", "SQUAT_OVERHEAD"],

        qualityGate: { minAnalysisConfidence0_100: 60 },

        targets: [
            // PROMs (cut-off)
            {
                key: "prom.acl_rsi_0_100",
                mode: "CUT_OFF",
                min: 65,
                notes:
                    "Cut-off sugerido como indicador de prontidão psicológica; ajuste por contexto (nível/tempo pós-op)."
            },

            // Controle motor (melhoras relativas)
            {
                key: "squat.knee_valgus_deg_peak_L",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 15,
                notes: "Reduzir valgo no lado esquerdo (pico no fundo do agacho)."
            },
            {
                key: "squat.knee_valgus_deg_peak_R",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 15,
                notes: "Reduzir valgo no lado direito (pico no fundo do agacho)."
            },
            {
                key: "squat.trunk_lean_sagittal_deg_peak",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                notes: "Reduzir inclinação/compensação de tronco."
            },
            {
                key: "gait.symmetry_step_time_pct",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                notes: "Aumentar simetria temporal (menor é melhor)."
            },
            {
                key: "gait.pelvic_drop_deg_peak_L",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Se houver Trendelenburg/queda pélvica à esquerda, reduzir."
            },
            {
                key: "gait.pelvic_drop_deg_peak_R",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Se houver Trendelenburg/queda pélvica à direita, reduzir."
            }
        ],

        clinicianNotesTemplate:
            "RTS é multifatorial. Evite usar um único marcador (ex.: LSI isolado). Combine PROMs + testes funcionais + qualidade de movimento + histórico e carga.",
        patientNotesTemplate:
            "A gente acompanha não só força, mas também controle e confiança pra voltar ao esporte com mais segurança.",

        evidence: [
            {
                label: "ACL-RSI ≥ 65 como ponto de corte em 2 anos (retorno ao mesmo esporte)",
                source: "Sadeqi et al., 2018 (ACL-RSI threshold ≥65 para retorno ao mesmo esporte em 2 anos)"
            },
            {
                label: "LSI pode superestimar função e se associar a risco de 2ª lesão",
                source: "Wellsandt et al., 2017 (LSI pode superestimar função pós-ACLR)"
            }
        ],

        defaultPinnedMetricKeys: [
            "prom.acl_rsi_0_100",
            "gait.symmetry_step_time_pct",
            "squat.knee_valgus_deg_peak_L",
            "squat.trunk_lean_sagittal_deg_peak"
        ],
        tags: ["acl", "rts", "knee", "sport"]
    },

    {
        id: "patellar_tendinopathy_progress",
        name: "Tendinopatia Patelar — Evolução e Controle de Movimento (template)",
        description:
            "Template para acompanhar evolução com VISA-P + qualidade do agachamento. Metas devem ser ajustadas por fase (reativo vs recondicionamento).",
        applicableTests: ["SQUAT_OVERHEAD"],

        qualityGate: { minAnalysisConfidence0_100: 60 },

        targets: [
            {
                key: "prom.visa_p_0_100",
                mode: "CUT_OFF",
                min: 80,
                notes:
                    "Meta de referência (ajuste por fase/nível). VISA-P máximo 100 (assintomático)."
            },

            {
                key: "squat.knee_valgus_deg_peak_L",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                notes: "Reduzir valgo (controle frontal)."
            },
            {
                key: "squat.knee_valgus_deg_peak_R",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                notes: "Reduzir valgo (controle frontal)."
            },
            {
                key: "squat.depth_score_mean_0_100",
                mode: "IMPROVEMENT_ABS",
                minDeltaAbs: 8,
                isOptional: true,
                notes:
                    "Aumentar profundidade com controle (se a tarefa exigir). Ajuste pelo objetivo e dor."
            },
            {
                key: "squat.hesitation_mean_0_100",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Reduzir hesitação/micro-pausas durante execução."
            }
        ],

        clinicianNotesTemplate:
            "VISA-P é medida de evolução (não diagnóstica). Metas de movimento: priorize controle + tolerância à carga e dor.",
        patientNotesTemplate:
            "O foco é você ganhar tolerância à carga e um movimento mais estável. A nota do questionário ajuda a medir seu progresso.",

        evidence: [
            {
                label: "VISA-P: máximo 100 (assintomático)",
                source: "Lohrer et al., 2011 (VISA-P máximo 100 representa indivíduo assintomático)"
            },
            {
                label: "VISA-P não é teste diagnóstico (uso para evolução)",
                source: "SRALab (VISA-P é ferramenta de desfecho; não é diagnóstico)"
            }
        ],

        defaultPinnedMetricKeys: [
            "prom.visa_p_0_100",
            "squat.knee_valgus_deg_peak_L",
            "squat.smoothness_mean_0_100"
        ],
        tags: ["tendinopathy", "patellar", "knee"]
    },

    {
        id: "low_back_pain_function",
        name: "Lombalgia — Função e Incapacidade (template)",
        description:
            "Template para acompanhar incapacidade (ODI) e controle global (tronco) com melhora clínica mínima como referência.",
        applicableTests: ["GAIT", "SQUAT_OVERHEAD", "ROMBERG"],

        qualityGate: { minAnalysisConfidence0_100: 60 },

        targets: [
            {
                key: "prom.odi_0_100",
                mode: "IMPROVEMENT_ABS",
                minDeltaAbs: 7.5,
                notes:
                    "MCID varia por população/contexto. Default: reduzir ~7.5 pontos (ajustável)."
            },

            {
                key: "squat.trunk_lean_sagittal_deg_peak",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Reduzir compensação de tronco no agachamento."
            },
            {
                key: "gait.trunk_lean_frontal_deg_peak",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Reduzir inclinação lateral do tronco na marcha."
            },
            {
                key: "romberg.time_to_stabilize_s",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Se Romberg for usado, reduzir tempo até estabilizar."
            }
        ],

        clinicianNotesTemplate:
            "ODI deve ser interpretado como % (0–100). MCID depende do cenário; combine com dor, função e tolerância de carga.",
        patientNotesTemplate:
            "A ideia é reduzir limitações do dia a dia e melhorar o controle do tronco. O questionário mede esse impacto na rotina.",

        evidence: [
            {
                label: "ODI: cálculo em % (0–100) a partir de 10 itens (0–5 cada)",
                source: "Oswestry Disability Questionnaire (scoring: soma / total possível × 100)"
            },
            {
                label: "MCID do ODI varia; exemplos 7.5 pts e 8 pts em fontes diferentes",
                source:
                    "SRALab (ODI MCID 7.5 em recomendações) + Maughan & Lewis 2010 (ODI MCID ~8)"
            }
        ],

        defaultPinnedMetricKeys: ["prom.odi_0_100", "gait.trunk_lean_frontal_deg_peak"],
        tags: ["low_back_pain", "odi", "spine"]
    },

    {
        id: "ankle_instability_balance",
        name: "Instabilidade de Tornozelo — Equilíbrio (Romberg template)",
        description:
            "Template focado em estabilidade/propriocepção com Romberg (olhos abertos/fechados). Usa melhora relativa (mais robusto).",
        applicableTests: ["ROMBERG"],

        qualityGate: { minAnalysisConfidence0_100: 60 },

        targets: [
            {
                key: "romberg.romberg_ratio_EC_over_EO",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                notes: "Reduzir diferença entre olhos fechados vs abertos (ratio menor)."
            },
            {
                key: "romberg.sway_area_mm2_EC",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                notes: "Reduzir área de oscilação com olhos fechados."
            },
            {
                key: "romberg.sway_velocity_mm_s_EC",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Reduzir velocidade de oscilação com olhos fechados."
            },
            {
                key: "romberg.time_to_stabilize_s",
                mode: "IMPROVEMENT_PCT",
                minDeltaPct: 10,
                isOptional: true,
                notes: "Reduzir tempo até estabilizar após iniciar/fechar olhos."
            }
        ],

        clinicianNotesTemplate:
            "Sem cut-off universal: use melhora relativa + consistência do protocolo (câmera, distância, tempo de teste).",
        patientNotesTemplate:
            "A meta é você balançar menos e estabilizar mais rápido, principalmente quando tira a visão (olhos fechados).",

        evidence: [],
        defaultPinnedMetricKeys: ["romberg.romberg_ratio_EC_over_EO", "romberg.sway_area_mm2_EC"],
        tags: ["ankle", "balance", "romberg"]
    }
];

export default GOAL_PROFILES_SEED;
