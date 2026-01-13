import { supabase } from '@/integrations/supabase/client';

export interface ExerciseVideo {
  id: string;
  exercise_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  file_size: number;
  category: string;
  difficulty: string;
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
  category: string;
  difficulty: string;
  body_parts: string[];
  equipment: string[];
}

export interface VideoMetadata {
  duration?: number;
  width?: number;
  height?: number;
}

/**
 * Exercise Videos Service
 * Handles video storage, upload, and playback for exercise demonstrations
 */
export const exerciseVideosService = {
  /**
   * Get all exercise videos with optional filters
   */
  async getVideos(filters?: {
    category?: string;
    difficulty?: string;
    bodyPart?: string;
    equipment?: string;
    searchTerm?: string;
  }) {
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

    if (filters?.bodyPart) {
      query = query.contains('body_parts', [filters.bodyPart]);
    }

    if (filters?.equipment) {
      query = query.contains('equipment', [filters.equipment]);
    }

    if (filters?.searchTerm) {
      query = query.ilike('title', `%${filters.searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching exercise videos:', error);
      throw error;
    }

    return data as ExerciseVideo[];
  },

  /**
   * Get a single video by ID
   */
  async getVideoById(id: string) {
    const { data, error } = await supabase
      .from('exercise_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ExerciseVideo;
  },

  /**
   * Get videos for a specific exercise
   */
  async getVideosByExerciseId(exerciseId: string) {
    const { data, error } = await supabase
      .from('exercise_videos')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ExerciseVideo[];
  },

  /**
   * Extract video metadata (duration, dimensions)
   */
  async extractVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  },

  /**
   * Generate a thumbnail from video file
   */
  async generateThumbnail(file: File, time: number = 1): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.currentTime = time;

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(video.src);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video for thumbnail generation'));
      };

      video.src = URL.createObjectURL(file);
    });
  },

  /**
   * Upload a new exercise video
   */
  async uploadVideo(data: UploadVideoData) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');

    // Extract video metadata
    const metadata = await this.extractVideoMetadata(data.file);

    // Generate thumbnail if not provided
    let thumbnailFile = data.thumbnail;
    let thumbnailUrl: string | undefined;

    if (!thumbnailFile) {
      try {
        const thumbnailBlob = await this.generateThumbnail(data.file);
        thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
      }
    }

    // Upload video file
    const videoExt = data.file.name.split('.').pop() || 'mp4';
    const videoFileName = `${Date.now()}_${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.${videoExt}`;
    const videoPath = `videos/${videoFileName}`;

    const { error: videoUploadError } = await supabase.storage
      .from('exercise-videos')
      .upload(videoPath, data.file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (videoUploadError) throw videoUploadError;

    // Get public URL for video
    const { data: videoUrlData } = supabase.storage
      .from('exercise-videos')
      .getPublicUrl(videoPath);

    // Upload thumbnail if available
    if (thumbnailFile) {
      const thumbnailExt = thumbnailFile.name.split('.').pop() || 'jpg';
      const thumbnailFileName = `${Date.now()}_${data.title.replace(/[^a-zA-Z0-9]/g, '_')}_thumb.${thumbnailExt}`;
      const thumbnailPath = `thumbnails/${thumbnailFileName}`;

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
      }
    }

    // Create database record
    const { data: videoRecord, error: dbError } = await supabase
      .from('exercise_videos')
      .insert({
        exercise_id: data.exercise_id,
        title: data.title,
        description: data.description,
        video_url: videoUrlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        duration: metadata.duration,
        file_size: data.file.size,
        category: data.category,
        difficulty: data.difficulty,
        body_parts: data.body_parts,
        equipment: data.equipment,
        uploaded_by: userData.user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup uploaded files if DB insert fails
      await supabase.storage.from('exercise-videos').remove([videoPath]);
      throw dbError;
    }

    return videoRecord as ExerciseVideo;
  },

  /**
   * Update an existing video
   */
  async updateVideo(id: string, updates: Partial<Omit<ExerciseVideo, 'id' | 'created_at' | 'uploaded_by'>>) {
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
  },

  /**
   * Delete a video
   */
  async deleteVideo(id: string) {
    // Get video record first
    const { data: video } = await supabase
      .from('exercise_videos')
      .select('*')
      .eq('id', id)
      .single();

    if (!video) throw new Error('Video not found');

    // Delete from database
    const { error: dbError } = await supabase
      .from('exercise_videos')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    // Delete files from storage
    const videoPath = this.extractPathFromUrl(video.video_url);
    const filesToDelete: string[] = [];

    if (videoPath) filesToDelete.push(videoPath);

    if (video.thumbnail_url) {
      const thumbPath = this.extractPathFromUrl(video.thumbnail_url);
      if (thumbPath) filesToDelete.push(thumbPath);
    }

    if (filesToDelete.length > 0) {
      await supabase.storage.from('exercise-videos').remove(filesToDelete);
    }

    return video;
  },

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
   * Get signed URL for private video access (if needed)
   */
  async getSignedUrl(videoPath: string, expiresIn: number = 3600) {
    const { data, error } = await supabase.storage
      .from('exercise-videos')
      .createSignedUrl(videoPath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },
};

/**
 * Video categories for organization
 */
export const VIDEO_CATEGORIES = [
  'alongamento',
  'fortalecimento',
  'mobilidade',
  'equilíbrio',
  'coordenação',
  'postura',
  'respiração',
  'relaxamento',
] as const;

/**
 * Difficulty levels
 */
export const VIDEO_DIFFICULTY = [
  'iniciante',
  'intermediário',
  'avançado',
] as const;

/**
 * Body parts for filtering
 */
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

/**
 * Equipment options
 */
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
