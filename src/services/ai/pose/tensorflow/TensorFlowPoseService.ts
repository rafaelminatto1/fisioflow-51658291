/**
 * TensorFlow.js Service implementation for pose detection
 *
 * This service uses @tensorflow-models/pose-detection which works on:
 * - Web (browsers with WebGL/WebGPU)
 * - React Native (iOS & Android) via @tensorflow/tfjs-react-native
 * - No native code required!
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
import { mapMoveNetToMediaPipe, type MoveNetKeypoint } from '@/utils/landmarkMapping';

// ============================================================================
// Type Definitions for TensorFlow.js
// ============================================================================

interface PoseDetector {
  estimatePoses(
    image: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageData
  ): Promise<PoseDetectionResult[]>;
  dispose(): void;
}

interface MoveNetResult {
  keypoints: Array<{
    name: string;
    score: number;
    x: number;
    y: number;
  }>;
  score: number;
}

interface PoseDetectionConstructor {
  createDetector(
    model: 'MoveNet' | 'BlazePose' | 'PoseNet',
    options?: {
      modelType?: 'lightning' | 'thunder' | 'full' | 'lite';
      enableSmoothing?: boolean;
      minConfidence?: number;
    }
  ): Promise<PoseDetector>;
}

// ============================================================================
// TensorFlow.js Pose Service
// ============================================================================

export interface TensorFlowPoseServiceOptions {
  debug?: boolean;
  modelType?: 'lightning' | 'thunder';
  enableSmoothing?: boolean;
  minConfidence?: number;
}

/**
 * TensorFlow.js implementation using MoveNet
 *
 * This service works everywhere without native code:
 * - Web browsers (WebGL/WebGPU)
 * - React Native iOS & Android (via tfjs-react-native)
 */
export class TensorFlowPoseService implements IPoseDetectionService {
  private detector: PoseDetector | null = null;
  private isInitialized = false;
  private readonly debug: boolean;
  private readonly modelType: 'lightning' | 'thunder';
  private readonly enableSmoothing: boolean;
  private readonly minConfidence: number;
  private realtimeCallback: PoseDetectionCallback | null = null;
  private realtimeActive = false;

  constructor(options: TensorFlowPoseServiceOptions = {}) {
    this.debug = options.debug ?? false;
    this.modelType = options.modelType ?? 'lightning';
    this.enableSmoothing = options.enableSmoothing ?? true;
    this.minConfidence = options.minConfidence ?? 0.3;
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load TensorFlow.js and pose detection model
      const { createDetector } = await import('@tensorflow-models/pose-detection');

      // Initialize backend
      const tf = await import('@tensorflow/tfjs');

      // Set backend based on platform
      if (typeof window !== 'undefined' && 'gpu' in (navigator as any)) {
        await tf.setBackend('webgl');
      } else {
        await tf.setBackend('cpu');
      }

      // Create pose detector
      this.detector = await createDetector('MoveNet', {
        modelType: this.modelType,
        enableSmoothing: this.enableSmoothing,
      });

      this.isInitialized = true;

      if (this.debug) {
        console.log('[TensorFlowPoseService] Initialized with model:', this.modelType);
        console.log('[TensorFlowPoseService] Backend:', tf.getBackend());
      }
    } catch (error) {
      throw new PoseDetectionError(
        'Failed to initialize TensorFlow.js pose detection',
        PoseErrorCode.MODEL_LOAD_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  // ========================================================================
  // IPoseDetectionService Implementation
  // ========================================================================

  async detectFromImage(
    imageData: HTMLImageElement | ImageData | string
  ): Promise<PoseDetectionResult> {
    await this.ensureInitialized();

    let imageElement: HTMLImageElement | ImageData;

    if (typeof imageData === 'string') {
      // Base64 or URL string
      imageElement = await this.loadImage(imageData);
    } else if (imageData instanceof HTMLImageElement) {
      imageElement = imageData;
    } else if (imageData instanceof ImageData) {
      imageElement = imageData;
    } else {
      throw new PoseDetectionError(
        'Invalid image data format',
        PoseErrorCode.INVALID_INPUT
      );
    }

    const poses = await this.detector!.estimatePoses(imageElement);

    if (poses.length === 0) {
      return {
        landmarks: this.createEmptyLandmarks(),
        confidence: 0,
        timestamp: Date.now(),
      };
    }

    return this.convertPoseToResult(poses[0]);
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

    // Ensure video is loaded
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
      const poses = await this.detector!.estimatePoses(videoElement);

      if (poses.length > 0) {
        const result = this.convertPoseToResult(poses[0]);
        frames.push({
          landmarks: result.landmarks,
          timestamp: currentTime,
          confidence: result.confidence,
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

    // Note: The actual frame processing needs to be called from your video/camera loop
    // Use processVideoFrame() method
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
    const tf = await import('@tensorflow/tfjs');
    const backend = tf.getBackend();

    return {
      name: `TensorFlow.js MoveNet ${this.modelType}`,
      version: '4.22.0',
      platform: typeof navigator !== 'undefined' ? 'web' : 'native',
      supportsGpu: backend === 'webgl' || backend === 'webgpu',
      maxFps: this.modelType === 'lightning' ? 30 : 20,
      landmarkCount: 33, // We provide 33 after mapping
      supportsRealtime: true,
      supportsVideo: true,
    };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Process a video frame for real-time detection
   * Call this method from your camera/video loop
   */
  async processVideoFrame(
    videoElement: HTMLVideoElement | ImageData
  ): Promise<void> {
    if (!this.realtimeActive || !this.realtimeCallback || !this.detector) {
      return;
    }

    try {
      const poses = await this.detector.estimatePoses(videoElement);

      if (poses.length > 0 && this.realtimeCallback) {
        const result = this.convertPoseToResult(poses[0]);
        this.realtimeCallback(result);
      }
    } catch (error) {
      if (this.debug) {
        console.error('[TensorFlowPoseService] Frame processing error:', error);
      }
    }
  }

  /**
   * Convert MoveNet result to our unified format
   */
  private convertPoseToResult(pose: any): PoseDetectionResult {
    // MoveNet returns 17 keypoints, need to map to 33 MediaPipe landmarks
    const moveNetKeypoints: MoveNetKeypoint[] = pose.keypoints || [];

    const mapped = mapMoveNetToMediaPipe(moveNetKeypoints);

    // Calculate confidence
    const confidence = pose.score ?? this.calculateConfidence(mapped);

    return {
      landmarks: mapped,
      confidence,
      timestamp: Date.now(),
    };
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
   * Create empty landmarks array (33 landmarks)
   */
  private createEmptyLandmarks(): PoseLandmark[] {
    return Array(33).fill(null).map(() => ({
      x: 0,
      y: 0,
      z: 0,
      visibility: 0,
    }));
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
    this.detector?.dispose();
    this.detector = null;
    this.isInitialized = false;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new TensorFlow pose service instance
 */
export function createTensorFlowPoseService(
  options?: TensorFlowPoseServiceOptions
): TensorFlowPoseService {
  return new TensorFlowPoseService(options);
}
