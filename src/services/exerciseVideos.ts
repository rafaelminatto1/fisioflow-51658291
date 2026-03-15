/**
 * Exercise Videos Service — Cloudflare Workers + Neon PostgreSQL
 *
 * Uploads de arquivo continuam direto para R2 via uploadToR2.
 * Metadados gravados no Neon via Workers API.
 */
import { uploadToR2, deleteFromR2 } from '@/lib/storage/r2-storage';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { exerciseVideosApi } from '@/lib/api/workers-client';

// ============================================================================
// TYPES
// ============================================================================

export interface ExerciseVideo {
  id: string;
  exercise_id: string | null;
  organization_id?: string | null;
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
  // ── READ ──────────────────────────────────────────────────────────────────

  async getVideos(filters?: VideoFilterOptions): Promise<ExerciseVideo[]> {
    try {
      const res = await exerciseVideosApi.list({
        category: filters?.category !== 'all' ? filters?.category : undefined,
        difficulty: filters?.difficulty !== 'all' ? filters?.difficulty : undefined,
        bodyPart: filters?.bodyPart !== 'all' ? filters?.bodyPart : undefined,
        equipment: filters?.equipment !== 'all' ? filters?.equipment : undefined,
        search: filters?.searchTerm,
      });
      return res.data ?? [];
    } catch (error) {
      logger.error('[exerciseVideosService] getVideos error', error, 'exerciseVideos');
      throw error;
    }
  },

  async getVideoById(id: string): Promise<ExerciseVideo> {
    try {
      const res = await exerciseVideosApi.get(id);
      if (!res.data) throw new Error('Vídeo não encontrado');
      return res.data;
    } catch (error) {
      logger.error('[exerciseVideosService] getVideoById error', error, 'exerciseVideos');
      throw error;
    }
  },

  async getVideosByExerciseId(exerciseId: string): Promise<ExerciseVideo[]> {
    try {
      const res = await exerciseVideosApi.byExercise(exerciseId);
      return res.data ?? [];
    } catch (error) {
      logger.error('[exerciseVideosService] getVideosByExerciseId error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ── PROCESSING HELPERS (browser-side, sem serviço externo) ───────────────────────

  validateVideoFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_VIDEO_SIZE) {
      return { valid: false, error: `O vídeo deve ter no máximo ${this.formatFileSize(MAX_VIDEO_SIZE)}` };
    }
    if (!file.type.startsWith('video/')) {
      return { valid: false, error: 'O arquivo deve ser um vídeo' };
    }
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext as typeof ALLOWED_VIDEO_EXTENSIONS[number])) {
      return { valid: false, error: `Formato não suportado. Use: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}` };
    }
    return { valid: true };
  },

  async extractVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const cleanup = () => URL.revokeObjectURL(video.src);

      video.onloadedmetadata = () => {
        cleanup();
        resolve({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => { cleanup(); reject(new Error('Falha ao carregar metadados do vídeo')); };
      setTimeout(() => { if (!video.duration) { cleanup(); reject(new Error('Timeout ao carregar vídeo')); } }, 10000);
      video.src = URL.createObjectURL(file);
    });
  },

  async generateThumbnail(file: File, time = 1): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.currentTime = time;
      const cleanup = () => URL.revokeObjectURL(video.src);

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (!ctx) { cleanup(); reject(new Error('Falha ao obter contexto do canvas')); return; }
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            cleanup();
            if (blob) resolve(blob);
            else reject(new Error('Falha ao gerar thumbnail'));
          }, 'image/jpeg', 0.8);
        } catch (e) { cleanup(); reject(e); }
      };
      video.onerror = () => { cleanup(); reject(new Error('Falha ao carregar vídeo para gerar thumbnail')); };
      setTimeout(() => { if (video.readyState < 2) { cleanup(); reject(new Error('Timeout ao gerar thumbnail')); } }, 15000);
      video.src = URL.createObjectURL(file);
    });
  },

  // ── UPLOAD ────────────────────────────────────────────────────────────────

  async uploadVideo(data: UploadVideoData): Promise<ExerciseVideo> {
    try {
      const validation = this.validateVideoFile(data.file);
      if (!validation.valid) throw new Error(validation.error);

      const metadata = await this.extractVideoMetadata(data.file);

      // Generate thumbnail if not provided
      let thumbnailUrl: string | null = null;
      const thumbnailFile = data.thumbnail ?? await this.generateThumbnail(data.file).then(
        (blob) => new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }),
        () => null,
      );

      // Upload video to R2
      const { publicUrl: videoUrl } = await uploadToR2(data.file, 'exercise-videos/videos');

      // Upload thumbnail to R2
      if (thumbnailFile) {
        const { publicUrl: thumbUrl } = await uploadToR2(thumbnailFile, 'exercise-videos/thumbnails').catch(() => ({ publicUrl: null }));
        thumbnailUrl = thumbUrl;
      }

      // Save metadata in Neon via Workers
      const res = await exerciseVideosApi.create({
        exercise_id: data.exercise_id ?? null,
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration: Math.round(metadata.duration ?? 0),
        file_size: data.file.size,
        category: data.category,
        difficulty: data.difficulty,
        body_parts: data.body_parts,
        equipment: data.equipment,
      });

      return res.data;
    } catch (error) {
      logger.error('[exerciseVideosService] uploadVideo error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ── UPDATE ────────────────────────────────────────────────────────────────

  async updateVideo(
    id: string,
    updates: Partial<Omit<ExerciseVideo, 'id' | 'created_at' | 'uploaded_by' | 'video_url' | 'file_size'>>,
  ): Promise<ExerciseVideo> {
    try {
      const res = await exerciseVideosApi.update(id, updates as Record<string, unknown>);
      return res.data;
    } catch (error) {
      logger.error('[exerciseVideosService] updateVideo error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ── DELETE ────────────────────────────────────────────────────────────────

  async deleteVideo(id: string): Promise<ExerciseVideo> {
    try {
      const res = await exerciseVideosApi.delete(id);
      const video = res.data;

      // Delete R2 files (best-effort)
      const filesToDelete: string[] = [];
      const videoKey = this.extractR2KeyFromUrl(video.video_url);
      if (videoKey) filesToDelete.push(videoKey);
      if (video.thumbnail_url) {
        const thumbKey = this.extractR2KeyFromUrl(video.thumbnail_url);
        if (thumbKey) filesToDelete.push(thumbKey);
      }
      if (filesToDelete.length) {
        await Promise.allSettled(filesToDelete.map((k) => deleteFromR2(k)));
      }

      return video;
    } catch (error) {
      logger.error('[exerciseVideosService] deleteVideo error', error, 'exerciseVideos');
      throw error;
    }
  },

  // ── UTILITIES ─────────────────────────────────────────────────────────────

  extractR2KeyFromUrl(url: string): string | null {
    try {
      return decodeURIComponent(new URL(url).pathname.substring(1));
    } catch {
      return null;
    }
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatDuration(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
};
