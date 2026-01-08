// Schema: physio-metrics.dynamic_compare@1.0.0

export const SCHEMA_VERSION = "physio-metrics.dynamic_compare@1.0.0";

export type TestType = "GAIT" | "SQUAT_OVERHEAD" | "ROMBERG" | "CUSTOM" | "AUTO";
export type MetricUnit = "deg" | "pct" | "s" | "ms" | "mm" | "mm2" | "mm_s" | "px" | "px2" | "px_s" | "score_0_100" | "spm" | "ratio" | "count" | "na";
export type Directionality = "LOWER_IS_BETTER" | "HIGHER_IS_BETTER" | "CLOSER_TO_ZERO_IS_BETTER" | "UNKNOWN";
export type MetricStatus = "IMPROVED" | "UNCHANGED" | "WORSE" | "NA";

export interface FrameTimeRef {
    frame_index: number;
    t_ms?: number | null;
}

export interface TrialRef {
    label: "INITIAL" | "REASSESSMENT" | "CUSTOM";
    captured_at: string; // ISO Date
    source_asset_ids: string[];
    analysis_run_id?: string;
    study_id?: string;
    protocol?: {
        view?: "FRONTAL" | "LATERAL" | "OBLIQUE" | "UNKNOWN";
        fps?: number | null;
        notes?: string;
    };
    metrics_schema_ref?: string;
    metrics_payload?: any; // Snapshot of raw metrics
}

export interface KeyMomentPair {
    name: string;
    trial_A: FrameTimeRef;
    trial_B: FrameTimeRef;
}

export interface Synchronization {
    mode: "AUTO" | "MANUAL" | "HYBRID";
    anchor: {
        anchor_type: "GAIT_MID_STANCE" | "GAIT_HEEL_STRIKE" | "GAIT_TOE_OFF" | "SQUAT_BOTTOM" | "ROMBERG_EYES_CLOSE" | "CUSTOM";
        trial_A: FrameTimeRef;
        trial_B: FrameTimeRef;
        window_s?: number | null;
        warp_method?: "NONE" | "LINEAR" | "DTW_LIGHT";
        notes?: string;
    };
    key_moments?: KeyMomentPair[];
}

export interface MetricDelta {
    key: string; // e.g. 'gait.symmetry_step_time_pct'
    label: string;
    unit: MetricUnit;
    value_A?: number | null;
    value_B?: number | null;
    delta?: number | null;
    directionality: Directionality;
    status: MetricStatus;
    delta_abs_threshold?: number | null;
    delta_pct_threshold?: number | null;
    confidence_0_100?: number | null;
    notes?: string;
}

export interface Summary {
    improvements: string[];
    still_to_improve: string[];
    key_findings: string[];
    metrics_table_markdown: string;
    technical_text?: string;
    patient_text?: string;
    limitations?: string[];
}

export interface Quality {
    analysis_confidence_A_0_100: number;
    analysis_confidence_B_0_100: number;
    analysis_confidence_overall_0_100: number;
    occlusion_pct_A?: number | null;
    occlusion_pct_B?: number | null;
    warnings?: string[];
}

// Root Interface
export interface DynamicCompareMetrics {
    schema_version: string; // const "physio-metrics.dynamic_compare@1.0.0"
    compare_type: "DYNAMIC_COMPARE";

    compare_id?: string;
    clinic_id?: string;
    patient_id?: string;
    session_id?: string;
    created_at: string;

    test_type: TestType;

    trial_A: TrialRef;
    trial_B: TrialRef;

    synchronization: Synchronization;

    metric_deltas: MetricDelta[];

    summary: Summary;

    quality: Quality;

    tags?: string[];
    disclaimer?: string;
}

// Standard Keys
export const METRIC_KEYS = {
    GAIT: {
        CADENCE: 'gait.cadence_spm',
        SYMMETRY: 'gait.symmetry_step_time_pct',
        STANCE_L: 'gait.stance_pct_L',
        STANCE_R: 'gait.stance_pct_R',
        PELVIC_DROP_L: 'gait.pelvic_drop_deg_peak_L',
        PELVIC_DROP_R: 'gait.pelvic_drop_deg_peak_R',
        TRUNK_LEAN: 'gait.trunk_lean_frontal_deg_peak',
        KNEE_VALGUS_L: 'gait.knee_valgus_deg_peak_L',
        KNEE_VALGUS_R: 'gait.knee_valgus_deg_peak_R',
    },
    SQUAT: {
        VALGUS_L: 'squat.knee_valgus_deg_peak_L',
        VALGUS_R: 'squat.knee_valgus_deg_peak_R',
        TRUNK_LEAN_SAG: 'squat.trunk_lean_sagittal_deg_peak',
        DEPTH: 'squat.depth_score_mean_0_100',
        SMOOTHNESS: 'squat.smoothness_mean_0_100',
        HESITATION: 'squat.hesitation_mean_0_100',
    },
    ROMBERG: {
        SWAY_AREA_EO: 'romberg.sway_area_mm2_EO',
        SWAY_AREA_EC: 'romberg.sway_area_mm2_EC',
        SWAY_VEL_EO: 'romberg.sway_velocity_mm_s_EO',
        SWAY_VEL_EC: 'romberg.sway_velocity_mm_s_EC',
        TIME_TO_STABILIZE: 'romberg.time_to_stabilize_s',
        RATIO: 'romberg.romberg_ratio_EC_over_EO',
    }
};
