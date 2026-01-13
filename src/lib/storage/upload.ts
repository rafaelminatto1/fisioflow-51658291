import { upload } from '@vercel/blob/client';

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
 * Helper to determine storage strategy
 */
export function getStorageStrategy(fileType: 'video' | 'image' | 'document') {
    if (fileType === 'video' || fileType === 'image') {
        return 'vercel-blob'; // High performance CDN
    }
    return 'supabase'; // Secure documents
}
