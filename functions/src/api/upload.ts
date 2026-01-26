/**
 * Upload API - Firebase Cloud Function
 *
 * Substitui a rota /api/upload que usava Vercel Blob
 * Agora usa Firebase Storage para todos os uploads
 *
 * @version 1.0.0 - Firebase Functions v2
 *
 * Usage from client:
 * ```ts
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const uploadFn = httpsCallable(functions, 'generateUploadToken');
 *
 * const result = await uploadFn({
 *   filename: 'video.mp4',
 *   contentType: 'video/mp4'
 * });
 * ```
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getAdminAuth, getAdminStorage } from '../init';

// ============================================================================
// TYPES
// ============================================================================

interface GenerateUploadTokenRequest {
  filename: string;
  contentType: string;
  folder?: string;
}

interface GenerateUploadTokenResponse {
  uploadUrl: string;
  storagePath: string;
  token: string;
}

// ============================================================================
// CALLABLE FUNCTION: Generate Upload Token/URL
// ============================================================================

/**
 * Generate a signed URL for direct upload to Firebase Storage
 *
 * This replaces the Vercel Blob upload workflow:
 * 1. Client calls this function to get upload credentials
 * 2. Client uploads directly to Firebase Storage using the signed URL
 * 3. File is stored in Firebase Storage
 *
 * For even better performance, consider using Firebase Storage directly from the client:
 * ```ts
 * import { ref, uploadBytes } from 'firebase/storage';
 * import { storage } from '@/integrations/firebase/app';
 *
 * const storageRef = ref(storage, `uploads/${filename}`);
 * await uploadBytes(storageRef, file);
 * ```
 */
export const generateUploadToken = onCall(
  {
    region: 'southamerica-east1',
  },
  async (request): Promise<GenerateUploadTokenResponse> => {
    const { data, auth } = request;

    // Auth check
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { filename, contentType, folder = 'uploads' } = data as GenerateUploadTokenRequest;

    // Validate input
    if (!filename || !contentType) {
      throw new HttpsError('invalid-argument', 'filename and contentType are required');
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'text/plain',
      'application/json',
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new HttpsError('failed-precondition', `Content type ${contentType} not allowed`);
    }

    try {
      // Get user info (for verification)
      const adminAuth = getAdminAuth();
      await adminAuth.getUser(auth.uid); // Verify user exists

      // Generate unique storage path
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const extension = filename.split('.').pop();
      const storageFilename = `${timestamp}-${random}.${extension}`;
      const storagePath = `${folder}/${auth.uid}/${storageFilename}`;

      // Get admin storage instance
      const adminStorage = getAdminStorage();
      const bucket = adminStorage.bucket();
      const file = bucket.file(storagePath);

      // Generate signed URL for upload (valid for 15 minutes)
      const [uploadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType,
      });

      logger.info('[generateUploadToken] Upload token generated', {
        userId: auth.uid,
        storagePath,
        contentType,
      });

      return {
        uploadUrl,
        storagePath,
        token: btoa(JSON.stringify({ storagePath, contentType })), // Simple token for client
      };
    } catch (error) {
      logger.error('[generateUploadToken] Error', {
        userId: auth.uid,
        error,
      });
      throw new HttpsError('internal', 'Failed to generate upload token');
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: Confirm Upload
// ============================================================================

interface ConfirmUploadRequest {
  storagePath: string;
  token: string;
}

interface ConfirmUploadResponse {
  downloadUrl: string;
  publicUrl: string;
}

/**
 * Confirm an upload and get the download URL
 * Called after client completes the upload using the signed URL
 */
export const confirmUpload = onCall(
  {
    region: 'southamerica-east1',
  },
  async (request): Promise<ConfirmUploadResponse> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { storagePath, token } = data as ConfirmUploadRequest;

    if (!storagePath) {
      throw new HttpsError('invalid-argument', 'storagePath is required');
    }

    try {
      // Verify token (basic check)
      let tokenData: { storagePath: string; contentType: string };
      try {
        tokenData = JSON.parse(atob(token));
      } catch {
        throw new HttpsError('permission-denied', 'Invalid token');
      }

      if (tokenData.storagePath !== storagePath) {
        throw new HttpsError('permission-denied', 'Token mismatch');
      }

      // Get the file from storage
      const adminStorage = getAdminStorage();
      const bucket = adminStorage.bucket();
      const file = bucket.file(storagePath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new HttpsError('not-found', 'File not found');
      }

      // Get signed URL for download (valid for 1 year)
      const [downloadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      });

      // For public files, you could also generate a public URL
      // by making the file publicly readable or using a CDN
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

      logger.info('[confirmUpload] Upload confirmed', {
        userId: auth.uid,
        storagePath,
      });

      return {
        downloadUrl,
        publicUrl,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[confirmUpload] Error', {
        userId: auth.uid,
        storagePath,
        error,
      });
      throw new HttpsError('internal', 'Failed to confirm upload');
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: Delete File
// ============================================================================

interface DeleteFileRequest {
  storagePath: string;
}

interface DeleteFileResponse {
  success: boolean;
}

/**
 * Delete a file from Firebase Storage
 * Verifies user owns the file before deletion
 */
export const deleteFile = onCall(
  {
    region: 'southamerica-east1',
  },
  async (request): Promise<DeleteFileResponse> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { storagePath } = data as DeleteFileRequest;

    if (!storagePath) {
      throw new HttpsError('invalid-argument', 'storagePath is required');
    }

    try {
      // Verify user owns the file (path should contain user ID)
      if (!storagePath.includes(`/${auth.uid}/`) && !storagePath.startsWith(`${auth.uid}/`)) {
        throw new HttpsError('permission-denied', 'You can only delete your own files');
      }

      const adminStorage = getAdminStorage();
      const bucket = adminStorage.bucket();
      const file = bucket.file(storagePath);

      await file.delete();

      logger.info('[deleteFile] File deleted', {
        userId: auth.uid,
        storagePath,
      });

      return { success: true };
    } catch (error) {
      logger.error('[deleteFile] Error', {
        userId: auth.uid,
        storagePath,
        error,
      });
      throw new HttpsError('internal', 'Failed to delete file');
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: List Files
// ============================================================================

interface ListFilesRequest {
  folder?: string;
}

interface ListFilesResponse {
  files: Array<{
    name: string;
    path: string;
    size: number;
    contentType: string;
    updatedAt: string;
  }>;
}

/**
 * List files owned by the user
 */
export const listUserFiles = onCall(
  {
    region: 'southamerica-east1',
  },
  async (request): Promise<ListFilesResponse> => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { folder = 'uploads' } = data as ListFilesRequest;

    try {
      const adminStorage = getAdminStorage();
      const bucket = adminStorage.bucket();
      const prefix = `${folder}/${auth.uid}/`;

      const [files] = await bucket.getFiles({ prefix });

      const fileList = files.map((file) => ({
        name: file.name.split('/').pop() || file.name,
        path: file.name,
        size: typeof file.metadata.size === 'number'
          ? file.metadata.size
          : parseInt(String(file.metadata.size || '0'), 10),
        contentType: file.metadata.contentType || 'unknown',
        updatedAt: file.metadata.updated || new Date().toISOString(),
      }));

      logger.info('[listUserFiles] Files listed', {
        userId: auth.uid,
        count: fileList.length,
      });

      return { files: fileList };
    } catch (error) {
      logger.error('[listUserFiles] Error', {
        userId: auth.uid,
        error,
      });
      throw new HttpsError('internal', 'Failed to list files');
    }
  }
);
