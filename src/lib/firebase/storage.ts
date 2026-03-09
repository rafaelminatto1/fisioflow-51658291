/**
 * Storage Service — Cloudflare R2
 *
 * API idêntica ao módulo anterior (Firebase Storage), agora usando R2.
 * Componentes existentes continuam importando daqui sem mudança.
 */
import { uploadToR2, deleteFromR2 } from '@/lib/storage/r2-storage';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES (mantidos para compatibilidade)
// ============================================================================

export interface UploadOptions {
  folder?: string;
  public?: boolean;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  resumable?: boolean;
  onProgress?: (progress: number) => void;
  retry?: boolean;
  includeUserIdPath?: boolean;
}

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  contentType: string;
  createdAt: Date;
}

// ============================================================================
// CONSTANTS (mantidos para compatibilidade)
// ============================================================================

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

export const SIZE_LIMITS = {
  SMALL: 5 * 1024 * 1024,
  MEDIUM: 50 * 1024 * 1024,
  LARGE: 500 * 1024 * 1024,
  MAXIMUM: 5 * 1024 * 1024 * 1024,
} as const;

// ============================================================================
// UPLOAD
// ============================================================================

export async function uploadFile(file: File, options: UploadOptions = {}): Promise<UploadResult> {
  const folder = options.folder ?? STORAGE_FOLDERS.UPLOADS;
  try {
    const result = await uploadToR2(file, folder, { onProgress: options.onProgress });
    return { url: result.url, path: result.path, name: result.name, size: result.size, contentType: result.contentType, createdAt: result.createdAt };
  } catch (error) {
    logger.error('[storage] uploadFile error', error, 'Storage');
    throw error;
  }
}

export async function uploadFiles(files: File[], options: UploadOptions = {}): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  for (let i = 0; i < files.length; i++) {
    try {
      results.push(await uploadFile(files[i], { ...options, onProgress: (p) => options.onProgress?.((i * 100 + p) / files.length) }));
    } catch (error) {
      logger.error(`[storage] uploadFiles: falha no arquivo ${i + 1}`, error, 'Storage');
    }
  }
  return results;
}

export async function uploadBase64(base64: string, filename: string, options: UploadOptions = {}): Promise<UploadResult> {
  let data = base64;
  let contentType = options.contentType;
  if (base64.startsWith('data:')) {
    const match = base64.match(/^data:([^;]+);base64,/);
    if (match) { contentType = contentType ?? match[1]; data = base64.replace(/^data:[^;]+;base64,/, ''); }
  }
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const file = new File([new Blob([arr], { type: contentType })], filename, { type: contentType });
  return uploadFile(file, options);
}

// ============================================================================
// DELETE
// ============================================================================

export async function deleteFile(path: string): Promise<void> {
  try { await deleteFromR2(path); }
  catch (error) { logger.error('[storage] deleteFile error', error, 'Storage'); throw error; }
}

export async function deleteFiles(paths: string[]): Promise<void> {
  await Promise.allSettled(paths.map((p) => deleteFromR2(p)));
}

// ============================================================================
// STUBS de compatibilidade
// ============================================================================

/** R2 files são públicos — retorna path/url diretamente. */
export async function getDownloadUrl(path: string): Promise<string> { return path; }

/** @deprecated */
export async function uploadToBlob(file: File, folder = 'uploads'): Promise<string> {
  return (await uploadFile(file, { folder, public: true })).url;
}

/** @deprecated */
export async function uploadToFirebase(file: File, folder = 'documents'): Promise<string> {
  return (await uploadFile(file, { folder })).url;
}
