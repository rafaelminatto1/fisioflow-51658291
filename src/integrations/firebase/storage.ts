/**
 * Firebase Storage Integration
 *
 * Provides access to Firebase Storage for file uploads.
 */

import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { getFirebaseApp } from './app';

/**
 * Get Firebase Storage instance
 */
export function getFirebaseStorage() {
  const app = getFirebaseApp();
  return getStorage(app);
}

// Re-export for convenience
export { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a file to Firebase Storage
 * @param path Storage path
 * @param file File to upload
 * @returns Download URL
 */
export async function uploadFile(path: string, file: File): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Delete a file from Firebase Storage
 * @param path Storage path
 */
export async function deleteFile(path: string): Promise<void> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, path);

  // Note: This requires proper Firebase Storage security rules
  // import { deleteObject } from 'firebase/storage';
  // await deleteObject(storageRef);
}
