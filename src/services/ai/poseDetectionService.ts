/**
 * Pose Detection Service
 *
 * This service provides static image pose detection functionality.
 * It now uses the platform-agnostic pose detection abstraction layer,
 * supporting both MediaPipe (web) and TFLite (iOS).
 *
 * @deprecated Import from `@/services/ai/pose` instead for new code.
 *   This file is kept for backward compatibility.
 */

import { UnifiedLandmark } from '@/utils/geometry';
import { createPoseDetectionService } from '@/services/ai/pose';
import type { PoseDetectionResult } from '@/services/ai/pose/types';

// ============================================================================
// Legacy Types (for backward compatibility with MediaPipe UMD)
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

// ============================================================================
// Legacy Singleton (kept for backward compatibility)
// ============================================================================

let poseEstimator: PoseInstance | null = null;
let PoseClass: PoseConstructor | null = null;

/**
 * Initialize the pose estimator singleton
 *
 * @deprecated Use `createPoseDetectionService()` instead. This function
 *   is kept for backward compatibility but will be removed in future versions.
 */
export const initPoseEstimator = async (): Promise<PoseInstance> => {
  if (poseEstimator) return poseEstimator;

  // Dynamically import the @mediapipe/pose module
  if (!PoseClass) {
    await import('@mediapipe/pose');
    // The module attaches Pose to the global window object
    if (typeof window !== 'undefined' && (window as any).Pose) {
      PoseClass = (window as any).Pose as PoseConstructor;
    } else {
      console.error('Pose constructor not found on window object');
      throw new Error('Failed to load MediaPipe Pose');
    }
  }

  const pose = new PoseClass({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    },
  });

  pose.setOptions({
    modelComplexity: 2, // 2 = heavy (most accurate)
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  await pose.initialize();
  poseEstimator = pose;
  return pose;
};

// ============================================================================
// Refactored Service Functions
// ============================================================================

/**
 * Detect pose in a static image
 *
 * This function now uses the platform-agnostic pose detection service,
 * automatically selecting the appropriate implementation (MediaPipe for web,
 * TFLite for iOS) based on the runtime platform.
 *
 * @param imageElement - HTMLImageElement to analyze
 * @returns Promise resolving to array of pose landmarks
 *
 * @example
 * ```typescript
 * const landmarks = await detectPoseInImage(imageElement);
 * console.log(`Detected ${landmarks.length} landmarks`);
 * ```
 *
 * @deprecated Use `createPoseDetectionService().detectFromImage()` instead.
 *   This function is kept for backward compatibility.
 */
export const detectPoseInImage = async (
  imageElement: HTMLImageElement
): Promise<UnifiedLandmark[]> => {
  // Use the new abstraction layer
  const service = createPoseDetectionService({ debug: false });
  const result: PoseDetectionResult = await service.detectFromImage(imageElement);

  // Convert to legacy format
  return result.landmarks as unknown as UnifiedLandmark[];
};

/**
 * Detect pose from image data URL or base64 string
 *
 * @param imageDataUrl - Data URL or base64 encoded image
 * @returns Promise resolving to array of pose landmarks
 */
export const detectPoseFromDataUrl = async (
  imageDataUrl: string
): Promise<UnifiedLandmark[]> => {
  const service = createPoseDetectionService({ debug: false });
  const result: PoseDetectionResult = await service.detectFromImage(imageDataUrl);

  return result.landmarks as unknown as UnifiedLandmark[];
};

/**
 * Detect pose from ImageData object
 *
 * @param imageData - ImageData object from canvas
 * @returns Promise resolving to array of pose landmarks
 */
export const detectPoseFromImageData = async (
  imageData: ImageData
): Promise<UnifiedLandmark[]> => {
  const service = createPoseDetectionService({ debug: false });
  const result: PoseDetectionResult = await service.detectFromImage(imageData);

  return result.landmarks as unknown as UnifiedLandmark[];
};

// ============================================================================
// Batch Processing Utilities
// ============================================================================

/**
 * Detect pose in multiple images concurrently
 *
 * @param images - Array of HTMLImageElements
 * @param concurrency - Number of images to process simultaneously (default: 3)
 * @returns Promise resolving to array of landmark arrays
 */
export const detectPoseInImagesBatch = async (
  images: HTMLImageElement[],
  concurrency: number = 3
): Promise<UnifiedLandmark[][]> => {
  const results: UnifiedLandmark[][] = [];

  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((img) => detectPoseInImage(img)));
    results.push(...batchResults);
  }

  return results;
};

/**
 * Detect pose in multiple images with progress callback
 *
 * @param images - Array of HTMLImageElements
 * @param onProgress - Callback for progress updates
 * @returns Promise resolving to array of landmark arrays
 */
export const detectPoseInImagesWithProgress = async (
  images: HTMLImageElement[],
  onProgress?: (current: number, total: number) => void
): Promise<UnifiedLandmark[][]> => {
  const results: UnifiedLandmark[][] = [];

  for (let i = 0; i < images.length; i++) {
    const landmarks = await detectPoseInImage(images[i]);
    results.push(landmarks);

    if (onProgress) {
      onProgress(i + 1, images.length);
    }
  }

  return results;
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Reset the pose estimator singleton
 *
 * This clears the cached pose estimator instance, forcing re-initialization
 * on the next call to `initPoseEstimator()`.
 */
export const resetPoseEstimator = (): void => {
  if (poseEstimator) {
    poseEstimator.close();
    poseEstimator = null;
  }
  PoseClass = null;
};

/**
 * Check if pose estimator is initialized
 */
export const isPoseEstimatorInitialized = (): boolean => {
  return poseEstimator !== null;
};

// ============================================================================
// Re-exports for backward compatibility
// ============================================================================

export type { PoseDetectionResult, VideoAnalysisResult } from '@/services/ai/pose/types';
export { createPoseDetectionService } from '@/services/ai/pose';
