/**
 * Strategic Analytics - Type Definitions
 * @module lib/analytics/strategic/types
 */

// ============================================================================
// TIME SLOT OPPORTUNITIES
// ============================================================================

export interface TimeSlotOpportunity {
  organization_id: string;
  day_of_week: number; // 1-7 (ISO: 1=Monday, 7=Sunday)
  day_name: string; // "Segunda-feira", etc.
  hour: number; // 0-23
  occupied_slots: number;
  total_possible_slots: number;
  occupancy_rate: number; // 0-100
  opportunity_level: 'high' | 'medium' | 'low' | 'none';
  opportunity_score: number; // 0-100, higher = better opportunity
  trend_delta: number; // Recent trend (-1 to 1)
  calculated_at: string;
}

export interface TimeSlotInsight {
  dayOfWeek: string;
  dayName: string;
  hour: number;
  hourLabel: string; // "14:00"
  occupancyRate: number;
  opportunityScore: number;
  opportunityLevel: 'high' | 'medium' | 'low';
  trend: 'improving' | 'declining' | 'stable';
  suggestedActions: string[];
  historicalAverage?: number;
  recentAverage?: number;
}

// ============================================================================
// PATIENT ACQUISITION ANALYSIS
// ============================================================================

export interface PatientAcquisitionPeriod {
  organization_id: string;
  period_start: string;
  period_end: string;
  start_day_of_week: number;
  period_label: string; // "Semana 1", "Semana 2", etc.
  new_patients_count: number;
  new_evaluations_count: number;
  new_patients_vs_avg_pct: number;
  evaluations_vs_avg_pct: number;
  new_patients_z_score: number;
  period_classification: 'critical_low' | 'low' | 'normal' | 'high' | 'exceptional';
  calculated_at: string;
}

export interface AcquisitionGap {
  period: {
    type: 'week' | 'month' | 'fortnight';
    label: string;
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    newPatients: number;
    evaluations: number;
    conversionRate: number;
  };
  comparison: {
    vsAverage: number; // Percentage difference
    vsLastYear?: number;
    zScore: number;
  };
  classification: 'critical' | 'low' | 'normal' | 'high';
  suggestedActions: string[];
}

// ============================================================================
// STRATEGIC INSIGHTS
// ============================================================================

export type InsightType =
  | 'low_demand_slot'
  | 'low_acquisition_period'
  | 'revenue_opportunity'
  | 'retention_risk'
  | 'seasonal_pattern'
  | 'operational_inefficiency';

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';
export type InsightStatus = 'detected' | 'acknowledged' | 'addressed' | 'dismissed';

export interface StrategicInsight {
  id: string;
  organization_id: string;
  insight_type: InsightType;
  data: Record<string, unknown>;
  priority: InsightPriority;
  impact_score: number; // 0-100
  confidence_score: number; // 0-100
  status: InsightStatus;
  insight_date: string;
  valid_until?: string;
  recommendations: string[];
  suggested_actions?: SuggestedAction[];
  created_at: string;
  updated_at: string;
  acknowledged_at?: string;
  addressed_at?: string;
  dismissed_at?: string;
  parent_insight_id?: string;
  generated_by: 'system' | 'ai' | 'user';
  generation_method?: string;
}

export interface SuggestedAction {
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  timeline: string;
  steps?: string[];
  expectedImpact?: {
    metric: string;
    change: number; // Percentage or absolute
    confidence: number; // 0-100
  };
}

// ============================================================================
// FORECASTING
// ============================================================================

export type ForecastHorizon = '7d' | '30d' | '90d';
export type ForecastMetric = 'appointments' | 'patients' | 'revenue' | 'occupancy';

export interface ForecastPrediction {
  date: string;
  appointments: {
    predicted: number;
    confidence: number; // 0-100
    range: [number, number]; // [min, max]
  };
  newPatients: {
    predicted: number;
    confidence: number;
  };
  revenue: {
    predicted: number;
    confidence: number;
    range: [number, number];
  };
  occupancy: {
    predicted: number; // 0-100
    confidence: number;
  };
}

export interface TrendAnalysis {
  trend: 'growing' | 'stable' | 'declining';
  growthRate: number; // Percentage
  seasonality: number[]; // 7 or 12 values for weekly/monthly pattern
  anomalies: Array<{
    date: string;
    value: number;
    expected: number;
    deviation: number;
    reason?: string;
  }>;
  confidence: number; // 0-100
}

export interface ForecastResponse {
  predictions: ForecastPrediction[];
  insights: {
    trend: TrendAnalysis;
    recommendations: string[];
    risks: string[];
    opportunities: string[];
  };
  metadata: {
    generatedAt: string;
    horizon: ForecastHorizon;
    model: string;
    confidence: number;
  };
}

// ============================================================================
// SMART ALERTS
// ============================================================================

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertChannel = 'email' | 'whatsapp' | 'push' | 'dashboard' | 'webhook';
export type AlertComparisonOperator = '>' | '<' | '>=' | '<=' | '=' | '!=';
export type AlertTimeWindow = '1h' | '24h' | '7d' | '30d' | '90d';
export type AlertStatus = 'triggered' | 'acknowledged' | 'resolved' | 'dismissed' | 'false_positive';

export interface SmartAlertConfiguration {
  id: string;
  organization_id: string;
  alert_name: string;
  description?: string;
  enabled: boolean;
  metric_name: string;
  threshold_value: number;
  comparison_operator: AlertComparisonOperator;
  time_window: AlertTimeWindow;
  severity: AlertSeverity;
  notification_channels: AlertChannel[];
  cooldown_minutes: number;
  requires_confirmation: boolean;
  auto_dismiss_after?: string;
  message_template?: string;
  suggested_actions?: SuggestedAction[];
  created_at: string;
  updated_at: string;
}

export interface SmartAlertHistory {
  id: string;
  organization_id: string;
  configuration_id: string;
  metric_value: number;
  threshold_value: number;
  severity: AlertSeverity;
  alert_date: string;
  context_data?: Record<string, unknown>;
  status: AlertStatus;
  acknowledged_at?: string;
  resolved_at?: string;
  dismissed_at?: string;
  resolution_notes?: string;
  resolved_by?: string;
  notifications_sent?: Array<{
    channel: AlertChannel;
    status: string;
    sent_at?: string;
  }>;
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

export interface StrategicDashboardMetrics {
  // Oportunidades
  topOpportunities: TimeSlotInsight[];
  lowDemandSlots: TimeSlotInsight[];
  acquisitionGaps: AcquisitionGap[];

  // Insights ativos
  activeInsights: StrategicInsight[];
  criticalInsights: StrategicInsight[];
  acknowledgedInsights: StrategicInsight[];

  // Alertas recentes
  recentAlerts: SmartAlertHistory[];
  activeAlerts: SmartAlertHistory[];

  // Previsões
  forecast?: ForecastResponse;

  // Sumários
  summary: {
    totalOpportunities: number;
    criticalInsights: number;
    activeAlerts: number;
    forecastTrend: 'growing' | 'stable' | 'declining';
    overallHealthScore: number; // 0-100
  };

  lastUpdated: string;
}

// ============================================================================
// FILTERS AND QUERIES
// ============================================================================

export interface StrategicAnalyticsFilters {
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  insightTypes?: InsightType[];
  priorities?: InsightPriority[];
  includeDismissed?: boolean;
  horizon?: ForecastHorizon;
  metrics?: ForecastMetric[];
}

export interface TimeSlotAnalysisOptions {
  minOpportunityScore?: number; // 0-100
  minOccupancyRate?: number; // 0-100
  maxOccupancyRate?: number; // 0-100
  daysOfWeek?: number[]; // 1-7
  hours?: number[]; // 0-23
  sortBy?: 'opportunity_score' | 'occupancy_rate' | 'day_hour';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface AcquisitionAnalysisOptions {
  periodType?: 'week' | 'month' | 'fortnight';
  minZScore?: number;
  maxZScore?: number;
  classification?: Array<'critical_low' | 'low' | 'normal' | 'high' | 'exceptional'>;
  sortBy?: 'new_patients_count' | 'vs_avg_pct' | 'z_score';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

// ============================================================================
// AI RECOMMENDATIONS
// ============================================================================

export type RecommendationCategory = 'pricing' | 'marketing' | 'scheduling' | 'staffing' | 'operations';

export interface AIRecommendation {
  id: string;
  type: RecommendationCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  rationale: string; // Why this recommendation is being made
  expectedImpact: {
    metric: string;
    change: number;
    confidence: number;
    timeframe: string;
  };
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
    cost?: 'low' | 'medium' | 'high';
    steps: string[];
    resources?: string[];
  };
  risks?: string[];
  alternatives?: string[];
  metadata: {
    generatedAt: string;
    model: string;
    confidence: number;
  };
}

export interface ActionPlanRequest {
  focusArea: 'occupancy' | 'acquisition' | 'retention' | 'revenue' | 'all';
  timeHorizon: 'immediate' | 'short' | 'medium' | 'long';
  constraints?: {
    budget?: 'low' | 'medium' | 'high';
    teamSize?: number;
    availableResources?: string[];
  };
}

export interface ActionPlanResponse {
  summary: {
    focusArea: string;
    timeHorizon: string;
    totalActions: number;
    estimatedImpact: string;
    estimatedTimeline: string;
  };
  priorityActions: Array<{
    order: number;
    title: string;
    description: string;
    expectedImpact: string;
    effort: string;
    timeline: string;
    steps: string[];
  }>;
  quickWins: Array<{
    title: string;
    description: string;
    impact: string;
    effort: 'low';
    timeline: string;
  }>;
  longTermStrategies: Array<{
    title: string;
    description: string;
    impact: string;
    effort: 'medium' | 'high';
    timeline: string;
  }>;
  kpisToTrack: string[];
  reviewDate: string;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  TimeSlotOpportunity,
  TimeSlotInsight,
  PatientAcquisitionPeriod,
  AcquisitionGap,
  StrategicInsight,
  SuggestedAction,
  ForecastPrediction,
  TrendAnalysis,
  ForecastResponse,
  SmartAlertConfiguration,
  SmartAlertHistory,
  StrategicDashboardMetrics,
  StrategicAnalyticsFilters,
  TimeSlotAnalysisOptions,
  AcquisitionAnalysisOptions,
  AIRecommendation,
  ActionPlanRequest,
  ActionPlanResponse,
};
