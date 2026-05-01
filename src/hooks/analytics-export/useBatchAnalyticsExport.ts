import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { patientsApi } from "@/services/api/patients";
import { analyticsApi } from "@/services/api/analytics";
import type { PatientGoalTracking } from "@/types/clinical";
import type { AnalyticsExportData, ExportFormat, BatchExportOptions } from "./types";
import { sanitizeFileName, downloadBlob, loadExcelApi, getRiskInfo } from "./utils";

export function useBatchAnalyticsExport() {
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<string | null>(null);

  const batchExportMutation = useMutation({
    mutationFn: async ({
      patientIds,
      format: outputFormat,
      options: _options,
    }: {
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

        const [patientResult, statsResult, progressResult, riskResult, goalsResult] =
          await Promise.allSettled([
            patientsApi.get(patientId),
            patientsApi.stats(patientId),
            analyticsApi.patientProgress(patientId),
            analyticsApi.patientRisk(patientId),
            analyticsApi.patientGoals.list(patientId),
          ]);

        if (patientResult.status !== "fulfilled") {
          continue;
        }

        const patient = patientResult.value.data;
        const stats = statsResult.status === "fulfilled" ? statsResult.value.data : null;
        const progressSummary =
          progressResult.status === "fulfilled" ? progressResult.value.data : null;
        const riskScore = riskResult.status === "fulfilled" ? riskResult.value.data : null;
        const goals = goalsResult.status === "fulfilled" ? goalsResult.value.data : [];
        
        const sessionCount = stats?.totalSessions ?? progressSummary?.total_sessions ?? 0;
        const goalsAchieved =
          progressSummary?.goals_achieved ??
          goals.filter((goal: PatientGoalTracking) => goal.status === "achieved").length;
        const overallProgress = progressSummary?.overall_progress_percentage ?? 0;
        const dropoutRisk = riskScore?.dropout_risk_score ?? 50;
        const patientName = patient.full_name || patient.name || "";

        const exportData: AnalyticsExportData = {
          patientInfo: {
            id: patient.id,
            name: patientName,
            email: patient.email || undefined,
            phone: patient.phone || undefined,
            exportDate: format(new Date(), "dd/MM/yyyy HH:mm", {
              locale: ptBR,
            }),
          },
          progressSummary: {
            totalSessions: sessionCount,
            totalPainReduction: progressSummary?.total_pain_reduction ?? 0,
            goalsAchieved: goalsAchieved,
            overallProgress: Math.round(overallProgress),
          },
          trends: [],
          predictions: {
            dropoutRisk: Math.round(dropoutRisk),
            successProbability: Math.round(100 - dropoutRisk),
          },
          goals: goals.map((goal: PatientGoalTracking) => ({
            title: goal.goal_title,
            status: goal.status,
            progress: Math.round(goal.progress_percentage ?? 0),
            targetDate: goal.target_date
              ? format(new Date(goal.target_date), "dd/MM/yyyy", {
                  locale: ptBR,
                })
              : undefined,
          })),
        };

        results.push(exportData);
      }

      setProgress(100);
      setCurrentPatient(null);

      const timestamp = format(new Date(), "yyyyMMdd_HHmm", { locale: ptBR });

      if (outputFormat === "excel") {
        const XLSX = await loadExcelApi();
        const workbook = XLSX.utils.book_new();

        const summaryData = [
          ["RELATÓRIO EM LOTE - FISIOFLOW"],
          [""],
          ["Data de Exportação", format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })],
          ["Total de Pacientes", results.length.toString()],
          [""],
          ["Paciente", "Sessões", "Progresso", "Risco de Abandono", "Classificação"],
          ...results.map((r) => [
            r.patientInfo.name,
            r.progressSummary.totalSessions.toString(),
            `${r.progressSummary.overallProgress}%`,
            `${r.predictions.dropoutRisk}%`,
            getRiskInfo(r.predictions.dropoutRisk).label,
          ]),
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        summarySheet["!cols"] = [{ wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");
        await XLSX.writeFile(workbook, `analytics_batch_${timestamp}.xlsx`);
      } else {
        const jsonContent = JSON.stringify(results, null, 2);
        downloadBlob(
          new Blob([jsonContent], { type: "application/json" }),
          `analytics_batch_${timestamp}.json`,
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
    onError: (error: Error) => {
      toast.error("Erro ao exportar em lote: " + error.message);
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
