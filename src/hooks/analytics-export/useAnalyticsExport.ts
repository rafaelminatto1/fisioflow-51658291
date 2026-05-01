import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PatientAnalyticsData } from "@/types/patientAnalytics";
import type { AnalyticsExportData, ExportOptions, ExportResult } from "./types";
import { sanitizeFileName, downloadBlob, addBOMToCSV } from "./utils";
import { generatePDF } from "./pdfGenerator";
import { generateExcel } from "./excelGenerator";
import { convertToCSV } from "./csvGenerator";

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

      // Map API data to export format
      const exportData: AnalyticsExportData = {
        patientInfo: {
          id: patientId,
          name: patientName,
          exportDate: format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        },
        progressSummary: {
          totalSessions: analyticsData.progress_summary.total_sessions,
          totalPainReduction: analyticsData.progress_summary.total_pain_reduction,
          goalsAchieved: analyticsData.progress_summary.goals_achieved,
          overallProgress: Math.round(
            analyticsData.progress_summary.overall_progress_percentage || 0,
          ),
        },
        trends: [
          ...(analyticsData.pain_trend
            ? [
                {
                  type: "Dor",
                  current: analyticsData.pain_trend.current_score,
                  change: analyticsData.pain_trend.change,
                  changePercentage: analyticsData.pain_trend.change_percentage,
                },
              ]
            : []),
          ...(analyticsData.function_trend
            ? [
                {
                  type: "Função",
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
            ? format(new Date(analyticsData.predictions.predicted_recovery_date), "dd/MM/yyyy", {
                locale: ptBR,
              })
            : undefined,
        },
        goals: analyticsData.goals.map((goal) => ({
          title: goal.goal_title,
          status: goal.status,
          progress: Math.round(goal.progress_percentage || 0),
        })),
      };

      setExportProgress(50);

      let result: ExportResult;

      switch (options.format) {
        case "csv": {
          const csvContent = addBOMToCSV(convertToCSV(exportData, options));
          const fileName =
            options.fileName ||
            `analytics_${sanitizeFileName(patientName)}_${format(new Date(), "yyyyMMdd_HHmm", { locale: ptBR })}.csv`;
          downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), fileName);
          result = {
            format: "csv",
            fileName,
            timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          };
          break;
        }

        case "json": {
          const jsonContent = JSON.stringify(exportData, null, 2);
          const fileName =
            options.fileName ||
            `analytics_${sanitizeFileName(patientName)}_${format(new Date(), "yyyyMMdd_HHmm", { locale: ptBR })}.json`;
          downloadBlob(new Blob([jsonContent], { type: "application/json" }), fileName);
          result = {
            format: "json",
            fileName,
            timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          };
          break;
        }

        case "pdf":
          result = await generatePDF(exportData, patientName, options);
          break;

        case "excel":
          result = await generateExcel(exportData, patientName, options);
          break;

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      setExportProgress(100);
      await queryClient.invalidateQueries({ queryKey: ["patient-analytics"] });

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
      toast.error("Erro ao exportar relatório", {
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
