import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../../types/env";

/**
 * Cloudflare R2 Storage Service (S3 Compatible)
 */
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

  /**
   * Generates a presigned URL for uploading a recording
   */
  async getUploadUrl(key: string, contentType = "video/webm") {
    const command = new PutObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(), // or name
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  /**
   * Generates a signed URL for viewing/downloading an object
   * @param key The R2 object key
   * @param expiresIn Expiration time in seconds (default 24h)
   */
  async getDownloadUrl(key: string, expiresIn = 86400) {
    const command = new GetObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Uploads a file buffer directly to R2
   */
  async uploadFile(key: string, body: Uint8Array, contentType: string, filename?: string) {
    const command = new PutObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
      ContentType: contentType,
      ContentDisposition: filename ? `attachment; filename="${filename}"` : undefined,
    });

    return await this.client.send(command);
  }

  /**
   * List of recordings for an appointment
   */
  getRecordingKey(appointmentId: string, timestamp = Date.now()) {
    return `recordings/${appointmentId}/${timestamp}.webm`;
  }
}
