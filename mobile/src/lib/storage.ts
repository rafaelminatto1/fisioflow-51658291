import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../config/firebase';

const storage = getStorage(app);

export async function uploadFile(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  
  return await getDownloadURL(storageRef);
}
