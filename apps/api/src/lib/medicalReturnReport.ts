// Template v2: gênero embutido nas VARIÁVEIS (Meta não permite editar template
// PENDING nem variável no início/fim do body; um único template atende M/F).
export const MEDICAL_REPORT_TEMPLATE_NAME = "relatorio_fisioterapia_v2";

export const MEDICAL_REPORT_TEMPLATE_BODY =
  "Olá {{1}}! Sou {{2}}, fisioterapeuta {{3}}. " +
  "Segue o relatório de fisioterapia referente ao retorno de {{4}}. " +
  "Pedido/relatório: {{5}}. Fico à disposição!";

export type Gender = "M" | "F" | null;

export interface MedicalReportContext {
  doctorName: string;
  doctorGender?: Gender;
  therapistName: string;
  therapistGender?: Gender;
  patientName: string;
  patientGender?: Gender;
  returnDate: string | null;
  attachmentUrl: string | null;
}

/** Normaliza 'M'/'F'/'masculino'/'feminino' (qualquer caixa) para 'M' | 'F' | null. */
export function normalizeGender(value: unknown): Gender {
  if (typeof value !== "string") return null;
  const first = value.trim().toLowerCase()[0];
  if (first === "m") return "M";
  if (first === "f") return "F";
  return null;
}

export function honorificName(name: string, gender?: Gender): string {
  const title = gender === "M" ? "Dr." : gender === "F" ? "Dra." : "Dr(a).";
  return `${title} ${name.trim() || "—"}`;
}

export function patientReference(name: string, gender?: Gender): string {
  const article = gender === "M" ? "do paciente" : gender === "F" ? "da paciente" : "do(a) paciente";
  return `${article} ${name.trim() || "—"}`;
}

export function formatReturnDateBr(returnDate: string | null): string {
  if (!returnDate) return "data a confirmar";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(returnDate);
  if (!match) return returnDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function buildMedicalReportVariables(ctx: MedicalReportContext): string[] {
  return [
    honorificName(ctx.doctorName, ctx.doctorGender),
    honorificName(ctx.therapistName, ctx.therapistGender),
    patientReference(ctx.patientName, ctx.patientGender),
    formatReturnDateBr(ctx.returnDate),
    ctx.attachmentUrl?.trim() || "segue em anexo",
  ];
}

export function buildMedicalReportText(ctx: MedicalReportContext): string {
  const vars = buildMedicalReportVariables(ctx);
  return MEDICAL_REPORT_TEMPLATE_BODY.replace(/\{\{(\d)\}\}/g, (_, i) => vars[Number(i) - 1] ?? "");
}
