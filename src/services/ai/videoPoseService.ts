import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { Point3D, UnifiedLandmark, POSE_LANDMARKS } from "@/utils/geometry";

let poseLandmarker: PoseLandmarker | null = null;

const initializePoseLandmarker = async () => {
    if (poseLandmarker) return poseLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose/pose_landmarker/float16/1/pose_landmarker_full.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });

    return poseLandmarker;
};

export interface VideoAnalysisFrame {
    timestamp: number;
    landmarks: UnifiedLandmark[];
    worldLandmarks: Point3D[];
}

export const processVideo = async (
    videoElement: HTMLVideoElement,
    onProgress?: (progress: number) => void
): Promise<VideoAnalysisFrame[]> => {
    const landmarker = await initializePoseLandmarker();
    const results: VideoAnalysisFrame[] = [];

    // Ensure video is loaded and we know duration
    if (Number.isNaN(videoElement.duration)) {
        throw new Error("Video duration unknown. Please wait for metadata.");
    }

    const duration = videoElement.duration;
    const fps = 30; // Processing FPS target
    const interval = 1000 / fps;

    let currentTime = 0;

    // We simulate processing by seeking the video? 
    // Or we assume the video is playing?
    // Robust way for analysis: Seek to specific times to ensure we cover the whole video efficiently without needing realtime playback.
    // However, HTMLVideoElement seek is slow.
    // Best approach for client-side analysis of uploaded file:
    // 1. Play video invisible at max speed? No, frames might drop.
    // 2. Seek frame by frame? Reliable but slow.
    // 3. WebCodecs? Complex.
    // 4. RequestVideoFrameCallback during playback?

    // For this MVP, let's use the Seek method to ensure we get explicit timestamps processed.
    // It might be slow for long videos, but reliable.

    // Pause video to take control
    videoElement.pause();
    videoElement.currentTime = 0;

    // We need to wait for seek to complete before processing
    const waitForSeek = () => new Promise<void>(resolve => {
        const handler = () => {
            videoElement.removeEventListener('seeked', handler);
            resolve();
        };
        videoElement.addEventListener('seeked', handler);
    });

    while (currentTime < duration) {
        videoElement.currentTime = currentTime;
        await waitForSeek();

        // Detect
        // detectForVideo requires a timestamp relative to start
        const timestampMs = currentTime * 1000;
        const result: PoseLandmarkerResult = landmarker.detectForVideo(videoElement, timestampMs);

        if (result.landmarks && result.landmarks.length > 0) {
            const raw = result.landmarks[0];
            const rawWorld = result.worldLandmarks[0];

            // Map to Unified
            const unified: UnifiedLandmark[] = raw.map((l, index) => ({
                x: l.x,
                y: l.y,
                z: l.z,
                visibility: l.visibility || 0,
                name: Object.keys(POSE_LANDMARKS).find(key => POSE_LANDMARKS[key as keyof typeof POSE_LANDMARKS] === index) || `unknown_${index}`
            }));

            const world: Point3D[] = rawWorld.map(l => ({
                x: l.x,
                y: l.y,
                z: l.z || 0,
                visibility: l.visibility
            }));

            results.push({
                timestamp: currentTime,
                landmarks: unified,
                worldLandmarks: world
            });
        }

        if (onProgress) {
            onProgress(currentTime / duration);
        }

        currentTime += (1 / fps); // Advance 1 frame (approx)
    }

    return results;
};
