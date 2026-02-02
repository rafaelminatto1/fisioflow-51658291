/**
 * Firebase Storage Upload Handler
 *
 * Handles file uploads to Firebase Storage
 * Migrated from Vercel Blob to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseStorage } from '@/integrations/firebase/storage';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface UploadRequestBody {
  file: {
    name: string;
    type: string;
    size: number;
    data: string; // Base64 encoded
  };
  path?: string;
  metadata?: Record<string, string>;
}

export interface UploadResponse {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default async function handler(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as UploadRequestBody;

    // Validate file
    if (!body.file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Check content type
    if (!ALLOWED_CONTENT_TYPES.includes(body.file.type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Content type ${body.file.type} not allowed`,
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // Check file size
    if (body.file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    // In a real app, you should check authentication here!
    // For example, verify Firebase session from cookies/headers

    // Convert base64 to Blob
    const base64Data = body.file.data.split(',')[1] || body.file.data;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: body.file.type });

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const extension = body.file.name.split('.').pop();
    const filename = `${timestamp}_${randomSuffix}.${extension}`;
    const path = body.path || `uploads/${filename}`;

    // Upload to Firebase Storage
    const storage = getFirebaseStorage();
    const storageRef = ref(storage, path);

    const metadata = {
      contentType: body.file.type,
      ...body.metadata,
    };

    await uploadBytes(storageRef, blob, metadata);
    const downloadUrl = await getDownloadURL(storageRef);

    logger.info('File uploaded successfully', {
      filename,
      path,
      size: body.file.size,
      type: body.file.type,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: downloadUrl,
        path,
      } as UploadResponse),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Upload failed', error, 'upload');

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      } as UploadResponse),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}

/**
 * Generate signed URL for direct upload (alternative method)
 * This can be used for larger files or client-side direct uploads
 */
export async function generateUploadUrl(
  path: string,
  contentType: string
): Promise<{ uploadUrl: string; method: string; headers: Record<string, string> }> {
  // For Firebase Storage, you would typically use:
  // 1. Firebase Storage REST API with OAuth
  // 2. Firebase Cloud Functions to generate signed URLs
  // 3. Google Cloud Storage signed URLs

  // This is a placeholder - implement based on your authentication strategy
  throw new Error('generateUploadUrl not implemented - use Cloud Function');
}
