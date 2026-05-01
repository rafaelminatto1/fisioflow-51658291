import { PDF_COLORS, RISK_THRESHOLDS, SUCCESS_THRESHOLDS } from "./constants";

export function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getRiskInfo(value: number): {
  label: string;
  color: (typeof PDF_COLORS)[keyof typeof PDF_COLORS];
} {
  if (value < RISK_THRESHOLDS.low) {
    return { label: "Baixo", color: PDF_COLORS.success };
  }
  if (value < RISK_THRESHOLDS.medium) {
    return { label: "Médio", color: PDF_COLORS.warning };
  }
  return { label: "Alto", color: PDF_COLORS.danger };
}

export function getSuccessLevel(value: number): string {
  if (value < SUCCESS_THRESHOLDS.low) return "Baixo";
  if (value < SUCCESS_THRESHOLDS.medium) return "Médio";
  return "Alto";
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke URL after a short delay to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function addBOMToCSV(csv: string): string {
  return "\uFEFF" + csv;
}

export async function loadExcelApi() {
  const module = await import("@/lib/export/exceljsWrapper");
  return module.default;
}

export function formatGoalStatus(status: string): string {
  const statusMap: Record<string, string> = {
    not_started: "Não Iniciado",
    in_progress: "Em Progresso",
    achieved: "Alcançado",
    on_hold: "Pausado",
    cancelled: "Cancelado",
  };
  return statusMap[status] || status;
}

export function getImprovementLabel(value: number): string {
  if (value >= 70) return "Excelente";
  if (value >= 40) return "Bom";
  if (value >= 20) return "Moderado";
  return "Baixo";
}

export function getTrendDirection(change: number): string {
  if (Math.abs(change) < 5) return "Estável";
  return change > 0 ? "Positiva ↗" : "Negativa ↘";
}

export function getRiskInterpretation(value: number, type: "dropout" | "success"): string {
  if (type === "dropout") {
    if (value < 30) return "Baixa probabilidade de abandono";
    if (value < 60) return "Atenção necessária à retenção";
    return "Alto risco - intervenção recomendada";
  }
  if (value < 40) return "Requer intervenção adicional";
  if (value < 70) return "Boa probabilidade de sucesso";
  return "Excelente prognóstico";
}

export function getGoalState(progress: number, status: string): string {
  if (status === "achieved") return "✓ Alcançado";
  if (progress >= 75) return "Quase alcançado";
  if (progress >= 50) return "Bom progresso";
  if (progress >= 25) return "Em andamento";
  if (status === "not_started") return "Não iniciado";
  return "Iniciando";
}
