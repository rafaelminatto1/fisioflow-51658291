import { MetricDefinition, MetricRegistrySchema } from './metricRegistry.zod';
import { fisioLogger as logger } from '@/lib/errors/logger';

export const metricRegistry: Record<string, MetricDefinition> = {
    // --- GAIT ---
    "gait.cadence": {
        key: "gait.cadence",
        label: "Cadência",
        shortLabel: "Cadência",
        description: "Passos por minuto.",
        unit: "spm",
        directionality: "HIGHER_IS_BETTER", // Often higher is better for efficiency, but context dependent
        group: "GAIT",
        chart: { defaultChart: "LINE", decimals: 0, domain: [null, null] },
        tags: ["efficiency"]
    },
    "gait.symmetry_step_time_pct": {
        key: "gait.symmetry_step_time_pct",
        label: "Simetria do Tempo de Passo",
        shortLabel: "Simetria (Tempo)",
        unit: "pct",
        directionality: "HIGHER_IS_BETTER", // Wait, standard symmetry index? Usu. 100 is perfect. If it's asymmetry % then lower is better. 
        // User prompt said "LOWER_IS_BETTER" for "symmetry_step_time_pct" -> implying it is Asymmetry or Deviation. 
        // Let's assume it represents 'Symmetry Index' where 100% is perfect, OR 'Asymmetry' where 0% is perfect.
        // User prompt explicit request: "gait.symmetry_step_time_pct (LOWER_IS_BETTER)".
        // So it must be % Asymmetry.
        group: "GAIT",
        chart: { defaultChart: "BAR", decimals: 1, domain: [0, 100] },
        tags: ["symmetry"]
    },
    "gait.stance_pct_L": {
        key: "gait.stance_pct_L",
        label: "Tempo de Apoio (Esq)",
        unit: "pct",
        directionality: "UNKNOWN",
        group: "GAIT",
        chart: { defaultChart: "LINE", decimals: 1, domain: [0, 100] }
    },
    "gait.stance_pct_R": {
        key: "gait.stance_pct_R",
        label: "Tempo de Apoio (Dir)",
        unit: "pct",
        directionality: "UNKNOWN",
        group: "GAIT",
        chart: { defaultChart: "LINE", decimals: 1, domain: [0, 100] }
    },
    "gait.pelvic_drop_deg_peak_L": {
        key: "gait.pelvic_drop_deg_peak_L",
        label: "Queda Pélvica (Esq)",
        shortLabel: "Queda Pélvica (E)",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "GAIT",
        recommendedViews: ["FRONTAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["stability", "trendelenburg"]
    },
    "gait.pelvic_drop_deg_peak_R": {
        key: "gait.pelvic_drop_deg_peak_R",
        label: "Queda Pélvica (Dir)",
        shortLabel: "Queda Pélvica (D)",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "GAIT",
        recommendedViews: ["FRONTAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["stability", "trendelenburg"]
    },
    "gait.trunk_lean_frontal_deg_peak": {
        key: "gait.trunk_lean_frontal_deg_peak",
        label: "Inclinação de Tronco (Frontal)",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "GAIT",
        recommendedViews: ["FRONTAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["posture", "stability"]
    },
    "gait.knee_valgus_deg_peak_L": {
        key: "gait.knee_valgus_deg_peak_L",
        label: "Valgo Dinâmico Joelho (Esq)",
        shortLabel: "Valgo (E)",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "GAIT",
        recommendedViews: ["FRONTAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["alignment", "valgus"]
    },
    "gait.knee_valgus_deg_peak_R": {
        key: "gait.knee_valgus_deg_peak_R",
        label: "Valgo Dinâmico Joelho (Dir)",
        shortLabel: "Valgo (D)",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "GAIT",
        recommendedViews: ["FRONTAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["alignment", "valgus"]
    },

    // --- SQUAT ---
    "squat.knee_valgus_deg_peak_L": {
        key: "squat.knee_valgus_deg_peak_L",
        label: "Valgo de Joelho (Esq)",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "SQUAT_OVERHEAD",
        recommendedViews: ["FRONTAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["alignment", "valgus"]
    },
    "squat.knee_valgus_deg_peak_R": {
        key: "squat.knee_valgus_deg_peak_R",
        label: "Valgo de Joelho (Dir)",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "SQUAT_OVERHEAD",
        recommendedViews: ["FRONTAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["alignment", "valgus"]
    },
    "squat.trunk_lean_sagittal_deg_peak": {
        key: "squat.trunk_lean_sagittal_deg_peak",
        label: "Inclinação Anterior do Tronco",
        unit: "deg",
        directionality: "LOWER_IS_BETTER",
        group: "SQUAT_OVERHEAD",
        recommendedViews: ["LATERAL"],
        chart: { defaultChart: "LINE", decimals: 1 },
        tags: ["mobility", "posture"]
    },
    "squat.depth_score_mean_0_100": {
        key: "squat.depth_score_mean_0_100",
        label: "Score de Profundidade",
        unit: "score_0_100",
        directionality: "HIGHER_IS_BETTER",
        group: "SQUAT_OVERHEAD",
        chart: { defaultChart: "BAR", decimals: 0, domain: [0, 100] },
        tags: ["performance"]
    },
    "squat.smoothness_mean_0_100": {
        key: "squat.smoothness_mean_0_100",
        label: "Fluidez/Controle",
        unit: "score_0_100",
        directionality: "HIGHER_IS_BETTER",
        group: "SQUAT_OVERHEAD",
        chart: { defaultChart: "BAR", decimals: 0, domain: [0, 100] },
        tags: ["quality"]
    },
    "squat.hesitation_mean_0_100": {
        key: "squat.hesitation_mean_0_100",
        label: "Índice de Hesitação",
        unit: "score_0_100",
        directionality: "LOWER_IS_BETTER",
        group: "SQUAT_OVERHEAD",
        chart: { defaultChart: "LINE", decimals: 0, domain: [0, 100] },
        tags: ["quality"]
    },

    // --- ROMBERG ---
    "romberg.sway_area_mm2_EO": {
        key: "romberg.sway_area_mm2_EO",
        label: "Área de Oscilação (Olhos Abertos)",
        unit: "mm2",
        directionality: "LOWER_IS_BETTER",
        group: "ROMBERG",
        requiresCalibration: true,
        chart: { defaultChart: "BAR", decimals: 1 }
    },
    "romberg.sway_area_mm2_EC": {
        key: "romberg.sway_area_mm2_EC",
        label: "Área de Oscilação (Olhos Fechados)",
        unit: "mm2",
        directionality: "LOWER_IS_BETTER",
        group: "ROMBERG",
        requiresCalibration: true,
        chart: { defaultChart: "BAR", decimals: 1 }
    },
    "romberg.sway_velocity_mm_s_EO": {
        key: "romberg.sway_velocity_mm_s_EO",
        label: "Velocidade de Oscilação (EO)",
        unit: "mm_s",
        directionality: "LOWER_IS_BETTER",
        group: "ROMBERG",
        requiresCalibration: true,
        chart: { defaultChart: "LINE", decimals: 1 }
    },
    "romberg.sway_velocity_mm_s_EC": {
        key: "romberg.sway_velocity_mm_s_EC",
        label: "Velocidade de Oscilação (EC)",
        unit: "mm_s",
        directionality: "LOWER_IS_BETTER",
        group: "ROMBERG",
        requiresCalibration: true,
        chart: { defaultChart: "LINE", decimals: 1 }
    },
    "romberg.time_to_stabilize_s": {
        key: "romberg.time_to_stabilize_s",
        label: "Tempo de Estabilização",
        unit: "s",
        directionality: "LOWER_IS_BETTER",
        group: "ROMBERG",
        chart: { defaultChart: "LINE", decimals: 2 }
    },
    "romberg.romberg_ratio_EC_over_EO": {
        key: "romberg.romberg_ratio_EC_over_EO",
        label: "Romberg Ratio (EC/EO)",
        description: "Razão de oscilação entre olhos fechados e abertos.",
        unit: "ratio",
        directionality: "LOWER_IS_BETTER", // Closer to 1 is actually ideal, but usually high ratio means visual dependency. So lowering it towards 1 is good.
        group: "ROMBERG",
        chart: { defaultChart: "LINE", decimals: 2 }
    },
    "romberg.instability_index_0_100": {
        key: "romberg.instability_index_0_100",
        label: "Índice de Instabilidade",
        unit: "score_0_100",
        directionality: "LOWER_IS_BETTER",
        group: "ROMBERG",
        chart: { defaultChart: "LINE", decimals: 0, domain: [0, 100] }
    },

    // --- PROM (Patient Reported Outcome Measures) ---
    "prom.acl_rsi_0_100": {
        key: "prom.acl_rsi_0_100",
        label: "ACL-RSI",
        description: "Escala de prontidão psicológica para retorno ao esporte.",
        unit: "score_0_100",
        directionality: "HIGHER_IS_BETTER",
        group: "PROM",
        chart: { defaultChart: "LINE", decimals: 0, domain: [0, 100] },
        thresholds: { unchangedAbs: 5 } // arbitrary default
    },
    "prom.ikdc_0_100": {
        key: "prom.ikdc_0_100",
        label: "IKDC Subjetivo",
        unit: "score_0_100",
        directionality: "HIGHER_IS_BETTER",
        group: "PROM",
        chart: { defaultChart: "LINE", decimals: 0, domain: [0, 100] }
    },
    "prom.visa_p_0_100": {
        key: "prom.visa_p_0_100",
        label: "VISA-P",
        description: "Avaliação de tendinopatia patelar.",
        unit: "score_0_100",
        directionality: "HIGHER_IS_BETTER",
        group: "PROM",
        chart: { defaultChart: "LINE", decimals: 0, domain: [0, 100] }
    },
    "prom.odi_0_100": {
        key: "prom.odi_0_100",
        label: "Oswestry (ODI)",
        description: "Índice de Incapacidade Oswestry para lombalgia.",
        unit: "score_0_100",
        directionality: "LOWER_IS_BETTER",
        group: "PROM",
        chart: { defaultChart: "LINE", decimals: 0, domain: [0, 100] }
    }
};

// Runtime Validation of the Registry itself
try {
    MetricRegistrySchema.parse(metricRegistry);
    // console.log("Metric Registry Validated ✅");
} catch (e) {
    logger.error("Metric Registry Validation Failed", e, 'metricRegistry');
}
