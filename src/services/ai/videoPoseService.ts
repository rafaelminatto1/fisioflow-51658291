/**
 * Video Pose Detection Service
 *
 * This service processes videos frame-by-frame to detect pose landmarks
 * throughout the video. It now uses the platform-agnostic pose detection
 * abstraction layer, supporting both MediaPipe (web) and TFLite (iOS).
 *
 * @deprecated Import from `@/services/ai/pose` instead for new code.
 *   This file is kept for backward compatibility.
 */

import type { VideoAnalysisFrame } from './types';
import { createPoseDetectionService } from '@/services/ai/pose';
import type { PoseDetectionResult } from '@/services/ai/pose/types';
import { Point3D, UnifiedLandmark, POSE_LANDMARKS } from '@/utils/geometry';

// ============================================================================
// Legacy Types (for backward compatibility)
// ============================================================================

export interface VideoAnalysisFrame {
  timestamp: number;
  landmarks: UnifiedLandmark[];
  worldLandmarks: Point3D[];
}

// ============================================================================
// Refactored Service Functions
// ============================================================================

/**
 * Process a video element to extract pose landmarks frame by frame
 *
 * This function now uses the platform-agnostic pose detection service,
 * automatically selecting the appropriate implementation (MediaPipe for web,
 * TFLite for iOS) based on the runtime platform.
 *
 * @param videoElement - HTMLVideoElement to process
 * @param onProgress - Optional callback for progress updates (0-1)
 * @returns Promise resolving to array of frame results with landmarks
 *
 * @example
 * ```typescript
 * const results = await processVideo(videoElement, (progress) => {
 *   console.log(`Processing: ${Math.round(progress * 100)}%`);
 * });
 * ```
 */
export const processVideo = async (
  videoElement: HTMLVideoElement,
  onProgress?: (progress: number) => void
): Promise<VideoAnalysisFrame[]> => {
  const service = createPoseDetectionService({ debug: false });

  // Ensure video is loaded and we know duration
  if (Number.isNaN(videoElement.duration)) {
    throw new Error('Video duration unknown. Please wait for metadata.');
  }

  const duration = videoElement.duration;
  const fps = 30; // Processing FPS target
  let currentTime = 0;

  // Pause video to take control
  videoElement.pause();
  videoElement.currentTime = 0;

  // We need to wait for seek to complete before processing
  const waitForSeek = () =>
    new Promise<void>((resolve) => {
      const handler = () => {
        videoElement.removeEventListener('seeked', handler);
        resolve();
      };
      videoElement.addEventListener('seeked', handler);
    });

  const legacyResults: VideoAnalysisFrame[] = [];

  // Process frame by frame
  while (currentTime < duration) {
    videoElement.currentTime = currentTime;
    await waitForSeek();

    // Detect pose at this frame
    // Create a canvas to extract the current frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.drawImage(videoElement, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use the abstract service to detect pose
    const result: PoseDetectionResult = await service.detectFromImage(imageData);

    // Convert to legacy format
    const unified: UnifiedLandmark[] = result.landmarks.map((lm, index) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility,
      name:
        Object.keys(POSE_LANDMARKS).find(
          (key) => POSE_LANDMARKS[key as keyof typeof POSE_LANDMARKS] === index
        ) || `unknown_${index}`,
    }));

    const world: Point3D[] = result.landmarks.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z || 0,
      visibility: lm.visibility,
    }));

    legacyResults.push({
      timestamp: currentTime,
      landmarks: unified,
      worldLandmarks: world,
    });

    if (onProgress) {
      onProgress(currentTime / duration);
    }

    currentTime += 1 / fps; // Advance 1 frame
  }

  return legacyResults;
};

/**
 * Process video from a file URL
 *
 * @param videoUrl - URL of the video file
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to array of frame results
 */
export const processVideoFromUrl = async (
  videoUrl: string,
  onProgress?: (progress: number) => void
): Promise<VideoAnalysisFrame[]> => {
  const videoElement = document.createElement('video');
  videoElement.crossOrigin = 'anonymous';
  videoElement.playsInline = true;
  videoElement.muted = true;

  // Wait for video metadata to load
  await new Promise<void>((resolve, reject) => {
    videoElement.onloadedmetadata = () => resolve();
    videoElement.onerror = () => reject(new Error('Failed to load video'));
    videoElement.src = videoUrl;
  });

  return processVideo(videoElement, onProgress);
};

/**
 * Process video from a File object
 *
 * @param videoFile - File object from file input
 * @param onProgress - Optional callback for progress updates
 * @returns Promise resolving to array of frame results
 */
export const processVideoFromFile = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<VideoAnalysisFrame[]> => {
  const url = URL.createObjectURL(videoFile);
  try {
    return await processVideoFromUrl(url, onProgress);
  } finally {
    URL.revokeObjectURL(url);
  }
};

// ============================================================================
// Batch Processing Utilities
// ============================================================================

/**
 * Process multiple videos concurrently
 *
 * @param videos - Array of video elements or URLs
 * @param onProgress - Callback for overall progress
 * @param concurrency - Number of videos to process simultaneously (default: 2)
 * @returns Promise resolving to array of results for each video
 */
export const processVideosBatch = async (
  videos: Array<HTMLVideoElement | string>,
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void,
  concurrency: number = 2
): Promise<VideoAnalysisFrame[][]> => {
  const results: VideoAnalysisFrame[][] = [];
  const total = videos.length;

  for (let i = 0; i < videos.length; i += concurrency) {
    const batch = videos.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((video) =>
        typeof video === 'string'
          ? processVideoFromUrl(video)
          : processVideo(video)
      )
    );

    results.push(...batchResults);

    if (onProgress) {
      onProgress({
        current: i + batch.length,
        total,
        percentage: ((i + batch.length) / total) * 100,
      });
    }
  }

  return results;
};

// ============================================================================
// Re-exports for backward compatibility
// ============================================================================

export type { PoseDetectionResult, VideoAnalysisResult, PoseDetectionFrame } from '@/services/ai/pose/types';
export { createPoseDetectionService } from '@/services/ai/pose';
