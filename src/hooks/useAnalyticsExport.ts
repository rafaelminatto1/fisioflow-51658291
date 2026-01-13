/**
 * Analytics Export Hook
 *
 * Provides functionality to export patient analytics data
 * in various formats (PDF, CSV, JSON).
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PatientAnalyticsData } from '@/types/patientAnalytics';

// ============================================================================
// TYPES
// ============================================================================

export type ExportFormat = 'pdf' | 'csv' | 'json' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  includeCharts?: boolean;
  includePredictions?: boolean;
  includeGoals?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  language?: 'pt-BR' | 'en';
}

export interface AnalyticsExportData {
  patientInfo: {
    id: string;
    name: string;
    exportDate: string;
  };
  progressSummary: {
    totalSessions: number;
    totalPainReduction: number;
    goalsAchieved: number;
    overallProgress: number;
  };
  trends: Array<{
    type: string;
    current: number;
    change: number;
    changePercentage: number;
  }>;
  predictions: {
    dropoutRisk: number;
    successProbability: number;
    predictedRecoveryDate?: string;
  };
  goals: Array<{
    title: string;
    status: string;
    progress: number;
  }>;
}

// ============================================================================
// CSV EXPORT HELPER
// ============================================================================

function convertToCSV(data: AnalyticsExportData): string {
  const rows: string[][] = [];

  // Header
  rows.push(['Relatório de Analytics - FisioFlow']);
  rows.push([`Data de Exportação: ${data.patientInfo.exportDate}`]);
  rows.push([]);

  // Progress Summary
  rows.push(['RESUMO DO PROGRESSO']);
  rows.push(['Métrica', 'Valor']);
  rows.push(['Total de Sessões', data.progressSummary.totalSessions.toString()]);
  rows.push(['Redução Total da Dor', data.progressSummary.totalPainReduction.toString()]);
  rows.push(['Objetivos Alcançados', data.progressSummary.goalsAchieved.toString()]);
  rows.push(['Progresso Geral', `${data.progressSummary.overallProgress}%`]);
  rows.push([]);

  // Trends
  rows.push(['TENDÊNCIAS']);
  rows.push(['Tipo', 'Atual', 'Mudança', '% Mudança']);
  data.trends.forEach(trend => {
    rows.push([trend.type, trend.current.toString(), trend.change.toString(), `${trend.changePercentage}%`]);
  });
  rows.push([]);

  // Predictions
  rows.push(['PREDIÇÕES']);
  rows.push(['Risco de Abandono', `${data.predictions.dropoutRisk}%`]);
  rows.push(['Probabilidade de Sucesso', `${data.predictions.successProbability}%`]);
  if (data.predictions.predictedRecoveryDate) {
    rows.push(['Data Prevista de Recuperação', data.predictions.predictedRecoveryDate]);
  }
  rows.push([]);

  // Goals
  rows.push(['OBJETIVOS']);
  rows.push(['Título', 'Status', 'Progresso']);
  data.goals.forEach(goal => {
    rows.push([goal.title, goal.status, `${goal.progress}%`]);
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// MAIN EXPORT HOOK
// ============================================================================

export function useAnalyticsExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async ({
      patientId,
      patientName,
      analyticsData,
      options
    }: {
      patientId: string;
      patientName: string;
      analyticsData: PatientAnalyticsData;
      options: ExportOptions;
    }) => {
      setIsExporting(true);

      const exportData: AnalyticsExportData = {
        patientInfo: {
          id: patientId,
          name: patientName,
          exportDate: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        },
        progressSummary: {
          totalSessions: analyticsData.progress_summary.total_sessions,
          totalPainReduction: analyticsData.progress_summary.total_pain_reduction,
          goalsAchieved: analyticsData.progress_summary.goals_achieved,
          overallProgress: Math.round(analyticsData.progress_summary.overall_progress_percentage || 0),
        },
        trends: [
          ...(analyticsData.pain_trend ? [{
            type: 'Dor',
            current: analyticsData.pain_trend.current_score,
            change: analyticsData.pain_trend.change,
            changePercentage: analyticsData.pain_trend.change_percentage,
          }] : []),
          ...(analyticsData.function_trend ? [{
            type: 'Função',
            current: analyticsData.function_trend.current_score,
            change: analyticsData.function_trend.change,
            changePercentage: analyticsData.function_trend.change_percentage,
          }] : []),
        ],
        predictions: {
          dropoutRisk: Math.round(analyticsData.predictions.dropout_probability),
          successProbability: Math.round(analyticsData.predictions.success_probability),
          predictedRecoveryDate: analyticsData.predictions.predicted_recovery_date
            ? format(new Date(analyticsData.predictions.predicted_recovery_date), 'dd/MM/yyyy', { locale: ptBR })
            : undefined,
        },
        goals: analyticsData.goals.map(goal => ({
          title: goal.goal_title,
          status: goal.status,
          progress: Math.round(goal.progress_percentage || 0),
        })),
      };

      const timestamp = format(new Date(), 'yyyyMMdd_HHmm', { locale: ptBR });
      const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, '_');

      switch (options.format) {
        case 'csv': {
          const csvContent = convertToCSV(exportData);
          downloadFile(
            csvContent,
            `analytics_${sanitizedName}_${timestamp}.csv`,
            'text/csv;charset=utf-8;'
          );
          break;
        }

        case 'json': {
          const jsonContent = JSON.stringify(exportData, null, 2);
          downloadFile(
            jsonContent,
            `analytics_${sanitizedName}_${timestamp}.json`,
            'application/json'
          );
          break;
        }

        case 'pdf':
          // For PDF export, we would typically use a library like jsPDF
          // This is a placeholder that shows a toast message
          toast.info(
            'Exportação PDF será implementada com jsPDF. Use CSV ou JSON por enquanto.',
            { duration: 5000 }
          );
          throw new Error('PDF export not yet implemented');

        case 'excel':
          // For Excel export, we would use a library like xlsx
          toast.info(
            'Exportação Excel será implementada com xlsx. Use CSV ou JSON por enquanto.',
            { duration: 5000 }
          );
          throw new Error('Excel export not yet implemented');

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      return exportData;
    },
    onSuccess: () => {
      toast.success('Relatório exportado com sucesso');
      setIsExporting(false);
    },
    onError: (error) => {
      if (error.message !== 'PDF export not yet implemented' &&
          error.message !== 'Excel export not yet implemented') {
        toast.error('Erro ao exportar relatório: ' + error.message);
      }
      setIsExporting(false);
    },
  });

  return {
    exportData: exportMutation.mutate,
    isExporting: isExporting || exportMutation.isPending,
  };
}

// ============================================================================
// BATCH EXPORT HOOK (for multiple patients)
// ============================================================================

export function useBatchAnalyticsExport() {
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const batchExportMutation = useMutation({
    mutationFn: async ({
      patientIds,
      format
    }: {
      patientIds: string[];
      format: ExportFormat;
    }) => {
      setIsExporting(true);
      setProgress(0);

      const results = [];
      const total = patientIds.length;

      for (let i = 0; i < patientIds.length; i++) {
        const patientId = patientIds[i];

        // Fetch patient data
        const { data: patient } = await supabase
          .from('patients')
          .select('id, full_name')
          .eq('id', patientId)
          .single();

        if (!patient) continue;

        // Fetch analytics data (simplified - in production would use the full analytics hook)
        const results_data = {
          patientInfo: {
            id: patient.id,
            name: patient.full_name,
            exportDate: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          },
          progressSummary: { totalSessions: 0, totalPainReduction: 0, goalsAchieved: 0, overallProgress: 0 },
          trends: [],
          predictions: { dropoutRisk: 0, successProbability: 0 },
          goals: [],
        };

        results.push(results_data);
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      // Export as JSON batch file
      const timestamp = format(new Date(), 'yyyyMMdd_HHmm', { locale: ptBR });
      const jsonContent = JSON.stringify(results, null, 2);
      downloadFile(
        jsonContent,
        `analytics_batch_${timestamp}.json`,
        'application/json'
      );

      return results;
    },
    onSuccess: () => {
      toast.success('Relatório em lote exportado com sucesso');
      setIsExporting(false);
      setProgress(0);
    },
    onError: (error) => {
      toast.error('Erro ao exportar relatório: ' + error.message);
      setIsExporting(false);
      setProgress(0);
    },
  });

  return {
    batchExport: batchExportMutation.mutate,
    isExporting,
    progress,
  };
}
