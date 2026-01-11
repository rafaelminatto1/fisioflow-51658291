import React, { useEffect, useRef, useState } from 'react';
import { Pose, Results } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { calculateAngle, POSE_LANDMARKS } from '@/utils/geometry';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Camera, Upload } from 'lucide-react';

interface PoseAnalyzerProps {
    videoSrc?: string; // URL object or null for webcam
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAnalysisUpdate?: (data: any) => void;
}

const PoseAnalyzer: React.FC<PoseAnalyzerProps> = ({ videoSrc, onAnalysisUpdate: _onAnalysisUpdate }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const poseRef = useRef<Pose | null>(null);
    const requestRef = useRef<number>();
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const { toast } = useToast();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analyzePosture = React.useCallback((worldLandmarks: any[], ctx: CanvasRenderingContext2D, width: number, height: number, normalizedLandmarks: any[]) => {
        // 1. Tech Neck: Ear - Shoulder alignment
        // const leftEar = worldLandmarks[POSE_LANDMARKS.LEFT_EAR];
        const leftShoulder = worldLandmarks[POSE_LANDMARKS.LEFT_SHOULDER];

        // Draw specialized analysis lines
        const nLeftEar = normalizedLandmarks[POSE_LANDMARKS.LEFT_EAR];
        const nLeftShoulder = normalizedLandmarks[POSE_LANDMARKS.LEFT_SHOULDER];

        ctx.strokeStyle = '#FFFF00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(nLeftEar.x * width, nLeftEar.y * height);
        ctx.lineTo(nLeftShoulder.x * width, nLeftShoulder.y * height);
        ctx.stroke();

        // Torso Alignment
        const leftHip = worldLandmarks[POSE_LANDMARKS.LEFT_HIP];
        const verticalPoint = { x: leftHip.x, y: leftHip.y - 0.5, z: leftHip.z };
        const torsoAngle = calculateAngle(leftShoulder, leftHip, verticalPoint);
        const isBadPosture = torsoAngle > 20;

        ctx.fillStyle = isBadPosture ? 'red' : 'green';
        ctx.font = '24px Arial';
        ctx.fillText(`Tronco: ${torsoAngle.toFixed(1)}°`, 20, 50);

        if (isBadPosture) {
            ctx.strokeStyle = 'red';
            ctx.beginPath();
            ctx.moveTo(normalizedLandmarks[POSE_LANDMARKS.LEFT_SHOULDER].x * width, normalizedLandmarks[POSE_LANDMARKS.LEFT_SHOULDER].y * height);
            ctx.lineTo(normalizedLandmarks[POSE_LANDMARKS.LEFT_HIP].x * width, normalizedLandmarks[POSE_LANDMARKS.LEFT_HIP].y * height);
            ctx.stroke();
        }
    }, []);

    const onResults = React.useCallback((results: Results) => {
        if (!canvasRef.current || !videoRef.current) return;

        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;

        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.poseLandmarks) {
            drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
            drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

            if (results.poseWorldLandmarks) {
                analyzePosture(results.poseWorldLandmarks, canvasCtx, videoWidth, videoHeight, results.poseLandmarks);
            }
        }
        canvasCtx.restore();
    }, [analyzePosture]);



    useEffect(() => {
        // Capture ref for cleanup
        const videoElement = videoRef.current;

        // 1. Initialize Pose
        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            },
        });

        pose.setOptions({
            modelComplexity: 2,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        pose.onResults(onResults);
        poseRef.current = pose;

        return () => {
            cancelAnimationFrame(requestRef.current!);
            pose.close();

            // Use captured ref
            if (videoElement && videoElement.srcObject) {
                const tracks = (videoElement.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, [onResults]);  

    // 2. Handle Video Source Changes
    useEffect(() => {
        if (videoSrc && videoRef.current) {
            videoRef.current.src = videoSrc;
            videoRef.current.load();
            setCameraActive(false);
        } else if (!videoSrc) {
            // Optional: Auto-start webcam or wait for user
        }
    }, [videoSrc]);

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        startProcessing();
                    };
                    setCameraActive(true);
                }
            } catch {
                toast({
                    title: "Erro na Câmera",
                    description: "Não foi possível acessar a câmera.",
                    variant: "destructive"
                });
            }
        }
    };

    const startProcessing = () => {
        setIsProcessing(true);
        processFrame();
    };

    const stopProcessing = () => {
        setIsProcessing(false);
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
    };

    const processFrame = async () => {
        if (!videoRef.current || !poseRef.current || !canvasRef.current) return;

        if (videoRef.current.paused || videoRef.current.ended) {
            // If video ended, stop loop
            if (videoRef.current.ended) setIsProcessing(false);
            return;
        }

        await poseRef.current.send({ image: videoRef.current });

        if (isProcessing) { // Check again to continue loop
            requestRef.current = requestAnimationFrame(processFrame);
        }
    };



    // Handling file upload for quick test if not provided via props
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            if (videoRef.current) {
                videoRef.current.src = url;
                setCameraActive(false);
            }
        }
    };

    return (
        <Card className="p-4 flex flex-col items-center gap-4 w-full h-full bg-slate-900 border-slate-800">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shrink-0">
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-contain opacity-0" // Hide video, show canvas
                    playsInline
                    muted
                    onPlay={() => startProcessing()}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-contain"
                />
            </div>

            <div className="flex gap-2 w-full justify-center">
                {!videoSrc && (
                    <>
                        <Button onClick={startCamera} variant={cameraActive ? "default" : "secondary"}>
                            <Camera className="w-4 h-4 mr-2" />
                            Webcam
                        </Button>
                        <div className="relative">
                            <Button variant="outline">
                                <Upload className="w-4 h-4 mr-2" />
                                Carregar Vídeo
                            </Button>
                            <input
                                type="file"
                                accept="video/*"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </>
                )}

                <Button onClick={() => {
                    if (videoRef.current?.paused) {
                        videoRef.current.play();
                        startProcessing();
                    } else {
                        videoRef.current?.pause();
                        stopProcessing();
                    }
                }}>
                    {isProcessing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
            </div>
        </Card>
    );
};

export default PoseAnalyzer;
