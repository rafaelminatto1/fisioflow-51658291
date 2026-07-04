export const MEDICAL_REPORT_TEMPLATE_NAME = "relatorio_fisioterapia";

// Texto idêntico ao template aprovado na Meta (id 1049539834163719) —
// variáveis não podem abrir nem fechar o corpo, por isso o fecho fixo.
export const MEDICAL_REPORT_TEMPLATE_BODY =
  "Olá Dr(a). {{1}}! Sou Dr(a). {{2}}, fisioterapeuta do(a) paciente {{3}}. " +
  "Segue o relatório de fisioterapia referente ao retorno de {{4}}. " +
  "Pedido/relatório: {{5}}. Fico à disposição!";

export interface MedicalReportContext {
  doctorName: string;
  therapistName: string;
  patientName: string;
  returnDate: string | null;
  attachmentUrl: string | null;
}

export function formatReturnDateBr(returnDate: string | null): string {
  if (!returnDate) return "data a confirmar";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(returnDate);
  if (!match) return returnDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function buildMedicalReportVariables(ctx: MedicalReportContext): string[] {
  return [
    ctx.doctorName.trim() || "—",
    ctx.therapistName.trim() || "—",
    ctx.patientName.trim() || "—",
    formatReturnDateBr(ctx.returnDate),
    ctx.attachmentUrl?.trim() || "segue em anexo",
  ];
}

export function buildMedicalReportText(ctx: MedicalReportContext): string {
  const vars = buildMedicalReportVariables(ctx);
  return MEDICAL_REPORT_TEMPLATE_BODY.replace(/\{\{(\d)\}\}/g, (_, i) => vars[Number(i) - 1] ?? "");
}
