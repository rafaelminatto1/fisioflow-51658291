import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ClinicalReportPDFDocument } from '@/components/patients/pdf/ClinicalReportPDFDocument';
import { ClinicalReportInput } from '@/services/ai/geminiAiService';

export const exportClinicalReportToPDF = async (
  patientName: string,
  reportText: string,
  reportInput: ClinicalReportInput
) => {
  const blob = await pdf(
    <ClinicalReportPDFDocument reportText={reportText} reportInput={reportInput} />
  ).toBlob();
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-clinico-${patientName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
