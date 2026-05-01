import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AnalyticsExportData, ExportOptions, ExportResult } from "./types";
import {
  sanitizeFileName,
  loadExcelApi,
  formatGoalStatus,
  getImprovementLabel,
  getTrendDirection,
  getRiskInfo,
  getSuccessLevel,
  getRiskInterpretation,
  getGoalState,
} from "./utils";

export async function generateExcel(
  data: AnalyticsExportData,
  patientName: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const timestamp = format(new Date(), "yyyyMMdd_HHmm", { locale: ptBR });
  const sanitizedName = sanitizeFileName(patientName);
  const fileName = options.fileName || `analytics_${sanitizedName}_${timestamp}.xlsx`;

  const XLSX = await loadExcelApi();
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = buildSummaryData(data);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 28 }, { wch: 35 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  // Trends Sheet
  if (options.includeTrends !== false && data.trends.length > 0) {
    const trendsData = [
      ["Dados de Evolução"],
      [""],
      ["Tipo", "Atual", "Mudança", "% Mudança", "Tendência"],
      ...data.trends.map((t) => [
        t.type,
        t.current,
        t.change,
        `${t.changePercentage}%`,
        getTrendDirection(t.change),
      ]),
    ];
    const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData);
    trendsSheet["!cols"] = [{ wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, trendsSheet, "Tendências");
  }

  // Risk Analysis Sheet
  if (options.includePredictions !== false) {
    const riskData = [
      ["Análise de Risco e Prognóstico"],
      [""],
      ["Métrica", "Valor", "Classificação", "Interpretação"],
      [
        "Risco de Abandono",
        `${data.predictions.dropoutRisk}%`,
        getRiskInfo(data.predictions.dropoutRisk).label,
        getRiskInterpretation(data.predictions.dropoutRisk, "dropout"),
      ],
      [
        "Probabilidade de Sucesso",
        `${data.predictions.successProbability}%`,
        getSuccessLevel(data.predictions.successProbability),
        getRiskInterpretation(data.predictions.successProbability, "success"),
      ],
      [""],
      ["Legenda de Classificações"],
      ["Risco de Abandono: Baixo < 30%, Médio 30-60%, Alto > 60%"],
      ["Probabilidade de Sucesso: Baixo < 40%, Médio 40-70%, Alto > 70%"],
      ...(data.predictions.predictedRecoveryDate
        ? [["", "Data Prevista de Recuperação: " + data.predictions.predictedRecoveryDate]]
        : []),
    ];
    const riskSheet = XLSX.utils.aoa_to_sheet(riskData);
    riskSheet["!cols"] = [{ wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, riskSheet, "Análise de Risco");
  }

  // Goals Sheet
  if (options.includeGoals !== false && data.goals.length > 0) {
    const goalsData = [
      ["Objetivos de Tratamento"],
      [""],
      ["Título", "Status", "Progresso", "Data Alvo", "Estado"],
      ...data.goals.map((g) => [
        g.title,
        formatGoalStatus(g.status),
        `${g.progress}%`,
        g.targetDate || "Não definida",
        getGoalState(g.progress, g.status),
      ]),
    ];
    const goalsSheet = XLSX.utils.aoa_to_sheet(goalsData);
    goalsSheet["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, goalsSheet, "Objetivos");
  }

  // Save workbook
  await XLSX.writeFile(workbook, fileName);

  return { format: "excel", fileName, timestamp };
}

function buildSummaryData(data: AnalyticsExportData): string[][] {
  return [
    ["RELATÓRIO DE ANALYTICS - FISIOFLOW"],
    [""],
    ["Informações do Paciente"],
    ["Nome", data.patientInfo.name],
    ["ID do Paciente", data.patientInfo.id],
    ...(data.patientInfo.email ? [["Email", data.patientInfo.email]] : []),
    ...(data.patientInfo.phone ? [["Telefone", data.patientInfo.phone]] : []),
    ["Data de Exportação", data.patientInfo.exportDate],
    [""],
    ["Resumo do Progresso"],
    ["Métrica", "Valor", "Observação"],
    ["Total de Sessões", data.progressSummary.totalSessions.toString(), ""],
    [
      "Redução Total da Dor",
      `${data.progressSummary.totalPainReduction}%`,
      getImprovementLabel(data.progressSummary.totalPainReduction),
    ],
    [
      "Objetivos Alcançados",
      data.progressSummary.goalsAchieved.toString(),
      `de ${data.progressSummary.goalsAchieved + data.goals.filter((g) => g.status !== "achieved").length} totais`,
    ],
    ["Progresso Geral", `${data.progressSummary.overallProgress}%`, ""],
  ];
}
