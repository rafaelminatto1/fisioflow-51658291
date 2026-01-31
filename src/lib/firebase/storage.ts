/**
 * Firebase Storage Service
 *
 * Complete storage solution replacing Vercel Blob
 * Handles uploads, downloads, deletions, and URL generation
 *
 * @version 1.0.0 - Firebase Migration
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  FullMetadata,
} from 'firebase/storage';
import { storage } from '@/integrations/firebase/app';
import { getAuth } from 'firebase/auth';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface UploadOptions {
  /**
   * Storage folder/path
   * @default 'uploads'
   */
  folder?: string;

  /**
   * Whether the file should be publicly accessible
   * @default false
   */
  public?: boolean;

  /**
   * Custom filename (without extension)
   * If not provided, uses timestamp + original filename
   */
  filename?: string;

  /**
   * Content type (MIME type)
   * Auto-detected from file if not provided
   */
  contentType?: string;

  /**
   * Custom metadata
   */
  metadata?: Record<string, string>;

  /**
   * Whether to use resumable upload (for large files)
   * @default true for files > 10MB
   */
  resumable?: boolean;

  /**
   * Progress callback for resumable uploads
   */
  onProgress?: (progress: number) => void;

  /**
   * Enable retry for failed uploads
   * @default true
   */
  retry?: boolean;
}

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
  createdAt: Date;
}

export interface FileMetadata extends FullMetadata {
  customMetadata?: Record<string, string>;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Default storage folders
export const STORAGE_FOLDERS = {
  UPLOADS: 'uploads',
  DOCUMENTS: 'documents',
  IMAGES: 'images',
  VIDEOS: 'videos',
  AUDIO: 'audio',
  PATIENTS: 'patients',
  EXERCISES: 'exercises',
  REPORTS: 'reports',
  TEMP: 'temp',
} as const;

// File size limits (in bytes)
export const SIZE_LIMITS = {
  SMALL: 5 * 1024 * 1024, // 5MB
  MEDIUM: 50 * 1024 * 1024, // 50MB
  LARGE: 500 * 1024 * 1024, // 500MB
  MAXIMUM: 5 * 1024 * 1024 * 1024, // 5GB (Firebase limit)
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get file extension from filename or MIME type
 */
function getFileExtension(filename: string, mimeType?: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && ext.length <= 5) return `.${ext}`;

  // Fallback to MIME type
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
  };

  return mimeType ? (mimeToExt[mimeType] || '') : '';
}

/**
 * Generate a unique filename
 */
function generateFilename(originalName: string, customName?: string): string {
  if (customName) {
    const ext = getFileExtension(originalName);
    return `${customName}${ext}`;
  }
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = getFileExtension(originalName);
  return `${timestamp}-${random}${ext}`;
}

/**
 * Get storage reference for a file
 */
function getStorageRef(path: string) {
  return ref(storage, path);
}

/**
 * Determine if upload should be resumable based on file size
 */
function shouldUseResumableUpload(file: File, options?: UploadOptions): boolean {
  if (options?.resumable !== undefined) return options.resumable;
  return file.size > SIZE_LIMITS.MEDIUM;
}

// ============================================================================
// PUBLIC API - UPLOAD
// ============================================================================

/**
 * Upload a file to Firebase Storage
 *
 * @param file - File to upload
 * @param options - Upload options
 * @returns Upload result with URL and metadata
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folder = STORAGE_FOLDERS.UPLOADS,
    public: isPublic = false,
    filename: customName,
    contentType = file.type,
    metadata: customMetadata,
    onProgress,
    retry = true,
  } = options;

  // Get current user for user-specific uploads
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  // Build path
  const pathParts = [folder];
  if (userId) pathParts.push(userId);
  const filename = generateFilename(file.name, customName);
  pathParts.push(filename);
  const path = pathParts.join('/');

  // Create storage reference
  const storageRef = getStorageRef(path);

  // Prepare metadata
  const metadata = {
    contentType,
    customMetadata: {
      ...customMetadata,
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      ...(userId && { uploadedBy: userId }),
      public: isPublic ? 'true' : 'false',
    },
  };

  try {
    let uploadResult;

    if (shouldUseResumableUpload(file, options)) {
      // Resumable upload for large files
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      // Wrap in promise for progress tracking
      uploadResult = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress?.(progress);
          },
          (error) => {
            reject(error);
          },
          async () => {
            resolve(await uploadTask.snapshot.ref);
          }
        );
      });
    } else {
      // Standard upload for smaller files
      uploadResult = await uploadBytes(storageRef, file, metadata);
    }

    const url = await getDownloadURL((uploadResult as { ref: StorageReference }).ref);

    return {
      url,
      path,
      name: filename,
      size: file.size,
      contentType,
      createdAt: new Date(),
    };
  } catch (error) {
    logger.error('Upload error', error, 'Storage');
    throw error;
  }
}

/**
 * Upload multiple files in batch
 *
 * @param files - Files to upload
 * @param options - Upload options
 * @returns Array of upload results
 */
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadFile(files[i], {
        ...options,
        onProgress: (progress) => {
          // Calculate overall progress
          const overallProgress = ((i * 100) + progress) / files.length;
          options.onProgress?.(overallProgress);
        },
      });
      results.push(result);
    } catch (error) {
      logger.error(`Failed to upload file ${i + 1}`, error, 'Storage');
      // Continue with other files
    }
  }

  return results;
}

/**
 * Upload a base64 string as a file
 *
 * @param base64 - Base64 data URL or raw base64 string
 * @param filename - Filename to use
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadBase64(
  base64: string,
  filename: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Extract data from data URL if present
  let data = base64;
  let contentType = options.contentType;

  if (base64.startsWith('data:')) {
    const match = base64.match(/^data:([^;]+);base64,/);
    if (match) {
      contentType = contentType || match[1];
      data = base64.replace(/^data:([^;]+);base64,/, '');
    }
  }

  // Convert base64 to Blob
  const byteCharacters = atob(data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  const file = new File([blob], filename, { type: contentType });

  return uploadFile(file, options);
}

/**
 * Upload from a URL (fetches and stores)
 *
 * @param url - URL to fetch from
 * @param filename - Filename to use
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadFromUrl(
  url: string,
  filename: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type });

    return uploadFile(file, options);
  } catch (error) {
    logger.error('Upload from URL error', error, 'Storage');
    throw error;
  }
}

// ============================================================================
// PUBLIC API - DOWNLOAD
// ============================================================================

/**
 * Get download URL for a file
 *
 * @param path - Storage path
 * @returns Download URL
 */
export async function getDownloadUrl(path: string): Promise<string> {
  const storageRef = getStorageRef(path);
  return getDownloadURL(storageRef);
}

/**
 * Get metadata for a file
 *
 * @param path - Storage path
 * @returns File metadata
 */
export async function getFileMetadata(path: string): Promise<FileMetadata> {
  const storageRef = getStorageRef(path);
  return getMetadata(storageRef);
}

/**
 * List all files in a folder
 *
 * @param folderPath - Folder path
 * @returns Array of file metadata
 */
export async function listFiles(folderPath: string): Promise<FullMetadata[]> {
  const storageRef = getStorageRef(folderPath);
  const result = await listAll(storageRef);
  return result.items.map((item) => item);
}

// ============================================================================
// PUBLIC API - DELETE
// ============================================================================

/**
 * Delete a file
 *
 * @param path - Storage path
 * @returns Promise that resolves when deleted
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = getStorageRef(path);
  await deleteObject(storageRef);
}

/**
 * Delete multiple files
 *
 * @param paths - Array of storage paths
 * @returns Promise that resolves when all deleted
 */
export async function deleteFiles(paths: string[]): Promise<void> {
  await Promise.all(paths.map((path) => deleteFile(path)));
}

/**
 * Delete all files in a folder
 *
 * @param folderPath - Folder path
 * @returns Number of files deleted
 */
export async function deleteFolder(folderPath: string): Promise<number> {
  const storageRef = getStorageRef(folderPath);
  const result = await listAll(storageRef);

  // Delete all items
  await Promise.all(result.items.map((item) => deleteObject(item)));

  // Recursively delete subfolders
  for (const folder of result.prefixes) {
    await deleteFolder(folder.fullPath);
  }

  return result.items.length;
}

// ============================================================================
// PUBLIC API - METADATA
// ============================================================================

/**
 * Update file metadata
 *
 * @param path - Storage path
 * @param metadata - New metadata
 * @returns Promise that resolves when updated
 */
export async function updateFileMetadata(
  path: string,
  metadata: { customMetadata?: Record<string, string> }
): Promise<void> {
  const storageRef = getStorageRef(path);
  await updateMetadata(storageRef, metadata);
}

// ============================================================================
// PUBLIC API - UTILITY
// ============================================================================

/**
 * Get storage statistics for a folder
 *
 * @param folderPath - Folder path to analyze
 * @returns Storage statistics
 */
export async function getStorageStats(folderPath: string): Promise<StorageStats> {
  const files = await listFiles(folderPath);

  const stats: StorageStats = {
    totalFiles: files.length,
    totalSize: 0,
    filesByType: {},
  };

  for (const file of files) {
    stats.totalSize += file.size || 0;

    const contentType = file.contentType || 'unknown';
    stats.filesByType[contentType] = (stats.filesByType[contentType] || 0) + 1;
  }

  return stats;
}

/**
 * Copy a file to a new location
 *
 * @param sourcePath - Source file path
 * @param destinationPath - Destination file path
 * @returns Download URL of the new file
 */
export async function copyFile(
  sourcePath: string,
  destinationPath: string
): Promise<string> {
  // Firebase Storage doesn't have a native copy operation
  // We need to download and re-upload
  const sourceUrl = await getDownloadUrl(sourcePath);
  const filename = destinationPath.split('/').pop() || 'copy';

  const result = await uploadFromUrl(sourceUrl, filename, {
    folder: destinationPath.split('/').slice(0, -1).join('/'),
  });

  return result.url;
}

/**
 * Move a file to a new location
 *
 * @param sourcePath - Source file path
 * @param destinationPath - Destination file path
 * @returns Download URL of the moved file
 */
export async function moveFile(
  sourcePath: string,
  destinationPath: string
): Promise<string> {
  const url = await copyFile(sourcePath, destinationPath);
  await deleteFile(sourcePath);
  return url;
}

// ============================================================================
// PUBLIC API - LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy function to replace uploadToBlob
 * Maintains backward compatibility with existing code
 */
export async function uploadToBlob(
  file: File,
  folder: string = 'uploads'
): Promise<string> {
  const result = await uploadFile(file, { folder, public: true });
  return result.url;
}

/**
 * Legacy function name for uploadToFirebase
 * Maintains backward compatibility
 */
export async function uploadToFirebase(
  file: File,
  folder: string = 'documents'
): Promise<string> {
  const result = await uploadFile(file, { folder });
  return result.url;
}
