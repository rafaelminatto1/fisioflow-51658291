import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Patient, Evolution } from "@/types";
import type { ApiPatient } from "@/types/api";

/**
 * Generates a professional text summary for WhatsApp sharing.
 */
export function generateEvolutionTextSummary(patient: Patient, evolution: Evolution): string {
  const dateStr = evolution.date
    ? format(new Date(evolution.date), "dd/MM/yyyy", { locale: ptBR })
    : "N/A";

  let summary = `*Fisioterapia - Relatório de Evolução*\n\n`;
  summary += `*Paciente:* ${patient.name}\n`;
  summary += `*Data:* ${dateStr}\n`;
  summary += `*Nível de Dor:* ${evolution.painLevel}/10\n\n`;

  if (evolution.subjective) summary += `*Subjetivo:* ${evolution.subjective}\n`;
  if (evolution.objective) summary += `*Objetivo:* ${evolution.objective}\n`;
  if (evolution.assessment) summary += `*Avaliação:* ${evolution.assessment}\n`;
  if (evolution.plan) summary += `*Conduta/Plano:* ${evolution.plan}\n\n`;

  summary += `_Relatório gerado via FisioFlow_`;

  return summary;
}

/**
 * Generates a high-quality, professional PDF report for patient evolution.
 * Uses modern CSS patterns for a clean, medical-grade look.
 */
export async function generateEvolutionPDF(patient: Patient, evolutions: Evolution[]) {
  const sortedEvolutions = [...evolutions].sort(
    (a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime(),
  );

  const primaryColor = "#0EA5E9"; // Modern Sky Blue
  const secondaryColor = "#64748B";
  const borderColor = "#E2E8F0";
  const backgroundColor = "#F8FAFC";

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 20mm; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1E293B;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }

          /* Header Styles */
          .document-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid ${primaryColor};
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .brand-container { flex: 1; }
          .brand-name {
            font-size: 28px;
            font-weight: 800;
            color: ${primaryColor};
            letter-spacing: -0.5px;
            margin: 0;
          }
          .document-type {
            font-size: 14px;
            font-weight: 600;
            color: ${secondaryColor};
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .header-meta { text-align: right; font-size: 12px; color: ${secondaryColor}; }

          /* Patient Profile Section */
          .profile-section {
            background-color: ${backgroundColor};
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            border: 1px solid ${borderColor};
          }
          .profile-item { margin-bottom: 8px; }
          .profile-label {
            font-size: 11px;
            font-weight: 700;
            color: ${secondaryColor};
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
          }
          .profile-value { font-size: 15px; font-weight: 600; color: #0F172A; }

          /* Evolution List */
          .evolution-container { margin-top: 20px; }
          .evolution-entry {
            margin-bottom: 32px;
            padding-left: 16px;
            border-left: 4px solid ${borderColor};
            page-break-inside: avoid;
          }
          .evolution-entry:hover { border-left-color: ${primaryColor}; }

          .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .entry-date { font-size: 16px; font-weight: 700; color: #0F172A; }
          .pain-indicator {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
          }
          .pain-low { background-color: #DCFCE7; color: #166534; }
          .pain-med { background-color: #FEF9C3; color: #854D0E; }
          .pain-high { background-color: #FEE2E2; color: #991B1B; }

          /* SOAP Sections */
          .soap-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .soap-box { margin-bottom: 12px; }
          .soap-tag {
            display: inline-block;
            width: 24px;
            height: 24px;
            line-height: 24px;
            text-align: center;
            background-color: #F1F5F9;
            color: #475569;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            margin-right: 8px;
          }
          .soap-title { font-size: 13px; font-weight: 700; color: ${secondaryColor}; vertical-align: middle; }
          .soap-text { font-size: 14px; margin-top: 6px; color: #334155; text-align: justify; }

          /* Footer */
          .report-footer {
            margin-top: 60px;
            padding-top: 24px;
            border-top: 1px solid ${borderColor};
            text-align: center;
            font-size: 11px;
            color: ${secondaryColor};
          }
        </style>
      </head>
      <body>
        <div class="document-header">
          <div class="brand-container">
            <h1 class="brand-name">FisioFlow Pro</h1>
            <div class="document-type">Prontuário de Evolução Fisioterapêutica</div>
          </div>
          <div class="header-meta">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}<br/>
            Às ${format(new Date(), "HH:mm")}
          </div>
        </div>

        <div class="profile-section">
          <div class="profile-column">
            <div class="profile-item">
              <span class="profile-label">Paciente</span>
              <span class="profile-value">${patient.name}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Data de Nascimento</span>
              <span class="profile-value">${patient.birthDate ? format(new Date(patient.birthDate), "dd/MM/yyyy") : "Não informada"}</span>
            </div>
          </div>
          <div class="profile-column">
            <div class="profile-item">
              <span class="profile-label">Condição Principal</span>
              <span class="profile-value">${patient.condition || "Geral"}</span>
            </div>
            <div class="profile-item">
              <span class="profile-label">Total de Atendimentos</span>
              <span class="profile-value">${evolutions.length} sessões</span>
            </div>
          </div>
        </div>

        ${
          (patient as any).insurance?.provider
            ? `
        <div style="margin-top: -30px; margin-bottom: 40px; padding: 15px; border: 1px dashed ${borderColor}; border-radius: 8px; font-size: 13px; background-color: #fff;">
          <strong style="color: ${primaryColor}; display: block; margin-bottom: 5px;">Dados para Reembolso (Convênio)</strong>
          Operadora: ${(patient as any).insurance.provider} 
          ${(patient as any).insurance.plan ? ` | Plano: ${(patient as any).insurance.plan}` : ""}
          ${(patient as any).insurance.cardNumber ? ` | Carteirinha: ${(patient as any).insurance.cardNumber}` : ""}
        </div>
        `
            : ""
        }

        <div class="evolution-container">
          ${sortedEvolutions
            .map((ev) => {
              const painValue = ev.painLevel || 0;
              const painClass =
                painValue <= 3 ? "pain-low" : painValue <= 6 ? "pain-med" : "pain-high";

              return `
              <div class="evolution-entry">
                <div class="entry-header">
                  <span class="entry-date">${ev.date ? format(new Date(ev.date), "dd/MM/yyyy • HH:mm") : ""}</span>
                  ${
                    ev.painLevel !== undefined
                      ? `
                    <span class="pain-indicator ${painClass}">DOR: ${ev.painLevel}/10</span>
                  `
                      : ""
                  }
                </div>

                <div class="soap-grid">
                  ${
                    ev.subjective
                      ? `
                    <div class="soap-box">
                      <span class="soap-tag">S</span><span class="soap-title">Subjetivo</span>
                      <p class="soap-text">${ev.subjective}</p>
                    </div>
                  `
                      : ""
                  }

                  ${
                    ev.objective
                      ? `
                    <div class="soap-box">
                      <span class="soap-tag">O</span><span class="soap-title">Objetivo</span>
                      <p class="soap-text">${ev.objective}</p>
                    </div>
                  `
                      : ""
                  }

                  ${
                    ev.assessment
                      ? `
                    <div class="soap-box">
                      <span class="soap-tag">A</span><span class="soap-title">Avaliação</span>
                      <p class="soap-text">${ev.assessment}</p>
                    </div>
                  `
                      : ""
                  }

                  ${
                    ev.plan
                      ? `
                    <div class="soap-box">
                      <span class="soap-tag">P</span><span class="soap-title">Plano</span>
                      <p class="soap-text">${ev.plan}</p>
                    </div>
                  `
                      : ""
                  }
                </div>
              </div>
            `;
            })
            .join("")}
        </div>

        <div class="report-footer">
          Documento emitido via FisioFlow Pro - Sistema de Gestão Fisioterapêutica.<br/>
          As informações contidas neste relatório são de responsabilidade do profissional assistente.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: `Relatório_${patient.name.replace(/\s/g, "_")}`,
    });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new Error("Não foi possível gerar o PDF. Verifique os dados do paciente.");
  }
}

/**
 * Generates a professional Receipt PDF for financial transactions.
 * Includes insurance details if provided to facilitate reimbursement.
 */
export async function generateReceiptPDF(
  patient: Patient,
  transaction: {
    amount: number;
    date: string;
    description?: string;
    paymentMethod?: string;
  },
  clinicInfo?: {
    name: string;
    cnpj?: string;
    address?: string;
    professionalName?: string;
    professionalRegister?: string;
  },
) {
  const primaryColor = "#0EA5E9";
  const secondaryColor = "#64748B";
  const borderColor = "#E2E8F0";

  const insuranceInfo = (patient as any).insurance;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #1E293B;
            line-height: 1.6;
            padding: 40px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid ${primaryColor};
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .clinic-name { font-size: 24px; font-weight: 800; color: ${primaryColor}; margin: 0; }
          .clinic-info { font-size: 12px; color: ${secondaryColor}; margin-top: 4px; }
          
          .receipt-title {
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 40px;
          }

          .content-box {
            border: 1px solid ${borderColor};
            border-radius: 12px;
            padding: 30px;
            background-color: #F8FAFC;
          }

          .text-main { font-size: 16px; margin-bottom: 20px; text-align: justify; }
          .amount-box {
            font-size: 22px;
            font-weight: 800;
            color: #0F172A;
            text-align: right;
            margin-top: 20px;
          }

          .insurance-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px dashed ${borderColor};
          }
          .section-title { font-size: 13px; font-weight: 700; color: ${secondaryColor}; text-transform: uppercase; margin-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
          .info-label { font-weight: 600; color: ${secondaryColor}; }

          .footer {
            margin-top: 80px;
            text-align: center;
          }
          .signature-line {
            width: 250px;
            border-top: 1px solid #1E293B;
            margin: 0 auto 10px;
          }
          .professional-info { font-size: 14px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="clinic-name">${clinicInfo?.name || "FisioFlow Clinical"}</h1>
          <div class="clinic-info">
            ${clinicInfo?.cnpj ? `CNPJ: ${clinicInfo.cnpj} <br/>` : ""}
            ${clinicInfo?.address || ""}
          </div>
        </div>

        <div class="receipt-title">Recibo de Pagamento</div>

        <div class="content-box">
          <p class="text-main">
            Recebemos de <strong>${patient.name}</strong> 
            ${patient.document ? `(CPF: ${patient.document})` : ""} a importância de 
            <strong>R$ ${transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            referente a <strong>${transaction.description || "Serviços de Fisioterapia"}</strong>, 
            realizado em ${format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}.
          </p>

          <div class="amount-box">
            Valor Total: R$ ${transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>

          ${
            insuranceInfo?.provider
              ? `
          <div class="insurance-section">
            <div class="section-title">Dados para Reembolso</div>
            <div class="info-grid">
              <div><span class="info-label">Operadora:</span> ${insuranceInfo.provider}</div>
              ${insuranceInfo.plan ? `<div><span class="info-label">Plano:</span> ${insuranceInfo.plan}</div>` : ""}
              ${insuranceInfo.cardNumber ? `<div><span class="info-label">Carteirinha:</span> ${insuranceInfo.cardNumber}</div>` : ""}
            </div>
          </div>
          `
              : ""
          }
        </div>

        <div class="footer">
          <div class="signature-line"></div>
          <div class="professional-info">
            ${clinicInfo?.professionalName || "Fisioterapeuta Responsável"}<br/>
            ${clinicInfo?.professionalRegister || ""}
          </div>
          <div style="margin-top: 40px; font-size: 10px; color: ${secondaryColor};">
            Gerado eletronicamente via FisioFlow em ${format(new Date(), "dd/MM/yyyy HH:mm")}
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: `Recibo_${patient.name.replace(/\s/g, "_")}`,
    });
  } catch (error) {
    console.error("Receipt Generation Error:", error);
    throw new Error("Não foi possível gerar o recibo.");
  }
}

/**
 * Gera um relatório técnico para fins de reembolso (Padrão Mooca Fisioterapia)
 */
export async function generateReimbursementReportPDF(
  patient: ApiPatient,
  options: {
    diagnosis?: string;
    startDate: string;
    endDate: string;
    sessionsCount: number;
    tussCode?: string;
    clinicalFocus?: string;
  },
) {
  const tuss = options.tussCode || "50000160";
  const focus = options.clinicalFocus || "Reabilitação ortopédica, pós-operatório e esportivo";

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1E293B; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #0EA5E9; padding-bottom: 20px; }
          .clinic-name { font-size: 24px; font-weight: 800; color: #0EA5E9; margin: 0; text-transform: uppercase; }
          .title { font-size: 20px; font-weight: bold; margin-top: 30px; margin-bottom: 20px; text-align: center; text-transform: uppercase; }
          .recipient { margin-bottom: 30px; font-weight: bold; }
          .content { text-align: justify; margin-bottom: 40px; font-size: 15px; }
          .footer { margin-top: 80px; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 30px; }
          .signature-name { font-weight: bold; display: block; font-size: 16px; }
          .signature-info { font-size: 12px; color: #64748B; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">Mooca Fisioterapia RA Ltda</div>
          <div style="font-size: 11px; color: #64748B;">Excelência em Reabilitação Musculoesquelética</div>
        </div>

        <div class="title">RELATÓRIO DE ATENDIMENTO</div>

        <div class="recipient">Ao convênio médico,</div>

        <div class="content">
          <p>Venho por meio desta relatar o quadro clínico da(o) paciente <strong>${patient.full_name}</strong>, no tratamento de fisioterapia. 
          Em seu quadro clínico para a <strong>${focus}</strong>.</p>

          <p>Foi realizado programa fisioterapêutico de analgesia, mobilização articular, cinesioterapia, ativação muscular e facilitação neuromuscular ao decorrer das sessões. 
          Foi utilizado recursos de cinesioterapia, eletrotermofototerapia para analgesia com TENS (transcutaneous electrical nerve simulation), US (ultrassom) e técnicas de facilitação neuromuscular proprioceptiva, força e mobilidade.</p>
          
          <p>O tratamento compreende o período de <strong>${format(new Date(options.startDate), "dd/MM/yyyy")}</strong> a <strong>${format(new Date(options.endDate), "dd/MM/yyyy")}</strong>, totalizando <strong>${options.sessionsCount}</strong> sessões de fisioterapia (Código TUSS: ${tuss}).</p>

          <p>Estou à disposição para maiores esclarecimentos ou dúvidas.</p>
        </div>

        <div class="footer">
          <span class="signature-name">Amanda Hitomi Notoya Minatto</span>
          <span class="signature-info">
            Fisioterapeuta – CREFITO-3 nº 215954-F<br>
            Mooca Fisioterapia RA Ltda – CNPJ: 54.836.577/0001-67<br>
            Rua Manuel Vieira de Sousa, 166 – Mooca – CEP 03124-110 – São Paulo/SP<br>
            Telefone: (11) 93433-5858
          </span>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await Sharing.shareAsync(uri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: `Relatório_${(patient.full_name ?? patient.name ?? "paciente").replace(/\s/g, "_")}`,
    });
  } catch (error) {
    console.error("Report Generation Error:", error);
    throw new Error("Não foi possível gerar o relatório de reembolso.");
  }
}
