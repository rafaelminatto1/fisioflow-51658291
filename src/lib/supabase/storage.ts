import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  maxSize?: number; // em MB
  allowedTypes?: string[];
}

export interface UploadResult {
  success: boolean;
  data?: {
    path: string;
    publicUrl: string;
    fileName: string;
    size: number;
  };
  error?: string;
}

// Configurações padrão para diferentes tipos de upload
export const STORAGE_BUCKETS = {
  PATIENT_DOCUMENTS: 'patient-documents',
  EXERCISE_MEDIA: 'exercise-media',
  PROFILE_AVATARS: 'profile-avatars',
  TREATMENT_FILES: 'treatment-files'
} as const;

export const UPLOAD_CONFIGS = {
  [STORAGE_BUCKETS.PATIENT_DOCUMENTS]: {
    maxSize: 10, // 10MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  [STORAGE_BUCKETS.EXERCISE_MEDIA]: {
    maxSize: 50, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'video/webm']
  },
  [STORAGE_BUCKETS.PROFILE_AVATARS]: {
    maxSize: 2, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg']
  },
  [STORAGE_BUCKETS.TREATMENT_FILES]: {
    maxSize: 20, // 20MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain']
  }
};

/**
 * Valida um arquivo antes do upload
 */
export function validateFile(file: File, config: { maxSize: number; allowedTypes: string[] }): { valid: boolean; error?: string } {
  // Verificar tamanho
  const maxSizeBytes = config.maxSize * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${config.maxSize}MB`
    };
  }

  // Verificar tipo
  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${config.allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Gera um nome único para o arquivo
 */
export function generateFileName(originalName: string, folder?: string): string {
  const extension = originalName.split('.').pop();
  const uuid = uuidv4();
  const timestamp = Date.now();
  const fileName = `${uuid}_${timestamp}.${extension}`;
  
  return folder ? `${folder}/${fileName}` : fileName;
}

/**
 * Faz upload de um arquivo para o Supabase Storage
 */
export async function uploadFile(file: File, options: UploadOptions): Promise<UploadResult> {
  try {
    // Obter configuração do bucket
    const config = UPLOAD_CONFIGS[options.bucket as keyof typeof UPLOAD_CONFIGS];
    if (!config) {
      return {
        success: false,
        error: 'Bucket não configurado'
      };
    }

    // Validar arquivo
    const validation = validateFile(file, {
      maxSize: options.maxSize || config.maxSize,
      allowedTypes: options.allowedTypes || config.allowedTypes
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Gerar nome do arquivo
    const fileName = options.fileName || generateFileName(file.name, options.folder);

    // Fazer upload
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      data: {
        path: data.path,
        publicUrl: publicUrlData.publicUrl,
        fileName: file.name,
        size: file.size
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no upload'
    };
  }
}

/**
 * Remove um arquivo do Supabase Storage
 */
export async function deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao deletar arquivo'
    };
  }
}

/**
 * Lista arquivos de uma pasta
 */
export async function listFiles(bucket: string, folder?: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        offset: 0
      });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: data || []
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar arquivos'
    };
  }
}

/**
 * Obtém URL de download temporária para arquivos privados
 */
export async function getDownloadUrl(bucket: string, path: string, expiresIn: number = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar URL de download'
    };
  }
}