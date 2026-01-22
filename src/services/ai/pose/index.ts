/**
 * Platform-agnostic pose detection service factory
 *
 * This module provides a unified interface for pose detection across platforms:
 * - Web: Uses MediaPipe BlazePose (faster, more accurate)
 * - Mobile (iOS/Android): Uses TensorFlow.js MoveNet (works without native code)
 *
 * The factory pattern ensures the rest of the app doesn't need to know
 * which platform-specific implementation is being used.
 */

import { Capacitor } from '@capacitor/core';
import { getPlatform } from '@/hooks/platform/usePlatform';
import type { IPoseDetectionService } from './types';
import { MediaPipeWebService } from './web/MediaPipeWebService';
import { TensorFlowPoseService } from './tensorflow/TensorFlowPoseService';

/**
 * Detection mode for forcing a specific implementation
 */
export type PoseDetectionMode = 'auto' | 'web' | 'tensorflow';

/**
 * Factory options for service creation
 */
export interface PoseServiceFactoryOptions {
  /** Force a specific mode (useful for testing or fallback) */
  mode?: PoseDetectionMode;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Global service instance (singleton pattern)
 */
let serviceInstance: IPoseDetectionService | null = null;
let serviceMode: PoseDetectionMode = 'auto';

/**
 * Get or create the platform-appropriate pose detection service
 *
 * @param options - Optional factory configuration
 * @returns Pose detection service instance
 *
 * @example
 * ```typescript
 * const service = createPoseDetectionService();
 * const result = await service.detectFromImage(imageElement);
 * ```
 */
export function createPoseDetectionService(
  options: PoseServiceFactoryOptions = {}
): IPoseDetectionService {
  const { mode = 'auto', debug = false } = options;

  // Return existing instance if available and mode hasn't changed
  if (serviceInstance && mode === serviceMode) {
    if (debug) {
      console.log('[PoseDetection] Returning existing service instance');
    }
    return serviceInstance;
  }

  // Determine which implementation to use
  const selectedMode = mode === 'auto' ? detectOptimalMode() : mode;
  const platformInfo = getPlatform();

  if (debug) {
    console.log('[PoseDetection] Creating service with mode:', selectedMode);
    console.log('[PoseDetection] Platform:', platformInfo.platform);
    console.log('[PoseDetection] Is native:', Capacitor.isNativePlatform());
  }

  // Create appropriate service instance
  switch (selectedMode) {
    case 'tensorflow':
      serviceInstance = new TensorFlowPoseService({ debug });
      break;

    case 'web':
    default:
      serviceInstance = new MediaPipeWebService({ debug });
      break;
  }

  serviceMode = selectedMode;

  if (debug) {
    console.log('[PoseDetection] Service created:', serviceInstance.constructor.name);
  }

  return serviceInstance;
}

/**
 * Reset the service instance (useful for testing or re-initialization)
 */
export function resetPoseDetectionService(): void {
  if (serviceInstance) {
    // Stop any active real-time detection
    serviceInstance.stopRealtimeDetection().catch((err) => {
      console.warn('[PoseDetection] Error stopping service during reset:', err);
    });
  }
  serviceInstance = null;
  serviceMode = 'auto';
}

/**
 * Get the current service mode
 */
export function getCurrentServiceMode(): PoseDetectionMode {
  return serviceMode;
}

/**
 * Detect the optimal mode based on platform and capabilities
 */
function detectOptimalMode(): PoseDetectionMode {
  const platformInfo = getPlatform();
  const isNative = platformInfo.isNative || Capacitor.isNativePlatform();
  const isIOS = platformInfo.isIOS;
  const isAndroid = platformInfo.isAndroid;
  const isWeb = platformInfo.isWeb;

  // iOS/Android: Use TensorFlow.js (works without native code)
  if (isNative && (isIOS || isAndroid)) {
    return 'tensorflow';
  }

  // Web: Use MediaPipe web (faster and more accurate)
  if (isWeb) {
    return 'web';
  }

  // Fallback to TensorFlow.js
  return 'tensorflow';
}

/**
 * Get service capabilities for the current platform
 *
 * This can be called before creating the service to check availability.
 */
export async function getPoseDetectionCapabilities(
  options: PoseServiceFactoryOptions = {}
) {
  const service = createPoseDetectionService(options);
  return service.getCapabilities();
}

/**
 * Check if pose detection is available on the current platform
 */
export async function isPoseDetectionAvailable(
  options: PoseServiceFactoryOptions = {}
): Promise<boolean> {
  try {
    const service = createPoseDetectionService(options);
    return await service.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Feature flags for pose detection (can be used for gradual rollout)
 */
export const POSE_DETECTION_FEATURES = {
  /** Enable TensorFlow.js on mobile (works without native code) */
  TENSORFLOW_MOBILE_ENABLED: true,
  /** Enable real-time detection (may be disabled for low-end devices) */
  REALTIME_ENABLED: true,
  /** Enable GPU acceleration (when available) */
  GPU_ACCELERATION: true,
  /** Minimum iOS version for TensorFlow.js */
  MIN_IOS_VERSION: '13.0',
} as const;

/**
 * Check if TensorFlow.js should be used on mobile
 *
 * This considers feature flags and platform capabilities.
 */
export function shouldUseTensorFlowMobile(): boolean {
  if (!POSE_DETECTION_FEATURES.TENSORFLOW_MOBILE_ENABLED) {
    return false;
  }

  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  const platformInfo = getPlatform();
  return platformInfo.isIOS || platformInfo.isAndroid;
}

// Export types for convenience
export type {
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
  PoseDetectionError,
  PoseErrorCode,
} from './types';

export { MediaPipeLandmark, MoveNetLandmark } from './types';
