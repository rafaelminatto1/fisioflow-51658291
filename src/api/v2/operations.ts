import { request, requestPublic } from "./base";
import type {
  AssetAnnotationVersionRecord,
  AuditLog,
  ConvenioReportRecord,
  EvaluationFormFieldRow,
  EvaluationFormRow,
  MedicalReportRecord,
  MedicalReportTemplateRecord,
  PatientEvaluationResponseRow,
  Precadastro,
  PrecadastroToken,
  PublicBookingProfile,
  PublicBookingRequestResult,
} from "@/types/workers";

function withQuery(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  const qs = new URLSearchParams(
    Object.entries(params ?? {})
      .filter(([, value]) => value != null && String(value) !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  return qs ? `${path}?${qs}` : path;
}

const evalForms = (path: string, opts?: RequestInit) =>
  request<any>(`/api/evaluation-forms${path}`, opts);

export const evaluationFormsApi = {
  list: (p?: { tipo?: string; ativo?: boolean; favorite?: boolean }) => evalForms(withQuery("", p)),
  get: (id: string) => evalForms(`/${id}`),
  create: (d: Partial<EvaluationFormRow>) =>
    evalForms("", { method: "POST", body: JSON.stringify(d) }),
  update: (id: string, d: Partial<EvaluationFormRow>) =>
    evalForms(`/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  delete: (id: string) => evalForms(`/${id}`, { method: "DELETE" }),
  duplicate: (id: string) => evalForms(`/${id}/duplicate`, { method: "POST" }),
  addField: (formId: string, d: Partial<EvaluationFormFieldRow>) =>
    evalForms(`/${formId}/fields`, { method: "POST", body: JSON.stringify(d) }),
  updateField: (fieldId: string, d: Partial<EvaluationFormFieldRow>) =>
    evalForms(`/fields/${fieldId}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteField: (fieldId: string) => evalForms(`/fields/${fieldId}`, { method: "DELETE" }),
  responses: {
    list: (formId: string, params?: { patientId?: string }) =>
      evalForms(`/${formId}/responses${withQuery("", params)}`),
    listByPatient: (patientId: string) =>
      evalForms<{ data: PatientEvaluationResponseRow[] }>(withQuery("/responses", { patientId })),
    get: (responseId: string) =>
      evalForms<{ data: PatientEvaluationResponseRow }>(`/responses/${responseId}`),
    create: (
      formId: string,
      d: {
        patient_id: string;
        appointment_id?: string | null;
        responses: Record<string, unknown>;
        status?: PatientEvaluationResponseRow["status"];
        scheduled_for?: string | null;
        started_at?: string | null;
        completed_at?: string | null;
      },
    ) =>
      evalForms<{ data: PatientEvaluationResponseRow }>(`/${formId}/responses`, {
        method: "POST",
        body: JSON.stringify(d),
      }),
    update: (
      responseId: string,
      d: Partial<
        Pick<
          PatientEvaluationResponseRow,
          | "appointment_id"
          | "responses"
          | "status"
          | "scheduled_for"
          | "started_at"
          | "completed_at"
        >
      >,
    ) =>
      evalForms<{ data: PatientEvaluationResponseRow }>(`/responses/${responseId}`, {
        method: "PUT",
        body: JSON.stringify(d),
      }),
  },
};

export const mediaApi = {
  getUploadUrl: (data: { filename: string; contentType: string; folder?: string }) =>
    request<{
      data: {
        uploadUrl: string;
        publicUrl: string;
        key: string;
        expiresIn: number;
      };
    }>("/api/media/upload-url", { method: "POST", body: JSON.stringify(data) }),
  annotations: {
    list: (assetId: string) =>
      request<{ data: AssetAnnotationVersionRecord[] }>(
        `/api/media/annotations?assetId=${encodeURIComponent(assetId)}`,
      ),
    create: (data: { asset_id: string; version: number; data: Record<string, unknown>[] }) =>
      request<{ data: AssetAnnotationVersionRecord }>("/api/media/annotations", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};

export const auditLogsApi = {
  list: (params?: { entityType?: string; entityId?: string; limit?: number }) =>
    request<{ data: AuditLog[] }>(withQuery("/api/audit-logs", params)),
  create: (d: Partial<AuditLog>) =>
    request<{ data: AuditLog }>("/api/audit-logs", {
      method: "POST",
      body: JSON.stringify(d),
    }),
};

export const auditApi = auditLogsApi;

export const precadastroApi = {
  public: {
    getToken: (token: string) =>
      requestPublic<{ data: PrecadastroToken }>(
        `/api/precadastro/public/${encodeURIComponent(token)}`,
      ),
    submit: (
      token: string,
      data: {
        nome: string;
        email?: string;
        telefone?: string;
        data_nascimento?: string;
        endereco?: string;
        cpf?: string;
        convenio?: string;
        queixa_principal?: string;
        observacoes?: string;
      },
    ) =>
      requestPublic<{ data: Precadastro }>(
        `/api/precadastro/public/${encodeURIComponent(token)}/submissions`,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      ),
  },
  tokens: {
    list: () => request<{ data: PrecadastroToken[] }>("/api/precadastro/tokens"),
    create: (data: Partial<PrecadastroToken>) =>
      request<{ data: PrecadastroToken }>("/api/precadastro/tokens", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<PrecadastroToken>) =>
      request<{ data: PrecadastroToken }>(`/api/precadastro/tokens/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  submissions: {
    list: () => request<{ data: Precadastro[] }>("/api/precadastro/submissions"),
    update: (id: string, data: Partial<Precadastro>) =>
      request<{ data: Precadastro }>(`/api/precadastro/submissions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
};

export const reportsApi = {
  medicalTemplates: {
    list: () => request<{ data: MedicalReportTemplateRecord[] }>("/api/reports/medical-templates"),
    create: (data: Partial<MedicalReportTemplateRecord>) =>
      request<{ data: MedicalReportTemplateRecord }>("/api/reports/medical-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<MedicalReportTemplateRecord>) =>
      request<{ data: MedicalReportTemplateRecord }>(`/api/reports/medical-templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/reports/medical-templates/${id}`, {
        method: "DELETE",
      }),
  },
  medical: {
    list: () => request<{ data: MedicalReportRecord[] }>("/api/reports/medical"),
    create: (data: Partial<MedicalReportRecord> & Record<string, unknown>) =>
      request<{ data: MedicalReportRecord }>("/api/reports/medical", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<MedicalReportRecord> & Record<string, unknown>) =>
      request<{ data: MedicalReportRecord }>(`/api/reports/medical/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/reports/medical/${id}`, {
        method: "DELETE",
      }),
  },
  convenio: {
    list: () => request<{ data: ConvenioReportRecord[] }>("/api/reports/convenio"),
    create: (data: Partial<ConvenioReportRecord> & Record<string, unknown>) =>
      request<{ data: ConvenioReportRecord }>("/api/reports/convenio", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<ConvenioReportRecord> & Record<string, unknown>) =>
      request<{ data: ConvenioReportRecord }>(`/api/reports/convenio/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/api/reports/convenio/${id}`, {
        method: "DELETE",
      }),
  },
  pdf: {
    generate: (data: {
      type: string;
      patientName: string;
      patientId: string;
      data: Record<string, unknown>;
      saveToR2?: boolean;
      includeHtml?: boolean;
    }) =>
      request<{
        pdfUrl: string;
        pdfKey: string;
        htmlUrl?: string;
        htmlKey?: string;
      }>("/api/reports/pdf", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    share: (data: { key: string; expiresIn?: number }) =>
      request<{ url: string }>("/api/reports/pdf/share", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};

export const publicBookingApi = {
  getProfile: (slug: string) =>
    requestPublic<{ data: PublicBookingProfile }>(
      `/api/public/booking/${encodeURIComponent(slug)}`,
    ),
  create: (data: {
    slug: string;
    date: string;
    time: string;
    patient: {
      name: string;
      email?: string;
      phone: string;
      notes?: string;
    };
  }) =>
    requestPublic<{ data: PublicBookingRequestResult; success: boolean }>("/api/public/booking", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
