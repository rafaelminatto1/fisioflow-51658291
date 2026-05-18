import { request } from "./base";
import { getWorkersApiUrl } from "@/lib/api/config";
const BASE = "/api/patient-media";

export interface PatientPhoto {
  id: string;
  patient_id: string;
  organization_id: string;
  professional_id: string | null;
  photo_type: "before" | "after" | "progress" | "postural" | "clinical" | "wound";
  r2_key: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string;
  session_id: string | null;
  body_region: string | null;
  side: string | null;
  notes: string | null;
  tags: string[];
  series_id: string | null;
  series_order: number;
  created_at: string;
  updated_at: string;
}

export interface PatientVideo {
  id: string;
  patient_id: string;
  organization_id: string;
  professional_id: string | null;
  video_type:
    | "gait"
    | "biomechanics"
    | "range_of_motion"
    | "before"
    | "after"
    | "exercise"
    | "clinical";
  r2_key: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string;
  duration_seconds: number | null;
  session_id: string | null;
  body_region: string | null;
  notes: string | null;
  tags: string[];
  thumbnail_r2_key: string | null;
  status: "uploading" | "ready" | "processing" | "failed";
  created_at: string;
  updated_at: string;
}

export interface MedicalRequest {
  id: string;
  patient_id: string;
  organization_id: string;
  professional_id: string | null;
  request_type: "exam_request" | "referral" | "prescription" | "certificate" | "other";
  title: string | null;
  notes: string | null;
  r2_key: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  request_date: string | null;
  requested_by: string | null;
  specialty: string | null;
  status: "pending" | "scheduled" | "done";
  created_at: string;
  updated_at: string;
}

export interface UploadUrlResult {
  uploadUrl: string;
  r2Key: string;
  expiresIn: number;
  mediaType: string;
}

// ─── Upload URL (presigned PUT direto ao R2) ──────────────────────────────────

export async function getPatientMediaUploadUrl(params: {
  patientId: string;
  mediaType: "photo" | "video" | "medical_request" | "exam";
  contentType: string;
  fileSize?: number;
  fileName?: string;
}): Promise<UploadUrlResult> {
  const res = await request<{ data: UploadUrlResult }>(`${BASE}/upload-url`, {
    method: "POST",
    body: JSON.stringify(params),
  });
  return res.data;
}

// ─── Access URL (presigned GET, 15min) ───────────────────────────────────────

export async function getPatientMediaAccessUrl(r2Key: string): Promise<string> {
  const res = await request<{ url: string }>(`${BASE}/access-url/${encodeURIComponent(r2Key)}`);
  return res.url;
}

// ─── Serve URL (via Images API — otimizada, sem presigned) ───────────────────

export function getImageServeUrl(
  r2Key: string,
  opts?: {
    w?: number;
    h?: number;
    fit?: "cover" | "contain" | "scale-down";
    q?: number;
    blur?: number;
  },
): string {
  const base = getWorkersApiUrl();
  const params = new URLSearchParams();
  if (opts?.w) params.set("w", String(opts.w));
  if (opts?.h) params.set("h", String(opts.h));
  if (opts?.fit) params.set("fit", opts.fit);
  if (opts?.q) params.set("q", String(opts.q));
  if (opts?.blur) params.set("blur", String(opts.blur));
  const qs = params.toString();
  return `${base}${BASE}/image/${r2Key}${qs ? `?${qs}` : ""}`;
}

// ─── Fotos ────────────────────────────────────────────────────────────────────

export async function listPatientPhotos(
  patientId: string,
  filters?: { series_id?: string; photo_type?: string },
): Promise<PatientPhoto[]> {
  const params = new URLSearchParams();
  if (filters?.series_id) params.set("series_id", filters.series_id);
  if (filters?.photo_type) params.set("photo_type", filters.photo_type);
  const qs = params.toString();
  const res = await request<{ data: PatientPhoto[] }>(
    `${BASE}/${patientId}/photos${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function createPatientPhoto(
  patientId: string,
  data: Partial<PatientPhoto>,
): Promise<PatientPhoto> {
  const res = await request<{ data: PatientPhoto }>(`${BASE}/${patientId}/photos`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deletePatientPhoto(patientId: string, photoId: string): Promise<void> {
  await request(`${BASE}/${patientId}/photos/${photoId}`, { method: "DELETE" });
}

// ─── Vídeos ───────────────────────────────────────────────────────────────────

export async function listPatientVideos(
  patientId: string,
  filters?: { video_type?: string },
): Promise<PatientVideo[]> {
  const params = new URLSearchParams();
  if (filters?.video_type) params.set("video_type", filters.video_type);
  const qs = params.toString();
  const res = await request<{ data: PatientVideo[] }>(
    `${BASE}/${patientId}/videos${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function createPatientVideo(
  patientId: string,
  data: Partial<PatientVideo>,
): Promise<PatientVideo> {
  const res = await request<{ data: PatientVideo }>(`${BASE}/${patientId}/videos`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deletePatientVideo(patientId: string, videoId: string): Promise<void> {
  await request(`${BASE}/${patientId}/videos/${videoId}`, { method: "DELETE" });
}

// ─── Pedidos médicos ──────────────────────────────────────────────────────────

export async function listMedicalRequests(patientId: string): Promise<MedicalRequest[]> {
  const res = await request<{ data: MedicalRequest[] }>(`${BASE}/${patientId}/medical-requests`);
  return res.data;
}

export async function createMedicalRequest(
  patientId: string,
  data: Partial<MedicalRequest>,
): Promise<MedicalRequest> {
  const res = await request<{ data: MedicalRequest }>(`${BASE}/${patientId}/medical-requests`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateMedicalRequest(
  patientId: string,
  id: string,
  data: Partial<MedicalRequest>,
): Promise<MedicalRequest> {
  const res = await request<{ data: MedicalRequest }>(
    `${BASE}/${patientId}/medical-requests/${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
  return res.data;
}

export async function deleteMedicalRequest(patientId: string, id: string): Promise<void> {
  await request(`${BASE}/${patientId}/medical-requests/${id}`, { method: "DELETE" });
}

// ─── Helper: upload completo (get URL → PUT → registrar metadata) ─────────────

export async function uploadPatientFile(params: {
  patientId: string;
  mediaType: "photo" | "video" | "medical_request" | "exam";
  file: File;
  metadata?: Record<string, unknown>;
}): Promise<{ r2Key: string }> {
  const { uploadUrl, r2Key } = await getPatientMediaUploadUrl({
    patientId: params.patientId,
    mediaType: params.mediaType,
    contentType: params.file.type,
    fileSize: params.file.size,
    fileName: params.file.name,
  });

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: params.file,
    headers: { "Content-Type": params.file.type },
  });

  if (!putRes.ok) throw new Error(`Upload R2 falhou: ${putRes.status}`);

  return { r2Key };
}
