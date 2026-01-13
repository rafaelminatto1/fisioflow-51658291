/**
 * Patient Analytics and ML Types
 *
 * Types for machine learning predictions, patient outcomes,
 * lifecycle tracking, and risk assessment.
 */

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

export type LifecycleEventType =
  | 'lead_created'
  | 'first_contact'
  | 'first_appointment_scheduled'
  | 'first_appointment_completed'
  | 'treatment_started'
  | 'treatment_paused'
  | 'treatment_resumed'
  | 'treatment_completed'
  | 'discharged'
  | 'follow_up_scheduled'
  | 'reactivation'
  | 'churned';

export interface PatientLifecycleEvent {
  id: string;
  patient_id: string;
  event_type: LifecycleEventType;
  event_date: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  notes?: string;
}

export interface PatientLifecycleSummary {
  current_stage: LifecycleEventType;
  days_in_current_stage: number;
  total_days_in_treatment: number;
  stage_history: Array<{
    stage: LifecycleEventType;
    date: string;
    duration_days?: number;
  }>;
  upcoming_milestones: Array<{
    milestone: string;
    expected_date: string;
    probability: number;
  }>;
}

// ============================================================================
// OUTCOME MEASURES (PROMs)
// ============================================================================

export type OutcomeMeasureType =
  | 'pain_scale'
  | 'functional_scale'
  | 'quality_of_life'
  | 'disability_index'
  | 'satisfaction'
  | 'adherence';

export interface PatientOutcomeMeasure {
  id: string;
  patient_id: string;
  measure_type: OutcomeMeasureType;
  measure_name: string;
  score: number;
  normalized_score?: number; // 0-100
  min_score: number;
  max_score: number;
  measurement_date: string;
  body_part?: string;
  context?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface OutcomeMeasureTrend {
  measure_name: string;
  current_score: number;
  initial_score: number;
  change: number;
  change_percentage: number;
  trend: 'improving' | 'stable' | 'declining';
  trend_strength: 'strong' | 'moderate' | 'weak';
  data_points: Array<{
    date: string;
    score: number;
    normalized_score?: number;
  }>;
}

// ============================================================================
// SESSION METRICS
// ============================================================================

export type MoodType = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

export interface PatientSessionMetrics {
  id: string;
  patient_id: string;
  session_id?: string;
  session_date: string;
  session_number?: number;

  // Pre-session
  pain_level_before?: number;
  functional_score_before?: number;
  mood_before?: MoodType;

  // Session details
  duration_minutes?: number;
  treatment_type?: string;
  techniques_used?: string[];
  areas_treated?: string[];

  // Post-session
  pain_level_after?: number;
  functional_score_after?: number;
  mood_after?: MoodType;
  patient_satisfaction?: number;

  // Calculated
  pain_reduction?: number;
  functional_improvement?: number;

  notes?: string;
  therapist_id?: string;
  created_at: string;
}

// ============================================================================
// PREDICTIONS
// ============================================================================

export type PredictionType =
  | 'outcome_success'
  | 'dropout_risk'
  | 'recovery_timeline'
  | 'optimal_session_frequency'
  | 'pain_projection'
  | 'functional_projection';

export interface PatientPrediction {
  id: string;
  patient_id: string;
  prediction_type: PredictionType;
  prediction_date: string;

  // Input features
  features: Record<string, unknown>;

  // Prediction outputs
  predicted_value?: number;
  predicted_class?: string;
  confidence_score: number; // 0-1
  confidence_interval?: {
    lower: number;
    upper: number;
  };

  // Timeframe
  target_date?: string;
  timeframe_days?: number;

  // Actual outcome (for validation)
  actual_value?: number;
  actual_class?: string;
  outcome_determined_at?: string;

  // Metadata
  model_version: string;
  model_name?: string;
  is_active: boolean;

  created_at: string;
}

export interface PatientPredictionSummary {
  dropout_probability: number;
  dropout_risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_recovery_date?: string;
  predicted_recovery_confidence: number;
  expected_sessions_remaining?: number;
  success_probability: number;
  key_risk_factors: string[];
  recommendations: string[];
}

// ============================================================================
// RISK SCORES
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PatientRiskScore {
  id: string;
  patient_id: string;
  calculated_at: string;

  // Individual risks
  dropout_risk_score: number; // 0-100
  no_show_risk_score: number; // 0-100
  poor_outcome_risk_score: number; // 0-100

  // Overall
  overall_risk_score: number; // 0-100
  risk_level: RiskLevel;

  // Factors
  risk_factors: Record<string, unknown>;
  protective_factors: Record<string, unknown>;

  // Recommendations
  recommended_actions?: string[];

  // Context
  days_since_last_session?: number;
  upcoming_appointments?: number;
  session_attendance_rate?: number;

  created_at: string;
}

// ============================================================================
// GOAL TRACKING
// ============================================================================

export type GoalCategory =
  | 'pain_reduction'
  | 'functional_improvement'
  | 'range_of_motion'
  | 'strength'
  | 'endurance'
  | 'activities_of_daily_living'
  | 'return_to_sport'
  | 'other';

export type GoalStatus = 'not_started' | 'in_progress' | 'achieved' | 'on_hold' | 'cancelled';

export interface PatientGoalTracking {
  id: string;
  patient_id: string;
  goal_title: string;
  goal_description?: string;
  goal_category: GoalCategory;

  // Target
  target_value?: number;
  current_value?: number;
  initial_value?: number;
  unit?: string;
  target_date?: string;

  // Status
  status: GoalStatus;
  progress_percentage?: number;

  // Achievement
  achieved_at?: string;
  achievement_milestone?: string;

  // Relationships
  related_pathology?: string;
  associated_plan_id?: string;

  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CLINICAL BENCHMARKS
// ============================================================================

export interface ClinicalBenchmark {
  id: string;
  benchmark_name: string;
  benchmark_category: string;
  pathology?: string;
  population_segment?: string;

  // Values
  median_value: number;
  mean_value: number;
  percentile_25: number;
  percentile_75: number;
  standard_deviation?: number;

  // Context
  sample_size: number;
  data_source: string;
  reference?: string;
  last_updated: string;

  created_at: string;
}

export interface PatientBenchmarkComparison {
  benchmark: ClinicalBenchmark;
  patient_value: number;
  patient_percentile: number;
  comparison: 'above_average' | 'average' | 'below_average';
  difference_from_median: number;
  difference_from_mean: number;
}

// ============================================================================
// PATIENT INSIGHTS
// ============================================================================

export type InsightType =
  | 'trend_alert'
  | 'milestone_achieved'
  | 'risk_detected'
  | 'recommendation'
  | 'comparison'
  | 'progress_summary';

export interface PatientInsight {
  id: string;
  patient_id: string;
  insight_type: InsightType;
  insight_text: string;
  confidence_score?: number;

  // Related data
  related_metric?: string;
  metric_value?: number;
  comparison_value?: number;
  comparison_benchmark_id?: string;

  // Status
  is_acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;

  // Action
  action_taken?: string;
  actioned_at?: string;
  actioned_by?: string;

  created_at: string;
  expires_at?: string;
}

// ============================================================================
// PROGRESS SUMMARY
// ============================================================================

export interface PatientProgressSummary {
  total_sessions: number;
  avg_pain_reduction: number | null;
  total_pain_reduction: number;
  avg_functional_improvement: number | null;
  current_pain_level: number | null;
  initial_pain_level: number | null;
  goals_achieved: number;
  goals_in_progress: number;
  overall_progress_percentage: number | null;
}

// ============================================================================
// ML TRAINING DATA (Anonymized)
// ============================================================================

export interface MLTrainingData {
  id: string;
  patient_hash: string; // Anonymized

  // Demographic (binned)
  age_group: string;
  gender: string;

  // Clinical
  primary_pathology: string;
  chronic_condition: boolean;
  baseline_pain_level: number;
  baseline_functional_score: number;

  // Treatment
  treatment_type: string;
  session_frequency_weekly: number;
  total_sessions: number;

  // Engagement
  attendance_rate: number;
  home_exercise_compliance: number;
  portal_login_frequency: number;

  // Outcome
  outcome_category: 'success' | 'partial' | 'poor';
  sessions_to_discharge: number;
  pain_reduction_percentage: number;
  functional_improvement_percentage: number;
  patient_satisfaction_score: number;

  // Metadata
  data_collection_period_start: string;
  data_collection_period_end: string;
  created_at: string;
}

// ============================================================================
// ANALYTICS DASHBOARD TYPES
// ============================================================================

export interface PatientAnalyticsData {
  patient_id: string;

  // Progress
  progress_summary: PatientProgressSummary;

  // Trends
  pain_trend: OutcomeMeasureTrend | null;
  function_trend: OutcomeMeasureTrend | null;

  // Risk
  risk_score: PatientRiskScore | null;

  // Predictions
  predictions: PatientPredictionSummary;

  // Lifecycle
  lifecycle: PatientLifecycleSummary | null;

  // Benchmarks
  benchmark_comparisons: PatientBenchmarkComparison[];

  // Insights
  recent_insights: PatientInsight[];
  actionable_insights: PatientInsight[];

  // Goals
  goals: PatientGoalTracking[];

  // Session history (summary)
  recent_sessions: Array<{
    date: string;
    pain_reduction: number;
    satisfaction: number;
  }>;
}

// ============================================================================
// CHART DATA TYPES
// ============================================================================

export interface PainProgressionChartPoint {
  date: string;
  pain_level: number;
  pain_level_predicted?: number;
  session_number: number;
}

export interface FunctionalProgressionChartPoint {
  date: string;
  functional_score: number;
  functional_score_predicted?: number;
  session_number: number;
}

export interface LifecycleStage {
  stage: string;
  start_date: string;
  end_date?: string;
  duration_days?: number;
  color: string;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export type OutcomeMeasureFormData = Omit<
  PatientOutcomeMeasure,
  'id' | 'patient_id' | 'created_at' | 'normalized_score' | 'min_score' | 'max_score'
>;

export type GoalFormData = Omit<
  PatientGoalTracking,
  'id' | 'patient_id' | 'progress_percentage' | 'achieved_at' | 'created_at' | 'updated_at' | 'created_by'
>;

export type SessionMetricsFormData = Omit<
  PatientSessionMetrics,
  'id' | 'patient_id' | 'pain_reduction' | 'functional_improvement' | 'created_at'
>;
