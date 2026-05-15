import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { AnalysisResult } from "../types/biomechanics";

export const generateBiomechanicsReport = async (result: AnalysisResult) => {
  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 20px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #10b981; }
          .report-title { font-size: 18px; margin-top: 5px; color: #666; }
          .patient-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-left: 4px solid #10b981; padding-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; }
          th { background: #f9fafb; font-size: 12px; color: #6b7280; text-transform: uppercase; }
          .status-ok { color: #10b981; font-weight: bold; }
          .status-warning { color: #f59e0b; font-weight: bold; }
          .status-alert { color: #ef4444; font-weight: bold; }
          .symmetry-card { background: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #10b981; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="clinic-name">FisioFlow</div>
          <div class="report-title">Relatório de Avaliação Biomecânica</div>
        </div>

        <div class="patient-info">
          <div><strong>Paciente:</strong> ${result.patientName || "Não informado"}</div>
          <div><strong>Data:</strong> ${new Date(result.timestamp).toLocaleDateString("pt-BR")}</div>
          <div><strong>Tipo de Análise:</strong> ${result.type.toUpperCase()}</div>
        </div>

        <div class="section-title">Ângulos Articulares</div>
        <table>
          <thead>
            <tr>
              <th>Articulação</th>
              <th>Ângulo</th>
              <th>Referência</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${result.angles
              .map(
                (a) => `
              <tr>
                <td>${a.joint}</td>
                <td>${a.angle.toFixed(1)}°</td>
                <td>${a.reference}°</td>
                <td class="status-${a.status}">${a.status.toUpperCase()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        ${
          result.symmetries && result.symmetries.length > 0
            ? `
          <div class="section-title">Análise de Simetria</div>
          ${result.symmetries
            .map(
              (s) => `
            <div class="symmetry-card">
              <strong>${s.joint}</strong>: Diferença de ${s.diff}° (${s.percentage}% de assimetria)
            </div>
          `,
            )
            .join("")}
        `
            : ""
        }

        ${
          result.observations
            ? `
          <div class="section-title">Observações Clínicas</div>
          <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${result.observations}</div>
        `
            : ""
        }

        <div class="footer">
          Gerado automaticamente pela plataforma FisioFlow em ${new Date().toLocaleString("pt-BR")}.
          Este relatório é uma ferramenta de auxílio clínico e deve ser interpretado por um profissional qualificado.
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    throw error;
  }
};
