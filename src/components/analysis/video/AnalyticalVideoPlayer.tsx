import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
	Play, 
	Pause, 
	SkipBack, 
	SkipForward, 
	Camera, 
	Gauge, 
	Settings2,
	Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { BiomechanicsOverlay } from "../canvas/BiomechanicsOverlay";
import { usePoseDetection } from "@/hooks/biomechanics/usePoseDetection";
import { UnifiedLandmark } from "@/utils/geometry";

interface AnalyticalVideoPlayerProps {
	src: string;
	onSnapshot?: (image: string, landmarks: UnifiedLandmark[]) => void;
	showAnalysis?: boolean;
}

export const AnalyticalVideoPlayer: React.FC<AnalyticalVideoPlayerProps> = ({
	src,
	onSnapshot,
	showAnalysis = true,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [landmarks, setLandmarks] = useState<UnifiedLandmark[]>([]);
	
	const { detect, isReady, init } = usePoseDetection({ 
		runningMode: "VIDEO" 
	});

	useEffect(() => {
		if (showAnalysis) init();
	}, [showAnalysis, init]);

	// Analysis loop during playback
	useEffect(() => {
		let requestRef: number;
		const analyze = () => {
			if (videoRef.current && isReady && !videoRef.current.paused) {
				const result = detect(videoRef.current);
				if (result?.landmarks?.length > 0) {
					setLandmarks(result.landmarks[0]);
				}
			}
			requestRef = requestAnimationFrame(analyze);
		};
		requestRef = requestAnimationFrame(analyze);
		return () => cancelAnimationFrame(requestRef);
	}, [isReady, detect]);

	const togglePlay = () => {
		if (videoRef.current) {
			if (isPlaying) videoRef.current.pause();
			else videoRef.current.play();
			setIsPlaying(!isPlaying);
		}
	};

	const seekFrame = (direction: number) => {
		if (videoRef.current) {
			const fps = 30; // Approximation
			videoRef.current.currentTime += direction * (1 / fps);
			// Trigger manual detection when seeking frame by frame
			setTimeout(() => {
				if (videoRef.current && isReady) {
					const result = detect(videoRef.current);
					if (result?.landmarks?.length > 0) setLandmarks(result.landmarks[0]);
				}
			}, 50);
		}
	};

	const handleCapture = () => {
		if (videoRef.current) {
			const canvas = document.createElement("canvas");
			canvas.width = videoRef.current.videoWidth;
			canvas.height = videoRef.current.videoHeight;
			const ctx = canvas.getContext("2d");
			if (ctx) {
				ctx.drawImage(videoRef.current, 0, 0);
				const dataUrl = canvas.toDataURL("image/jpeg");
				if (onSnapshot) onSnapshot(dataUrl, landmarks);
			}
		}
	};

	return (
		<div className="relative group bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
			<video
				ref={videoRef}
				src={src}
				className="w-full aspect-video object-contain"
				onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
				onDurationChange={(e) => setDuration(e.currentTarget.duration)}
				playsInline
			/>

			{showAnalysis && (
				<BiomechanicsOverlay
					landmarks={landmarks}
					width={videoRef.current?.clientWidth || 0}
					height={videoRef.current?.clientHeight || 0}
					showSkeleton={true}
					showAngles={true}
					opacity={isPlaying ? 0.6 : 1.0}
				/>
			)}

			{/* Custom Controls */}
			<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
				{/* Progress Slider */}
				<Slider
					value={[currentTime]}
					max={duration}
					step={0.01}
					onValueChange={([val]) => {
						if (videoRef.current) videoRef.current.currentTime = val;
					}}
					className="mb-4"
				/>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => seekFrame(-1)}>
							<SkipBack className="h-5 w-5" />
						</Button>
						
						<Button size="icon" variant="secondary" className="rounded-full h-12 w-12" onClick={togglePlay}>
							{isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
						</Button>

						<Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => seekFrame(1)}>
							<SkipForward className="h-5 w-5" />
						</Button>

						<div className="ml-4 text-white font-mono text-sm">
							{currentTime.toFixed(2)}s / {duration.toFixed(2)}s
						</div>
					</div>

					<div className="flex items-center gap-3">
						<Badge variant="outline" className="text-white border-white/20 gap-1 px-2">
							<Gauge className="h-3 w-3" />
							<select 
								className="bg-transparent border-none focus:ring-0 outline-none text-xs"
								value={playbackRate}
								onChange={(e) => {
									const val = parseFloat(e.target.value);
									setPlaybackRate(val);
									if (videoRef.current) videoRef.current.playbackRate = val;
								}}
							>
								<option value="0.25">0.25x</option>
								<option value="0.5">0.5x</option>
								<option value="1">1.0x</option>
								<option value="2">2.0x</option>
							</select>
						</Badge>

						<Button size="sm" variant="outline" className="text-white border-white/20 gap-2" onClick={handleCapture}>
							<Camera className="h-4 w-4" /> Snapshot
						</Button>
						
						<Button size="icon" variant="ghost" className="text-white">
							<Maximize2 className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</div>

			{/* Status Bar */}
			{!isReady && showAnalysis && (
				<div className="absolute top-4 right-4 animate-pulse">
					<Badge className="bg-yellow-500/80 text-black">Inicializando IA...</Badge>
				</div>
			)}
		</div>
	);
};
