/**
 * Cloud Function to proxy exercise images from Firebase Storage
 * This bypasses CORS issues and provides a reliable way to serve images
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';

export const exerciseImageProxy = onRequest(
  {
    region: 'southamerica-east1',
    memory: '256MiB',
    maxInstances: 50,
    cors: true,
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
      // Extract image path from URL: /api/exercise-image/:encodedPath
      // Normalize to string (Express query can be string | ParsedQs | string[])
      const raw = request.params[0] || request.query.path;
      const encodedPath =
        typeof raw === 'string' ? raw : Array.isArray(raw) ? String(raw[0] ?? '') : '';

      if (!encodedPath) {
        response.status(400).send('Bad Request: Missing image path');
        return;
      }

      // Decode the path (it might be double-encoded)
      let imagePath: string;
      try {
        imagePath = decodeURIComponent(encodedPath);
        // If still encoded, decode again
        if (imagePath.includes('%')) {
          imagePath = decodeURIComponent(imagePath);
        }
      } catch {
        imagePath = encodedPath;
      }

      // Validate path format (should be exercise-media/{id}/{filename})
      if (!imagePath.startsWith('exercise-media/')) {
        response.status(400).send('Bad Request: Invalid image path format');
        return;
      }

      // Get the bucket
      const bucketName = process.env.STORAGE_BUCKET_NAME || 'fisioflow-migration.firebasestorage.app';
      const bucket = getStorage().bucket(`gs://${bucketName}`);

      // Get the file
      const file = bucket.file(imagePath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
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

      // Stream the file to response
      const stream = file.createReadStream();
      stream.pipe(response);

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
