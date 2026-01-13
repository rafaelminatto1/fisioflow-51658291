import { Pose, Results } from '@mediapipe/pose';
import { UnifiedLandmark } from '@/utils/geometry';

// We use the legacy solution for simplicity as it shares assets with the realtime one
// provided in @mediapipe/pose package which is already installed.


let poseEstimator: Pose | null = null;

export const initPoseEstimator = async () => {
    if (poseEstimator) return poseEstimator;

    const pose = new Pose({
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
        const onResults = (results: Results) => {
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
