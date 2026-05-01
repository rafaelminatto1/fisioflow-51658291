export type ExportFormat = "pdf" | "csv" | "json" | "excel";

export interface ExportOptions {
  format: ExportFormat;
  includeCharts?: boolean;
  includePredictions?: boolean;
  includeGoals?: boolean;
  includeTrends?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  language?: "pt-BR" | "en";
  fileName?: string;
}

export interface AnalyticsExportData {
  patientInfo: {
    id: string;
    name: string;
    exportDate: string;
    email?: string;
    phone?: string;
  };
  progressSummary: {
    totalSessions: number;
    totalPainReduction: number;
    goalsAchieved: number;
    overallProgress: number;
    avgSessionDuration?: number;
  };
  trends: Array<{
    type: string;
    current: number;
    change: number;
    changePercentage: number;
    dataPoints?: Array<{ date: string; value: number }>;
  }>;
  predictions: {
    dropoutRisk: number;
    successProbability: number;
    predictedRecoveryDate?: string;
    confidenceInterval?: { min: number; max: number };
  };
  goals: Array<{
    title: string;
    status: string;
    progress: number;
    targetDate?: string;
  }>;
}

export interface ExportResult {
  format: ExportFormat;
  fileName: string;
  timestamp: string;
  size?: number;
}
