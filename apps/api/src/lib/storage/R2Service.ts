import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../../types/env';

/**
 * Cloudflare R2 Storage Service (S3 Compatible)
 */
export class R2Service {
  private client: S3Client;

  constructor(private env: Env) {
    this.client = new S3Client({
      region: 'auto',
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
  async getUploadUrl(key: string, contentType = 'video/webm') {
    const command = new PutObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(), // or name
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  /**
   * Generates a signed URL for viewing a recording
   */
  async getDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.env.MEDIA_BUCKET.toString(),
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn: 86400 }); // 24h
  }

  /**
   * List of recordings for an appointment
   */
  getRecordingKey(appointmentId: string, timestamp = Date.now()) {
    return `recordings/${appointmentId}/${timestamp}.webm`;
  }
}
