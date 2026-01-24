import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export class StorageDownload {
  static async getPatientPhotoUrl(patientId: string, filename: string): Promise<string> {
    const storageRef = ref(storage, `patients/${patientId}/photos/${filename}`);
    return getDownloadURL(storageRef);
  }

  static async getExerciseVideoUrl(exerciseId: string, filename: string): Promise<string> {
    const storageRef = ref(storage, `exercises/${exerciseId}/${filename}`);
    return getDownloadURL(storageRef);
  }

  static async getDownloadURL(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  }
}
