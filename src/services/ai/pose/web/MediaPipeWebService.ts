/**
 * MediaPipe Web implementation of IPoseDetectionService
 *
 * This service wraps the existing MediaPipe JS implementations for web.
 * It refactors poseDetectionService.ts and videoPoseService.ts to follow
 * the unified IPoseDetectionService interface.
 *
 * @see src/services/ai/poseDetectionService.ts - Original static image detection
 * @see src/services/ai/videoPoseService.ts - Original video processing
 */

import type {
  IPoseDetectionService,
  PoseLandmark,
  PoseDetectionResult,
  VideoAnalysisResult,
  PoseDetectionFrame,
  VideoProgressCallback,
  PoseDetectionCallback,
  RealtimeDetectionStatus,
  RealtimeDetectionOptions,
  PoseServiceCapabilities,
} from '../types';
import { PoseDetectionError, PoseErrorCode } from '../types';
import { UnifiedLandmark, POSE_LANDMARKS } from '../../../utils/geometry';

// ============================================================================
// Type Definitions for MediaPipe UMD Modules
// ============================================================================

interface PoseOptions {
  locateFile?: (file: string) => string;
}

interface PoseConfig {
  modelComplexity?: number;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

interface PoseResults {
  poseLandmarks?: UnifiedLandmark[];
  poseWorldLandmarks?: UnifiedLandmark[];
  image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
}

interface PoseInstance {
  setOptions(options: PoseConfig): void;
  onResults(callback: (results: PoseResults) => void): void;
  send(input: { image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
  initialize(): Promise<void>;
  close(): void;
}

interface PoseConstructor {
  new (options: PoseOptions): PoseInstance;
}

// Tasks Vision types
interface FilesetResolver {
  forVisionTasks(path: string): Promise<any>;
}

// MediaPipe PoseLandmarker result structure
interface PoseLandmarkerResult {
  landmarks?: Array<Array<{ x: number; y: number; z: number; visibility: number }>>;
  worldLandmarks?: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
}

// Use 'any' for PoseLandmarker to avoid type conflicts with the dynamically imported MediaPipe type
interface PoseLandmarker {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult;
  detect(image: HTMLImageElement | HTMLCanvasElement): PoseLandmarkerResult;
  close(): void;
}

// Type guard to check if result has valid landmarks
function hasValidLandmarks(
  result: PoseLandmarkerResult | any
): result is PoseLandmarkerResult & { landmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>> } {
  return (
    result &&
    result.landmarks &&
    Array.isArray(result.landmarks) &&
    result.landmarks.length > 0 &&
    Array.isArray(result.landmarks[0])
  );
}

interface PoseLandmarkerStatic {
  createFromOptions(
    vision: any,
    options: {
      baseOptions: {
        modelAssetPath: string;
        delegate: string;
      };
      runningMode: string;
      numPoses: number;
      minPoseDetectionConfidence: number;
      minPosePresenceConfidence: number;
      minTrackingConfidence: number;
    }
  ): Promise<PoseLandmarker>;
}

// ============================================================================
// MediaPipeWebService Implementation
// ============================================================================

export interface MediaPipeWebServiceOptions {
  debug?: boolean;
  modelComplexity?: 0 | 1 | 2;
  enableGpu?: boolean;
}

/**
 * MediaPipe web implementation using existing poseDetectionService and videoPoseService
 *
 * This service adapts the existing MediaPipe JS code to the new unified interface.
 */
export class MediaPipeWebService implements IPoseDetectionService {
  private poseEstimator: PoseInstance | null = null;
  // Use 'any' for poseLandmarker to avoid type conflicts with dynamically imported MediaPipe
  private poseLandmarker: any = null;
  private PoseClass: PoseConstructor | null = null;
  private isInitialized = false;
  private realtimeCallback: PoseDetectionCallback | null = null;
  private realtimeActive = false;
  private readonly debug: boolean;
  private readonly modelComplexity: number;

  constructor(options: MediaPipeWebServiceOptions = {}) {
    this.debug = options.debug ?? false;
    this.modelComplexity = options.modelComplexity ?? 2; // 2 = full (most accurate)
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize both the legacy Pose and tasks-vision PoseLandmarker
      await this.initPoseEstimator();
      await this.initPoseLandmarker();
      this.isInitialized = true;

      if (this.debug) {
        console.log('[MediaPipeWebService] Initialized successfully');
      }
    } catch (error) {
      throw new PoseDetectionError(
        'Failed to initialize MediaPipe',
        PoseErrorCode.MODEL_LOAD_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  private async initPoseEstimator(): Promise<void> {
    if (this.poseEstimator) return;

    // Dynamically import the @mediapipe/pose module
    if (!this.PoseClass) {
      await import('@mediapipe/pose');
      // The module attaches Pose to the global window object
      if (typeof window !== 'undefined' && (window as any).Pose) {
        this.PoseClass = (window as any).Pose as PoseConstructor;
      } else {
        throw new Error('Pose constructor not found on window object');
      }
    }

    const pose = new this.PoseClass({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: this.modelComplexity,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    await pose.initialize();
    this.poseEstimator = pose;
  }

  private async initPoseLandmarker(): Promise<void> {
    if (this.poseLandmarker) return;

    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );

    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose/pose_landmarker/float16/1/pose_landmarker_full.task`,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  // ========================================================================
  // IPoseDetectionService Implementation
  // ========================================================================

  async detectFromImage(
    imageData: HTMLImageElement | ImageData | string
  ): Promise<PoseDetectionResult> {
    await this.ensureInitialized();

    let imageElement: HTMLImageElement;

    if (typeof imageData === 'string') {
      // Base64 or URL string
      imageElement = await this.loadImage(imageData);
    } else if (imageData instanceof HTMLImageElement) {
      imageElement = imageData;
    } else if (imageData instanceof ImageData) {
      // Convert ImageData to HTMLImageElement
      imageElement = await this.imageDataToImage(imageData);
    } else {
      throw new PoseDetectionError(
        'Invalid image data format',
        PoseErrorCode.INVALID_INPUT
      );
    }

    return new Promise((resolve, reject) => {
      const onResults = (results: PoseResults) => {
        const landmarks = this.mapUnifiedLandmarksToPoseLandmarks(
          results.poseLandmarks || []
        );

        resolve({
          landmarks,
          confidence: this.calculateConfidence(landmarks),
          timestamp: Date.now(),
        });
      };

      // Set one-off listener
      this.poseEstimator!.onResults(onResults);
      this.poseEstimator!.send({ image: imageElement }).catch(reject);
    });
  }

  async detectFromVideo(
    videoFile: File | string,
    onProgress?: VideoProgressCallback
  ): Promise<VideoAnalysisResult> {
    await this.ensureInitialized();

    // Load video element
    const videoElement =
      typeof videoFile === 'string'
        ? await this.loadVideoFromUrl(videoFile)
        : await this.loadVideoFromFile(videoFile);

    const startTime = Date.now();
    const frames: PoseDetectionFrame[] = [];
    const fps = 30;

    // Ensure video is loaded and we know duration
    if (Number.isNaN(videoElement.duration)) {
      throw new PoseDetectionError(
        'Video duration unknown. Please wait for metadata.',
        PoseErrorCode.INVALID_INPUT
      );
    }

    const duration = videoElement.duration;
    let currentTime = 0;

    // Pause video to take control
    videoElement.pause();
    videoElement.currentTime = 0;

    const waitForSeek = () =>
      new Promise<void>((resolve) => {
        const handler = () => {
          videoElement.removeEventListener('seeked', handler);
          resolve();
        };
        videoElement.addEventListener('seeked', handler);
      });

    while (currentTime < duration) {
      videoElement.currentTime = currentTime;
      await waitForSeek();

      // Detect pose at this frame
      const timestampMs = currentTime * 1000;
      const result: PoseLandmarkerResult = this.poseLandmarker!.detectForVideo(
        videoElement,
        timestampMs
      ) as PoseLandmarkerResult;

      if (hasValidLandmarks(result)) {
        const rawLandmarks = result.landmarks[0];

        const landmarks: PoseLandmark[] = rawLandmarks.map((l) => ({
          x: l.x,
          y: l.y,
          z: l.z,
          visibility: l.visibility || 0,
        }));

        frames.push({
          landmarks,
          timestamp: currentTime,
          confidence: this.calculateConfidence(landmarks),
        });
      }

      // Report progress
      if (onProgress) {
        const currentFrame = Math.floor(currentTime * fps);
        const totalFrames = Math.floor(duration * fps);
        onProgress({
          currentFrame,
          totalFrames,
          percentage: (currentTime / duration) * 100,
          fps,
        });
      }

      currentTime += 1 / fps; // Advance 1 frame
    }

    const processingTime = Date.now() - startTime;

    return {
      frames,
      processingTime,
      averageFps: fps,
      totalFrames: frames.length,
    };
  }

  async startRealtimeDetection(
    callback: PoseDetectionCallback,
    options: RealtimeDetectionOptions = {}
  ): Promise<RealtimeDetectionStatus> {
    await this.ensureInitialized();

    if (this.realtimeActive) {
      throw new PoseDetectionError(
        'Real-time detection already active',
        PoseErrorCode.NOT_INITIALIZED
      );
    }

    this.realtimeCallback = callback;
    this.realtimeActive = true;

    // Return initial status
    // Note: Actual webcam handling should be done by the caller
    // This service just processes frames that are sent to it
    return {
      isActive: true,
      fps: options.targetFps ?? 30,
      avgProcessingTime: 0,
      gpuEnabled: options.enableGpu ?? true,
    };
  }

  async stopRealtimeDetection(): Promise<void> {
    this.realtimeActive = false;
    this.realtimeCallback = null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      return true;
    } catch {
      return false;
    }
  }

  async getCapabilities(): Promise<PoseServiceCapabilities> {
    return {
      name: 'MediaPipe Web Service',
      version: '0.5.1675469404',
      platform: 'web',
      supportsGpu: true,
      maxFps: 30,
      landmarkCount: 33,
      supportsRealtime: true,
      supportsVideo: true,
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Process a video element (web-specific method for backward compatibility)
   * This handles HTMLVideoElement directly without loading from File or URL
   */
  async detectFromVideoElement(
    videoElement: HTMLVideoElement,
    onProgress?: VideoProgressCallback
  ): Promise<VideoAnalysisResult> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const frames: PoseDetectionFrame[] = [];
    const fps = 30;

    // Ensure video is loaded and we know duration
    if (Number.isNaN(videoElement.duration)) {
      throw new PoseDetectionError(
        'Video duration unknown. Please wait for metadata.',
        PoseErrorCode.INVALID_INPUT
      );
    }

    const duration = videoElement.duration;
    let currentTime = 0;

    // Pause video to take control
    videoElement.pause();
    videoElement.currentTime = 0;

    const waitForSeek = () =>
      new Promise<void>((resolve) => {
        const handler = () => {
          videoElement.removeEventListener('seeked', handler);
          resolve();
        };
        videoElement.addEventListener('seeked', handler);
      });

    while (currentTime < duration) {
      videoElement.currentTime = currentTime;
      await waitForSeek();

      // Detect pose at this frame
      const timestampMs = currentTime * 1000;
      const result: PoseLandmarkerResult = this.poseLandmarker!.detectForVideo(
        videoElement,
        timestampMs
      ) as PoseLandmarkerResult;

      if (hasValidLandmarks(result)) {
        const rawLandmarks = result.landmarks[0];

        const landmarks: PoseLandmark[] = rawLandmarks.map((l) => ({
          x: l.x,
          y: l.y,
          z: l.z,
          visibility: l.visibility || 0,
        }));

        frames.push({
          landmarks,
          timestamp: currentTime,
          confidence: this.calculateConfidence(landmarks),
        });
      }

      // Report progress
      if (onProgress) {
        const currentFrame = Math.floor(currentTime * fps);
        const totalFrames = Math.floor(duration * fps);
        onProgress({
          currentFrame,
          totalFrames,
          percentage: (currentTime / duration) * 100,
          fps,
        });
      }

      currentTime += 1 / fps; // Advance 1 frame
    }

    const processingTime = Date.now() - startTime;

    return {
      frames,
      processingTime,
      averageFps: fps,
      totalFrames: frames.length,
    };
  }

  /**
   * Process a video frame for real-time detection
   * Call this method from your webcam loop
   */
  async processVideoFrame(
    videoElement: HTMLVideoElement,
    timestampMs: number
  ): Promise<void> {
    if (!this.realtimeActive || !this.realtimeCallback || !this.poseLandmarker) {
      return;
    }

    const result: PoseLandmarkerResult = this.poseLandmarker.detectForVideo(
      videoElement,
      timestampMs
    ) as PoseLandmarkerResult;

    if (hasValidLandmarks(result)) {
      const rawLandmarks = result.landmarks[0];
      const landmarks: PoseLandmark[] = rawLandmarks.map((l) => ({
        x: l.x,
        y: l.y,
        z: l.z,
        visibility: l.visibility || 0,
      }));

      this.realtimeCallback({
        landmarks,
        confidence: this.calculateConfidence(landmarks),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Convert UnifiedLandmark[] to PoseLandmark[] format
   */
  private mapUnifiedLandmarksToPoseLandmarks(
    unified: UnifiedLandmark[]
  ): PoseLandmark[] {
    // The existing UnifiedLandmark format should be compatible
    return unified.map((l) => ({
      x: l.x,
      y: l.y,
      z: l.z || 0,
      visibility: l.visibility || 0,
    }));
  }

  /**
   * Calculate overall confidence from landmarks
   */
  private calculateConfidence(landmarks: PoseLandmark[]): number {
    if (landmarks.length === 0) return 0;

    const totalVisibility = landmarks.reduce((sum, lm) => sum + lm.visibility, 0);
    return totalVisibility / landmarks.length;
  }

  /**
   * Load image from URL or base64 string
   */
  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  /**
   * Convert ImageData to HTMLImageElement
   */
  private async imageDataToImage(imageData: ImageData): Promise<HTMLImageElement> {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL();
    return this.loadImage(dataUrl);
  }

  /**
   * Load video from URL
   */
  private async loadVideoFromUrl(url: string): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video);
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = url;
    });
  }

  /**
   * Load video from File object
   */
  private async loadVideoFromFile(file: File): Promise<HTMLVideoElement> {
    const url = URL.createObjectURL(file);
    try {
      return await this.loadVideoFromUrl(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.poseEstimator?.close();
    this.poseLandmarker?.close();
    this.poseEstimator = null;
    this.poseLandmarker = null;
    this.isInitialized = false;
  }
}

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

let globalService: MediaPipeWebService | null = null;

/**
 * Get the global MediaPipe service instance
 */
export function getMediaPipeWebService(): MediaPipeWebService {
  if (!globalService) {
    globalService = new MediaPipeWebService();
  }
  return globalService;
}

/**
 * Legacy function: detect pose in image
 * @deprecated Use getMediaPipeWebService().detectFromImage() instead
 */
export async function detectPoseInImage(
  imageElement: HTMLImageElement
): Promise<UnifiedLandmark[]> {
  const service = getMediaPipeWebService();
  const result = await service.detectFromImage(imageElement);
  return result.landmarks as unknown as UnifiedLandmark[];
}

/**
 * Legacy function: process video
 * @deprecated Use getMediaPipeWebService().detectFromVideoElement() instead
 */
export async function processVideo(
  videoElement: HTMLVideoElement,
  onProgress?: (progress: number) => void
): Promise<any[]> {
  const service = getMediaPipeWebService();
  const result = await service.detectFromVideoElement(videoElement, (progress) => {
    if (onProgress) {
      onProgress(progress.percentage / 100);
    }
  });

  // Convert back to legacy format
  return result.frames.map((frame) => ({
    timestamp: frame.timestamp,
    landmarks: frame.landmarks as unknown as UnifiedLandmark[],
    worldLandmarks: [], // Legacy format had this
  }));
}
