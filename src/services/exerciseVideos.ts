import { supabase } from '@/integrations/supabase/client';

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

/**
 * Exercise Videos Service
 * Handles video storage, upload, and playback for exercise demonstrations
 */
export const exerciseVideosService = {
  // ------------------------------------------------------------------------
  // READ OPERATIONS
  // ------------------------------------------------------------------------

  /**
   * Get all exercise videos with optional filters
   */
  async getVideos(filters?: VideoFilterOptions): Promise<ExerciseVideo[]> {
    try {
      let query = supabase
        .from('exercise_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.difficulty && filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }

      if (filters?.bodyPart && filters.bodyPart !== 'all') {
        query = query.contains('body_parts', [filters.bodyPart]);
      }

      if (filters?.equipment && filters.equipment !== 'all') {
        query = query.contains('equipment', [filters.equipment]);
      }

      if (filters?.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ExerciseVideo[];
    } catch (error) {
      console.error('[exerciseVideosService] getVideos error:', error);
      throw error;
    }
  },

  /**
   * Get a single video by ID
   */
  async getVideoById(id: string): Promise<ExerciseVideo> {
    try {
      const { data, error } = await supabase
        .from('exercise_videos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ExerciseVideo;
    } catch (error) {
      console.error('[exerciseVideosService] getVideoById error:', error);
      throw error;
    }
  },

  /**
   * Get videos for a specific exercise
   */
  async getVideosByExerciseId(exerciseId: string): Promise<ExerciseVideo[]> {
    try {
      const { data, error } = await supabase
        .from('exercise_videos')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ExerciseVideo[];
    } catch (error) {
      console.error('[exerciseVideosService] getVideosByExerciseId error:', error);
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
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
          thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
        } catch (error) {
          console.warn('[exerciseVideosService] Failed to generate thumbnail:', error);
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
      const videoPath = `videos/${user.id}/${videoFileName}`;

      const { error: videoUploadError } = await supabase.storage
        .from('exercise-videos')
        .upload(videoPath, data.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (videoUploadError) {
        console.error('[exerciseVideosService] Video upload error:', videoUploadError);
        throw new Error('Falha ao fazer upload do vídeo');
      }

      // Get public URL for video
      const { data: videoUrlData } = supabase.storage
        .from('exercise-videos')
        .getPublicUrl(videoPath);

      // Upload thumbnail if available
      if (thumbnailFile) {
        const thumbnailExt = thumbnailFile.name.split('.').pop() || 'jpg';
        const thumbnailFileName = `${timestamp}_${sanitizedTitle}_thumb.${thumbnailExt}`;
        const thumbnailPath = `thumbnails/${user.id}/${thumbnailFileName}`;

        const { error: thumbUploadError } = await supabase.storage
          .from('exercise-videos')
          .upload(thumbnailPath, thumbnailFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!thumbUploadError) {
          const { data: thumbUrlData } = supabase.storage
            .from('exercise-videos')
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbUrlData.publicUrl;
        } else {
          console.warn('[exerciseVideosService] Thumbnail upload error:', thumbUploadError);
        }
      }

      // Create database record
      const { data: videoRecord, error: dbError } = await supabase
        .from('exercise_videos')
        .insert({
          exercise_id: data.exercise_id || null,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          video_url: videoUrlData.publicUrl,
          thumbnail_url: thumbnailUrl,
          duration: Math.round(metadata.duration || 0),
          file_size: data.file.size,
          category: data.category,
          difficulty: data.difficulty,
          body_parts: data.body_parts,
          equipment: data.equipment,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup uploaded files if DB insert fails
        await supabase.storage.from('exercise-videos').remove([videoPath]);
        console.error('[exerciseVideosService] DB insert error:', dbError);
        throw new Error('Falha ao salvar registro do vídeo');
      }

      return videoRecord as ExerciseVideo;
    } catch (error) {
      console.error('[exerciseVideosService] uploadVideo error:', error);
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
      const { data, error } = await supabase
        .from('exercise_videos')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ExerciseVideo;
    } catch (error) {
      console.error('[exerciseVideosService] updateVideo error:', error);
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
      const { data: video, error: fetchError } = await supabase
        .from('exercise_videos')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !video) {
        throw new Error('Vídeo não encontrado');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('exercise_videos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Delete files from storage (fire and forget, log errors only)
      const filesToDelete: string[] = [];
      const videoPath = this.extractPathFromUrl(video.video_url);
      if (videoPath) filesToDelete.push(videoPath);

      if (video.thumbnail_url) {
        const thumbPath = this.extractPathFromUrl(video.thumbnail_url);
        if (thumbPath) filesToDelete.push(thumbPath);
      }

      if (filesToDelete.length > 0) {
        await supabase.storage.from('exercise-videos').remove(filesToDelete).catch((err) => {
          console.warn('[exerciseVideosService] Failed to delete storage files:', err);
        });
      }

      return video as ExerciseVideo;
    } catch (error) {
      console.error('[exerciseVideosService] deleteVideo error:', error);
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
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/exercise-videos\/(.+)$/);
      return pathMatch ? pathMatch[1] : null;
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
   */
  async getSignedUrl(videoPath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from('exercise-videos')
      .createSignedUrl(videoPath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },
};
