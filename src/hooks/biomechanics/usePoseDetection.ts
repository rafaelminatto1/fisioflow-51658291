import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaPipeVision } from "@/hooks/performance";
import { resolveMediaPipeVisionFileset } from "@/lib/ai/mediapipe";
import { fisioLogger as logger } from "@/lib/errors/logger";

export type PoseLandmarkerInstance = any; // Will be properly typed when module loads

export interface UsePoseDetectionOptions {
  runningMode?: "IMAGE" | "VIDEO";
  modelAssetPath?: string;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  outputSegmentationMasks?: boolean;
}

const DEFAULT_OPTIONS: UsePoseDetectionOptions = {
  runningMode: "IMAGE",
  modelAssetPath:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  outputSegmentationMasks: false,
};

/**
 * Advanced hook for Pose Detection using MediaPipe Tasks Vision.
 * Handles lazy loading, initialization, and provides detection methods.
 */
export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const { load, isLoaded: libraryLoaded, isLoading: libraryLoading } = useMediaPipeVision();
  const [landmarker, setLandmarker] = useState<PoseLandmarkerInstance | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const landmarkerRef = useRef<PoseLandmarkerInstance | null>(null);
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const initLandmarker = useCallback(async () => {
    if (landmarkerRef.current || isInitializing) return;

    try {
      setIsInitializing(true);
      setError(null);

      // Ensure library is loaded
      const visionModule = await load();
      if (!visionModule) throw new Error("Falha ao carregar módulo MediaPipe Vision.");

      const { PoseLandmarker, FilesetResolver } = visionModule;
      const vision = await resolveMediaPipeVisionFileset(FilesetResolver);

      const instance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: mergedOptions.modelAssetPath,
          delegate: "GPU",
        },
        runningMode: mergedOptions.runningMode,
        minPoseDetectionConfidence: mergedOptions.minPoseDetectionConfidence,
        minPosePresenceConfidence: mergedOptions.minPosePresenceConfidence,
        minTrackingConfidence: mergedOptions.minTrackingConfidence,
        outputSegmentationMasks: mergedOptions.outputSegmentationMasks,
      });

      landmarkerRef.current = instance;
      setLandmarker(instance);
      logger.info(
        "PoseLandmarker inicializado com sucesso",
        { mode: mergedOptions.runningMode },
        "usePoseDetection",
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      logger.error("Erro ao inicializar PoseLandmarker", error, "usePoseDetection");
    } finally {
      setIsInitializing(false);
    }
  }, [
    load,
    isInitializing,
    mergedOptions.modelAssetPath,
    mergedOptions.runningMode,
    mergedOptions.minPoseDetectionConfidence,
    mergedOptions.minPosePresenceConfidence,
    mergedOptions.minTrackingConfidence,
    mergedOptions.outputSegmentationMasks,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
        setLandmarker(null);
      }
    };
  }, []);

  /**
   * Detect poses in a single image frame
   */
  const detect = useCallback(
    (image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) => {
      if (!landmarkerRef.current) return null;

      try {
        if (mergedOptions.runningMode === "IMAGE") {
          return landmarkerRef.current.detect(image);
        } else {
          // For VIDEO mode, use current timestamp
          return landmarkerRef.current.detectForVideo(image, performance.now());
        }
      } catch (err) {
        logger.error("Erro durante a detecção de pose", err as Error, "usePoseDetection");
        return null;
      }
    },
    [mergedOptions.runningMode],
  );

  return {
    landmarker,
    isLoading: libraryLoading || isInitializing,
    isReady: !!landmarker && libraryLoaded,
    error,
    init: initLandmarker,
    detect,
  };
}
