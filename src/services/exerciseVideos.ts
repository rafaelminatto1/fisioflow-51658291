/**
 * Exercise Videos Service - Migrated to Firebase
 */

import { db, collection, getDocs, where, orderBy, addDoc, updateDoc, deleteDoc, doc, getDoc, query as firestoreQuery, QueryConstraint, getFirebaseAuth } from '@/integrations/firebase/app';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from '@/integrations/firebase/storage';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { normalizeFirestoreData } from '@/utils/firestoreData';

const storage = getFirebaseStorage();
const auth = getFirebaseAuth();

// ============================================================================
// TYPES
// ============================================================================

export interface ExerciseVideo {
  id: string;
  exercise_id: string | null;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  file_size: number;
  category: VideoCategory;
  difficulty: VideoDifficulty;
  body_parts: string[];
  equipment: string[];
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface UploadVideoData {
  exercise_id?: string;
  title: string;
  description?: string;
  file: File;
  thumbnail?: File;
  category: VideoCategory;
  difficulty: VideoDifficulty;
  body_parts: string[];
  equipment: string[];
}

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
}

export type VideoCategory =
  | 'alongamento'
  | 'fortalecimento'
  | 'mobilidade'
  | 'equilíbrio'
  | 'coordenação'
  | 'postura'
  | 'respiração'
  | 'relaxamento';

export type VideoDifficulty = 'iniciante' | 'intermediário' | 'avançado';

export type VideoFilterOptions = {
  category?: VideoCategory | 'all';
  difficulty?: VideoDifficulty | 'all';
  bodyPart?: string;
  equipment?: string;
  searchTerm?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const VIDEO_CATEGORIES: readonly VideoCategory[] = [
  'alongamento',
  'fortalecimento',
  'mobilidade',
  'equilíbrio',
  'coordenação',
  'postura',
  'respiração',
  'relaxamento',
] as const;

export const VIDEO_DIFFICULTY: readonly VideoDifficulty[] = [
  'iniciante',
  'intermediário',
  'avançado',
] as const;

export const BODY_PARTS = [
  'pescoço',
  'ombros',
  'cotovelos',
  'punhos',
  'coluna cervical',
  'coluna torácica',
  'coluna lombar',
  'quadril',
  'joelhos',
  'tornozelos',
  'pés',
] as const;

export const EQUIPMENT_OPTIONS = [
  'nenhum',
  'banda elástica',
  'pesos',
  'bola suíça',
  'halteres',
  'tamponamento',
  'barra',
  'step',
  'tapete',
] as const;

export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_VIDEO_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'] as const;
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi'] as const;

// ============================================================================
// SERVICE
// ============================================================================

export const exerciseVideosService = {
  // ------------------------------------------------------------------------
  // READ OPERATIONS
  // ------------------------------------------------------------------------

  async getVideos(filters?: VideoFilterOptions): Promise<ExerciseVideo[]> {
    try {
      const constraints: QueryConstraint[] = [
        orderBy('created_at', 'desc')
      ];

      if (filters?.category && filters.category !== 'all') {
        constraints.push(where('category', '==', filters.category));
      }

      if (filters?.difficulty && filters.difficulty !== 'all') {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }

      if (filters?.bodyPart && filters.bodyPart !== 'all') {
        constraints.push(where('body_parts', 'array-contains', filters.bodyPart));
      }

      if (filters?.equipment && filters.equipment !== 'all') {
        constraints.push(where('equipment', 'array-contains', filters.equipment));
      }

      const q = firestoreQuery(collection(db, 'exercise_videos'), ...constraints);
      const querySnapshot = await getDocs(q);

      let videos = querySnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as ExerciseVideo[];

      // Client-side filtering for search term (Firestore doesn't support ILIKE)
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        videos = videos.filter(video =>
          video.title.toLowerCase().includes(searchLower) ||
          (video.description && video.description.toLowerCase().includes(searchLower))
        );
      }

      return videos;
    } catch (error) {
      logger.error('[exerciseVideosService] getVideos error', error, 'exerciseVideos');
      throw error;
    }
  },

  /**
   * Get a single video by ID
   */
  async getVideoById(id: string): Promise<ExerciseVideo> {
    try {
      const docRef = doc(db, 'exercise_videos', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Vídeo não encontrado');
      }

      return { id: docSnap.id, ...docSnap.data() } as ExerciseVideo;
    } catch (error) {
      logger.error('[exerciseVideosService] getVideoById error', error, 'exerciseVideos');
      throw error;
    }
  },

  /**
   * Get videos for a specific exercise
   */
  async getVideosByExerciseId(exerciseId: string): Promise<ExerciseVideo[]> {
    try {
      const q = firestoreQuery(
        collection(db, 'exercise_videos'),
        where('exercise_id', '==', exerciseId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as ExerciseVideo[];
    } catch (error) {
      logger.error('[exerciseVideosService] getVideosByExerciseId error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ------------------------------------------------------------------------
  // VIDEO PROCESSING
  // ------------------------------------------------------------------------

  /**
   * Validate video file
   */
  validateVideoFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `O vídeo deve ter no máximo ${this.formatFileSize(MAX_VIDEO_SIZE)}`,
      };
    }

    // Check file type
    if (!file.type.startsWith('video/')) {
      return { valid: false, error: 'O arquivo deve ser um vídeo' };
    }

    // Check file extension
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext as typeof ALLOWED_VIDEO_EXTENSIONS[number])) {
      return {
        valid: false,
        error: `Formato não suportado. Use: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`,
      };
    }

    return { valid: true };
  },

  /**
   * Extract video metadata (duration, dimensions)
   */
  async extractVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(video.src);
      };

      video.onloadedmetadata = () => {
        cleanup();
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Falha ao carregar metadados do vídeo'));
      };

      // Set timeout for metadata loading
      setTimeout(() => {
        if (!video.duration) {
          cleanup();
          reject(new Error('Timeout ao carregar vídeo'));
        }
      }, 10000);

      video.src = URL.createObjectURL(file);
    });
  },

  /**
   * Generate a thumbnail from video file at specified time
   */
  async generateThumbnail(file: File, time: number = 1): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.currentTime = time;

      const cleanup = () => {
        URL.revokeObjectURL(video.src);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            reject(new Error('Falha ao obter contexto do canvas'));
            return;
          }

          // Draw black background first
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              cleanup();
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Falha ao gerar thumbnail'));
              }
            },
            'image/jpeg',
            0.8
          );
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.onerror = () => {
        cleanup();
        reject(new Error('Falha ao carregar vídeo para gerar thumbnail'));
      };

      // Set timeout for thumbnail generation
      setTimeout(() => {
        if (video.readyState < 2) {
          cleanup();
          reject(new Error('Timeout ao gerar thumbnail'));
        }
      }, 15000);

      video.src = URL.createObjectURL(file);
    });
  },

  // ------------------------------------------------------------------------
  // UPLOAD OPERATIONS
  // ------------------------------------------------------------------------

  /**
   * Upload a new exercise video with full processing
   */
  async uploadVideo(data: UploadVideoData): Promise<ExerciseVideo> {
    try {
      // Get authenticated user
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Validate video file
      const validation = this.validateVideoFile(data.file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Extract video metadata
      const metadata = await this.extractVideoMetadata(data.file);

      // Generate thumbnail if not provided
      let thumbnailFile = data.thumbnail;
      let thumbnailUrl: string | null = null;

      if (!thumbnailFile) {
        try {
          const thumbnailBlob = await this.generateThumbnail(data.file);
          thumbnailFile = new File([thumbnailBlob], 'thumbnail.avif', { type: 'image/avif' });
        } catch (error) {
          logger.warn('[exerciseVideosService] Failed to generate thumbnail', error, 'exerciseVideos');
        }
      }

      // Sanitize filename
      const sanitizedTitle = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      // Upload video file
      const videoExt = data.file.name.split('.').pop() || 'mp4';
      const timestamp = Date.now();
      const videoFileName = `${timestamp}_${sanitizedTitle}.${videoExt}`;
      const videoPath = `videos/${user.uid}/${videoFileName}`;

      const videoRef = ref(storage, `exercise-videos/${videoPath}`);
      await uploadBytes(videoRef, data.file, {
        customMetadata: {
          contentType: data.file.type,
          cacheControl: 'public, max-age=31536000', // 1 ano
        }
      });

      const videoUrl = await getDownloadURL(videoRef);

      // Upload thumbnail if available
      if (thumbnailFile) {
        const thumbnailExt = thumbnailFile.name.split('.').pop() || 'jpg';
        const thumbnailFileName = `${timestamp}_${sanitizedTitle}_thumb.${thumbnailExt}`;
        const thumbnailPath = `thumbnails/${user.uid}/${thumbnailFileName}`;

        try {
          const thumbnailRef = ref(storage, `exercise-videos/${thumbnailPath}`);
          await uploadBytes(thumbnailRef, thumbnailFile, {
            customMetadata: {
              contentType: thumbnailFile.type,
              cacheControl: 'public, max-age=31536000',
            }
          });
          thumbnailUrl = await getDownloadURL(thumbnailRef);
        } catch (thumbError) {
          logger.warn('[exerciseVideosService] Thumbnail upload error', thumbError, 'exerciseVideos');
        }
      }

      // Create database record
      const videoData = {
        exercise_id: data.exercise_id || null,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration: Math.round(metadata.duration || 0),
        file_size: data.file.size,
        category: data.category,
        difficulty: data.difficulty,
        body_parts: data.body_parts,
        equipment: data.equipment,
        uploaded_by: user.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'exercise_videos'), videoData);

      return { id: docRef.id, ...videoData } as ExerciseVideo;
    } catch (error) {
      logger.error('[exerciseVideosService] uploadVideo error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ------------------------------------------------------------------------
  // UPDATE OPERATIONS
  // ------------------------------------------------------------------------

  /**
   * Update an existing video's metadata
   */
  async updateVideo(
    id: string,
    updates: Partial<Omit<ExerciseVideo, 'id' | 'created_at' | 'uploaded_by' | 'video_url' | 'file_size'>>
  ): Promise<ExerciseVideo> {
    try {
      const docRef = doc(db, 'exercise_videos', id);
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);

      // Fetch and return updated document
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as ExerciseVideo;
    } catch (error) {
      logger.error('[exerciseVideosService] updateVideo error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ------------------------------------------------------------------------
  // DELETE OPERATIONS
  // ------------------------------------------------------------------------

  /**
   * Delete a video and its files from storage
   */
  async deleteVideo(id: string): Promise<ExerciseVideo> {
    try {
      // Get video record first
      const docRef = doc(db, 'exercise_videos', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Vídeo não encontrado');
      }

      const video = { id: docSnap.id, ...docSnap.data() } as ExerciseVideo;

      // Delete from database
      await deleteDoc(docRef);

      // Delete files from storage (fire and forget, log errors only)
      const filesToDelete: string[] = [];
      const videoPath = this.extractPathFromUrl(video.video_url);
      if (videoPath) filesToDelete.push(`exercise-videos/${videoPath}`);

      if (video.thumbnail_url) {
        const thumbPath = this.extractPathFromUrl(video.thumbnail_url);
        if (thumbPath) filesToDelete.push(`exercise-videos/${thumbPath}`);
      }

      if (filesToDelete.length > 0) {
        await Promise.allSettled(
          filesToDelete.map(path => {
            const fileRef = ref(storage, path);
            return deleteObject(fileRef);
          })
        ).catch((err) => {
          logger.warn('[exerciseVideosService] Failed to delete storage files', err, 'exerciseVideos');
        });
      }

      return video;
    } catch (error) {
      logger.error('[exerciseVideosService] deleteVideo error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ------------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // ------------------------------------------------------------------------

  /**
   * Extract storage path from public URL
   */
  extractPathFromUrl(url: string): string | null {
    try {
      // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path?token=...
      // We need to extract the path after /o/ and before the query string
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]);
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Get signed URL for private video access (if needed in future)
   * Note: Firebase Storage doesn't have built-in signed URLs like Supabase.
   * This would require setting up Firebase Cloud Storage signed URLs via GCS.
   */
  async getSignedUrl(videoPath: string, _expiresIn: number = 3600): Promise<string> {
    // For now, return the public URL
    // In production, you might use Firebase Cloud Functions to generate signed URLs
    const storageRef = ref(storage, `exercise-videos/${videoPath}`);
    return getDownloadURL(storageRef);
  },
};