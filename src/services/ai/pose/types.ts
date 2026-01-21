/**
 * Unified types for pose detection across platforms (Web and iOS)
 *
 * This defines the interface that both MediaPipe (web) and TFLite (iOS)
 * implementations must follow, ensuring platform-agnostic pose detection.
 */

/**
 * Error class for pose detection failures
 */
export class PoseDetectionError extends Error {
  constructor(
    message: string,
    public code: PoseErrorCode,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PoseDetectionError';
  }
}

/**
 * Error codes for pose detection failures
 */
export enum PoseErrorCode {
  /** Camera access denied or unavailable */
  CAMERA_ERROR = 'CAMERA_ERROR',
  /** Model failed to load or initialize */
  MODEL_LOAD_ERROR = 'MODEL_LOAD_ERROR',
  /** Invalid input data or format */
  INVALID_INPUT = 'INVALID_INPUT',
  /** Inference failed */
  INFERENCE_ERROR = 'INFERENCE_ERROR',
  /** Platform not supported */
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  /** Service not initialized */
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  /** Unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Single pose landmark (body keypoint) with 3D coordinates
 *
 * MediaPipe and MoveNet both provide pose landmarks, but with different
 * indexing schemes. This unified format ensures consistency across platforms.
 */
export interface PoseLandmark {
  /** Normalized x coordinate (0.0 - 1.0, where 0 = left, 1 = right) */
  x: number;
  /** Normalized y coordinate (0.0 - 1.0, where 0 = top, 1 = bottom) */
  y: number;
  /** Normalized z coordinate (depth, relative to hips, negative = closer to camera) */
  z: number;
  /** Visibility/confidence score (0.0 - 1.0, where 1.0 = fully visible) */
  visibility: number;
}

/**
 * Complete pose detection result from a single frame or image
 */
export interface PoseDetectionResult {
  /** Array of 33 pose landmarks following MediaPipe BlazePose indexing */
  landmarks: PoseLandmark[];
  /** Overall confidence score for the detection (0.0 - 1.0) */
  confidence: number;
  /** Unix timestamp in milliseconds when detection was performed */
  timestamp: number;
}

/**
 * Result from video processing with multiple frames
 */
export interface VideoAnalysisResult {
  /** Individual frame results */
  frames: PoseDetectionFrame[];
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Average FPS achieved during processing */
  averageFps: number;
  /** Total number of frames processed */
  totalFrames: number;
}

/**
 * Single frame result from video analysis
 */
export interface PoseDetectionFrame {
  /** Pose landmarks for this frame */
  landmarks: PoseLandmark[];
  /** Frame timestamp in video (seconds) */
  timestamp: number;
  /** Confidence score for this frame */
  confidence: number;
}

/**
 * Progress callback for video processing
 */
export type VideoProgressCallback = (progress: {
  /** Current frame number */
  currentFrame: number;
  /** Total frames to process */
  totalFrames: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current FPS */
  fps: number;
}) => void;

/**
 * Real-time pose detection callback
 */
export type PoseDetectionCallback = (result: PoseDetectionResult) => void;

/**
 * Real-time detection status and metrics
 */
export interface RealtimeDetectionStatus {
  /** Whether detection is currently active */
  isActive: boolean;
  /** Current FPS */
  fps: number;
  /** Average processing time per frame (ms) */
  avgProcessingTime: number;
  /** Whether GPU acceleration is enabled */
  gpuEnabled: boolean;
}

/**
 * Platform detection service interface
 *
 * All pose detection services must implement this interface.
 * This allows the application to use the same API regardless of
 * whether it's running on web (MediaPipe) or iOS (TFLite/MoveNet).
 */
export interface IPoseDetectionService {
  /**
   * Detect pose from a static image
   *
   * @param imageData - Image data as HTML ImageElement, ImageData, or base64 string
   * @returns Promise resolving to pose detection result
   */
  detectFromImage(imageData: HTMLImageElement | ImageData | string): Promise<PoseDetectionResult>;

  /**
   * Detect pose from video file (frame-by-frame processing)
   *
   * @param videoFile - Video file or URL
   * @param onProgress - Optional callback for progress updates
   * @returns Promise resolving to video analysis results
   */
  detectFromVideo(
    videoFile: File | string,
    onProgress?: VideoProgressCallback
  ): Promise<VideoAnalysisResult>;

  /**
   * Start real-time pose detection from camera
   *
   * @param callback - Function called with each pose detection result
   * @param options - Optional configuration for target FPS, resolution, etc.
   * @returns Promise resolving when detection is started
   */
  startRealtimeDetection(
    callback: PoseDetectionCallback,
    options?: RealtimeDetectionOptions
  ): Promise<RealtimeDetectionStatus>;

  /**
   * Stop real-time pose detection
   *
   * @returns Promise resolving when detection is stopped
   */
  stopRealtimeDetection(): Promise<void>;

  /**
   * Check if the service is available and ready
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get service capabilities and info
   */
  getCapabilities(): Promise<PoseServiceCapabilities>;
}

/**
 * Options for real-time detection
 */
export interface RealtimeDetectionOptions {
  /** Target frames per second (default: 30) */
  targetFps?: number;
  /** Whether to enable GPU acceleration (default: true) */
  enableGpu?: boolean;
  /** Model complexity: 'lite' (faster) or 'full' (more accurate) */
  modelComplexity?: 'lite' | 'full';
  /** Minimum confidence threshold (0.0 - 1.0, default: 0.5) */
  minConfidence?: number;
}

/**
 * Service capabilities and metadata
 */
export interface PoseServiceCapabilities {
  /** Service name (e.g., 'MediaPipe Web', 'TFLite iOS') */
  name: string;
  /** Service version */
  version: string;
  /** Platform: 'web' | 'ios' | 'android' */
  platform: string;
  /** Whether GPU acceleration is available */
  supportsGpu: boolean;
  /** Maximum FPS achievable */
  maxFps: number;
  /** Number of landmarks provided */
  landmarkCount: number;
  /** Whether real-time detection is supported */
  supportsRealtime: boolean;
  /** Whether video processing is supported */
  supportsVideo: boolean;
}

/**
 * MediaPipe BlazePose landmark indices (33 landmarks)
 *
 * This reference is used for landmark mapping between MoveNet (17 landmarks)
 * and MediaPipe (33 landmarks).
 */
export enum MediaPipeLandmark {
  Nose = 0,
  LeftEyeInner = 1,
  LeftEye = 2,
  LeftEyeOuter = 3,
  RightEyeInner = 4,
  RightEye = 5,
  RightEyeOuter = 6,
  LeftEar = 7,
  RightEar = 8,
  MouthLeft = 9,
  MouthRight = 10,
  LeftShoulder = 11,
  RightShoulder = 12,
  LeftElbow = 13,
  RightElbow = 14,
  LeftWrist = 15,
  RightWrist = 16,
  LeftPinky = 17,
  RightPinky = 18,
  LeftIndex = 19,
  RightIndex = 20,
  LeftThumb = 21,
  RightThumb = 22,
  LeftHip = 23,
  RightHip = 24,
  LeftKnee = 25,
  RightKnee = 26,
  LeftAnkle = 27,
  RightAnkle = 28,
  LeftHeel = 29,
  RightHeel = 30,
  LeftFootIndex = 31,
  RightFootIndex = 32,
}

/**
 * MoveNet Lightning landmark indices (17 keypoints)
 *
 * Used for mapping to MediaPipe's 33 landmarks.
 */
export enum MoveNetLandmark {
  Nose = 0,
  LeftEye = 1,
  RightEye = 2,
  LeftShoulder = 5,
  RightShoulder = 6,
  LeftElbow = 7,
  RightElbow = 8,
  LeftWrist = 9,
  RightWrist = 10,
  LeftHip = 11,
  RightHip = 12,
  LeftKnee = 13,
  RightKnee = 14,
  LeftAnkle = 15,
  RightAnkle = 16,
}
