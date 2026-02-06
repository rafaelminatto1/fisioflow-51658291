import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getStorage
} from 'firebase/storage';
import { auth } from '@/integrations/firebase/app';

export type StorageBucket = 'avatars' | 'comprovantes' | 'prontuarios' | 'evolucao';

export interface UploadOptions {
  bucket: StorageBucket;
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  url: string;
  path: string;
  fullPath: string;
}

const BUCKET_LIMITS = {
  avatars: {
    maxSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  comprovantes: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  prontuarios: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime'],
  },
  evolucao: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const bucketLimits = BUCKET_LIMITS[options.bucket];
  const storage = getStorage();

  // Validate file size
  const maxSize = options.maxSize || bucketLimits.maxSize;
  if (file.size > maxSize) {
    throw new Error(
      `Arquivo muito grande. Tamanho máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`
    );
  }

  // Validate file type
  const allowedTypes = options.allowedTypes || bucketLimits.allowedTypes;
  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    );
  }

  // Get current user
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Generate file path
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 50);

  let filePath: string;

  if (options.bucket === 'avatars') {
    filePath = `avatars/${user.uid}/avatar.${fileExt}`;
  } else {
    const folder = options.folder || 'geral';
    filePath = `${options.bucket}/${user.uid}/${folder}/${timestamp}_${sanitizedName}`;
  }

  // Create storage reference
  const storageRef = ref(storage, filePath);

  // Upload with progress
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (options.onProgress) options.onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          url: downloadURL,
          path: filePath,
          fullPath: filePath, // Firebase fullPath is just the path from root
        });
      }
    );
  });
}

export async function deleteFile(_bucket: StorageBucket, path: string): Promise<void> {
  const storage = getStorage();
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Get a temporary access URL. In Firebase Storage, default getDownloadURL() 
 * is practically a permanent link unless signed URLs are used via Admin SDK.
 * For client-side, we use getDownloadURL but we can wrap it for consistency.
 */
export async function getSignedUrl(
  _bucket: StorageBucket,
  path: string,
  _expiresIn: number = 3600
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}
