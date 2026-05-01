import type { AnalyticsExportData, ExportOptions } from "./types";
import { formatGoalStatus } from "./utils";

export function convertToCSV(data: AnalyticsExportData, options: ExportOptions): string {
  const rows: string[][] = [];

  // Header
  rows.push(["Relatório de Analytics - FisioFlow"]);
  rows.push([`Data de Exportação: ${data.patientInfo.exportDate}`]);
  rows.push([`Paciente: ${data.patientInfo.name}`]);
  rows.push([]);

  // Progress Summary
  rows.push(["RESUMO DO PROGRESSO"]);
  rows.push(["Métrica", "Valor"]);
  rows.push(["Total de Sessões", data.progressSummary.totalSessions.toString()]);
  rows.push(["Redução Total da Dor", `${data.progressSummary.totalPainReduction}%`]);
  rows.push(["Objetivos Alcançados", data.progressSummary.goalsAchieved.toString()]);
  rows.push(["Progresso Geral", `${data.progressSummary.overallProgress}%`]);
  rows.push([]);

  // Trends
  if (options.includeTrends !== false && data.trends.length > 0) {
    rows.push(["TENDÊNCIAS"]);
    rows.push(["Tipo", "Atual", "Mudança", "% Mudança"]);
    data.trends.forEach((trend) => {
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
    rows.push(["PREDIÇÕES"]);
    rows.push(["Métrica", "Valor"]);
    rows.push(["Risco de Abandono", `${data.predictions.dropoutRisk}%`]);
    rows.push(["Probabilidade de Sucesso", `${data.predictions.successProbability}%`]);
    if (data.predictions.predictedRecoveryDate) {
      rows.push(["Data Prevista de Recuperação", data.predictions.predictedRecoveryDate]);
    }
    rows.push([]);
  }

  // Goals
  if (options.includeGoals !== false && data.goals.length > 0) {
    rows.push(["OBJETIVOS"]);
    rows.push(["Título", "Status", "Progresso", "Data Alvo"]);
    data.goals.forEach((goal) => {
      rows.push([
        goal.title,
        formatGoalStatus(goal.status),
        `${goal.progress}%`,
        goal.targetDate || "N/A",
      ]);
    });
  }

  // Convert to CSV string with proper escaping
  return rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma or quote
          const cellStr = String(cell);
          if (cellStr.includes('"') || cellStr.includes(",") || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(","),
    )
    .join("\n");
}
