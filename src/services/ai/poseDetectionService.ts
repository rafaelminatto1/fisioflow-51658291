import { UnifiedLandmark } from '@/utils/geometry';
import { logger } from '@/lib/errors/logger';

// Extend Window interface for MediaPipe Pose
declare global {
  interface Window {
    Pose?: PoseConstructor;
  }
}

// Type definitions for @mediapipe/pose (UMD module)
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
    new(options: PoseOptions): PoseInstance;
}

// We use the legacy solution for simplicity as it shares assets with the realtime one
// provided in @mediapipe/pose package which is already installed.

let poseEstimator: PoseInstance | null = null;
let PoseClass: PoseConstructor | null = null;

export const initPoseEstimator = async () => {
    if (poseEstimator) return poseEstimator;

    // Dynamically import the @mediapipe/pose module
    if (!PoseClass) {
        await import('@mediapipe/pose');
        // The module attaches Pose to the global window object
        if (typeof window !== 'undefined' && window.Pose) {
            PoseClass = window.Pose;
        } else {
            logger.error('Pose constructor not found on window object', undefined, 'poseDetectionService');
            throw new Error('Failed to load MediaPipe Pose');
        }
    }

    const pose = new PoseClass({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
    });

    pose.setOptions({
        modelComplexity: 2, // 2 = heavy (most accurate)
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    await pose.initialize();
    poseEstimator = pose;
    return pose;
};

export const detectPoseInImage = async (imageElement: HTMLImageElement): Promise<UnifiedLandmark[]> => {
    const detector = await initPoseEstimator();

    return new Promise((resolve, reject) => {
        const onResults = (results: PoseResults) => {
            if (results.poseLandmarks) {
                resolve(results.poseLandmarks as UnifiedLandmark[]);
            } else {
                resolve([]);
            }
        };

        // One-off listener
        // Note: pose.onResults replaces the previous listener. 
        // In a real concurrent app, this singleton might be an issue.
        // For this wizard, it's sequential.
        detector.onResults(onResults);

        detector.send({ image: imageElement }).catch(reject);
    });
};

