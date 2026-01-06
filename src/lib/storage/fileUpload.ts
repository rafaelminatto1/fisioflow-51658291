import { supabase } from '@/integrations/supabase/client';

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

// Short-lived signed URL expiration times per bucket (in seconds)
// Following LGPD compliance and principle of least privilege
const SIGNED_URL_EXPIRY: Record<StorageBucket, number> = {
  avatars: 3600,       // 1 hour (public bucket, but fallback)
  prontuarios: 3600,   // 1 hour - view during clinical session
  comprovantes: 7200,  // 2 hours - download financial receipt
  evolucao: 1800,      // 30 min - quick evolution photo check
};

export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const bucketLimits = BUCKET_LIMITS[options.bucket];

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
  const { data: { user } } = await supabase.auth.getUser();
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
    filePath = `${user.id}/avatar.${fileExt}`;
  } else {
    const folder = options.folder || 'geral';
    filePath = `${user.id}/${folder}/${timestamp}_${sanitizedName}`;
  }

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(options.bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: options.bucket === 'avatars',
    });

  if (error) throw error;

  // Get URL
  let publicUrl: string;
  
  if (options.bucket === 'avatars') {
    const { data: urlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(filePath);
    publicUrl = urlData.publicUrl;
  } else {
    // Use short-lived signed URLs for security (LGPD compliance)
    const expiresIn = SIGNED_URL_EXPIRY[options.bucket] || 3600;
    const { data: urlData, error: urlError } = await supabase.storage
      .from(options.bucket)
      .createSignedUrl(filePath, expiresIn);
    
    if (urlError) throw urlError;
    publicUrl = urlData.signedUrl;
  }

  return {
    url: publicUrl,
    path: data.path,
    fullPath: `${options.bucket}/${data.path}`,
  };
}

export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}

export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;

  return data.signedUrl;
}
