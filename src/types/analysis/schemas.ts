export type TrialType = 'GAIT' | 'SQUAT_OVERHEAD' | 'ROMBERG';

export interface BaseAnalysis {
    schema_version: string;
    trial_type: TrialType;
    trial_id: string;
    clinic_id: string;
    patient_id: string;
    session_id?: string;
    captured_at: string;
    source_asset_ids: string[];
    calibration: {
        is_calibrated: boolean;
        mm_per_px: number | null;
        notes?: string;
    };
    quality: {
        landmark_confidence_mean_0_1: number;
        occlusion_pct: number;
        analysis_confidence_0_100: number;
        warnings?: string[];
    };
    disclaimer?: string;
}

// --- GAIT SCHEMA ---
export interface GaitProtocol {
    view: 'FRONTAL' | 'LATERAL' | 'OBLIQUE';
    walkway_m?: number | null;
    fps: number;
    instructions?: string;
    footwear?: 'BAREFOOT' | 'SHOES' | 'OTHER';
}

export interface GaitCycle {
    side: 'L' | 'R';
    heel_strike_frame: number;
    toe_off_frame: number;
    next_heel_strike_frame: number;
    mid_stance_frame?: number | null;
}

export interface GaitSummary {
    cadence_spm?: number | null;
    gait_speed_mm_s?: number | null;
    stride_length_mm?: number | null;

    step_length_mm_L?: number | null;
    step_length_mm_R?: number | null;

    step_time_s_L?: number | null;
    step_time_s_R?: number | null;

    stance_pct_L?: number | null;
    stance_pct_R?: number | null;
    swing_pct_L?: number | null;
    swing_pct_R?: number | null;
    double_support_pct?: number | null;

    symmetry_step_time_pct?: number | null;
    symmetry_step_length_pct?: number | null;

    pelvic_drop_deg_peak_L?: number | null;
    pelvic_drop_deg_peak_R?: number | null;
    trunk_lean_frontal_deg_peak?: number | null;

    knee_valgus_deg_peak_L?: number | null;
    knee_valgus_deg_peak_R?: number | null;

    notes?: string;
}

export interface GaitTimeseriesSample {
    t_ms: number;
    com_ml_mm?: number | null;
    com_ap_mm?: number | null;
    pelvic_obliquity_deg?: number | null;
    trunk_lean_frontal_deg?: number | null;
    knee_frontal_angle_deg_L?: number | null;
    knee_frontal_angle_deg_R?: number | null;
}

export interface GaitMetrics extends BaseAnalysis {
    trial_type: 'GAIT';
    protocol: GaitProtocol;
    events: {
        cycles: GaitCycle[];
    };
    summary: GaitSummary;
    timeseries?: {
        downsample_hz: number;
        samples: GaitTimeseriesSample[];
    };
}

// --- SQUAT OVERHEAD SCHEMA ---
export interface SquatProtocol {
    view: 'FRONTAL' | 'LATERAL' | 'OBLIQUE';
    fps: number;
    rep_target: number;
    load?: 'BODYWEIGHT' | 'STICK' | 'BAR_EMPTY' | 'OTHER';
    notes?: string;
}

export interface SquatRep {
    rep_index: number;
    start_frame: number;
    bottom_frame: number;
    end_frame: number;

    depth_score_0_100?: number | null;
    hip_flexion_deg_at_bottom?: number | null;

    trunk_lean_sagittal_deg_at_bottom?: number | null;
    trunk_lean_frontal_deg_at_bottom?: number | null;

    knee_valgus_deg_at_bottom_L?: number | null;
    knee_valgus_deg_at_bottom_R?: number | null;

    heel_lift_flag?: boolean | null;
    knee_tracking_score_0_100?: number | null;

    tempo_s?: number | null;
    hesitation_score_0_100?: number | null;
    smoothness_score_0_100?: number | null;
}

export interface SquatSummary {
    rep_count: number;
    depth_score_mean_0_100?: number | null;
    smoothness_mean_0_100?: number | null;

    knee_valgus_deg_peak_L?: number | null;
    knee_valgus_deg_peak_R?: number | null;

    trunk_lean_sagittal_deg_peak?: number | null;
    trunk_lean_frontal_deg_peak?: number | null;

    notes?: string;
}

export interface OverheadSquatMetrics extends BaseAnalysis {
    trial_type: 'SQUAT_OVERHEAD';
    protocol: SquatProtocol;
    reps: SquatRep[];
    summary: SquatSummary;
}

// --- ROMBERG SCHEMA ---
export interface RombergProtocol {
    fps: number;
    feet_position: 'FEET_TOGETHER' | 'SEMI_TANDEM' | 'TANDEM' | 'OTHER';
    arms_position?: 'ARMS_CROSSED' | 'ARMS_DOWN' | 'OTHER';
    duration_open_s: number;
    duration_closed_s: number;
    notes?: string;
}

export interface RombergSegment {
    start_frame: number;
    end_frame: number;
    sway_path_mm?: number | null;
    sway_area_mm2?: number | null;
    sway_velocity_mm_s?: number | null;
    rms_ml_mm?: number | null;
    rms_ap_mm?: number | null;
}

export interface RombergSummary {
    sway_path_mm_EO?: number | null;
    sway_path_mm_EC?: number | null;

    sway_area_mm2_EO?: number | null;
    sway_area_mm2_EC?: number | null;

    sway_velocity_mm_s_EO?: number | null;
    sway_velocity_mm_s_EC?: number | null;

    rms_ml_mm_EO?: number | null;
    rms_ml_mm_EC?: number | null;
    rms_ap_mm_EO?: number | null;
    rms_ap_mm_EC?: number | null;

    romberg_ratio_EC_over_EO?: number | null;
    instability_index_0_100?: number | null;

    notes?: string;
}

export interface RombergTimeseriesSample {
    t_ms: number;
    segment: 'EO' | 'EC';
    com_ml_mm?: number | null;
    com_ap_mm?: number | null;
}

export interface RombergMetrics extends BaseAnalysis {
    trial_type: 'ROMBERG';
    protocol: RombergProtocol;
    segments: {
        eyes_open: RombergSegment;
        eyes_closed: RombergSegment;
        transition?: {
            eyes_close_frame?: number | null;
            time_to_stabilize_s?: number | null;
            first_oscillation_peak_mm?: number | null;
        };
    };
    summary: RombergSummary;
    timeseries?: {
        downsample_hz: number;
        samples: RombergTimeseriesSample[];
    };
}

export type DynamicAnalysis = GaitMetrics | OverheadSquatMetrics | RombergMetrics;
