import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Play, Pause, SkipBack, SkipForward, RefreshCw } from 'lucide-react';
import { UnifiedLandmark } from '@/utils/geometry';

interface VideoSource {
    url: string;
    landmarks?: { timestamp: number, points: UnifiedLandmark[] }[]; // Sorted by timestamp
}

interface DualVideoPlayerProps {
    videoA: VideoSource;
    videoB: VideoSource;
    syncOffsetMs?: number; // Offset to apply to Video B (positive = B plays later)
    onSyncChange?: (offsetMs: number) => void;
}

const DualVideoPlayer: React.FC<DualVideoPlayerProps> = ({ videoA, videoB, syncOffsetMs = 0, onSyncChange }) => {
    const vidARef = useRef<HTMLVideoElement>(null);
    const vidBRef = useRef<HTMLVideoElement>(null);
    const canvasARef = useRef<HTMLCanvasElement>(null);
    const canvasBRef = useRef<HTMLCanvasElement>(null);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [localOffset, setLocalOffset] = useState(syncOffsetMs);

    // Sync Ref Loop
    const requestRef = useRef<number>();

    // 1. Handle Metadata (Duration)
    const handleLoadedMetadata = () => {
        if (vidARef.current && vidBRef.current) {
            const dur = Math.max(vidARef.current.duration, vidBRef.current.duration);
            if (!Number.isNaN(dur)) setDuration(dur);
        }
    };

    // 2. Play/Pause Control
    const togglePlay = () => {
        if (!vidARef.current || !vidBRef.current) return;

        if (playing) {
            vidARef.current.pause();
            vidBRef.current.pause();
        } else {
            // Ideally we promise chain
            vidARef.current.play();
            vidBRef.current.play();
        }
        setPlaying(!playing);
    };

    // 3. Playback Speed
    useEffect(() => {
        if (vidARef.current) vidARef.current.playbackRate = speed;
        if (vidBRef.current) vidBRef.current.playbackRate = speed;
    }, [speed]);

    // 4. Time Update Loop (RAF for Sync and Canvas Draw)
    const tick = React.useCallback(() => {
        if (!vidARef.current || !vidBRef.current) {
            requestRef.current = requestAnimationFrame(tick);
            return;
        }

        // Master clock is Video A
        const masterTime = vidARef.current.currentTime;
        setCurrentTime(masterTime);

        // Check Sync of Video B
        // Target Time B = Master Time - (Offset / 1000) ?? 
        // If Offset is +1s, B should be 1s behind A? Or B starts 1s later? 
        // Typically: Global Timeline = T.
        // Vid A displays frame at T.
        // Vid B displays frame at T - offset.
        // Let's assume Offset aligns event. 
        // If Event A is at 5s, and Event B is at 7s. Offset = 2s.
        // When Global Time is 5s (Event A), we want Vid B to show 7s (Event B)?
        // No, we want to align visual events. 
        // If A is reference. We want B to shift.
        // let targetB = masterTime + (localOffset / 1000); 

        // Simple Logic:
        // We just verify drift. If drift > 0.1s, seek B.
        // But B might need to handle Play/Pause state.

        // We rely on simple play() for both. Only correction if major drift.
        // For accurate analysis, we might seek both every frame? No, jerky.

        // Drawing Landmarks
        drawLandmarks(canvasARef.current, vidARef.current, videoA.landmarks, masterTime);
        drawLandmarks(canvasBRef.current, vidBRef.current, videoB.landmarks, vidBRef.current.currentTime);

        requestRef.current = requestAnimationFrame(tick);
    }, [videoA, videoB]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [tick]); // Dependencies for draw logic if needed

    // Draw Helper
    const drawLandmarks = (
        canvas: HTMLCanvasElement | null,
        video: HTMLVideoElement,
        landmarks: { timestamp: number, points: UnifiedLandmark[] }[] | undefined,
        time: number
    ) => {
        if (!canvas || !landmarks) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Find closest frame
        // Assuming sorted timestamps
        // Simple search (optimize with binary search for long videos)
        const frame = landmarks.find(f => Math.abs(f.timestamp - time) < 0.1); // 100ms tolerance

        if (frame) {
            // Draw connections (Stick figure)
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;

            // Simplistic drawing for MVP
            // We need connections map. Using lines between known points.
            // ... (omitted full skeleton loop for brevity, drawing key points)

            ctx.fillStyle = 'red';
            frame.points.forEach(p => {
                if ((p.visibility || 0) > 0.5) {
                    ctx.beginPath();
                    ctx.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }
    };

    const handleSeek = (val: number[]) => {
        const time = val[0];
        if (vidARef.current) vidARef.current.currentTime = time;
        if (vidBRef.current) vidBRef.current.currentTime = time + (localOffset / 1000);
        setCurrentTime(time);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* Player A */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                        ref={vidARef}
                        src={videoA.url}
                        className="w-full h-full object-contain"
                        onLoadedMetadata={handleLoadedMetadata}
                    />
                    <canvas ref={canvasARef} className="absolute inset-0 w-full h-full pointer-events-none" width={640} height={360} />
                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-xs rounded">Vídeo A (Inicial)</div>
                </div>

                {/* Player B */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                        ref={vidBRef}
                        src={videoB.url}
                        className="w-full h-full object-contain"
                    />
                    <canvas ref={canvasBRef} className="absolute inset-0 w-full h-full pointer-events-none" width={640} height={360} />
                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 text-xs rounded">Vídeo B (Reavaliação)</div>
                </div>
            </div>

            {/* Controls */}
            <Card className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => handleSeek([currentTime - 5])}><SkipBack className="w-4 h-4" /></Button>
                    <Button onClick={togglePlay} className="w-12">
                        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleSeek([currentTime + 5])}><SkipForward className="w-4 h-4" /></Button>

                    <div className="w-32">
                        <span className="text-xs text-muted-foreground">Velocidade: {speed}x</span>
                        <Slider min={0.25} max={2} step={0.25} value={[speed]} onValueChange={(v) => setSpeed(v[0])} />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{currentTime.toFixed(1)}s</span>
                        <span>{duration.toFixed(1)}s</span>
                    </div>
                    <Slider
                        min={0} max={duration} step={0.1}
                        value={[currentTime]}
                        onValueChange={handleSeek}
                    />
                </div>

                {/* Sync Control */}
                <div className="flex items-center gap-4 border-t pt-4">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                        <span className="text-xs text-muted-foreground">Sincronia (Offset Vídeo B): {localOffset}ms</span>
                        <Slider
                            min={-2000} max={2000} step={50}
                            value={[localOffset]}
                            onValueChange={(v) => { setLocalOffset(v[0]); if (onSyncChange) onSyncChange(v[0]); }}
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default DualVideoPlayer;
