import React from "react";
import type { ClinicalReportInput } from "@/services/ai/geminiAiService";
import { loadReactPdfRuntime } from "@/lib/export/reactPdfRuntime";

export const exportClinicalReportToPDF = async (
  patientName: string,
  reportText: string,
  reportInput: ClinicalReportInput,
) => {
  const [{ pdf }, { ClinicalReportPDFDocument }] = await Promise.all([
    loadReactPdfRuntime(),
    import("@/components/patient/pdf/ClinicalReportPDFDocument"),
  ]);

  const blob = await pdf(
    React.createElement(ClinicalReportPDFDocument, {
      reportText,
      reportInput,
    }),
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-clinico-${patientName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
