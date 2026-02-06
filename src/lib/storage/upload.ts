/**
 * File Upload Service - Migrated to Firebase Storage
 *
 * Migration from Vercel Blob to Firebase Storage:
 * - uploadToBlob() → uploadFile() with public option
 * - uploadToFirebase() → uploadFile()
 * - All uploads now go through Firebase Storage
 *
 * @version 2.0.0 - Firebase Storage (replaces Vercel Blob)
 *
 * @deprecated Import from @/lib/firebase/storage instead
 * This file is kept for backward compatibility
 */
import {

  uploadFile,
  uploadFiles,
  uploadBase64,
  uploadFromUrl,
  getDownloadUrl,
  deleteFile,
  deleteFiles,
  deleteFolder,
  getFileMetadata,
  listFiles,
  updateFileMetadata,
  getStorageStats,
  copyFile,
  moveFile,
  STORAGE_FOLDERS,
  SIZE_LIMITS,
  type UploadOptions,
  type UploadResult,
  type StorageStats,
} from '@/lib/firebase/storage';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

// Upload functions
export { uploadFile, uploadFiles, uploadBase64, uploadFromUrl };

// Download functions
export { getDownloadUrl, getFileMetadata, listFiles };

// Delete functions
export { deleteFile, deleteFiles, deleteFolder };

// Metadata functions
export { updateFileMetadata, getStorageStats };

// Utility functions
export { copyFile, moveFile };

// Types
export type { UploadOptions, UploadResult, StorageStats };

// Constants
export { STORAGE_FOLDERS, SIZE_LIMITS };

// ============================================================================
// LEGACY FUNCTIONS (deprecated, maintained for compatibility)
// ============================================================================

/**
 * @deprecated Use uploadFile() with { public: true } instead
 */
export async function uploadToBlob(file: File, folder: string = 'uploads') {
  logger.warn('[uploadToBlob] Deprecated - use uploadFile() with { public: true }', undefined, 'upload');
  return uploadFile(file, { folder, public: true });
}

/**
 * @deprecated Use uploadFile() instead
 */
export async function uploadToFirebase(file: File, folder: string = 'documents') {
  logger.warn('[uploadToFirebase] Deprecated - use uploadFile()', undefined, 'upload');
  return uploadFile(file, { folder });
}

/**
 * @deprecated All uploads now use Firebase Storage
 */
export function getStorageStrategy(_fileType: 'video' | 'image' | 'document'): 'firebase' {
  // All uploads now go through Firebase Storage
  // Public/private is controlled by the 'public' option
  return 'firebase';
}

// ============================================================================
// EXPORT EVERYTHING FROM FIREBASE STORAGE
// ============================================================================

// This allows a smooth migration:
// Old code: import { uploadToBlob } from '@/lib/storage/upload'
// New code: import { uploadFile } from '@/lib/firebase/storage'

export {
  // Upload
  uploadFile,
  uploadFiles,
  uploadBase64,
  uploadFromUrl,

  // Download
  getDownloadUrl,
  getFileMetadata,
  listFiles,

  // Delete
  deleteFile,
  deleteFiles,
  deleteFolder,

  // Metadata
  updateFileMetadata,
  getStorageStats,

  // Utility
  copyFile,
  moveFile,

  // Types
  type UploadOptions,
  type UploadResult,
  type StorageStats,

  // Constants
  STORAGE_FOLDERS,
  SIZE_LIMITS,
} from '@/lib/firebase/storage';
