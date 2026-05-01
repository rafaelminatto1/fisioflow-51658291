import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AnalyticsExportData, ExportOptions, ExportResult } from "./types";
import { PDF_COLORS } from "./constants";
import { sanitizeFileName, getRiskInfo, getSuccessLevel, formatGoalStatus } from "./utils";

export async function generatePDF(
  data: AnalyticsExportData,
  patientName: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const timestamp = format(new Date(), "yyyyMMdd_HHmm", { locale: ptBR });
  const sanitizedName = sanitizeFileName(patientName);
  const fileName = options.fileName || `analytics_${sanitizedName}_${timestamp}.pdf`;

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - 2 * margin;

  // Header
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Relatório de Analytics", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Paciente: ${data.patientInfo.name}`, pageWidth / 2, 26, {
    align: "center",
  });
  doc.text(`Gerado em: ${data.patientInfo.exportDate}`, pageWidth / 2, 32, {
    align: "center",
  });
  if (data.patientInfo.email) {
    doc.text(data.patientInfo.email, pageWidth / 2, 38, { align: "center" });
  }

  let yPos = 52;

  // Progress Summary Section
  doc.setFontSize(13);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text("Resumo do Progresso", margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total de Sessões", data.progressSummary.totalSessions.toString()],
      ["Redução Total da Dor", `${data.progressSummary.totalPainReduction}%`],
      ["Objetivos Alcançados", data.progressSummary.goalsAchieved.toString()],
      ["Progresso Geral", `${data.progressSummary.overallProgress}%`],
      ...(data.progressSummary.avgSessionDuration
        ? [["Duração Média/Sessão", `${data.progressSummary.avgSessionDuration} min`]]
        : []),
    ],
    theme: "striped",
    headStyles: {
      fillColor: PDF_COLORS.primary,
      font: "helvetica",
      fontStyle: "bold",
    },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.6 },
      1: { cellWidth: contentWidth * 0.4 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  yPos = finalY;

  // Check if we need a new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  // Trends Section
  if (options.includeTrends !== false && data.trends.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text("Tendências", margin, yPos);
    yPos += 8;

    const trendBody = data.trends.map((trend) => [
      trend.type,
      trend.current.toString(),
      trend.change > 0 ? `+${trend.change}` : trend.change.toString(),
      trend.changePercentage > 0 ? `+${trend.changePercentage}%` : `${trend.changePercentage}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Tipo", "Atual", "Mudança", "% Mudança"]],
      body: trendBody,
      theme: "striped",
      headStyles: { fillColor: PDF_COLORS.primary },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    yPos = finalY;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
  }

  // Predictions Section
  if (options.includePredictions !== false) {
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text("Predições", margin, yPos);
    yPos += 8;

    const riskInfo = getRiskInfo(data.predictions.dropoutRisk);
    const predictionData = [
      ["Risco de Abandono", `${data.predictions.dropoutRisk}%`, riskInfo.label],
      [
        "Probabilidade de Sucesso",
        `${data.predictions.successProbability}%`,
        getSuccessLevel(data.predictions.successProbability),
      ],
    ];

    if (data.predictions.predictedRecoveryDate) {
      predictionData.push([
        "Data Prevista de Recuperação",
        data.predictions.predictedRecoveryDate,
        "",
      ]);
    }

    if (data.predictions.confidenceInterval) {
      predictionData.push([
        "Intervalo de Confiança",
        `${data.predictions.confidenceInterval.min} - ${data.predictions.confidenceInterval.max}`,
        "95%",
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [["Métrica", "Valor", "Classificação"]],
      body: predictionData,
      theme: "striped",
      headStyles: { fillColor: PDF_COLORS.primary },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 2: { cellWidth: 25 } },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    yPos = finalY;

    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
  }

  // Goals Section
  if (options.includeGoals !== false && data.goals.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text("Objetivos", margin, yPos);
    yPos += 8;

    const goalsBody = data.goals.map((goal) => [
      goal.title,
      formatGoalStatus(goal.status),
      `${goal.progress}%`,
      goal.targetDate || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Título", "Status", "Progresso", "Data Alvo"]],
      body: goalsBody,
      theme: "striped",
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
    doc.text(`Página ${i} de ${pageCount} - FisioFlow Analytics`, pageWidth / 2, pageHeight - 15, {
      align: "center",
    });

    // Disclaimer
    doc.setFontSize(7);
    doc.text(
      "Este relatório é gerado automaticamente e deve ser validado por um profissional de saúde.",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" },
    );
  }

  // Save PDF
  doc.save(fileName);

  return { format: "pdf", fileName, timestamp };
}
