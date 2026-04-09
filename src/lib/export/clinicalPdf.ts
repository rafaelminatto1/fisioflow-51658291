/**
 * Geração de PDFs clínicos: Evolução SOAP, Protocolo de Exercícios e Recibo Simples
 * Usa jsPDF + jspdf-autotable (já disponíveis no projeto)
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Helpers ────────────────────────────────────────────────────────────────

function addClinicHeader(doc: jsPDF, clinicName = "FisioFlow Clínica") {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pw, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(clinicName, 14, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema FisioFlow — Documento gerado eletronicamente", pw - 14, 14, { align: "right" });
  doc.setTextColor(40, 40, 40);
  return 30; // nextY
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text(title.toUpperCase(), 14, y);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1, doc.internal.pageSize.getWidth() - 14, y + 1);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  return y + 7;
}

function addField(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth = 85): number {
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text(`${label}:`, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  const lines = doc.splitTextToSize(value || "—", maxWidth);
  doc.text(lines, x + doc.getTextWidth(`${label}: `), y);
  return y + lines.length * 5;
}

function addFooter(doc: jsPDF, page: number, totalPages: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — Página ${page}/${totalPages}`,
    pw / 2, ph - 8, { align: "center" },
  );
  doc.setDrawColor(200, 200, 200);
  doc.line(14, ph - 12, pw - 14, ph - 12);
}

// ─── 1. Evolução SOAP ───────────────────────────────────────────────────────

export interface SoapEvolution {
  id: string;
  date: string;
  therapist_name?: string;
  patient_name?: string;
  clinic_name?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  pain_level?: number;
  goals?: string;
  diagnosis?: string;
  session_number?: number;
  /** Base64 PNG de assinatura digital para embutir no PDF */
  signature_image?: string;
  /** Timestamp da assinatura para exibir no rodapé */
  signed_at?: string;
}

export function generateSoapPDF(evolution: SoapEvolution): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = addClinicHeader(doc, evolution.clinic_name);

  // Título
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Evolução Clínica — Nota SOAP", pw / 2, y, { align: "center" });
  y += 8;

  // Informações do atendimento
  y = addSectionTitle(doc, "Dados do Atendimento", y);
  const dateStr = (() => { try { return format(new Date(evolution.date), "dd/MM/yyyy", { locale: ptBR }); } catch { return evolution.date; } })();
  y = addField(doc, "Data", dateStr, 14, y, 80);
  y = addField(doc, "Paciente", evolution.patient_name ?? "—", 14, y, 80);
  y = addField(doc, "Terapeuta", evolution.therapist_name ?? "—", 14, y, 80);
  if (evolution.session_number) y = addField(doc, "Sessão nº", String(evolution.session_number), 14, y, 80);
  if (evolution.pain_level !== undefined) y = addField(doc, "Nível de dor (EVA)", `${evolution.pain_level}/10`, 14, y, 80);
  y += 4;

  // SOAP
  if (evolution.subjective) {
    y = addSectionTitle(doc, "S — Subjetivo", y);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(evolution.subjective, pw - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  if (evolution.objective) {
    y = addSectionTitle(doc, "O — Objetivo", y);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(evolution.objective, pw - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  if (evolution.assessment) {
    y = addSectionTitle(doc, "A — Avaliação", y);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(evolution.assessment, pw - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  if (evolution.plan) {
    y = addSectionTitle(doc, "P — Plano", y);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(evolution.plan, pw - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 6;
  }

  // Assinatura
  const signY = Math.max(y + 10, 240);
  if (evolution.signature_image) {
    try {
      doc.addImage(evolution.signature_image, "PNG", 14, signY - 20, 60, 18);
    } catch { /* ignore invalid image */ }
  }
  doc.setDrawColor(60, 60, 60);
  doc.line(14, signY, 90, signY);
  doc.setFontSize(8);
  doc.text(evolution.therapist_name ?? "Fisioterapeuta Responsável", 14, signY + 4);
  if (evolution.signed_at) {
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Assinado digitalmente em ${evolution.signed_at}`, 14, signY + 9);
    doc.setTextColor(40, 40, 40);
  }

  addFooter(doc, 1, 1);
  const filename = `evolucao-soap-${(evolution.patient_name ?? "paciente").replace(/\s+/g, "-")}-${dateStr.replace(/\//g, "-")}.pdf`;
  doc.save(filename);
}

// ─── 2. Protocolo de Exercícios ─────────────────────────────────────────────

export interface ExerciseItem {
  name: string;
  description?: string;
  sets: number;
  reps: number;
  duration_seconds?: number;
  rest_seconds?: number;
  frequency?: string;
  notes?: string;
}

export interface ExerciseProtocolData {
  patient_name: string;
  therapist_name?: string;
  clinic_name?: string;
  protocol_name?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  exercises: ExerciseItem[];
}

export function generateExerciseProtocolPDF(data: ExerciseProtocolData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = addClinicHeader(doc, data.clinic_name);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Protocolo de Exercícios Prescritos", pw / 2, y, { align: "center" });
  y += 8;

  y = addSectionTitle(doc, "Informações do Paciente", y);
  y = addField(doc, "Paciente", data.patient_name, 14, y, 80);
  if (data.therapist_name) y = addField(doc, "Fisioterapeuta", data.therapist_name, 14, y, 80);
  if (data.protocol_name) y = addField(doc, "Protocolo", data.protocol_name, 14, y, 80);
  if (data.start_date) y = addField(doc, "Início", data.start_date, 14, y, 80);
  if (data.end_date) y = addField(doc, "Término previsto", data.end_date, 14, y, 80);
  y += 4;

  if (data.exercises.length > 0) {
    y = addSectionTitle(doc, "Lista de Exercícios", y);
    autoTable(doc, {
      startY: y,
      head: [["#", "Exercício", "Séries", "Reps / Duração", "Descanso", "Frequência"]],
      body: data.exercises.map((ex, i) => [
        i + 1,
        `${ex.name}${ex.description ? `\n${ex.description.slice(0, 80)}` : ""}`,
        ex.sets,
        ex.duration_seconds
          ? `${Math.floor(ex.duration_seconds / 60)}min${ex.duration_seconds % 60 > 0 ? ` ${ex.duration_seconds % 60}s` : ""}`
          : `${ex.reps} reps`,
        ex.rest_seconds ? `${ex.rest_seconds}s` : "—",
        ex.frequency ?? "Conforme orientação",
      ]),
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 75 },
        2: { cellWidth: 15 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  if (data.notes) {
    y = addSectionTitle(doc, "Observações", y);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(data.notes, pw - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  // Assinatura
  const signY = Math.max(y + 10, 250);
  doc.setDrawColor(60, 60, 60);
  doc.line(14, signY, 90, signY);
  doc.setFontSize(8);
  doc.text(data.therapist_name ?? "Fisioterapeuta Responsável", 14, signY + 4);

  addFooter(doc, 1, 1);
  const filename = `protocolo-exercicios-${data.patient_name.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}

// ─── 3. Recibo de Atendimento ───────────────────────────────────────────────

export interface ReceiptData {
  patient_name: string;
  patient_cpf?: string;
  therapist_name?: string;
  clinic_name?: string;
  clinic_cnpj?: string;
  service_description: string;
  amount: number;
  date: string;
  appointment_id?: string;
  payment_method?: string;
}

export function generateReceiptPDF(data: ReceiptData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = addClinicHeader(doc, data.clinic_name);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PAGAMENTO", pw / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  if (data.appointment_id) doc.text(`Ref: #${data.appointment_id.slice(0, 8).toUpperCase()}`, pw / 2, y, { align: "center" });
  doc.setTextColor(40, 40, 40);
  y += 10;

  // Quadro do recibo
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.rect(14, y, pw - 28, 55);

  const dateStr = (() => { try { return format(new Date(data.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch { return data.date; } })();
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const amountFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(data.amount);

  doc.text(`Recebi de `, 20, y);
  doc.setFont("helvetica", "bold");
  doc.text(data.patient_name, 20 + doc.getTextWidth("Recebi de "), y);
  if (data.patient_cpf) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(` (CPF: ${data.patient_cpf})`, 20 + doc.getTextWidth("Recebi de " + data.patient_name), y);
  }
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`a importância de `, 20, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(13);
  doc.text(amountFormatted, 20 + doc.getTextWidth("a importância de "), y);
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  y += 8;

  doc.setFont("helvetica", "normal");
  const serviceLines = doc.splitTextToSize(`referente a: ${data.service_description}`, pw - 48);
  doc.text(serviceLines, 20, y);
  y += serviceLines.length * 6 + 4;

  doc.text(`Data: ${dateStr}`, 20, y);
  if (data.payment_method) {
    doc.text(`Pagamento: ${data.payment_method}`, 20 + 80, y);
  }
  y += 20;

  // Assinatura prestador
  const signX = pw / 2 - 30;
  doc.setDrawColor(60, 60, 60);
  doc.line(signX, y, signX + 80, y);
  doc.setFontSize(8.5);
  doc.text(data.therapist_name ?? "Fisioterapeuta Responsável", signX + 40, y + 5, { align: "center" });
  if (data.clinic_cnpj) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`CNPJ: ${data.clinic_cnpj}`, signX + 40, y + 10, { align: "center" });
  }

  addFooter(doc, 1, 1);
  const filename = `recibo-${data.patient_name.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
