import { upload } from '@vercel/blob/client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/integrations/firebase/app';

/**
 * Upload a file to Vercel Blob (ideal for public assets like exercise videos)
 */
export async function uploadToBlob(file: File, folder: string = 'uploads') {
    try {
        const filename = `${folder}/${Date.now()}-${file.name}`;

        // Use client-side upload which calls our /api/upload endpoint for auth
        const newBlob = await upload(filename, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
        });

        return newBlob.url;
    } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        throw error;
    }
}

/**
 * Upload a file to Firebase Storage (ideal for secure documents)
 */
export async function uploadToFirebase(file: File, folder: string = 'documents') {
    try {
        const filename = `${folder}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading to Firebase Storage:', error);
        throw error;
    }
}

/**
 * Helper to determine storage strategy
 */
export function getStorageStrategy(fileType: 'video' | 'image' | 'document') {
    if (fileType === 'video' || fileType === 'image') {
        return 'vercel-blob'; // High performance CDN
    }
    return 'firebase'; // Secure documents
}
