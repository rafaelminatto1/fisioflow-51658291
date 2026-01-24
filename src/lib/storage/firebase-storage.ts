/**
 * Firebase Storage Client
 * Cliente para upload e download de arquivos no Firebase Storage
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  FullMetadata,
  UploadMetadata,
  UploadTask,
  StorageReference,
} from 'firebase/storage';

import { getFirebaseStorage } from '@/integrations/firebase/app';

/**
 * Buckets do Firebase Storage para FisioFlow
 */
export const STORAGE_BUCKETS = {
  /** Vídeos de exercícios */
  EXERCISE_VIDEOS: 'exercise-videos',

  /** Thumbnails de exercícios */
  EXERCISE_THUMBNAILS: 'exercise-thumbnails',

  /** Fotos de perfil/avatar */
  AVATARS: 'avatars',

  /** Comprovantes de pagamento */
  RECEIPTS: 'comprovantes',

  /** Prontuários e documentos médicos */
  MEDICAL_RECORDS: 'prontuarios',

  /** Fotos de evolução do paciente */
  PROGRESS_PHOTOS: 'evolucao',

  /** Documentos diversos */
  DOCUMENTS: 'documentos',
};

/**
 * Opções de upload
 */
export interface UploadOptions {
  /** Tipo MIME do arquivo */
  contentType?: string;

  /** Metadados customizados */
  customMetadata?: Record<string, string>;

  /** Mostrar progresso */
  onProgress?: (progress: number) => void;

  /** Callback de erro */
  onError?: (error: Error) => void;

  /** Callback de conclusão */
  onComplete?: (url: string) => void;

  /** Tornar arquivo público */
  public?: boolean;
}

/**
 * Resultado de upload
 */
export interface UploadResult {
  /** URL pública do arquivo */
  url: string;

  /** Referência do arquivo */
  ref: StorageReference;

  /** Metadados do arquivo */
  metadata: FullMetadata;
}

/**
 * Cliente Firebase Storage
 */
class FirebaseStorageClient {
  private storage = getFirebaseStorage();

  /**
   * Faz upload de um arquivo
   *
   * @param bucket - Nome do bucket
   * @param path - Caminho dentro do bucket
   * @param file - Arquivo para upload (Blob, File, Uint8Array)
   * @param options - Opções de upload
   * @returns URL do arquivo
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Blob | Uint8Array | File,
    options: UploadOptions = {}
  ): Promise<string> {
    const storageRef = ref(this.storage, `${bucket}/${path}`);

    const metadata: UploadMetadata = {};
    if (options.contentType) {
      metadata.contentType = options.contentType;
    }
    if (options.customMetadata) {
      metadata.customMetadata = options.customMetadata;
    }

    // Upload simples (sem progresso)
    if (!options.onProgress) {
      await uploadBytes(storageRef, file, metadata);
      return getDownloadURL(storageRef);
    }

    // Upload com progresso
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          options.onProgress?.(progress);
        },
        (error) => {
          options.onError?.(error);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(storageRef);
          options.onComplete?.(url);
          resolve(url);
        }
      );
    });
  }

  /**
   * Faz upload retornando resultado completo
   */
  async uploadFileWithResult(
    bucket: string,
    path: string,
    file: Blob | Uint8Array | File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const storageRef = ref(this.storage, `${bucket}/${path}`);

    const metadata: UploadMetadata = {};
    if (options.contentType) {
      metadata.contentType = options.contentType;
    }
    if (options.customMetadata) {
      metadata.customMetadata = options.customMetadata;
    }

    await uploadBytes(storageRef, file, metadata);

    const [url, meta] = await Promise.all([
      getDownloadURL(storageRef),
      getMetadata(storageRef),
    ]);

    return {
      url,
      ref: storageRef,
      metadata: meta,
    };
  }

  /**
   * Faz upload de arquivo retornando task para controle
   */
  uploadFileResumable(
    bucket: string,
    path: string,
    file: Blob | Uint8Array | File,
    options: UploadOptions = {}
  ): UploadTask {
    const storageRef = ref(this.storage, `${bucket}/${path}`);

    const metadata: UploadMetadata = {};
    if (options.contentType) {
      metadata.contentType = options.contentType;
    }
    if (options.customMetadata) {
      metadata.customMetadata = options.customMetadata;
    }

    return uploadBytesResumable(storageRef, file, metadata);
  }

  /**
   * Obtém URL pública de um arquivo
   *
   * @param bucket - Nome do bucket
   * @param path - Caminho do arquivo
   * @returns URL pública
   */
  async getPublicUrl(bucket: string, path: string): Promise<string> {
    const storageRef = ref(this.storage, `${bucket}/${path}`);
    return getDownloadURL(storageRef);
  }

  /**
   * Deleta um arquivo
   *
   * @param bucket - Nome do bucket
   * @param path - Caminho do arquivo
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const storageRef = ref(this.storage, `${bucket}/${path}`);
    await deleteObject(storageRef);
  }

  /**
   * Lista todos os arquivos em um caminho
   *
   * @param bucket - Nome do bucket
   * @param path - Caminho para listar
   * @returns Lista de arquivos
   */
  async listFiles(bucket: string, path: string = ''): Promise<string[]> {
    const storageRef = ref(this.storage, `${bucket}/${path}`);
    const result = await listAll(storageRef);

    return result.items.map((item) => item.fullPath);
  }

  /**
   * Lista todos os arquivos com detalhes
   */
  async listFilesWithMetadata(
    bucket: string,
    path: string = ''
  ): Promise<Array<{ name: string; url: string; metadata: FullMetadata }>> {
    const storageRef = ref(this.storage, `${bucket}/${path}`);
    const result = await listAll(storageRef);

    const files = await Promise.all(
      result.items.map(async (item) => {
        const [url, metadata] = await Promise.all([
          getDownloadURL(item),
          getMetadata(item),
        ]);

        return {
          name: item.name,
          url,
          metadata,
        };
      })
    );

    return files;
  }

  /**
   * Obtém metadados de um arquivo
   *
   * @param bucket - Nome do bucket
   * @param path - Caminho do arquivo
   * @returns Metadados do arquivo
   */
  async getFileMetadata(bucket: string, path: string): Promise<FullMetadata> {
    const storageRef = ref(this.storage, `${bucket}/${path}`);
    return getMetadata(storageRef);
  }

  /**
   * Upload de avatar de usuário
   */
  async uploadAvatar(
    userId: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    // Usar timestamp para evitar cache
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const path = `${userId}/${timestamp}.${ext}`;

    return this.uploadFile(STORAGE_BUCKETS.AVATARS, path, file, {
      contentType: file.type,
      public: true,
      ...options,
    });
  }

  /**
   * Upload de vídeo de exercício
   */
  async uploadExerciseVideo(
    exerciseId: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${exerciseId}.${ext}`;

    return this.uploadFile(STORAGE_BUCKETS.EXERCISE_VIDEOS, path, file, {
      contentType: file.type,
      public: true,
      customMetadata: {
        exerciseId,
        uploadedAt: new Date().toISOString(),
      },
      ...options,
    });
  }

  /**
   * Upload de thumbnail de exercício
   */
  async uploadExerciseThumbnail(
    exerciseId: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${exerciseId}.${ext}`;

    return this.uploadFile(STORAGE_BUCKETS.EXERCISE_THUMBNAILS, path, file, {
      contentType: file.type,
      public: true,
      ...options,
    });
  }

  /**
   * Upload de comprovante de pagamento
   */
  async uploadPaymentReceipt(
    paymentId: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const path = `${paymentId}/${timestamp}.${ext}`;

    return this.uploadFile(STORAGE_BUCKETS.RECEIPTS, path, file, {
      contentType: file.type,
      ...options,
    });
  }

  /**
   * Upload de foto de evolução
   */
  async uploadProgressPhoto(
    patientId: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const path = `${patientId}/${timestamp}.${ext}`;

    return this.uploadFile(STORAGE_BUCKETS.PROGRESS_PHOTOS, path, file, {
      contentType: file.type,
      customMetadata: {
        patientId,
        uploadedAt: new Date().toISOString(),
      },
      ...options,
    });
  }

  /**
   * Upload de documento do prontuário
   */
  async uploadMedicalDocument(
    patientId: string,
    category: string,
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const path = `${patientId}/${category}/${timestamp}.${ext}`;

    return this.uploadFile(STORAGE_BUCKETS.MEDICAL_RECORDS, path, file, {
      contentType: file.type,
      customMetadata: {
        patientId,
        category,
        uploadedAt: new Date().toISOString(),
      },
      ...options,
    });
  }

  /**
   * Obtém a referência de um arquivo
   */
  getRef(bucket: string, path: string): StorageReference {
    return ref(this.storage, `${bucket}/${path}`);
  }
}

// Instância singleton
let storageClientInstance: FirebaseStorageClient | null = null;

/**
 * Obtém o cliente de storage
 */
export function getStorageClient(): FirebaseStorageClient {
  if (!storageClientInstance) {
    storageClientInstance = new FirebaseStorageClient();
  }
  return storageClientInstance;
}

/**
 * Funções de conveniência exportadas
 */
export const storageClient = getStorageClient();

export async function uploadFile(
  bucket: string,
  path: string,
  file: Blob | Uint8Array | File,
  options?: UploadOptions
): Promise<string> {
  return storageClient.uploadFile(bucket, path, file, options);
}

export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  return storageClient.getPublicUrl(bucket, path);
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  return storageClient.deleteFile(bucket, path);
}

export async function listFiles(
  bucket: string,
  path?: string
): Promise<string[]> {
  return storageClient.listFiles(bucket, path);
}

export default storageClient;
