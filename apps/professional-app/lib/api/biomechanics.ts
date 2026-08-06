import { fetchApi } from "./client";

export interface BiomechanicsSignature {
  valid: boolean;
  signer: string;
  signedAt: string;
  integrityStatus: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    fingerprint?: string;
  };
}

export interface BiomechanicsAnalysisPayload {
  patientId: string;
  type: string;
  analysisData: Record<string, unknown>;
  mediaUrl?: string;
  thumbnailUrl?: string;
  observations?: string;
  conclusions?: string;
  symmetryScore?: number;
  trajectoryData?: any[];
  aiValidationStatus?: string;
}

export interface BiomechanicsProtocol {
  id: string;
  organizationId?: string | null;
  slug: string;
  name: string;
  category: string;
  description?: string | null;
  assessmentType: string;
  captureRequirements?: Record<string, any> | null;
  metricDefinitions?: any[] | null;
  qualityRules?: Record<string, any> | null;
  progressionGates?: any[] | null;
  redFlags?: any[] | null;
  evidenceRefs?: any[] | null;
  isSystem: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface BiomechanicsMedia {
  id: string;
  organizationId: string;
  patientId: string;
  assessmentId: string;
  r2Key?: string | null;
  streamUid?: string | null;
  mediaType: string;
  view: string;
  durationMs?: number | null;
  fps?: string | null;
  width?: number | null;
  height?: number | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  qualityScore?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BiomechanicsJob {
  id: string;
  organizationId: string;
  patientId: string;
  assessmentId: string;
  mediaId?: string | null;
  status: string;
  stage: string;
  progress: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  modelVersion?: string | null;
  algorithmVersion?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BiomechanicsAnnotation {
  id: string;
  organizationId: string;
  assessmentId: string;
  mediaId?: string | null;
  frameIndex?: number | null;
  timeMs?: number | null;
  tool: string;
  geometry?: Record<string, any> | null;
  label?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BiomechanicsAssessment {
  id: string;
  patientId: string;
  organizationId: string;
  professionalId?: string | null;
  protocolId?: string | null;
  primaryMediaId?: string | null;
  jobId?: string | null;
  type: string;
  status?: string | null;
  qualityScore?: string | null;
  captureContext?: Record<string, any> | null;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  analysisData?: Record<string, any> | null;
  observations?: string | null;
  conclusions?: string | null;
  symmetryScore?: string | null;
  trajectoryData?: any[] | null;
  aiValidationStatus?: string | null;
  algorithmVersion?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  reportHash?: string | null;
  signedAt?: string | null;
  signatureMetadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface BiomechanicsComparisonMetric {
  key: string;
  label: string;
  unit: string;
  fromValue: number | null;
  toValue: number;
  delta: number | null;
  direction: "improved" | "worse" | "stable" | "new";
  lowerIsBetter: boolean;
}

export interface BiomechanicsComparison {
  from: null | {
    id: string;
    date: string;
    label: string;
    type: string;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  to: {
    id: string;
    date: string;
    label: string;
    type: string;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  metrics: BiomechanicsComparisonMetric[];
  /**
   * Preenchido quando as duas avaliações vieram de estimadores de pose
   * diferentes. Mundt 2022 mostrou que famílias de estimadores não são
   * intercambiáveis — parte da variação pode ser do método, não do paciente.
   */
  engineMismatch?: {
    from: string;
    to: string;
    message: string;
  } | null;
  availableAssessments: Array<{
    id: string;
    label: string;
    date: string;
    type: string;
    status?: string | null;
  }>;
  history: Array<{
    assessmentId: string;
    date: string;
    label: string;
    type: string;
    metrics: Array<{
      key: string;
      label: string;
      unit: string;
      value: number;
      lowerIsBetter: boolean;
    }>;
  }>;
}

/**
 * Linha de `biomechanics_metrics` como o workbench devolve.
 *
 * `provenance` é a coluna autoritativa (migration 0165) — a UI mostra o chip
 * "no dispositivo" / "nuvem" / "manual" a partir dela. `acknowledgedAt` marca
 * a conferência individual do profissional, exigida antes de validar o laudo.
 */
export interface BiomechanicsMetricRow {
  id: string;
  assessmentId: string;
  metricKey: string;
  metricValue: string | number;
  unit?: string | null;
  side?: string | null;
  phase?: string | null;
  view?: string | null;
  confidence?: string | number | null;
  severity?: string | null;
  provenance: "device_pose" | "container_pose" | "manual" | "patient_reported" | "derived" | "synthetic_demo";
  poseEngine?: string | null;
  sampleCount?: number | null;
  attempt?: number | null;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  supersededAt?: string | null;
  algorithmVersion?: string | null;
  createdAt: string;
}

export interface BiomechanicsPdfResult {
  pdfUrl: string;
  pdfKey: string;
  pdfHash: string;
  generated: boolean;
  cached: boolean;
  generatedAt: string;
}

export interface BiomechanicsCapturePayload {
  patientId: string;
  protocolId?: string;
  type?: string;
  view?: "frontal" | "sagittal" | "posterior" | "superior";
  attempt?: number;
  mediaType?: "video" | "photo";
  contentType?: string;
  durationMs?: number;
  fps?: number;
  width?: number;
  height?: number;
  sizeBytes?: number;
  checklist?: Record<string, any>;
  metadata?: Record<string, any>;
  source?: string;
}

export interface BiomechanicsWorkbench {
  assessment: BiomechanicsAssessment;
  media: BiomechanicsMedia[];
  jobs: BiomechanicsJob[];
  metrics: BiomechanicsMetricRow[];
  frames: any[];
  events: any[];
  annotations: BiomechanicsAnnotation[];
}

/**
 * Métrica vinda do aparelho é PROVISÓRIA (ADR-001): aparece na hora para o
 * fisio mostrar ao paciente, mas o número que fica no laudo vem do
 * reprocessamento em nuvem, que usa um estimador só em todas as sessões.
 */
export function isProvisional(provenance?: string | null): boolean {
  return provenance === "device_pose";
}

/** Rótulo do chip de procedência exibido em cada métrica. */
export function provenanceLabel(provenance?: string | null): string {
  switch (provenance) {
    case "device_pose":
      return "provisório · no aparelho";
    case "container_pose":
      return "em nuvem";
    case "manual":
      return "medição manual";
    case "patient_reported":
      return "relato do paciente";
    case "derived":
      return "derivado";
    default:
      return "não validado";
  }
}

export const biomechanicsApi = {
  dashboard: () =>
    fetchApi<{
      data: {
        counts: { queued: number; processing: number; needsReview: number; failed: number };
        jobs: BiomechanicsJob[];
        recentAssessments: BiomechanicsAssessment[];
      };
    }>("/api/biomechanics/dashboard", { method: "GET" }),

  listProtocols: (params?: { category?: string }) =>
    fetchApi<{ data: BiomechanicsProtocol[] }>("/api/biomechanics/protocols", {
      method: "GET",
      params,
    }),

  createCapture: (payload: BiomechanicsCapturePayload) =>
    fetchApi<{
      data: {
        assessment: BiomechanicsAssessment;
        media: BiomechanicsMedia;
        job: BiomechanicsJob;
        protocol: BiomechanicsProtocol | null;
      };
    }>("/api/biomechanics/captures", {
      method: "POST",
      data: payload,
    }),

  createUploadUrl: (
    id: string,
    payload: { mediaId: string; filename?: string; contentType?: string },
  ) =>
    fetchApi<{ data: { uploadUrl: string; key: string; media: BiomechanicsMedia } }>(
      `/api/biomechanics/${encodeURIComponent(id)}/media/upload-url`,
      { method: "POST", data: payload },
    ),

  completeMediaUpload: (
    id: string,
    payload: {
      mediaId: string;
      durationMs?: number;
      fps?: number;
      width?: number;
      height?: number;
      sizeBytes?: number;
      qualityScore?: number;
      metadata?: Record<string, any>;
    },
  ) =>
    fetchApi<{ data: { media: BiomechanicsMedia } }>(
      `/api/biomechanics/${encodeURIComponent(id)}/media/complete`,
      { method: "POST", data: payload },
    ),

  /**
   * Presigned PUT para o bundle de landmarks (`ff-pose-33-v1`, NDJSON gzip).
   * A chave vem do servidor — mandar `key` daqui não adianta e é ignorado.
   */
  createLandmarksUploadUrl: (
    id: string,
    payload: { mediaId?: string; frameCount: number; attempt?: number },
  ) =>
    fetchApi<{ data: { uploadUrl: string; key: string; attempt: number } }>(
      `/api/biomechanics/${encodeURIComponent(id)}/landmarks/upload-url`,
      { method: "POST", data: payload },
    ),

  /**
   * Avisa que o bundle subiu e enfileira o processamento.
   * Idempotente pelo sha256: reenviar depois de um timeout devolve o mesmo job
   * em vez de reprocessar a mesma captura.
   */
  completeLandmarksUpload: (
    id: string,
    payload: {
      mediaId?: string;
      sha256: string;
      bytes?: number;
      schema?: string;
      attempt?: number;
      header: Record<string, unknown>;
    },
  ) =>
    fetchApi<{ data: { media: BiomechanicsMedia; job: BiomechanicsJob; replayed: boolean } }>(
      `/api/biomechanics/${encodeURIComponent(id)}/landmarks/complete`,
      { method: "POST", data: payload },
    ),

  /** Conferência humana de uma métrica. NÃO altera a procedência. */
  acknowledgeMetric: (id: string, metricId: string) =>
    fetchApi<{ data: BiomechanicsMetricRow }>(
      `/api/biomechanics/${encodeURIComponent(id)}/metrics/${encodeURIComponent(metricId)}/acknowledge`,
      { method: "POST" },
    ),

  process: (id: string) =>
    fetchApi<{ data: { job: BiomechanicsJob } }>(
      `/api/biomechanics/${encodeURIComponent(id)}/process`,
      { method: "POST" },
    ),

  getJob: (id: string) =>
    fetchApi<{ data: BiomechanicsJob }>(`/api/biomechanics/${encodeURIComponent(id)}/job`, {
      method: "GET",
    }),

  getWorkbench: (id: string) =>
    fetchApi<{ data: BiomechanicsWorkbench }>(
      `/api/biomechanics/${encodeURIComponent(id)}/workbench`,
      { method: "GET" },
    ),

  createAnnotation: (
    id: string,
    payload: {
      mediaId?: string;
      frameIndex?: number;
      timeMs?: number;
      tool: string;
      geometry?: Record<string, any>;
      label?: string;
    },
  ) =>
    fetchApi<{ data: BiomechanicsAnnotation }>(
      `/api/biomechanics/${encodeURIComponent(id)}/annotations`,
      { method: "POST", data: payload },
    ),

  validateAssessment: (
    id: string,
    payload: { observations?: string; conclusions?: string; notes?: string },
  ) =>
    fetchApi<{ data: BiomechanicsAssessment }>(
      `/api/biomechanics/${encodeURIComponent(id)}/validate`,
      { method: "POST", data: payload },
    ),

  getTimeline: (patientId: string) =>
    fetchApi<{ data: any[] }>(
      `/api/biomechanics/patient/${encodeURIComponent(patientId)}/timeline`,
      { method: "GET" },
    ),

  create: (payload: BiomechanicsAnalysisPayload) =>
    fetchApi<{ success: boolean; data: any }>("/api/biomechanics", {
      method: "POST",
      data: payload,
    }),

  listByPatient: (patientId: string) =>
    fetchApi<{ data: BiomechanicsAssessment[] }>(
      `/api/biomechanics/patient/${encodeURIComponent(patientId)}`,
      { method: "GET" },
    ),

  getById: (id: string) =>
    fetchApi<{ data: BiomechanicsAssessment }>(`/api/biomechanics/${encodeURIComponent(id)}`, {
      method: "GET",
    }),

  getComparison: (
    patientId: string,
    params?: { fromAssessmentId?: string; toAssessmentId?: string; type?: string },
  ) =>
    fetchApi<{ data: BiomechanicsComparison }>(
      `/api/biomechanics/patient/${encodeURIComponent(patientId)}/comparison`,
      {
        method: "GET",
        params,
      },
    ),

  createOrReusePdf: (
    id: string,
    payload?: { patientName?: string; comparisonAssessmentId?: string; force?: boolean },
  ) =>
    fetchApi<{ data: BiomechanicsPdfResult }>(`/api/biomechanics/${encodeURIComponent(id)}/pdf`, {
      method: "POST",
      data: payload ?? {},
      timeout: 45000,
    }),

  signAssessment: (id: string) =>
    fetchApi<{ success: boolean; data: any }>(`/api/biomechanics/${encodeURIComponent(id)}/sign`, {
      method: "POST",
    }),

  verifySignature: (id: string) =>
    fetchApi<BiomechanicsSignature>(`/api/biomechanics/${encodeURIComponent(id)}/verify`, {
      method: "GET",
    }),
};
