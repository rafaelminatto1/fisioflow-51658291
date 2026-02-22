import { useState, useEffect, useCallback, useRef } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { EncryptionService } from '@/lib/services/encryptionService';
import { useAuth } from '@/hooks/useAuth';
import { phiCacheManager, type ClearableCache } from '@/lib/services/phiCacheManager';

/**
 * In-memory cache for decrypted photos
 * Cleared when app goes to background via PHI Cache Manager
 */
class PhotoCache implements ClearableCache {
  private cache: Map<string, string> = new Map();

  set(key: string, uri: string): void {
    this.cache.set(key, uri);
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  clear(): void {
    console.log('[PhotoCache] Clearing decrypted photo cache');
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }
}

const photoCache = new PhotoCache();

// Register photo cache with PHI Cache Manager
phiCacheManager.registerCache('photos', photoCache);

/**
 * Hook for decrypting and displaying patient photos
 * 
 * Features:
 * - Decrypts photos on load from Firebase Storage
 * - Caches decrypted images in memory only
 * - Cache is cleared automatically by PHI Cache Manager after 5 minutes in background
 * - Handles loading and error states
 * 
 * @param encryptedPhotoUrl - Firebase Storage URL or path to encrypted photo
 * @returns Object with decrypted photo URI, loading state, and error
 */
export function usePhotoDecryption(encryptedPhotoUrl?: string | null) {
  const { profile } = useAuth();
  const [decryptedUri, setDecryptedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const encryptionService = useRef(new EncryptionService()).current;

  const decryptPhoto = useCallback(async (photoUrl: string, userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cacheKey = `${userId}_${photoUrl}`;
      if (photoCache.has(cacheKey)) {
        const cachedUri = photoCache.get(cacheKey);
        console.log('[usePhotoDecryption] Using cached decrypted photo');
        setDecryptedUri(cachedUri || null);
        setLoading(false);
        return;
      }

      // Download encrypted photo from Firebase Storage
      const storage = getStorage();
      const photoRef = ref(storage, photoUrl);
      const downloadUrl = await getDownloadURL(photoRef);

      // Fetch encrypted data
      const response = await fetch(downloadUrl);
      const encryptedText = await response.text();

      // Parse encrypted data structure
      // Expected format: JSON with ciphertext, iv, authTag, algorithm, keyId
      let encryptedData;
      try {
        encryptedData = JSON.parse(encryptedText);
      } catch (parseError) {
        // If not JSON, assume it's legacy unencrypted photo
        console.warn('[usePhotoDecryption] Photo is not encrypted, using as-is');
        setDecryptedUri(downloadUrl);
        setLoading(false);
        return;
      }

      // Decrypt the photo
      const decryptedFileUri = await encryptionService.decryptFile(encryptedData, userId);

      // Cache the decrypted URI in memory
      photoCache.set(cacheKey, decryptedFileUri);
      console.log('[usePhotoDecryption] Photo decrypted and cached');

      setDecryptedUri(decryptedFileUri);
    } catch (err) {
      console.error('[usePhotoDecryption] Failed to decrypt photo:', err);
      setError(err as Error);
      setDecryptedUri(null);
    } finally {
      setLoading(false);
    }
  }, [encryptionService]);

  // Decrypt photo when URL or user changes
  useEffect(() => {
    if (!encryptedPhotoUrl || !profile?.id) {
      setDecryptedUri(null);
      setLoading(false);
      return;
    }

    decryptPhoto(encryptedPhotoUrl, profile.id);
  }, [encryptedPhotoUrl, profile?.id, decryptPhoto]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      // Don't clear entire cache on unmount, only on background
      // This allows multiple components to share the cache
    };
  }, []);

  return {
    decryptedUri,
    loading,
    error,
    clearCache: () => photoCache.clear(),
  };
}

/**
 * Clear all decrypted photos from memory cache
 * Should be called on logout
 */
export function clearPhotoCache(): void {
  photoCache.clear();
}
