import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase/config';
import { STORAGE_PATHS, STORAGE_LIMITS } from '@fisioflow/shared-constants';

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  metadata?: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  };
}

export class StorageUpload {
  static async uploadPatientPhoto(
    patientId: string,
    file: File | Blob,
    filename: string,
    options?: UploadOptions
  ): Promise<string> {
    const storageRef = ref(storage, `${STORAGE_PATHS.PATIENT_PHOTOS(patientId)}/${filename}`);
    return this.uploadFile(storageRef, file, options);
  }

  static async uploadExerciseVideo(
    exerciseId: string,
    file: File | Blob,
    filename: string,
    options?: UploadOptions
  ): Promise<string> {
    const storageRef = ref(storage, `${STORAGE_PATHS.EXERCISE_VIDEOS(exerciseId)}/${filename}`);
    return this.uploadFile(storageRef, file, options);
  }

  static async uploadSessionVideo(
    sessionId: string,
    file: File | Blob,
    filename: string,
    options?: UploadOptions
  ): Promise<string> {
    const storageRef = ref(storage, `${STORAGE_PATHS.SESSION_VIDEOS(sessionId)}/${filename}`);
    return this.uploadFile(storageRef, file, options);
  }

  static async uploadEvaluationAttachment(
    evaluationId: string,
    file: File | Blob,
    filename: string,
    options?: UploadOptions
  ): Promise<string> {
    const storageRef = ref(storage, `${STORAGE_PATHS.EVALUATION_ATTACHMENTS(evaluationId)}/${filename}`);
    return this.uploadFile(storageRef, file, options);
  }

  static async uploadUserProfile(
    userId: string,
    file: File | Blob,
    filename: string,
    options?: UploadOptions
  ): Promise<string> {
    const storageRef = ref(storage, `${STORAGE_PATHS.USER_PROFILE(userId)}/${filename}`);
    return this.uploadFile(storageRef, file, options);
  }

  private static async uploadFile(
    storageRef: any,
    file: File | Blob,
    options?: UploadOptions
  ): Promise<string> {
    // Check file size
    if (file instanceof File && file.size > STORAGE_LIMITS.MAX_VIDEO_SIZE) {
      throw new Error('File too large');
    }

    // Use resumable upload for better progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: options?.metadata?.contentType || 'application/octet-stream',
      customMetadata: options?.metadata?.customMetadata,
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: any) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          options?.onProgress?.(progress);
        },
        (error: any) => {
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  }

  static async deleteFile(fileUrl: string): Promise<void> {
    const storageRef = ref(storage, fileUrl);
    // Note: This requires the storageRef to be created from the URL
    // In production, you might want to store the full path instead of just the URL
  }
}
