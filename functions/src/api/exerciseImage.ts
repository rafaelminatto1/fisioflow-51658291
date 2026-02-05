/**
 * Cloud Function to proxy exercise images from Firebase Storage
 * This bypasses CORS issues and provides a reliable way to serve images
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { CORS_ORIGINS } from '../init';

export const exerciseImageProxy = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 50,
    cors: CORS_ORIGINS,
    invoker: 'public',
  },
  async (request, response) => {
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache

    // Handle OPTIONS preflight request
    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    // Only GET requests allowed
    if (request.method !== 'GET') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Extract image path from URL: /api/exercise-image/{path}
      // The path can be either:
      // - id/filename (new format, without exercise-media prefix)
      // - exercise-media/id/filename (old format, with prefix)
      const fullPath = request.path || '';
      console.log('Exercise image proxy - fullPath:', fullPath);

      let pathSegment = fullPath.replace('/api/exercise-image/', '');
      console.log('Exercise image proxy - pathSegment:', pathSegment);

      if (!pathSegment) {
        response.status(400).send('Bad Request: Missing image path');
        return;
      }

      // Decode the path if it's URL-encoded
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(pathSegment);
        // If still encoded, decode again
        if (decodedPath.includes('%')) {
          decodedPath = decodeURIComponent(decodedPath);
        }
      } catch {
        decodedPath = pathSegment;
      }

      console.log('Exercise image proxy - decodedPath:', decodedPath);

      // Ensure the path starts with 'exercise-media/'
      let imagePath: string;
      if (decodedPath.startsWith('exercise-media/')) {
        imagePath = decodedPath;
      } else {
        imagePath = 'exercise-media/' + decodedPath;
      }

      console.log('Exercise image proxy - imagePath:', imagePath);

      // Get the bucket
      const bucketName = process.env.STORAGE_BUCKET_NAME || 'fisioflow-migration.firebasestorage.app';
      console.log('Exercise image proxy - bucketName:', bucketName);
      const bucket = getStorage().bucket(`gs://${bucketName}`);

      // Get the file
      const file = bucket.file(imagePath);
      console.log('Exercise image proxy - file path:', imagePath);

      // Check if file exists
      const [exists] = await file.exists();
      console.log('Exercise image proxy - file exists:', exists);
      if (!exists) {
        console.log('Exercise image proxy - file not found:', imagePath);
        response.status(404).send('Not Found');
        return;
      }

      // Set content type based on file extension
      const extension = imagePath.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'avif': 'image/avif',
        'svg': 'image/svg+xml',
      };
      const contentType = contentTypes[extension || ''] || 'image/png';
      response.set('Content-Type', contentType);
      console.log('Exercise image proxy - content type:', contentType);

      // Stream the file to response
      console.log('Exercise image proxy - starting stream');
      const stream = file.createReadStream();
      stream.pipe(response);
      console.log('Exercise image proxy - stream piped');

      stream.on('error', (error) => {
        console.error('Error streaming image:', error);
        if (!response.headersSent) {
          response.status(500).send('Internal Server Error');
        }
      });

    } catch (error) {
      console.error('Error serving exercise image:', error);
      if (!response.headersSent) {
        response.status(500).send('Internal Server Error');
      }
    }
  }
);

/**
 * Helper function to convert Firebase Storage URL to proxy URL
 * @param storageUrl - The Firebase Storage URL
 * @returns The proxy URL
 */
export function toProxyUrl(storageUrl: string): string {
  try {
    // Parse Firebase Storage URL
    // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
    const url = new URL(storageUrl);
    const pathMatch = url.pathname.match(/\/o\/([^?]+)/);

    if (pathMatch) {
      const encodedPath = pathMatch[1];
      // In production: https://moocafisio.com.br/api/exercise-image/{path}
      // In dev: http://localhost:5001/{project}/us-central1/exerciseImageProxy
      return `/api/exercise-image/${encodedPath}`;
    }

    return storageUrl;
  } catch {
    return storageUrl;
  }
}
