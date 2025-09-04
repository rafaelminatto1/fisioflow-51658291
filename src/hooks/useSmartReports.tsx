import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface AdherenceReport {
  id: string;
  patient_id: string;
  plan_id: string;
  period_start: string;
  period_end: string;
  total_exercises: number;
  completed_exercises: number;
  adherence_percentage: number;
  average_pain_level: number;
  average_functional_score: number;
  progression_score: number;
  recommendations: string[];
  created_at: string;
}

export interface ProgressReport {
  id: string;
  patient_id: string;
  plan_id: string;
  report_type: 'weekly' | 'monthly' | 'custom';
  metrics: {
    pain_improvement: number;
    functional_improvement: number;
    exercise_compliance: number;
    session_frequency: number;
    goal_achievement: number;
  };
  trends: {
    pain_trend: 'improving' | 'stable' | 'worsening';
    function_trend: 'improving' | 'stable' | 'worsening';
    adherence_trend: 'improving' | 'stable' | 'declining';
  };
  insights: string[];
  recommendations: string[];
  created_at: string;
}

export interface ReportFilters {
  patient_id?: string;
  plan_id?: string;
  date_from?: string;
  date_to?: string;
  report_type?: 'adherence' | 'progress' | 'both';
}

export const useSmartReports = () => {
  const [adherenceReports, setAdherenceReports] = useState<AdherenceReport[]>([]);
  const [progressReports, setProgressReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch adherence reports
  const fetchAdherenceReports = async (filters?: ReportFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('adherence_reports')
        .select(`
          *,
          patients(name),
          exercise_plans(name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters?.plan_id) {
        query = query.eq('plan_id', filters.plan_id);
      }
      if (filters?.date_from) {
        query = query.gte('period_start', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('period_end', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAdherenceReports(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar relatórios de aderência';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch progress reports
  const fetchProgressReports = async (filters?: ReportFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('progress_reports')
        .select(`
          *,
          patients(name),
          exercise_plans(name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters?.plan_id) {
        query = query.eq('plan_id', filters.plan_id);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProgressReports(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar relatórios de progresso';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate adherence report
  const generateAdherenceReport = async (
    patientId: string,
    planId: string,
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate adherence metrics
      const { data: progressData, error: progressError } = await supabase
        .from('patient_progress')
        .select('*')
        .eq('patient_id', patientId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      if (progressError) throw progressError;

      const { data: planData, error: planError } = await supabase
        .from('exercise_plans')
        .select(`
          *,
          exercise_plan_items(*)
        `)
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Calculate metrics
      const totalExercises = planData.exercise_plan_items.length;
      const completedExercises = progressData?.filter(p => p.exercise_compliance >= 80).length || 0;
      const adherencePercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
      
      const avgPainLevel = progressData?.reduce((sum, p) => sum + (p.pain_level || 0), 0) / (progressData?.length || 1);
      const avgFunctionalScore = progressData?.reduce((sum, p) => sum + (p.functional_score || 0), 0) / (progressData?.length || 1);
      
      // Calculate progression score based on improvement
      const firstProgress = progressData?.[progressData.length - 1];
      const lastProgress = progressData?.[0];
      const progressionScore = firstProgress && lastProgress 
        ? ((lastProgress.functional_score - firstProgress.functional_score) / firstProgress.functional_score) * 100
        : 0;

      // Generate recommendations
      const recommendations = [];
      if (adherencePercentage < 70) {
        recommendations.push('Melhorar aderência aos exercícios - considerar ajustes no plano');
      }
      if (avgPainLevel > 6) {
        recommendations.push('Nível de dor elevado - revisar intensidade dos exercícios');
      }
      if (progressionScore < 10) {
        recommendations.push('Progresso funcional limitado - considerar modificações no programa');
      }
      if (adherencePercentage >= 80 && progressionScore >= 20) {
        recommendations.push('Excelente progresso - considerar progressão para próximo nível');
      }

      const reportData = {
        patient_id: patientId,
        plan_id: planId,
        period_start: periodStart,
        period_end: periodEnd,
        total_exercises: totalExercises,
        completed_exercises: completedExercises,
        adherence_percentage: Math.round(adherencePercentage),
        average_pain_level: Math.round(avgPainLevel * 10) / 10,
        average_functional_score: Math.round(avgFunctionalScore * 10) / 10,
        progression_score: Math.round(progressionScore * 10) / 10,
        recommendations
      };

      const { data, error } = await supabase
        .from('adherence_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;

      setAdherenceReports(prev => [data, ...prev]);
      
      toast({
        title: 'Sucesso',
        description: 'Relatório de aderência gerado com sucesso',
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatório de aderência';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate progress report
  const generateProgressReport = async (
    patientId: string,
    planId: string,
    reportType: 'weekly' | 'monthly' | 'custom'
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range based on report type
      const endDate = new Date();
      const startDate = new Date();
      
      switch (reportType) {
        case 'weekly':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        default:
          startDate.setMonth(endDate.getMonth() - 3); // 3 months for custom
      }

      // Fetch progress data
      const { data: progressData, error: progressError } = await supabase
        .from('patient_progress')
        .select('*')
        .eq('patient_id', patientId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (progressError) throw progressError;

      if (!progressData || progressData.length < 2) {
        throw new Error('Dados insuficientes para gerar relatório de progresso');
      }

      // Calculate metrics and trends
      const firstRecord = progressData[0];
      const lastRecord = progressData[progressData.length - 1];
      
      const painImprovement = ((firstRecord.pain_level - lastRecord.pain_level) / firstRecord.pain_level) * 100;
      const functionalImprovement = ((lastRecord.functional_score - firstRecord.functional_score) / firstRecord.functional_score) * 100;
      const avgCompliance = progressData.reduce((sum, p) => sum + (p.exercise_compliance || 0), 0) / progressData.length;
      
      // Determine trends
      const painTrend = painImprovement > 10 ? 'improving' : painImprovement < -10 ? 'worsening' : 'stable';
      const functionTrend = functionalImprovement > 10 ? 'improving' : functionalImprovement < -10 ? 'worsening' : 'stable';
      const adherenceTrend = avgCompliance > 80 ? 'improving' : avgCompliance < 60 ? 'declining' : 'stable';

      // Generate insights and recommendations
      const insights = [];
      const recommendations = [];

      if (painTrend === 'improving') {
        insights.push('Redução significativa nos níveis de dor');
      }
      if (functionTrend === 'improving') {
        insights.push('Melhora notável na funcionalidade');
        recommendations.push('Considerar progressão para exercícios mais desafiadores');
      }
      if (adherenceTrend === 'declining') {
        insights.push('Aderência aos exercícios em declínio');
        recommendations.push('Revisar barreiras para execução dos exercícios');
      }

      const reportData = {
        patient_id: patientId,
        plan_id: planId,
        report_type: reportType,
        metrics: {
          pain_improvement: Math.round(painImprovement * 10) / 10,
          functional_improvement: Math.round(functionalImprovement * 10) / 10,
          exercise_compliance: Math.round(avgCompliance * 10) / 10,
          session_frequency: progressData.length,
          goal_achievement: Math.round(((painImprovement + functionalImprovement) / 2) * 10) / 10
        },
        trends: {
          pain_trend: painTrend,
          function_trend: functionTrend,
          adherence_trend: adherenceTrend
        },
        insights,
        recommendations
      };

      const { data, error } = await supabase
        .from('progress_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;

      setProgressReports(prev => [data, ...prev]);
      
      toast({
        title: 'Sucesso',
        description: 'Relatório de progresso gerado com sucesso',
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar relatório de progresso';
      setError(message);
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Export report data
  const exportReport = async (reportId: string, type: 'adherence' | 'progress', format: 'pdf' | 'csv') => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('export-report', {
        body: { reportId, type, format }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([data], { 
        type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${type}_${reportId}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Relatório exportado com sucesso',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao exportar relatório';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    adherenceReports,
    progressReports,
    loading,
    error,
    fetchAdherenceReports,
    fetchProgressReports,
    generateAdherenceReport,
    generateProgressReport,
    exportReport
  };
};