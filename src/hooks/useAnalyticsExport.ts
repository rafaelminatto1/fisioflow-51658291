/**
 * Analytics Export Hook
 *
 * Provides functionality to export patient analytics data
 * in various formats (PDF, CSV, JSON, Excel).
 *
 * @module useAnalyticsExport
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
  includeTrends?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  language?: 'pt-BR' | 'en';
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

// ============================================================================
// CONSTANTS
// ============================================================================

const PDF_COLORS = {
  primary: [79, 70, 229] as const, // Indigo
  secondary: [59, 130, 246] as const, // Blue
  success: [34, 197, 94] as const, // Green
  warning: [251, 191, 36] as const, // Yellow
  danger: [239, 68, 68] as const, // Red
  muted: [107, 114, 128] as const, // Gray
} as const;

const RISK_THRESHOLDS = {
  low: 30,
  medium: 60,
} as const;

const SUCCESS_THRESHOLDS = {
  low: 40,
  medium: 70,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitizes a filename by removing special characters
 */
function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Gets risk level label and color
 */
function getRiskInfo(value: number): { label: string; color: typeof PDF_COLORS[keyof typeof PDF_COLORS] } {
  if (value < RISK_THRESHOLDS.low) {
    return { label: 'Baixo', color: PDF_COLORS.success };
  }
  if (value < RISK_THRESHOLOLS.medium) {
    return { label: 'Médio', color: PDF_COLORS.warning };
  }
  return { label: 'Alto', color: PDF_COLORS.danger };
}

/**
 * Gets success level label
 */
function getSuccessLevel(value: number): string {
  if (value < SUCCESS_THRESHOLDS.low) return 'Baixo';
  if (value < SUCCESS_THRESHOLDS.medium) return 'Médio';
  return 'Alto';
}

/**
 * Downloads a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke URL after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Adds BOM to CSV for proper UTF-8 encoding in Excel
 */
function addBOMToCSV(csv: string): string {
  return '\uFEFF' + csv;
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Generates a PDF report from analytics data
 */
function generatePDF(data: AnalyticsExportData, patientName: string, options: ExportOptions): ExportResult {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const timestamp = format(new Date(), 'yyyyMMdd_HHmm', { locale: ptBR });
  const sanitizedName = sanitizeFileName(patientName);
  const fileName = options.fileName || `analytics_${sanitizedName}_${timestamp}.pdf`;

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;

  // Header
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Relatório de Analytics', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Paciente: ${data.patientInfo.name}`, pageWidth / 2, 26, { align: 'center' });
  doc.text(`Gerado em: ${data.patientInfo.exportDate}`, pageWidth / 2, 32, { align: 'center' });
  if (data.patientInfo.email) {
    doc.text(data.patientInfo.email, pageWidth / 2, 38, { align: 'center' });
  }

  let yPos = 52;

  // Progress Summary Section
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text('Resumo do Progresso', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Sessões', data.progressSummary.totalSessions.toString()],
      ['Redução Total da Dor', `${data.progressSummary.totalPainReduction}%`],
      ['Objetivos Alcançados', data.progressSummary.goalsAchieved.toString()],
      ['Progresso Geral', `${data.progressSummary.overallProgress}%`],
      ...(data.progressSummary.avgSessionDuration
        ? [['Duração Média/Sessão', `${data.progressSummary.avgSessionDuration} min`]]
        : []
      ),
    ],
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.primary, font: 'helvetica', fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: contentWidth * 0.6 }, 1: { cellWidth: contentWidth * 0.4 } },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // Check if we need a new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // Trends Section
  if (options.includeTrends !== false && data.trends.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('Tendências', margin, yPos);
    yPos += 8;

    const trendBody = data.trends.map(trend => [
      trend.type,
      trend.current.toString(),
      trend.change > 0 ? `+${trend.change}` : trend.change.toString(),
      trend.changePercentage > 0 ? `+${trend.changePercentage}%` : `${trend.changePercentage}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Tipo', 'Atual', 'Mudança', '% Mudança']],
      body: trendBody,
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.primary },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
  }

  // Predictions Section
  if (options.includePredictions !== false) {
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('Predições', margin, yPos);
    yPos += 8;

    const riskInfo = getRiskInfo(data.predictions.dropoutRisk);
    const predictionData = [
      ['Risco de Abandono', `${data.predictions.dropoutRisk}%`, riskInfo.label],
      ['Probabilidade de Sucesso', `${data.predictions.successProbability}%`, getSuccessLevel(data.predictions.successProbability)],
    ];

    if (data.predictions.predictedRecoveryDate) {
      predictionData.push(['Data Prevista de Recuperação', data.predictions.predictedRecoveryDate, '']);
    }

    if (data.predictions.confidenceInterval) {
      predictionData.push([
        'Intervalo de Confiança',
        `${data.predictions.confidenceInterval.min} - ${data.predictions.confidenceInterval.max}`,
        '95%'
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Métrica', 'Valor', 'Classificação']],
      body: predictionData,
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.primary },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 2: { cellWidth: 25 } },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
  }

  // Goals Section
  if (options.includeGoals !== false && data.goals.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('Objetivos', margin, yPos);
    yPos += 8;

    const goalsBody = data.goals.map(goal => [
      goal.title,
      formatGoalStatus(goal.status),
      `${goal.progress}%`,
      goal.targetDate || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Título', 'Status', 'Progresso', 'Data Alvo']],
      body: goalsBody,
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.primary },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);

    // Page number
    doc.text(
      `Página ${i} de ${pageCount} - FisioFlow Analytics`,
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );

    // Disclaimer
    doc.setFontSize(7);
    doc.text(
      'Este relatório é gerado automaticamente e deve ser validado por um profissional de saúde.',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  doc.save(fileName);

  return { format: 'pdf', fileName, timestamp };
}

/**
 * Formats goal status for display
 */
function formatGoalStatus(status: string): string {
  const statusMap: Record<string, string> = {
    not_started: 'Não Iniciado',
    in_progress: 'Em Progresso',
    achieved: 'Alcançado',
    on_hold: 'Pausado',
    cancelled: 'Cancelado',
  };
  return statusMap[status] || status;
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

/**
 * Generates an Excel workbook from analytics data
 */
function generateExcel(data: AnalyticsExportData, patientName: string, options: ExportOptions): ExportResult {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmm', { locale: ptBR });
  const sanitizedName = sanitizeFileName(patientName);
  const fileName = options.fileName || `analytics_${sanitizedName}_${timestamp}.xlsx`;

  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = buildSummaryData(data);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 35 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // Trends Sheet
  if (options.includeTrends !== false && data.trends.length > 0) {
    const trendsSheet = createTrendsSheet(data);
    XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Tendências');
  }

  // Risk Analysis Sheet
  if (options.includePredictions !== false) {
    const riskSheet = createRiskAnalysisSheet(data);
    XLSX.utils.book_append_sheet(workbook, riskSheet, 'Análise de Risco');
  }

  // Goals Sheet
  if (options.includeGoals !== false && data.goals.length > 0) {
    const goalsSheet = createGoalsSheet(data);
    XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Objetivos');
  }

  // Save workbook
  XLSX.writeFile(workbook, fileName);

  return { format: 'excel', fileName, timestamp };
}

function buildSummaryData(data: AnalyticsExportData): string[][] {
  return [
    ['RELATÓRIO DE ANALYTICS - FISIOFLOW'],
    [''],
    ['Informações do Paciente'],
    ['Nome', data.patientInfo.name],
    ['ID do Paciente', data.patientInfo.id],
    ...(data.patientInfo.email ? [['Email', data.patientInfo.email]] : []),
    ...(data.patientInfo.phone ? [['Telefone', data.patientInfo.phone]] : []),
    ['Data de Exportação', data.patientInfo.exportDate],
    [''],
    ['Resumo do Progresso'],
    ['Métrica', 'Valor', 'Observação'],
    ['Total de Sessões', data.progressSummary.totalSessions.toString(), ''],
    ['Redução Total da Dor', `${data.progressSummary.totalPainReduction}%`, getImprovementLabel(data.progressSummary.totalPainReduction)],
    ['Objetivos Alcançados', data.progressSummary.goalsAchieved.toString(), `de ${data.progressSummary.goalsAchieved + data.goals.filter(g => g.status !== 'achieved').length} totais`],
    ['Progresso Geral', `${data.progressSummary.overallProgress}%`, ''],
  ];
}

function getImprovementLabel(value: number): string {
  if (value >= 70) return 'Excelente';
  if (value >= 40) return 'Bom';
  if (value >= 20) return 'Moderado';
  return 'Baixo';
}

function createTrendsSheet(data: AnalyticsExportData): XLSX.WorkSheet {
  const trendsData = [
    ['Dados de Evolução'],
    [''],
    ['Tipo', 'Atual', 'Mudança', '% Mudança', 'Tendência'],
    ...data.trends.map(t => [
      t.type,
      t.current,
      t.change,
      `${t.changePercentage}%`,
      getTrendDirection(t.change),
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(trendsData);
  sheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  return sheet;
}

function getTrendDirection(change: number): string {
  if (Math.abs(change) < 5) return 'Estável';
  return change > 0 ? 'Positiva ↗' : 'Negativa ↘';
}

function createRiskAnalysisSheet(data: AnalyticsExportData): XLSX.WorkSheet {
  const riskData = [
    ['Análise de Risco e Prognóstico'],
    [''],
    ['Métrica', 'Valor', 'Classificação', 'Interpretação'],
    [
      'Risco de Abandono',
      `${data.predictions.dropoutRisk}%`,
      getRiskInfo(data.predictions.dropoutRisk).label,
      getRiskInterpretation(data.predictions.dropoutRisk, 'dropout'),
    ],
    [
      'Probabilidade de Sucesso',
      `${data.predictions.successProbability}%`,
      getSuccessLevel(data.predictions.successProbability),
      getRiskInterpretation(data.predictions.successProbability, 'success'),
    ],
    [''],
    ['Legenda de Classificações'],
    ['Risco de Abandono: Baixo < 30%, Médio 30-60%, Alto > 60%'],
    ['Probabilidade de Sucesso: Baixo < 40%, Médio 40-70%, Alto > 70%'],
    ...(data.predictions.predictedRecoveryDate
      ? [['', 'Data Prevista de Recuperação: ' + data.predictions.predictedRecoveryDate]]
      : []
    ),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(riskData);
  sheet['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
  return sheet;
}

function getRiskInterpretation(value: number, type: 'dropout' | 'success'): string {
  if (type === 'dropout') {
    if (value < 30) return 'Baixa probabilidade de abandono';
    if (value < 60) return 'Atenção necessária à retenção';
    return 'Alto risco - intervenção recomendada';
  }
  if (value < 40) return 'Requer intervenção adicional';
  if (value < 70) return 'Boa probabilidade de sucesso';
  return 'Excelente prognóstico';
}

function createGoalsSheet(data: AnalyticsExportData): XLSX.WorkSheet {
  const goalsData = [
    ['Objetivos de Tratamento'],
    [''],
    ['Título', 'Status', 'Progresso', 'Data Alvo', 'Estado'],
    ...data.goals.map(g => [
      g.title,
      formatGoalStatus(g.status),
      `${g.progress}%`,
      g.targetDate || 'Não definida',
      getGoalState(g.progress, g.status),
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(goalsData);
  sheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
  return sheet;
}

function getGoalState(progress: number, status: string): string {
  if (status === 'achieved') return '✓ Alcançado';
  if (progress >= 75) return 'Quase alcançado';
  if (progress >= 50) return 'Bom progresso';
  if (progress >= 25) return 'Em andamento';
  if (status === 'not_started') return 'Não iniciado';
  return 'Iniciando';
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Converts analytics data to CSV format
 */
function convertToCSV(data: AnalyticsExportData, options: ExportOptions): string {
  const rows: string[][] = [];

  // Header
  rows.push(['Relatório de Analytics - FisioFlow']);
  rows.push([`Data de Exportação: ${data.patientInfo.exportDate}`]);
  rows.push([`Paciente: ${data.patientInfo.name}`]);
  rows.push([]);

  // Progress Summary
  rows.push(['RESUMO DO PROGRESSO']);
  rows.push(['Métrica', 'Valor']);
  rows.push(['Total de Sessões', data.progressSummary.totalSessions.toString()]);
  rows.push(['Redução Total da Dor', `${data.progressSummary.totalPainReduction}%`]);
  rows.push(['Objetivos Alcançados', data.progressSummary.goalsAchieved.toString()]);
  rows.push(['Progresso Geral', `${data.progressSummary.overallProgress}%`]);
  rows.push([]);

  // Trends
  if (options.includeTrends !== false && data.trends.length > 0) {
    rows.push(['TENDÊNCIAS']);
    rows.push(['Tipo', 'Atual', 'Mudança', '% Mudança']);
    data.trends.forEach(trend => {
      rows.push([
        trend.type,
        trend.current.toString(),
        trend.change.toString(),
        `${trend.changePercentage}%`,
      ]);
    });
    rows.push([]);
  }

  // Predictions
  if (options.includePredictions !== false) {
    rows.push(['PREDIÇÕES']);
    rows.push(['Métrica', 'Valor']);
    rows.push(['Risco de Abandono', `${data.predictions.dropoutRisk}%`]);
    rows.push(['Probabilidade de Sucesso', `${data.predictions.successProbability}%`]);
    if (data.predictions.predictedRecoveryDate) {
      rows.push(['Data Prevista de Recuperação', data.predictions.predictedRecoveryDate]);
    }
    rows.push([]);
  }

  // Goals
  if (options.includeGoals !== false && data.goals.length > 0) {
    rows.push(['OBJETIVOS']);
    rows.push(['Título', 'Status', 'Progresso', 'Data Alvo']);
    data.goals.forEach(goal => {
      rows.push([goal.title, formatGoalStatus(goal.status), `${goal.progress}%`, goal.targetDate || 'N/A']);
    });
  }

  // Convert to CSV string with proper escaping
  return rows
    .map(row =>
      row
        .map(cell => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell);
          if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for exporting single patient analytics
 */
export function useAnalyticsExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const queryClient = useQueryClient();

  const exportMutation = useMutation({
    mutationFn: async ({
      patientId,
      patientName,
      analyticsData,
      options,
    }: {
      patientId: string;
      patientName: string;
      analyticsData: PatientAnalyticsData;
      options: ExportOptions;
    }): Promise<ExportResult> => {
      setIsExporting(true);
      setExportProgress(0);

      // Simulate progress for large exports
      setExportProgress(25);
      await new Promise(resolve => setTimeout(resolve, 50));

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
          ...(analyticsData.pain_trend
            ? [
                {
                  type: 'Dor',
                  current: analyticsData.pain_trend.current_score,
                  change: analyticsData.pain_trend.change,
                  changePercentage: analyticsData.pain_trend.change_percentage,
                },
              ]
            : []),
          ...(analyticsData.function_trend
            ? [
                {
                  type: 'Função',
                  current: analyticsData.function_trend.current_score,
                  change: analyticsData.function_trend.change,
                  changePercentage: analyticsData.function_trend.change_percentage,
                },
              ]
            : []),
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

      setExportProgress(50);

      let result: ExportResult;

      switch (options.format) {
        case 'csv': {
          const csvContent = addBOMToCSV(convertToCSV(exportData, options));
          const fileName = options.fileName ||
            `analytics_${sanitizeFileName(patientName)}_${format(new Date(), 'yyyyMMdd_HHmm', { locale: ptBR })}.csv`;
          downloadBlob(
            new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
            fileName
          );
          result = { format: 'csv', fileName, timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss") };
          break;
        }

        case 'json': {
          const jsonContent = JSON.stringify(exportData, null, 2);
          const fileName = options.fileName ||
            `analytics_${sanitizeFileName(patientName)}_${format(new Date(), 'yyyyMMdd_HHmm', { locale: ptBR })}.json`;
          downloadBlob(new Blob([jsonContent], { type: 'application/json' }), fileName);
          result = { format: 'json', fileName, timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss") };
          break;
        }

        case 'pdf':
          result = generatePDF(exportData, patientName, options);
          break;

        case 'excel':
          result = generateExcel(exportData, patientName, options);
          break;

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      setExportProgress(100);

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['patient-analytics'] });

      return result;
    },
    onSuccess: (result) => {
      toast.success(`Relatório exportado: ${result.fileName}`, {
        description: `Formato: ${result.format.toUpperCase()}`,
      });
      setIsExporting(false);
      setExportProgress(0);
    },
    onError: (error: Error) => {
      toast.error('Erro ao exportar relatório', {
        description: error.message,
      });
      setIsExporting(false);
      setExportProgress(0);
    },
  });

  return {
    exportData: exportMutation.mutate,
    exportDataAsync: exportMutation.mutateAsync,
    isExporting: isExporting || exportMutation.isPending,
    exportProgress,
  };
}

// ============================================================================
// BATCH EXPORT HOOK
// ============================================================================

interface BatchExportOptions {
  format: ExportFormat;
  includeCharts?: boolean;
  patientIds?: string[];
  dateRange?: { start: string; end: string };
}

export function useBatchAnalyticsExport() {
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<string | null>(null);

  const batchExportMutation = useMutation({
    mutationFn: async ({ patientIds, format, options: _options }: {
      patientIds: string[];
      format: ExportFormat;
      options?: BatchExportOptions;
    }) => {
      setIsExporting(true);
      setProgress(0);

      const results: AnalyticsExportData[] = [];
      const total = patientIds.length;

      for (let i = 0; i < total; i++) {
        const patientId = patientIds[i];
        setCurrentPatient(patientId);
        setProgress(Math.round((i / total) * 100));

        // Fetch patient data
        const { data: patient, error } = await supabase
          .from('patients')
          .select('id, full_name, email, phone')
          .eq('id', patientId)
          .single();

        if (error || !patient) continue;

        // Fetch session count
        const { count: sessionCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId)
          .in('status', ['completed', 'confirmed']);

        // Fetch risk score
        const { data: riskScore } = await supabase
          .from('patient_risk_scores')
          .select('dropout_risk_score, overall_progress_percentage')
          .eq('patient_id', patientId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const exportData: AnalyticsExportData = {
          patientInfo: {
            id: patient.id,
            name: patient.full_name,
            email: patient.email || undefined,
            phone: patient.phone || undefined,
            exportDate: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          },
          progressSummary: {
            totalSessions: sessionCount || 0,
            totalPainReduction: 0,
            goalsAchieved: 0,
            overallProgress: Math.round(riskScore?.overall_progress_percentage || 0),
          },
          trends: [],
          predictions: {
            dropoutRisk: Math.round(riskScore?.dropout_risk_score || 50),
            successProbability: Math.round(100 - (riskScore?.dropout_risk_score || 50)),
          },
          goals: [],
        };

        results.push(exportData);
      }

      setProgress(100);
      setCurrentPatient(null);

      const timestamp = format(new Date(), 'yyyyMMdd_HHmm', { locale: ptBR });

      if (format === 'excel') {
        const workbook = XLSX.utils.book_new();

        const summaryData = [
          ['RELATÓRIO EM LOTE - FISIOFLOW'],
          [''],
          ['Data de Exportação', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })],
          ['Total de Pacientes', results.length.toString()],
          [''],
          ['Paciente', 'Sessões', 'Progresso', 'Risco de Abandono', 'Classificação'],
          ...results.map(r => [
            r.patientInfo.name,
            r.progressSummary.totalSessions.toString(),
            `${r.progressSummary.overallProgress}%`,
            `${r.predictions.dropoutRisk}%`,
            getRiskInfo(r.predictions.dropoutRisk).label,
          ]),
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        summarySheet['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
        XLSX.writeFile(workbook, `analytics_batch_${timestamp}.xlsx`);
      } else {
        const jsonContent = JSON.stringify(results, null, 2);
        downloadBlob(
          new Blob([jsonContent], { type: 'application/json' }),
          `analytics_batch_${timestamp}.json`
        );
      }

      return results;
    },
    onSuccess: (results) => {
      toast.success(`${results.length} pacientes exportados com sucesso`);
      setIsExporting(false);
      setProgress(0);
      setCurrentPatient(null);
    },
    onError: (error) => {
      toast.error('Erro ao exportar em lote: ' + error.message);
      setIsExporting(false);
      setProgress(0);
      setCurrentPatient(null);
    },
  });

  return {
    batchExport: batchExportMutation.mutate,
    batchExportAsync: batchExportMutation.mutateAsync,
    isExporting,
    progress,
    currentPatient,
  };
}

// Fix typo in constant reference
const RISK_THRESHOLOLS = RISK_THRESHOLDS;
