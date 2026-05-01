import {
  AppointmentRow,
  ContaFinanceira,
  DashboardResponse,
  Pagamento,
  PatientRow,
  TherapistSummary,
  GamificationStats,
  AtRiskPatient,
  PatientPrediction,
  RevenueForecast,
  StaffPerformanceMetric,
  PatientSelfAssessment,
} from "@/types/workers";
import { type Notification } from "@/api/v2/communications";

export type ViewMode = "today" | "week" | "month" | "custom";

export interface DashboardMetrics {
  pacientesAtivos: number;
  activePatients: number; // Alias
  totalPacientes: number;
  pacientesNovos: number;
  agendamentosHoje: number;
  appointmentsToday: number; // Alias
  agendamentosConcluidos: number;
  agendamentosRestantes: number;
  taxaNoShow: number;
  noShowRate: number; // Alias
  receitaMensal: number;
  monthlyRevenue: number; // Alias
  receitaMesAnterior: number;
  crescimentoMensal: number;
  tendenciaSemanal: Array<{
    dia: string;
    agendamentos: number;
    concluidos: number;
  }>;
  fisioterapeutasAtivos: number;
  agendamentosSemana: number;
  pendingEvolutions: number;
  whatsappConfirmationsPending: number;
  financialToday: {
    received: number;
    projected: number;
  };
  revenueChart: Array<{
    date: string;
    revenue: number;
  }>;
  clinicalImprovement: number;
  evolutionChart: Array<{
    day: number;
    actualPain: number;
    actualMobility: number;
    predictedPain: number;
  }>;
  targetRevenue: number;
  engagementScore: number;
  patientsAtRisk: number;
  occupancyRate: number;
  retentionRate: number;
  avgTicket: number;
}

export interface SmartDashboardData {
  metrics: DashboardMetrics;
  predictions: PatientPrediction[];
  medicalReturnsUpcoming: PatientRow[];
  forecasts: RevenueForecast[];
  staffPerformance: StaffPerformanceMetric[];
  selfAssessments: PatientSelfAssessment[];
  notifications: Notification[];
  birthdaysToday: PatientRow[];
  staffBirthdaysToday: TherapistSummary[];
  viewMode: ViewMode;
  patients: PatientRow[];
  appointmentsToday: AppointmentRow[];
  appointmentsWeek: AppointmentRow[];
  appointmentsMonth: AppointmentRow[];
  therapists: TherapistSummary[];
  gamificationStats: GamificationStats | null;
  atRiskPatients: AtRiskPatient[];
  analyticsDashboard: DashboardResponse | null;
}
