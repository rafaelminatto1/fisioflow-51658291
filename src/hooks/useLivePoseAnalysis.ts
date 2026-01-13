/**
 * useLivePoseAnalysis - Hook otimizado com lazy loading
 * Carrega o MediaPipe apenas quando o hook é usado
 * Reduz o tamanho inicial do bundle
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { UnifiedLandmark, POSE_LANDMARKS, calculateAngle } from '@/utils/geometry';
import { useMediaPipeVision } from '@/hooks/performance';

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

    // Armazena as dependências do MediaPipe carregadas
    const [mediaPipeModules, setMediaPipeModules] = useState<{
        PoseLandmarker: any;
        FilesetResolver: any;
        DrawingUtils: any;
    } | null>(null);

    const landmarkerRef = useRef<any>(null);
    const requestRef = useRef<number>();

    // Carregar MediaPipe sob demanda
    const { load: loadMediaPipe, isLoaded: mediaPipeLoaded, isLoading: mediaPipeLoading } = useMediaPipeVision();

    // Initialize Landmarker com lazy loading
    useEffect(() => {
        const initLandmarker = async () => {
            // Só inicializa quando mediaPipeLoaded=true E os módulos foram carregados
            if (mediaPipeLoaded && mediaPipeModules && !landmarkerRef.current) {
                try {
                    const { PoseLandmarker, FilesetResolver } = mediaPipeModules;
                    const vision = await FilesetResolver.forVisionTasks(
                        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
                    );
                    const landmarker = await PoseLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                            delegate: "GPU"
                        },
                        runningMode: "VIDEO",
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
            }
        };

        if (mediaPipeLoaded && !mediaPipeModules) {
            // Carregar dependências do MediaPipe
            import('@mediapipe/tasks-vision').then((module) => {
                const { PoseLandmarker: PL, FilesetResolver: FR, DrawingUtils: DU } = module;
                setMediaPipeModules({ PoseLandmarker: PL, FilesetResolver: FR, DrawingUtils: DU });
            });
        } else if (mediaPipeLoaded && mediaPipeModules) {
            // Módulos já carregados, inicializar o landmarker
            initLandmarker();
        }

        return () => {
            landmarkerRef.current?.close();
            landmarkerRef.current = null;
        };
    }, [mediaPipeLoaded, mediaPipeModules]);

    const startCamera = async () => {
        setIsLoading(true);
        setError(null);

        // Carregar MediaPipe se ainda não foi carregado
        if (!mediaPipeLoaded) {
            await loadMediaPipe();
        }

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

    const predictWebcam = useCallback(async () => {
        if (!landmarkerRef.current || !videoRef.current || !canvasRef.current || !mediaPipeModules) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const { DrawingUtils, PoseLandmarker } = mediaPipeModules;
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
                    radius: (data: any) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
                });
                drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

                // Calculate Live Metrics
                const unified = landmarks.map((l: any) => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility })) as UnifiedLandmark[];

                const hipL = unified[POSE_LANDMARKS.LEFT_HIP];
                const hipR = unified[POSE_LANDMARKS.RIGHT_HIP];
                const kneeL = unified[POSE_LANDMARKS.LEFT_KNEE];
                const kneeR = unified[POSE_LANDMARKS.RIGHT_KNEE];
                const ankleL = unified[POSE_LANDMARKS.LEFT_ANKLE];
                const ankleR = unified[POSE_LANDMARKS.RIGHT_ANKLE];
                const shoulderL = unified[POSE_LANDMARKS.LEFT_SHOULDER];
                const shoulderR = unified[POSE_LANDMARKS.RIGHT_SHOULDER];

                const angleL = calculateAngle(hipL, kneeL, ankleL);
                const angleR = calculateAngle(hipR, kneeR, ankleR);

                const midHip = { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2, z: 0 };
                const midShoulder = { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2, z: 0 };
                const trunkVertical = Math.abs(calculateAngle(
                    { x: midHip.x, y: midHip.y - 0.5, z: 0 },
                    midHip,
                    midShoulder
                ));

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
    }, [isAnalyzing, mediaPipeModules]);

    // Restart loop if isAnalyzing changes state
    useEffect(() => {
        if (isAnalyzing) {
            requestRef.current = requestAnimationFrame(predictWebcam);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, [isAnalyzing, predictWebcam]);

    return {
        videoRef,
        canvasRef,
        isAnalyzing,
        isLoading: isLoading || mediaPipeLoading,
        error,
        metrics,
        startCamera,
        stopCamera
    };
};
