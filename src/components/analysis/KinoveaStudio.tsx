import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Webcam from "react-webcam";
import { Stage, Layer, Line, Circle, Text, Group } from "react-konva";
import {
	Camera,
	Activity,
	Zap,
	Timer,
	TrendingUp,
	ChevronLeft,
	ChevronRight,
	Play,
	Pause,
	Plus,
	Trash2,
	ArrowUp,
	Ruler,
	Grid,
} from "lucide-react";
import { Pose, POSE_CONNECTIONS } from "@mediapipe/pose";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface KinoveaStudioProps {
	onCapture?: (image: string, analysis: any) => void;
	patientName?: string;
}

interface Point { x: number; y: number; }
interface TrajectoryPoint extends Point { frame: number; }
interface GaitEvent { type: "contact" | "toe-off" | "take-off" | "landing"; frame: number; side: "L" | "R"; }

export const KinoveaStudio: React.FC<KinoveaStudioProps> = ({ onCapture, patientName }) => {
	const webcamRef = useRef<Webcam>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<any>(null);

	// State
	const [activeTool, setActiveTool] = useState<"none" | "goniometer" | "scale" | "trajectory" | "jump">("none");
	const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
	const [currentFrame, setCurrentFrame] = useState(0);
	const [fps, setFps] = useState(240); // Optimized for iPhone 15
	const [poseResults, setPoseResults] = useState<any>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	// Data
	const [goniometerPoints, setGoniometerPoints] = useState<Point[]>([{ x: 400, y: 300 }, { x: 300, y: 200 }, { x: 300, y: 400 }]);
	const [trajectories, setTrajectories] = useState<TrajectoryPoint[][]>([]);
	const [activeTrajectoryIndex, setActiveTrajectoryIndex] = useState<number | null>(null);
	const [gaitEvents, setGaitEvents] = useState<GaitEvent[]>([]);
	const [jumpEvents, setJumpEvents] = useState<{takeoff?: number, landing?: number}>({});

	// MediaPipe
	useEffect(() => {
		const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
		pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5 });
		pose.onResults((results) => setPoseResults(results));

		let isRunning = true;
		const process = async () => {
			if (webcamRef.current?.video && isRunning) await pose.send({ image: webcamRef.current.video });
			if (isRunning) requestAnimationFrame(process);
		};
		process();
		return () => { isRunning = false; };
	}, []);

	// MyJump 3 Logic (Bosco Method)
	const jumpMetrics = useMemo(() => {
		if (jumpEvents.takeoff && jumpEvents.landing) {
			const flightTime = (jumpEvents.landing - jumpEvents.takeoff) / fps;
			const height = (9.81 * Math.pow(flightTime, 2)) / 8;
			return {
				height: (height * 100).toFixed(1), // cm
				flightTime: (flightTime * 1000).toFixed(0), // ms
			};
		}
		return null;
	}, [jumpEvents, fps]);

	// Gait Metrics (Morin et al. 2005)
	const gaitMetrics = useMemo(() => {
		const sorted = [...gaitEvents].sort((a, b) => a.frame - b.frame);
		let tc = 0, tf = 0;
		for(let i=0; i < sorted.length - 1; i++) {
			const e1 = sorted[i], e2 = sorted[i+1];
			if (e1.type === "contact" && e2.type === "toe-off") tc = (e2.frame - e1.frame) / fps;
			else if (e1.type === "toe-off" && e2.type === "contact") tf = (e2.frame - e1.frame) / fps;
		}
		if (tc === 0) return null;
		return {
			cadence: (60 / (tc + tf)).toFixed(1),
			oscillation: ((9.81 * Math.pow(tc, 2)) / 8 * 100).toFixed(1),
		};
	}, [gaitEvents, fps]);

	return (
		<TooltipProvider>
			<div className="flex flex-col gap-6 h-full">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					<Card className="lg:col-span-3 relative overflow-hidden bg-black border-2 border-primary/20 rounded-3xl shadow-2xl h-[600px]">
						<div ref={containerRef} className="relative w-full h-full">
							<Webcam ref={webcamRef} audio={false} className="absolute inset-0 w-full h-full object-cover opacity-60" />
							<Stage width={800} height={600} className="absolute inset-0 z-10">
								<Layer>
									{/* AI Skeleton */}
									{poseResults?.poseLandmarks && (
										<Group opacity={0.5}>
											{POSE_CONNECTIONS.map(([s, e], i) => (
												<Line key={i} points={[poseResults.poseLandmarks[s].x*800, poseResults.poseLandmarks[s].y*600, poseResults.poseLandmarks[e].x*800, poseResults.poseLandmarks[e].y*600]} stroke="#00ff00" strokeWidth={2} />
											))}
										</Layer>
									)}
									{/* Goniometer */}
									{activeTool === "goniometer" && (
										<Group>
											<Line points={[goniometerPoints[1].x, goniometerPoints[1].y, goniometerPoints[0].x, goniometerPoints[0].y, goniometerPoints[2].x, goniometerPoints[2].y]} stroke="#ff00ff" strokeWidth={3} />
											{goniometerPoints.map((p, i) => (
												<Circle key={i} x={p.x} y={p.y} radius={8} fill="#ff00ff" draggable onDragMove={(e) => {
													const pts = [...goniometerPoints]; pts[i] = { x: e.target.x(), y: e.target.y() }; setGoniometerPoints(pts);
												}} />
											))}
										</Group>
									)}
								</Layer>
							</Stage>
						</div>

						{/* Control HUD */}
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 z-30">
							<Button variant={activeTool === "trajectory" ? "default" : "ghost"} size="sm" onClick={() => setActiveTool("trajectory")} className="rounded-xl gap-2 text-xs font-black"><TrendingUp className="h-4 w-4" /> TRAJETÓRIA</Button>
							<Button variant={activeTool === "jump" ? "default" : "ghost"} size="sm" onClick={() => setActiveTool("jump")} className="rounded-xl gap-2 text-xs font-black"><ArrowUp className="h-4 w-4" /> MYJUMP</Button>
							<div className="h-6 w-px bg-white/20 mx-1" />
							<div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
								<Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setCurrentFrame(f => Math.max(0, f-1))}><ChevronLeft className="h-4 w-4" /></Button>
								<Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setCurrentFrame(f => f+1)}><ChevronRight className="h-4 w-4" /></Button>
							</div>
						</div>
					</Card>

					{/* Metrics Sidebar */}
					<div className="space-y-6">
						{/* MyJump Dashboard */}
						<Card className="border-none shadow-sm bg-blue-500/5">
							<CardContent className="p-6 space-y-4">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2"><ArrowUp className="h-3.3 w-3" /> Jump Performance</h4>
								<div className="grid grid-cols-1 gap-2">
									<Button size="sm" variant="outline" className="justify-start gap-2 text-[10px] font-bold" onClick={() => setJumpEvents(p => ({...p, takeoff: currentFrame}))}>
										{jumpEvents.takeoff ? "✅ DECOLAGEM" : "1. MARCAR DECOLAGEM"}
									</Button>
									<Button size="sm" variant="outline" className="justify-start gap-2 text-[10px] font-bold" onClick={() => setJumpEvents(p => ({...p, landing: currentFrame}))}>
										{jumpEvents.landing ? "✅ ATERRISSAGEM" : "2. MARCAR ATERRISSAGEM"}
									</Button>
								</div>
								{jumpMetrics && (
									<div className="pt-2 border-t border-blue-500/10">
										<p className="text-3xl font-black text-blue-600">{jumpMetrics.height}<span className="text-sm ml-1 font-bold">cm</span></p>
										<p className="text-[10px] font-medium text-muted-foreground uppercase mt-1">Bosco Height • {jumpMetrics.flightTime}ms Flight</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Gait Dashboard */}
						<Card className="border-none shadow-sm bg-green-500/5">
							<CardContent className="p-6 space-y-4">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-2"><Activity className="h-3 w-3" /> Gait Analysis</h4>
								<div className="grid grid-cols-2 gap-2">
									<Button size="sm" variant="ghost" className="h-8 text-[9px] bg-green-500/10 font-black" onClick={() => setGaitEvents(p => [...p, {type: "contact", frame: currentFrame, side: "R"}])}>CONTATO</Button>
									<Button size="sm" variant="ghost" className="h-8 text-[9px] bg-red-500/10 font-black" onClick={() => setGaitEvents(p => [...p, {type: "toe-off", frame: currentFrame, side: "R"}])}>IMPULSÃO</Button>
								</div>
								{gaitMetrics && (
									<div className="space-y-3">
										<div className="flex justify-between items-end">
											<span className="text-[10px] font-bold text-muted-foreground uppercase">Cadência</span>
											<span className="text-lg font-black">{gaitMetrics.cadence} <small className="text-[8px]">spm</small></span>
										</div>
										<div className="flex justify-between items-end">
											<span className="text-[10px] font-bold text-muted-foreground uppercase">Oscilação</span>
											<span className="text-lg font-black">{gaitMetrics.oscillation} <small className="text-[8px]">cm</small></span>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
};
