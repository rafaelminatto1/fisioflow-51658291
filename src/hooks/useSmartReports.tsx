import { useState } from 'react';

export interface AdherenceReport {
  id: string;
  patient_id: string;
  plan_id: string;
  period_start: string;
  period_end: string;
  total_sessions_planned: number;
  total_sessions_completed: number;
  adherence_percentage: number;
  avg_pain_reduction: number;
  avg_functional_improvement: number;
  consistency_score: number;
  created_at: string;
}

export interface ProgressReport {
  id: string;
  patient_id: string;
  report_period: string;
  pain_trend: 'improving' | 'stable' | 'worsening';
  functional_trend: 'improving' | 'stable' | 'worsening';
  exercise_compliance: number;
  goal_achievement_rate: number;
  recommendations: string[];
  next_review_date: string;
  created_at: string;
}

export interface OutcomeReport {
  id: string;
  patient_id: string;
  treatment_start: string;
  treatment_end?: string;
  initial_pain_level: number;
  final_pain_level: number;
  initial_functional_score: number;
  final_functional_score: number;
  total_sessions: number;
  treatment_satisfaction: number;
  goals_achieved: string[];
  created_at: string;
}

export function useSmartReports() {
  const [adherenceReports, setAdherenceReports] = useState<AdherenceReport[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [outcomeReports, setOutcomeReports] = useState<OutcomeReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock implementations - database tables don't exist yet
  const generateAdherenceReport = async (patientId: string, planId: string, startDate: string, endDate: string) => {
    const mockReport: AdherenceReport = {
      id: Math.random().toString(),
      patient_id: patientId,
      plan_id: planId,
      period_start: startDate,
      period_end: endDate,
      total_sessions_planned: 20,
      total_sessions_completed: 16,
      adherence_percentage: 80,
      avg_pain_reduction: 2.5,
      avg_functional_improvement: 15,
      consistency_score: 85,
      created_at: new Date().toISOString()
    };
    setAdherenceReports(prev => [mockReport, ...prev]);
    return mockReport;
  };

  const generateProgressReport = async (patientId: string, period: string) => {
    const mockReport: ProgressReport = {
      id: Math.random().toString(),
      patient_id: patientId,
      report_period: period,
      pain_trend: 'improving',
      functional_trend: 'improving',
      exercise_compliance: 78,
      goal_achievement_rate: 65,
      recommendations: ['Continuar exercícios', 'Aumentar frequência'],
      next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };
    setProgressReports(prev => [mockReport, ...prev]);
    return mockReport;
  };

  const generateOutcomeReport = async (patientId: string) => {
    const mockReport: OutcomeReport = {
      id: Math.random().toString(),
      patient_id: patientId,
      treatment_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      treatment_end: new Date().toISOString(),
      initial_pain_level: 8,
      final_pain_level: 3,
      initial_functional_score: 45,
      final_functional_score: 80,
      total_sessions: 24,
      treatment_satisfaction: 9,
      goals_achieved: ['Redução da dor', 'Melhora da mobilidade'],
      created_at: new Date().toISOString()
    };
    setOutcomeReports(prev => [mockReport, ...prev]);
    return mockReport;
  };

  return {
    adherenceReports,
    progressReports,
    outcomeReports,
    loading,
    error,
    generateAdherenceReport,
    generateProgressReport,
    generateOutcomeReport,
    fetchAdherenceReports: async () => {},
    fetchProgressReports: async () => {},
    fetchOutcomeReports: async () => {},
    autoGenerateReports: async () => true,
    calculateInsights: () => null
  };
}