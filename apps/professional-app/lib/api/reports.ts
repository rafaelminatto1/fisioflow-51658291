import { request } from './client';

export interface PdfReportRequest {
  type: string;
  patientName: string;
  patientId: string;
  data: Record<string, unknown>;
  saveToR2?: boolean;
  includeHtml?: boolean;
}

export interface PdfReportResponse {
  pdfUrl: string;
  pdfKey: string;
  htmlUrl?: string;
  htmlKey?: string;
}

export const reportsApi = {
  generatePdf: (data: PdfReportRequest) =>
    request<PdfReportResponse>('/api/reports/pdf', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  shareLink: (data: { key: string; expiresIn?: number }) =>
    request<{ url: string }>('/api/reports/pdf/share', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
