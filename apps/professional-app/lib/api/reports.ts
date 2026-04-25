import { fetchApi } from "./client";

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
    fetchApi<PdfReportResponse>("/api/reports/pdf", {
      method: "POST",
      data,
    }),

  shareLink: (data: { key: string; expiresIn?: number }) =>
    fetchApi<{ url: string }>("/api/reports/pdf/share", {
      method: "POST",
      data,
    }),
};
