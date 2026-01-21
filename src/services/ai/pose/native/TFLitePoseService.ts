/**
 * TensorFlow Lite (MoveNet) implementation for iOS
 *
 * This service uses native iOS modules to run pose detection using
 * TensorFlow Lite with the MoveNet model. It provides real-time
 * pose detection capabilities on iOS devices with GPU acceleration.
 *
 * @see expo-modules/modules/posedetection - Native iOS module
 */

import { Platform } from 'react-native';
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
import { mapMoveNetToMediaPipe, type MoveNetKeypoint } from '../../../utils/landmarkMapping';

// ============================================================================
// Native Module Types
// ============================================================================

/**
 * Native Expo module for pose detection
 * This will be available when the native module is loaded
 */
interface PoseDetectionModule {
  initializeModel(modelPath: string): Promise<boolean>;
  detectPose(
    imageData: number[],
    width: number,
    height: number
  ): Promise<{
    landmarks: Array<{ x: number; y: number; z: number; score: number }>;
    confidence: number;
    timestamp: number;
  }>;
  startRealtimeDetection(callback: (result: any) => void): Promise<void>;
  stopRealtimeDetection(): Promise<void>;
  getCapabilities(): Promise<{
    supportsGpu: boolean;
    maxFps: number;
    model: string;
  }>;
}

// ============================================================================
// TFLitePoseService Options
// ============================================================================

export interface TFLitePoseServiceOptions {
  debug?: boolean;
  modelVariant?: 'lightning' | 'thunder';
  enableGpu?: boolean;
}

// ============================================================================
// TFLitePoseService Implementation
// ============================================================================

/**
 * iOS Native implementation using TensorFlow Lite MoveNet
 *
 * This service communicates with a native iOS Expo module that runs
 * TensorFlow Lite inference for pose detection.
 */
export class TFLitePoseService implements IPoseDetectionService {
  private nativeModule: PoseDetectionModule | null = null;
  private isInitialized = false;
  private readonly debug: boolean;
  private readonly modelVariant: 'lightning' | 'thunder';
  private readonly enableGpu: boolean;
  private realtimeCallback: PoseDetectionCallback | null = null;
  private realtimeActive = false;

  // Model URLs
  private static readonly MODEL_URLS = {
    lightning:
      'https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/float16/4',
    thunder:
      'https://tfhub.dev/google/lite-model/movenet/singlepose/thunder/tflite/float16/4',
  };

  constructor(options: TFLitePoseServiceOptions = {}) {
    this.debug = options.debug ?? false;
    this.modelVariant = options.modelVariant ?? 'lightning';
    this.enableGpu = options.enableGpu ?? true;

    // Verify we're on iOS
    if (Platform.OS !== 'ios') {
      throw new PoseDetectionError(
        'TFLitePoseService is only available on iOS',
        PoseErrorCode.NOT_SUPPORTED
      );
    }
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load the native module
      this.nativeModule = await this.loadNativeModule();

      // Get model URL and initialize
      const modelUrl = TFLitePoseService.MODEL_URLS[this.modelVariant];

      if (this.debug) {
        console.log('[TFLitePoseService] Initializing with model:', this.modelVariant);
        console.log('[TFLitePoseService] Model URL:', modelUrl);
        console.log('[TFLitePoseService] GPU enabled:', this.enableGpu);
      }

      // Initialize the native model
      const success = await this.nativeModule.initializeModel(modelUrl);

      if (!success) {
        throw new Error('Failed to initialize TFLite model');
      }

      this.isInitialized = true;

      if (this.debug) {
        console.log('[TFLitePoseService] Initialized successfully');
      }
    } catch (error) {
      throw new PoseDetectionError(
        'Failed to initialize TFLite pose detection',
        PoseErrorCode.MODEL_LOAD_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  private async loadNativeModule(): Promise<PoseDetectionModule> {
    // Try to load the Expo module
    try {
      // Dynamic import to avoid build issues on web
      const ExpoModules = await import('expo-modules');
      return ExpoModules.default.PoseDetection;
    } catch (error) {
      // Module not available - this is expected in development
      if (this.debug) {
        console.warn(
          '[TFLitePoseService] Native module not available. Make sure to run `npx expo run:ios` to build the native module.'
        );
      }

      throw new PoseDetectionError(
        'Native pose detection module not found. Please build the iOS app with `npx expo run:ios`.',
        PoseErrorCode.NOT_INITIALIZED
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

    // Convert input to raw RGB data
    const { data, width, height } = await this.extractImageData(imageData);

    // Call native module
    const nativeResult = await this.nativeModule!.detectPose(data, width, height);

    // Convert MoveNet result (17 keypoints) to MediaPipe format (33 landmarks)
    const moveNetLandmarks: MoveNetKeypoint[] = nativeResult.landmarks.map(
      (lm) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        score: lm.score,
      })
    );

    const landmarks = mapMoveNetToMediaPipe(moveNetLandmarks);

    return {
      landmarks,
      confidence: nativeResult.confidence,
      timestamp: nativeResult.timestamp,
    };
  }

  async detectFromVideo(
    videoFile: File | string,
    onProgress?: VideoProgressCallback
  ): Promise<VideoAnalysisResult> {
    await this.ensureInitialized();

    // For video processing, we'll need to:
    // 1. Load the video
    // 2. Extract frames
    // 3. Process each frame through the native module
    // 4. Map results

    // This is a placeholder implementation
    // The actual implementation would need a video processing pipeline

    const startTime = Date.now();
    const frames: PoseDetectionFrame[] = [];

    // TODO: Implement video processing
    // This requires extracting frames from the video and processing each one

    throw new PoseDetectionError(
      'Video processing not yet implemented for iOS native module',
      PoseErrorCode.NOT_SUPPORTED
    );
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

    // Set up native callback
    const wrappedCallback = (nativeResult: any) => {
      if (!this.realtimeCallback) return;

      // Convert native result to our format
      const moveNetLandmarks: MoveNetKeypoint[] = nativeResult.landmarks.map(
        (lm: any) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          score: lm.score,
        })
      );

      const landmarks = mapMoveNetToMediaPipe(moveNetLandmarks);

      this.realtimeCallback({
        landmarks,
        confidence: nativeResult.confidence,
        timestamp: nativeResult.timestamp,
      });
    };

    await this.nativeModule!.startRealtimeDetection(wrappedCallback);

    const capabilities = await this.nativeModule!.getCapabilities();

    return {
      isActive: true,
      fps: capabilities.maxFps,
      avgProcessingTime: 0, // Will be updated by native module
      gpuEnabled: capabilities.supportsGpu && this.enableGpu,
    };
  }

  async stopRealtimeDetection(): Promise<void> {
    if (!this.realtimeActive) return;

    await this.nativeModule!.stopRealtimeDetection();
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
    try {
      const nativeCaps = await this.nativeModule!.getCapabilities();

      return {
        name: `TFLite MoveNet ${this.modelVariant}`,
        version: '1.0.0',
        platform: 'ios',
        supportsGpu: nativeCaps.supportsGpu,
        maxFps: nativeCaps.maxFps,
        landmarkCount: 33, // We provide 33 after mapping
        supportsRealtime: true,
        supportsVideo: false, // Not yet implemented
      };
    } catch {
      // Return default capabilities if module not loaded
      return {
        name: `TFLite MoveNet ${this.modelVariant}`,
        version: '1.0.0',
        platform: 'ios',
        supportsGpu: true,
        maxFps: 30,
        landmarkCount: 33,
        supportsRealtime: true,
        supportsVideo: false,
      };
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Extract image data from various input formats
   */
  private async extractImageData(
    imageData: HTMLImageElement | ImageData | string
  ): Promise<{ data: number[]; width: number; height: number }> {
    // TODO: Implement image data extraction
    // This needs to handle:
    // - HTMLImageElement (not available in React Native)
    // - ImageData
    // - Base64 string or URL

    // For now, return a placeholder
    // The actual implementation would use Canvas API (web) or
    // react-native-fast-tflite's image utilities (iOS)

    if (typeof imageData === 'string') {
      // Base64 or URL
      // Would need to load image and extract pixels
      throw new PoseDetectionError(
        'Image loading from string not yet implemented',
        PoseErrorCode.NOT_SUPPORTED
      );
    }

    if (imageData instanceof ImageData) {
      // Convert ImageData to RGB array
      const rgbData: number[] = [];
      for (let i = 0; i < imageData.data.length; i += 4) {
        rgbData.push(imageData.data[i]); // R
        rgbData.push(imageData.data[i + 1]); // G
        rgbData.push(imageData.data[i + 2]); // B
      }
      return {
        data: rgbData,
        width: imageData.width,
        height: imageData.height,
      };
    }

    throw new PoseDetectionError(
      'Unsupported image format',
      PoseErrorCode.INVALID_INPUT
    );
  }

  /**
   * Get the MoveNet model URL for the current variant
   */
  getModelUrl(): string {
    return TFLitePoseService.MODEL_URLS[this.modelVariant];
  }

  /**
   * Check if GPU acceleration is available
   */
  isGpuAvailable(): Promise<boolean> {
    return this.getCapabilities().then((caps) => caps.supportsGpu);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new TFLite pose service instance
 */
export function createTFLitePoseService(
  options?: TFLitePoseServiceOptions
): TFLitePoseService {
  return new TFLitePoseService(options);
}

// ============================================================================
// Fallback/Stub Implementation
// ============================================================================

/**
 * Stub implementation for when native module is not available
 * This allows the app to run without crashing during development
 */
export class TFLitePoseServiceStub implements IPoseDetectionService {
  private readonly debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
    if (debug) {
      console.warn('[TFLitePoseServiceStub] Using stub implementation');
    }
  }

  async detectFromImage(): Promise<PoseDetectionResult> {
    throw new PoseDetectionError(
      'Native module not available. Please build with `npx expo run:ios`.',
      PoseErrorCode.NOT_INITIALIZED
    );
  }

  async detectFromVideo(): Promise<VideoAnalysisResult> {
    throw new PoseDetectionError(
      'Native module not available. Please build with `npx expo run:ios`.',
      PoseErrorCode.NOT_INITIALIZED
    );
  }

  async startRealtimeDetection(): Promise<RealtimeDetectionStatus> {
    throw new PoseDetectionError(
      'Native module not available. Please build with `npx expo run:ios`.',
      PoseErrorCode.NOT_INITIALIZED
    );
  }

  async stopRealtimeDetection(): Promise<void> {
    // No-op
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getCapabilities(): Promise<PoseServiceCapabilities> {
    return {
      name: 'TFLite Pose Service (Stub)',
      version: '0.0.0',
      platform: 'ios',
      supportsGpu: false,
      maxFps: 0,
      landmarkCount: 0,
      supportsRealtime: false,
      supportsVideo: false,
    };
  }
}
