import { useRef, useState, useEffect, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { UnifiedLandmark, POSE_LANDMARKS, calculateAngle } from '@/utils/geometry';

export interface BiofeedbackMetrics {
    kneeValgusL: number;
    kneeValgusR: number;
    trunkLean: number;
    pelvicObliquity: number;
    confidence: number;
}

export const useLivePoseAnalysis = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<BiofeedbackMetrics | null>(null);
    const landmarkerRef = useRef<PoseLandmarker | null>(null);
    const requestRef = useRef<number>();

    // Initialize Landmarker
    useEffect(() => {
        const initLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO", // Use VIDEO for better tracking continuity than IMAGE, but feed it stream frames
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minPosePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });
                landmarkerRef.current = landmarker;
            } catch (err) {
                console.error("Failed to init landmarker", err);
                setError("Falha ao carregar modelo de IA.");
            }
        };
        initLandmarker();
        return () => {
            landmarkerRef.current?.close();
        };
    }, []);

    const startCamera = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadeddata = () => {
                    setIsAnalyzing(true);
                    setIsLoading(false);
                    predictWebcam();
                };
            }
        } catch (err) {
            console.error("Camera access denied", err);
            setError("Acesso à câmera negado ou indisponível.");
            setIsLoading(false);
        }
    };

    const stopCamera = () => {
        setIsAnalyzing(false);
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
    };

    const predictWebcam = async () => {
        if (!landmarkerRef.current || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const drawingUtils = new DrawingUtils(ctx!);

        const startTimeMs = performance.now();

        if (video.videoWidth > 0 && video.videoHeight > 0) {
            const result = landmarkerRef.current.detectForVideo(video, startTimeMs);

            // Clear canvas
            ctx!.clearRect(0, 0, canvas.width, canvas.height);

            if (result.landmarks && result.landmarks.length > 0) {
                const landmarks = result.landmarks[0];

                // Draw
                drawingUtils.drawLandmarks(landmarks, {
                    radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
                });
                drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

                // Calculate Live Metrics
                const unified = landmarks.map((l, i) => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility })) as UnifiedLandmark[];

                const hipL = unified[POSE_LANDMARKS.LEFT_HIP];
                const hipR = unified[POSE_LANDMARKS.RIGHT_HIP];
                const kneeL = unified[POSE_LANDMARKS.LEFT_KNEE];
                const kneeR = unified[POSE_LANDMARKS.RIGHT_KNEE];
                const ankleL = unified[POSE_LANDMARKS.LEFT_ANKLE];
                const ankleR = unified[POSE_LANDMARKS.RIGHT_ANKLE];
                const shoulderL = unified[POSE_LANDMARKS.LEFT_SHOULDER];
                const shoulderR = unified[POSE_LANDMARKS.RIGHT_SHOULDER];

                // Simple 2D Projections
                // Valgus Proxy: Knee deviation from Hip-Ankle line? 
                // Better: Angle Hip-Knee-Ankle (Frontal Projection)
                // 180 is straight. <170 is valgus? It depends on coords. 
                // Let's use simple hip-knee-ankle angle.
                const angleL = calculateAngle(hipL, kneeL, ankleL);
                const angleR = calculateAngle(hipR, kneeR, ankleR);

                // Trunk Lean (Shoulder Mid vs Hip Mid) - Simplified as Shoulder slope
                // Or Vertical alignment. Let's use Shoulder Slope for simple feedback ("Keep shoulders level")
                // Or Trunk Lean: Angle of Torso Vector vs Vertical.
                const midHip = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2, z: 0 };
                const midShoulder = { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2, z: 0 };
                const trunkVertical = Math.abs(calculateAngle(
                    { x: midHip.x, y: midHip.y - 0.5, z: 0 }, // Point above hip
                    midHip,
                    midShoulder
                ));  // 0 is perfectly vertical? calculateAngle returns 0-180. 
                // calculateAngle(A, B, C). B is vertex. 
                // A=Vertical Up, B=Hip, C=Shoulder. 
                // Ideally 0 or 180. 

                // Pelvic Drop (Hip slope)
                const pelvicSlope = Math.abs((Math.atan2(hipR.y - hipL.y, hipR.x - hipL.x) * 180) / Math.PI);

                setMetrics({
                    kneeValgusL: angleL,
                    kneeValgusR: angleR,
                    trunkLean: trunkVertical,
                    pelvicObliquity: pelvicSlope,
                    confidence: (result.landmarks[0][0].visibility || 0) * 100
                });

            } else {
                setMetrics(null);
            }
        }

        if (isAnalyzing) {
            requestRef.current = requestAnimationFrame(predictWebcam);
        }
    };

    // Restart loop if isAnalyzing changes state (handled by layout effect usually, but here recursive reqAnimFrame)
    useEffect(() => {
        if (isAnalyzing) {
            requestRef.current = requestAnimationFrame(predictWebcam);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, [isAnalyzing]);

    return {
        videoRef,
        canvasRef,
        isAnalyzing,
        isLoading,
        error,
        metrics,
        startCamera,
        stopCamera
    };
};
