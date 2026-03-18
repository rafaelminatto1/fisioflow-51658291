/**
 * Image Optimizer Utilities
 * Helper functions for optimized image loading and caching
 */

import { ImageURISource } from 'react-native';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Get optimized image source with cache and resize options
 */
export function getOptimizedImageSource(
  uri: string,
  options: ImageOptimizationOptions = {}
): ImageURISource {
  const { width, height, quality = 0.8 } = options;

  return {
    uri,
    cache: 'force-cache',
    width,
    height,
  };
}

/**
 * Generate a thumbnail URL from an image URL
 * Assumes the API supports query parameters for resizing
 */
export function generateThumbnailUrl(
  originalUrl: string,
  width: number = 200,
  height: number = 200
): string {
  try {
    const url = new URL(originalUrl);
    url.searchParams.set('w', width.toString());
    url.searchParams.set('h', height.toString());
    url.searchParams.set('fit', 'cover');
    url.searchParams.set('q', '80');
    return url.toString();
  } catch {
    return originalUrl;
  }
}

/**
 * Get the appropriate image size based on container dimensions
 */
export function getImageSizeForContainer(
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } {
  const scale = 2; // 2x for Retina displays
  
  return {
    width: Math.round(containerWidth * scale),
    height: Math.round(containerHeight * scale),
  };
}

/**
 * Check if image is a valid URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get image dimensions from URL (if available in URL path)
 */
export function extractImageDimensions(url: string): { width?: number; height?: number } | null {
  try {
    const urlObj = new URL(url);
    const width = urlObj.searchParams.get('w');
    const height = urlObj.searchParams.get('h');
    
    if (width && height) {
      return {
        width: parseInt(width, 10),
        height: parseInt(height, 10),
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Get fallback avatar for a user based on name
 */
export function getAvatarFallback(name: string, size: number = 100): string {
  const firstLetter = name?.charAt(0)?.toUpperCase() || 'U';
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#0D9488"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-size="${size * 0.4}" font-family="Arial" fill="white" font-weight="bold">
        ${firstLetter}
      </text>
    </svg>
  `)}`;
}
