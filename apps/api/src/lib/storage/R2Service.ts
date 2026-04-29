import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../../types/env";
import { writeEvent } from "../analytics";

export type R2StorageClass =
  | "clinical_document"
  | "clinical_image"
  | "clinical_video"
  | "clinical_audio"
  | "dicom"
  | "telemedicine_recording"
  | "danfse"
  | "ai_temp"
  | "public_exercise"
  | "pipeline_staging";

type StorageClassPolicy = {
  phi: boolean;
  defaultTtl: number;
  maxTtl: number;
  retention: string;
};

const STORAGE_CLASS_POLICIES: Record<R2StorageClass, StorageClassPolicy> = {
  clinical_document: { phi: true, defaultTtl: 900, maxTtl: 3600, retention: "legal_clinical" },
  clinical_image: { phi: true, defaultTtl: 900, maxTtl: 3600, retention: "legal_clinical" },
  clinical_video: { phi: true, defaultTtl: 900, maxTtl: 3600, retention: "legal_clinical" },
  clinical_audio: { phi: true, defaultTtl: 900, maxTtl: 3600, retention: "legal_clinical" },
  dicom: { phi: true, defaultTtl: 900, maxTtl: 3600, retention: "legal_clinical" },
  telemedicine_recording: { phi: true, defaultTtl: 900, maxTtl: 3600, retention: "clinic_policy" },
  danfse: { phi: true, defaultTtl: 900, maxTtl: 3600, retention: "fiscal" },
  ai_temp: { phi: true, defaultTtl: 300, maxTtl: 300, retention: "auto_expire" },
  public_exercise: { phi: false, defaultTtl: 0, maxTtl: 0, retention: "product_content" },
  pipeline_staging: { phi: false, defaultTtl: 0, maxTtl: 0, retention: "operational" },
};

const DEFAULT_PROTECTED_URL_TTL_SECONDS = 900;
const MAX_PROTECTED_URL_TTL_SECONDS = 3600;

function clampProtectedUrlTtl(expiresIn: number, maxTtl = MAX_PROTECTED_URL_TTL_SECONDS): number {
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) return DEFAULT_PROTECTED_URL_TTL_SECONDS;
  return Math.min(Math.floor(expiresIn), maxTtl);
}

function inferStorageClassFromKey(key: string): R2StorageClass | null {
  if (/\/dicom\//i.test(key)) return "dicom";
  if (/\/documents\//i.test(key)) return "clinical_document";
  if (/\/images\//i.test(key)) return "clinical_image";
  if (/\/videos\//i.test(key)) return "clinical_video";
  if (/\/audio\//i.test(key)) return "clinical_audio";
  if (/^recordings\//i.test(key)) return "telemedicine_recording";
  if (/\/nfse\//i.test(key) || /danfse/i.test(key)) return "danfse";
  if (/^tmp\/ai\//i.test(key)) return "ai_temp";
  if (/^public\/exercises\//i.test(key)) return "public_exercise";
  if (/^pipelines\//i.test(key)) return "pipeline_staging";
  return null;
}

export class R2Service {
  private client: S3Client;

  constructor(private env: Env) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async getUploadUrl(key: string, contentType = "video/webm") {
    this.emitAccessAudit("upload_url_created", key);

    const command = new PutObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async getDownloadUrl(key: string, expiresIn = DEFAULT_PROTECTED_URL_TTL_SECONDS) {
    const storageClass = inferStorageClassFromKey(key);
    const policy = storageClass ? STORAGE_CLASS_POLICIES[storageClass] : null;
    const effectiveMaxTtl = policy?.maxTtl ?? MAX_PROTECTED_URL_TTL_SECONDS;

    this.emitAccessAudit("download_url_created", key, storageClass);

    const command = new GetObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn: clampProtectedUrlTtl(expiresIn, effectiveMaxTtl),
    });
  }

  async uploadFile(
    key: string,
    body: Uint8Array,
    contentType: string,
    filename?: string,
    metadata?: { organizationId?: string; patientId?: string; sourceFeature?: string },
  ) {
    const storageClass = inferStorageClassFromKey(key) ?? "clinical_document";
    const policy = STORAGE_CLASS_POLICIES[storageClass];

    this.emitAccessAudit("file_uploaded", key, storageClass, metadata?.organizationId);

    const command = new PutObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
      ContentType: contentType,
      ContentDisposition: filename ? `attachment; filename="${filename}"` : undefined,
      Metadata: {
        contentClass: storageClass,
        retentionClass: policy.retention,
        phi: String(policy.phi),
        organizationId: metadata?.organizationId ?? "",
        patientId: metadata?.patientId ?? "",
        sourceFeature: metadata?.sourceFeature ?? "",
      },
    });

    return await this.client.send(command);
  }

  getRecordingKey(appointmentId: string, timestamp = Date.now()) {
    return `recordings/${appointmentId}/${timestamp}.webm`;
  }

  private emitAccessAudit(
    action: string,
    key: string,
    storageClass?: R2StorageClass | null,
    orgId?: string,
  ) {
    try {
      writeEvent(this.env, {
        event: `r2_${action}`,
        orgId: orgId ?? "system",
        route: `/r2/${action}`,
        method: "INTERNAL",
        status: 200,
        value: storageClass ? 1 : undefined,
      });
    } catch {
      // Audit emission must not break R2 operations
    }
  }
}
