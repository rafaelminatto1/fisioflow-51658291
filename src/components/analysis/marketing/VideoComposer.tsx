import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Progress } from '@/components/shared/ui/progress';
import { Loader2, Download, Play, Pause } from 'lucide-react';

interface VideoComposerProps {
    videoUrlA: string;
    videoUrlB: string;
    watermarkText?: string;
    metricsOverlay?: string[];
    onExportComplete: (blob: Blob) => void;
    isAnonymized?: boolean;
}

const VideoComposer: React.FC<VideoComposerProps> = ({
    videoUrlA,
    videoUrlB,
    watermarkText = "FisioFlow",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metricsOverlay = [],
    onExportComplete,
    isAnonymized = false
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRefA = useRef<HTMLVideoElement>(document.createElement('video'));
    const videoRefB = useRef<HTMLVideoElement>(document.createElement('video'));

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    // const [progress, setProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);

    // const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number>();

    // Init Videos
    useEffect(() => {
        const initVideo = (vid: HTMLVideoElement, src: string) => {
            vid.src = src;
            vid.muted = true;
            vid.crossOrigin = "anonymous";
            vid.load();
            vid.onloadedmetadata = () => {
                // Determine duration? Max of two?
            };
        };
        initVideo(videoRefA.current!, videoUrlA);
        initVideo(videoRefB.current!, videoUrlB);

        return () => {
            cancelAnimationFrame(animationFrameRef.current!);
        };
    }, [videoUrlA, videoUrlB]);

    // Draw Loop
    const drawParams = React.useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const vA = videoRefA.current;
        const vB = videoRefB.current;

        if (!canvas || !ctx || !vA || !vB) return;

        // Set dimensions (HD typical)
        canvas.width = 1280;
        canvas.height = 720;

        const halfWidth = canvas.width / 2;

        // Draw Background
        ctx.fillStyle = '#0f172a'; // Slate-900 background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Video A (Left)
        // Aspect ratio preserver
        // For MVP, just draw fill or fit? Let's fit.
        const drawScaled = (vid: HTMLVideoElement, xOffset: number) => {
            const scale = Math.min(halfWidth / vid.videoWidth, canvas.height / vid.videoHeight);
            const w = vid.videoWidth * scale;
            const h = vid.videoHeight * scale;
            const x = xOffset + (halfWidth - w) / 2;
            const y = (canvas.height - h) / 2;

            ctx.drawImage(vid, x, y, w, h);

            // Anonymization Blur (Simple Box on likely head pos? Too hard without landmarks)
            // For Generic Face Blur, we need actual detection data. 
            // IF isAnonymized, we blur the top 20% of the video signal? 
            if (isAnonymized) {
                // Simple head blur approximation (top 15% center)
                // This is DUMB blurring, assumes person is centered and standing.
                // Better implementation comes later with MediaPipe landmarks.
                ctx.filter = 'blur(20px)';
                const headW = w * 0.3;
                const headH = h * 0.2;
                ctx.drawImage(canvas, x + (w - headW) / 2, y, headW, headH, x + (w - headW) / 2, y, headW, headH);
                ctx.filter = 'none';
            }
        };

        drawScaled(vA, 0);
        drawScaled(vB, halfWidth);

        // Draw Divider
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(halfWidth, 50);
        ctx.lineTo(halfWidth, canvas.height - 50);
        ctx.stroke();

        // Draw Labels
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("INICIAL", halfWidth / 2, 40);
        ctx.fillText("REAVALIAÇÃO", halfWidth + halfWidth / 2, 40);

        // Draw Watermark
        ctx.font = '20px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText(watermarkText, canvas.width - 20, canvas.height - 20);

        // Draw Disclaimer
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Resultados podem variar. Imagens meramente ilustrativas.", canvas.width / 2, canvas.height - 15);

        // Loop
        if (isPlaying || isRecording) {
            animationFrameRef.current = requestAnimationFrame(drawParams);
        }
    }, [isAnonymized, isPlaying, isRecording, watermarkText]);

    // Control Sync
    const togglePlay = async () => {
        if (!videoRefA.current || !videoRefB.current) return;

        if (isPlaying) {
            videoRefA.current.pause();
            videoRefB.current.pause();
            setIsPlaying(false);
            cancelAnimationFrame(animationFrameRef.current!);
        } else {
            await Promise.all([videoRefA.current.play(), videoRefB.current.play()]);
            setIsPlaying(true);
            drawParams();
        }
    };

    // Render Once on Mount/Update (Static Preview)
    useEffect(() => {
        // Wait minor delay for video load?
        const t = setTimeout(() => {
            drawParams();
        }, 500);
        return () => clearTimeout(t);
    }, [videoUrlA, videoUrlB, isAnonymized, drawParams]);


    // Export Logic
    const startExport = async () => {
        if (!canvasRef.current || !videoRefA.current || !videoRefB.current) return;

        setIsRecording(true);
        setRecordingProgress(0);
        chunksRef.current = [];

        // Reset Videos
        videoRefA.current.currentTime = 0;
        videoRefB.current.currentTime = 0;

        // Setup MediaRecorder
        const stream = canvasRef.current.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' }); // chrome default

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            onExportComplete(blob);
            setIsRecording(false);

            // Revert state
            videoRefA.current.pause();
            videoRefB.current.pause();
            videoRefA.current.currentTime = 0;
            videoRefB.current.currentTime = 0;
            setIsPlaying(false);
            drawParams();
        };

        recorder.start();

        // Play Videos
        await Promise.all([videoRefA.current.play(), videoRefB.current.play()]);

        // Start Loop
        const animate = () => {
            drawParams();
            // Progress check
            const d = videoRefA.current!.duration;
            const c = videoRefA.current!.currentTime;
            setRecordingProgress((c / d) * 100);

            if (!videoRefA.current!.ended && !videoRefB.current!.ended) {
                requestAnimationFrame(animate);
            } else {
                recorder.stop();
            }
        };
        requestAnimationFrame(animate);
    };

    return (
        <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded overflow-hidden shadow-lg border border-slate-700">
                <canvas ref={canvasRef} className="w-full h-full object-contain" />

                {isRecording && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <p className="text-white font-medium mb-2">Renderizando Vídeo...</p>
                        <Progress value={recordingProgress} className="w-1/2 h-2" />
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center">
                <Button variant="outline" onClick={togglePlay} disabled={isRecording}>
                    {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? 'Pausar Preview' : 'Preview'}
                </Button>

                <Button onClick={startExport} disabled={isRecording || isPlaying} className="bg-purple-600 hover:bg-purple-700">
                    <Download className="w-4 h-4 mr-2" />
                    Gerar Vídeo de Marketing
                </Button>
            </div>
        </div>
    );
};

export default VideoComposer;
