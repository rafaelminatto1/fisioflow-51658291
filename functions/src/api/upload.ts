/**
 * Upload API - Firebase Cloud Function
 *
 * Substitui a rota /api/upload que usava Vercel Blob
 * Agora usa Firebase Storage para todos os uploads
 *
 * @version 1.1.0 - Firebase Functions v2 - Refactored for consistency
 */


// ============================================================================
// TYPES
// ============================================================================

import { CORS_ORIGINS, getAdminAuth, getAdminStorage } from '../init';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

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

interface ConfirmUploadRequest {
  storagePath: string;
  token: string;
}

interface ConfirmUploadResponse {
  downloadUrl: string;
  publicUrl: string;
}

interface DeleteFileRequest {
  storagePath: string;
}

interface DeleteFileResponse {
  success: boolean;
}

interface ListFilesRequest {
  folder?: string;
}

interface ListFileItem {
  name: string;
  path: string;
  size: number;
  contentType: string;
  updatedAt: string;
}

interface ListFilesResponse {
  files: ListFileItem[];
}

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Signed URL handler
 */
export const generateUploadTokenHandler = async (request: any) => {
  const { data, auth } = request;

  // Auth check
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { filename, contentType, folder = 'uploads' } = data;

  // Validate input
  if (!filename || !contentType) {
    throw new HttpsError('invalid-argument', 'filename and contentType are required');
  }

  // Validate content type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'application/pdf', 'text/plain', 'application/json',
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
      token: Buffer.from(JSON.stringify({ storagePath, contentType })).toString('base64'), // Simple token for client verification
    };
  } catch (error: unknown) {
    logger.error('[generateUploadToken] Error', {
      userId: auth.uid,
      error,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to generate upload token');
  }
};

/**
 * Generate a signed URL for direct upload to Firebase Storage
 */
export const generateUploadToken = onCall<GenerateUploadTokenRequest, Promise<GenerateUploadTokenResponse>>({ cors: CORS_ORIGINS }, generateUploadTokenHandler);

/**
 * Confirm upload handler
 */
export const confirmUploadHandler = async (request: any) => {
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { storagePath, token } = data;

  if (!storagePath) {
    throw new HttpsError('invalid-argument', 'storagePath is required');
  }

  try {
    // Verify token (basic check)
    let tokenData: { storagePath: string; contentType: string };
    try {
      tokenData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
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

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;

    logger.info('[confirmUpload] Upload confirmed', {
      userId: auth.uid,
      storagePath,
    });

    return {
      downloadUrl,
      publicUrl,
    };
  } catch (error: unknown) {
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
};

/**
 * Confirm an upload and get the download URL
 */
export const confirmUpload = onCall<ConfirmUploadRequest, Promise<ConfirmUploadResponse>>({ cors: CORS_ORIGINS }, confirmUploadHandler);

/**
 * Delete file handler
 */
export const deleteFileHandler = async (request: any) => {
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { storagePath } = data;

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
  } catch (error: unknown) {
    logger.error('[deleteFile] Error', {
      userId: auth.uid,
      storagePath,
      error,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to delete file');
  }
};

/**
 * Delete a file from Firebase Storage
 */
export const deleteFile = onCall<DeleteFileRequest, Promise<DeleteFileResponse>>({ cors: CORS_ORIGINS }, deleteFileHandler);

/**
 * List files handler
 */
export const listUserFilesHandler = async (request: any) => {
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { folder = 'uploads' } = data;

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
  } catch (error: unknown) {
    logger.error('[listUserFiles] Error', {
      userId: auth.uid,
      error,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to list files');
  }
};

/**
 * List files owned by the user
 */
export const listUserFiles = onCall<ListFilesRequest, Promise<ListFilesResponse>>({ cors: CORS_ORIGINS }, listUserFilesHandler);
