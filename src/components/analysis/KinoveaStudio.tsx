import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Line, Circle, Group, Text as KText } from "react-konva";
import {
	Activity,
	TrendingUp,
	ChevronLeft,
	ChevronRight,
	ArrowUp,
	Ruler,
	User2,
	Cpu,
	Upload,
} from "lucide-react";

// ─── MoveNet (TensorFlow.js) — dynamic import para não bloquear o build ───────
// Ref: npj Digital Medicine 9:37 (2026) — MoveNet SINGLEPOSE_THUNDER melhor
//      para marcha clínica vs BlazePose/MediaPipe legacy
type PoseDetector = import("@tensorflow-models/pose-detection").PoseDetector;
type Keypoint = import("@tensorflow-models/pose-detection").Keypoint;
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	TooltipProvider,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMoveNetDetector } from "@/lib/ai/poseDetectionRuntime";

interface KinoveaStudioProps {
	onCapture?: (image: string, analysis: any) => void;
	patientName?: string;
}

interface Point { x: number; y: number; }
interface TrajectoryPoint extends Point { frame: number; }
interface GaitEvent { type: "contact" | "toe-off"; frame: number; side: "L" | "R"; }

// Trajetória rastreada — pode ser ligada a um keypoint MoveNet (auto) ou manual (null)
interface TrackedTraj {
	points: TrajectoryPoint[];
	color: string;
	label: string;
	keypointIdx: number | null; // null = manual (click no canvas)
}

// ─── MoveNet COCO-17 keypoint names ──────────────────────────────────────────
const KP_NAMES = [
	"Nariz","Olho E","Olho D","Orelha E","Orelha D",
	"Ombro E","Ombro D","Cotovelo E","Cotovelo D","Punho E","Punho D",
	"Quadril E","Quadril D","Joelho E","Joelho D","Tornozelo E","Tornozelo D",
];
const KP_GROUPS = [
	{ label: "Cabeça",  indices: [0, 1, 2, 3, 4] },
	{ label: "Tronco",  indices: [5, 6, 11, 12] },
	{ label: "Braços",  indices: [7, 8, 9, 10] },
	{ label: "Pernas",  indices: [13, 14, 15, 16] },
];
const TRAJ_COLORS = ["#ff6b35","#ffd700","#00ff88","#ff69b4","#00cfff","#c084fc"];

// ─── Risk Zone Helpers ────────────────────────────────────────────────────────
// Zonas baseadas em literatura clínica (Morin 2005, Derrick 2004)
const oscillationZone = (val: number) => {
	if (val < 5) return { color: "text-blue-400", label: "Baixa", bg: "bg-blue-400/10" };
	if (val <= 10) return { color: "text-green-500", label: "Ideal", bg: "bg-green-500/10" };
	return { color: "text-amber-500", label: "Ineficiente", bg: "bg-amber-500/10" };
};

const cadenceZone = (val: number) => {
	if (val >= 180) return { color: "text-green-500", label: "Elite" };
	if (val >= 160) return { color: "text-amber-400", label: "Moderada" };
	return { color: "text-red-500", label: "Baixa" };
};

const powerZone = (val: number) => {
	if (val >= 4000) return { color: "text-green-500", label: "Alto" };
	if (val >= 2500) return { color: "text-blue-400", label: "Médio" };
	return { color: "text-muted-foreground", label: "Baixo" };
};

export const KinoveaStudio: React.FC<KinoveaStudioProps> = ({
	onCapture: _onCapture,
	patientName: _patientName,
}) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<any>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Tool + display state
	const [activeTool, setActiveTool] = useState<"none" | "goniometer" | "trajectory" | "jump">("none");
	const [, _setDimensions] = useState({ width: 800, height: 600 });
	const [currentFrame, setCurrentFrame] = useState(0);
	const [fps] = useState(240);
	const [, _setIsPlaying] = useState(false);
	const [videoSrc, setVideoSrc] = useState<string | null>(null);

	// MoveNet state
	const detectorRef = useRef<PoseDetector | null>(null);
	const rafRef = useRef<number | null>(null);
	const [poseKeypoints, setPoseKeypoints] = useState<Keypoint[] | null>(null);
	const [aiEnabled, setAiEnabled] = useState(false);
	const [aiLoading, setAiLoading] = useState(false);

	// MoveNet SINGLEPOSE_THUNDER via dynamic import (não bloqueia build)
	const startMoveNet = useCallback(async () => {
		if (detectorRef.current) return;
		setAiLoading(true);
		try {
			detectorRef.current = await createMoveNetDetector();
			setAiEnabled(true);

			const detect = async () => {
				const video = videoRef.current;
				if (video && video.readyState === 4 && detectorRef.current) {
					const poses = await detectorRef.current.estimatePoses(video);
					if (poses[0]?.keypoints) setPoseKeypoints(poses[0].keypoints);
				}
				rafRef.current = requestAnimationFrame(detect);
			};
			detect();
		} catch (err) {
			console.error("MoveNet init failed:", err);
		} finally {
			setAiLoading(false);
		}
	}, []);

	const stopMoveNet = useCallback(() => {
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
		detectorRef.current?.dispose();
		detectorRef.current = null;
		setPoseKeypoints(null);
		setAiEnabled(false);
	}, []);

	useEffect(() => () => stopMoveNet(), [stopMoveNet]);

	// Patient anthropometric data (required for Sayers power + Morin stiffness)
	const [patientMass, setPatientMass] = useState<number | null>(null);   // kg
	const [legLength, setLegLength] = useState<number | null>(null);       // cm (trochanterion to floor)
	const [runSpeed, setRunSpeed] = useState<number>(3.0);                 // m/s

	// Measurement data
	const [goniometerPoints, setGoniometerPoints] = useState<Point[]>([{ x: 400, y: 300 }, { x: 300, y: 200 }, { x: 300, y: 400 }]);
	const [gaitEvents, setGaitEvents] = useState<GaitEvent[]>([]);
	const [jumpEvents, setJumpEvents] = useState<{ takeoff?: number; landing?: number }>({});

	// ─── Trajectory auto-tracking state ──────────────────────────────────────
	const [trackedTrajs, setTrackedTrajs] = useState<TrackedTraj[]>([]);
	const trajFrameRef = useRef(0);

	// Quando AI roda e um keypoint está sendo rastreado, acumula posições automaticamente
	useEffect(() => {
		if (!poseKeypoints || !aiEnabled) return;
		const frame = ++trajFrameRef.current;
		setTrackedTrajs(prev => prev.map(traj => {
			if (traj.keypointIdx == null) return traj; // manual: não auto-rastreia
			const kp = poseKeypoints[traj.keypointIdx];
			if (!kp || (kp.score ?? 0) < 0.35) return traj;
			const newPt: TrajectoryPoint = { x: kp.x / 640 * 800, y: kp.y / 480 * 600, frame };
			return { ...traj, points: [...traj.points.slice(-800), newPt] };
		}));
	}, [poseKeypoints, aiEnabled]);

	// Adiciona nova trajetória — AI (por keypoint) ou manual
	const addTrajectory = useCallback((keypointIdx: number | null) => {
		const color = TRAJ_COLORS[trackedTrajs.length % TRAJ_COLORS.length];
		const label = keypointIdx != null ? KP_NAMES[keypointIdx] : `Manual ${trackedTrajs.length + 1}`;
		setTrackedTrajs(prev => [...prev, { points: [], color, label, keypointIdx }]);
	}, [trackedTrajs.length]);

	// Click no canvas → ponto manual na trajetória mais recente
	const handleCanvasClick = useCallback((e: any) => {
		if (activeTool !== "trajectory") return;
		const pos = e.target.getStage()?.getPointerPosition();
		if (!pos || trackedTrajs.length === 0) return;
		setTrackedTrajs(prev => {
			const arr = [...prev];
			const last = arr[arr.length - 1];
			arr[arr.length - 1] = { ...last, points: [...last.points, { x: pos.x, y: pos.y, frame: currentFrame }] };
			return arr;
		});
	}, [activeTool, trackedTrajs.length, currentFrame]);

	// ─── Jump Metrics ─────────────────────────────────────────────────────────
	// Bosco et al. (1983): h = g × tf² / 8
	// Sayers et al. (1999): PAPw (W) = 60.7 × h(cm) + 45.3 × BM(kg) − 2055
	const jumpMetrics = useMemo(() => {
		if (jumpEvents.takeoff == null || jumpEvents.landing == null) return null;
		const flightTime = (jumpEvents.landing - jumpEvents.takeoff) / fps;
		const heightM = (9.81 * Math.pow(flightTime, 2)) / 8; // Bosco 1983
		const heightCm = heightM * 100;
		const peakPower = patientMass != null
			? Math.max(0, 60.7 * heightCm + 45.3 * patientMass - 2055) // Sayers 1999
			: null;
		return {
			height: heightCm.toFixed(1),
			flightTime: (flightTime * 1000).toFixed(0),
			peakPower: peakPower?.toFixed(0) ?? null,
		};
	}, [jumpEvents, fps, patientMass]);

	// ─── Gait Metrics ─────────────────────────────────────────────────────────
	// Morin et al. (2005) Sine-Wave method — doi:10.1123/jab.21.2.167
	// tc = contact time, tf = flight time
	// Fmax  = π × m × g × (tc + tf) / tc
	// Δy    = g × tc² / π²  [vertical CoM displacement during stance]
	// kvert = Fmax / Δy
	// kleg  = Fmax / ΔL  where ΔL = L₀ − √(L₀² − (v × tc/2)²)
	const gaitMetrics = useMemo(() => {
		const sorted = [...gaitEvents].sort((a, b) => a.frame - b.frame);
		let tc = 0, tf = 0;
		for (let i = 0; i < sorted.length - 1; i++) {
			const e1 = sorted[i], e2 = sorted[i + 1];
			if (e1.type === "contact" && e2.type === "toe-off")
				tc = (e2.frame - e1.frame) / fps;
			else if (e1.type === "toe-off" && e2.type === "contact")
				tf = (e2.frame - e1.frame) / fps;
		}
		if (tc === 0) return null;

		const g = 9.81;
		const cadenceVal = 120 / (tc + tf);                          // steps/min (ambos pés)
		const oscillationCm = g * Math.pow(tc, 2) / (Math.PI * Math.PI) * 100; // Morin 2005

		// Leg stiffness — requer massa e comprimento de perna
		let legStiffnessKNm: number | null = null;
		let kvertKNm: number | null = null;
		if (patientMass != null && legLength != null) {
			const L0 = legLength / 100; // cm → m
			const Fmax = Math.PI * patientMass * g * (tc + tf) / tc;
			const deltaY = g * Math.pow(tc, 2) / (Math.PI * Math.PI);
			kvertKNm = Fmax / deltaY / 1000;
			const underSqrt = Math.pow(L0, 2) - Math.pow(runSpeed * tc / 2, 2);
			if (underSqrt > 0) {
				const deltaL = L0 - Math.sqrt(underSqrt);
				legStiffnessKNm = deltaL > 0 ? Fmax / deltaL / 1000 : null;
			}
		}

		return {
			cadenceVal,
			cadence: cadenceVal.toFixed(1),
			oscillationCm,
			oscillation: oscillationCm.toFixed(1),
			legStiffness: legStiffnessKNm?.toFixed(1) ?? null,
			kvert: kvertKNm?.toFixed(1) ?? null,
			tcMs: (tc * 1000).toFixed(0),
			tfMs: (tf * 1000).toFixed(0),
		};
	}, [gaitEvents, fps, patientMass, legLength, runSpeed]);

	// ─── Goniometer angle ─────────────────────────────────────────────────────
	const calculateAngle = (p1: Point, center: Point, p2: Point) => {
		const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
		const a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
		let angle = (a1 - a2) * (180 / Math.PI);
		if (angle < 0) angle += 360;
		if (angle > 180) angle = 360 - angle;
		return angle.toFixed(1);
	};

	const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file || !file.type.startsWith("video/")) return;
		const nextUrl = URL.createObjectURL(file);
		setVideoSrc((previous) => {
			if (previous) URL.revokeObjectURL(previous);
			return nextUrl;
		});
		setCurrentFrame(0);
		setJumpEvents({});
		setGaitEvents([]);
		setTrackedTrajs([]);
		setPoseKeypoints(null);
	}, []);

	useEffect(() => {
		return () => {
			if (videoSrc) URL.revokeObjectURL(videoSrc);
		};
	}, [videoSrc]);

	return (
		<TooltipProvider>
			<div className="flex flex-col gap-6 h-full">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

					{/* ── Video Canvas ─────────────────────────────────────── */}
					<Card className="lg:col-span-3 relative overflow-hidden bg-black border-2 border-primary/20 rounded-3xl shadow-2xl h-[600px]">
						<div ref={containerRef} className="relative w-full h-full">
							{videoSrc ? (
								<video
									ref={videoRef}
									src={videoSrc}
									className="absolute inset-0 w-full h-full object-contain opacity-70"
									playsInline
									muted
									controls={false}
								/>
							) : (
								<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-center text-white/80 px-6">
									<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
										<Upload className="h-10 w-10" />
									</div>
									<div className="space-y-1">
										<p className="text-sm font-black uppercase tracking-[0.2em] text-white">
											Upload de video para analise
										</p>
										<p className="text-sm text-white/60">
											Envie um video gravado para usar goniometro, trajetoria, salto e eventos da marcha.
										</p>
									</div>
									<Button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										className="rounded-xl font-black"
									>
										<Upload className="mr-2 h-4 w-4" />
										Selecionar video
									</Button>
								</div>
							)}
							<input
								ref={fileInputRef}
								type="file"
								accept="video/*"
								className="hidden"
								onChange={handleFileUpload}
							/>
							<Stage width={800} height={600} className="absolute inset-0 z-10" ref={stageRef} onClick={handleCanvasClick}>
								<Layer>
									{/* MoveNet SINGLEPOSE_THUNDER — Ref: npj Digital Medicine 9:37 (2026)
									    Verde = Direita, Azul = Esquerda, score > 0.4 */}
									{aiEnabled && poseKeypoints && (() => {
										const W = 800, H = 600, VW = 640, VH = 480;
										const conn = [[5,6],[5,7],[7,9],[6,8],[8,10],[11,12],[5,11],[6,12],[11,13],[13,15],[12,14],[14,16],[0,5],[0,6]];
										return (
											<Group opacity={0.85}>
												{conn.map(([a, b], i) => {
													const pa = poseKeypoints[a], pb = poseKeypoints[b];
													if (!pa || !pb || (pa.score ?? 0) < 0.4 || (pb.score ?? 0) < 0.4) return null;
													return <Line key={i} points={[pa.x/VW*W, pa.y/VH*H, pb.x/VW*W, pb.y/VH*H]} stroke={b >= 6 ? "#22c55e" : "#3b82f6"} strokeWidth={3} lineCap="round" />;
												})}
												{poseKeypoints.map((kp, i) => (kp?.score ?? 0) >= 0.4 ? <Circle key={i} x={kp.x/VW*W} y={kp.y/VH*H} radius={5} fill={i >= 6 ? "#22c55e" : "#3b82f6"} /> : null)}
											</Group>
										);
									})()}

									{/* Goniometer tool */}
									{activeTool === "goniometer" && (
										<Group>
											<Line
												points={[goniometerPoints[1].x, goniometerPoints[1].y, goniometerPoints[0].x, goniometerPoints[0].y, goniometerPoints[2].x, goniometerPoints[2].y]}
												stroke="#ff00ff" strokeWidth={3}
											/>
											{goniometerPoints.map((p, i) => (
												<Circle key={i} x={p.x} y={p.y} radius={8} fill="#ff00ff" draggable
													onDragMove={(e) => {
														const pts = [...goniometerPoints];
														pts[i] = { x: e.target.x(), y: e.target.y() };
														setGoniometerPoints(pts);
													}}
												/>
											))}
										</Group>
									)}

									{/*{/* Gait event markers: timeline na base */}
									{gaitEvents.map((ev, i) => (
										<Circle key={i}
											x={100 + (ev.frame % 600)}
											y={ev.type === "contact" ? 560 : 540}
											radius={6} opacity={0.9}
											fill={ev.side === "R" ? "#22c55e" : "#3b82f6"}
										/>
									))}

									{/* ── Trajetórias rastreadas (auto-AI + manual) ── */}
									{trackedTrajs.map((traj, ti) => traj.points.length >= 2 ? (
										<Group key={`traj-${ti}`}>
											<Line
												points={traj.points.flatMap(p => [p.x, p.y])}
												stroke={traj.color} strokeWidth={2.5}
												tension={0.4} opacity={0.85}
												lineCap="round" lineJoin="round"
											/>
											{(() => {
												const last = traj.points[traj.points.length - 1];
												return (
													<>
														<Circle x={last.x} y={last.y} radius={8} fill={traj.color} opacity={0.9} />
														<Circle x={last.x} y={last.y} radius={14} stroke={traj.color} strokeWidth={1.5} opacity={0.4} />
														<KText x={last.x + 10} y={last.y - 18} text={traj.label}
															fontSize={11} fontStyle="bold" fill={traj.color}
															shadowColor="black" shadowBlur={4} shadowOpacity={0.8}
														/>
													</>
												);
											})()}
										</Group>
									) : null)}
								</Layer>
							</Stage>
						</div>

						{/* Angle overlay */}
						{activeTool === "goniometer" && (
							<div className="absolute top-4 left-4 z-20 bg-black/80 text-white text-sm font-black px-3 py-1 rounded-xl">
								{calculateAngle(goniometerPoints[0], goniometerPoints[1], goniometerPoints[2])}°
							</div>
						)}

						{/* Control HUD */}
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 z-30">
							{/* MoveNet AI toggle */}
							<Button
								variant={aiEnabled ? "default" : "ghost"}
								size="sm"
								disabled={aiLoading || !videoSrc}
								onClick={() => aiEnabled ? stopMoveNet() : startMoveNet()}
								className={`rounded-xl gap-2 text-xs font-black ${aiEnabled ? "bg-green-600 hover:bg-green-700" : ""}`}
							>
								<Cpu className="h-4 w-4" />
								{aiLoading ? "CARREGANDO..." : aiEnabled ? "AI ON" : "AI OFF"}
							</Button>
							<div className="h-6 w-px bg-white/20" />
							<Button
								variant={activeTool === "goniometer" ? "default" : "ghost"}
								size="sm" onClick={() => setActiveTool(activeTool === "goniometer" ? "none" : "goniometer")}
								className="rounded-xl gap-2 text-xs font-black"
							>
								<Ruler className="h-4 w-4" /> GONIÔMETRO
							</Button>
							<Button
								variant={activeTool === "trajectory" ? "default" : "ghost"}
								size="sm" onClick={() => setActiveTool(activeTool === "trajectory" ? "none" : "trajectory")}
								className="rounded-xl gap-2 text-xs font-black"
							>
								<TrendingUp className="h-4 w-4" /> TRAJETÓRIA
							</Button>
							<Button
								variant={activeTool === "jump" ? "default" : "ghost"}
								size="sm" onClick={() => setActiveTool(activeTool === "jump" ? "none" : "jump")}
								className="rounded-xl gap-2 text-xs font-black"
							>
								<ArrowUp className="h-4 w-4" /> MYJUMP
							</Button>
							<div className="h-6 w-px bg-white/20 mx-1" />
							<div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
								<Button size="icon" variant="ghost" className="h-8 w-8 text-white"
									disabled={!videoSrc}
									onClick={() => setCurrentFrame(f => Math.max(0, f - 1))}>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span className="text-white text-[10px] font-black self-center px-1 min-w-[40px] text-center">
									{currentFrame}
								</span>
								<Button size="icon" variant="ghost" className="h-8 w-8 text-white"
									disabled={!videoSrc}
									onClick={() => setCurrentFrame(f => f + 1)}>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
							<Badge variant="secondary" className="text-[9px] font-black">{fps} fps</Badge>
						</div>
					</Card>

					{/* ── Metrics Sidebar ──────────────────────────────────── */}
					<div className="space-y-4 overflow-y-auto">

						{/* Patient Setup Panel */}
						<Card className="border-none shadow-sm bg-muted/5">
							<CardContent className="p-4 space-y-3">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
									<User2 className="h-3 w-3" /> Dados do Paciente
								</h4>
								<div className="space-y-2">
									<div>
										<Label className="text-[9px] font-bold uppercase text-muted-foreground">Massa (kg)</Label>
										<Input
											type="number"
											placeholder="ex: 70"
											className="h-7 text-xs font-bold"
											value={patientMass ?? ""}
											onChange={e => setPatientMass(e.target.value ? Number(e.target.value) : null)}
										/>
									</div>
									<div>
										<Label className="text-[9px] font-bold uppercase text-muted-foreground">Comprimento Perna (cm)</Label>
										<Input
											type="number"
											placeholder="ex: 90 (trocânter→chão)"
											className="h-7 text-xs font-bold"
											value={legLength ?? ""}
											onChange={e => setLegLength(e.target.value ? Number(e.target.value) : null)}
										/>
									</div>
									<div>
										<Label className="text-[9px] font-bold uppercase text-muted-foreground">Vel. Esteira (m/s)</Label>
										<Input
											type="number"
											step="0.5"
											placeholder="ex: 3.0"
											className="h-7 text-xs font-bold"
											value={runSpeed}
											onChange={e => setRunSpeed(Number(e.target.value) || 3.0)}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* MyJump Dashboard (Bosco 1983 + Sayers 1999) */}
						<Card className="border-none shadow-sm bg-blue-500/5">
							<CardContent className="p-4 space-y-3">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
									<ArrowUp className="h-3 w-3" /> Jump Lab · Bosco (1983)
								</h4>
								<div className="grid grid-cols-1 gap-1.5">
									<Button size="sm" variant="outline"
										className="justify-start gap-2 text-[10px] font-bold h-7"
										onClick={() => setJumpEvents(p => ({ ...p, takeoff: currentFrame }))}>
										{jumpEvents.takeoff != null ? `✅ DECOLAGEM · Frame ${jumpEvents.takeoff}` : "1. MARCAR DECOLAGEM"}
									</Button>
									<Button size="sm" variant="outline"
										className="justify-start gap-2 text-[10px] font-bold h-7"
										onClick={() => setJumpEvents(p => ({ ...p, landing: currentFrame }))}>
										{jumpEvents.landing != null ? `✅ ATERRISSAGEM · Frame ${jumpEvents.landing}` : "2. MARCAR ATERRISSAGEM"}
									</Button>
									<Button size="sm" variant="ghost"
										className="justify-start gap-2 text-[10px] font-bold h-6 text-muted-foreground"
										onClick={() => setJumpEvents({})}>
										Limpar
									</Button>
								</div>
								{jumpMetrics && (
									<div className="pt-2 border-t border-blue-500/10 space-y-2">
										<div>
											<p className="text-3xl font-black text-blue-600">
												{jumpMetrics.height}<span className="text-sm ml-1 font-bold">cm</span>
											</p>
											<p className="text-[9px] font-medium text-muted-foreground uppercase">
												Altura · tf = {jumpMetrics.flightTime}ms
											</p>
										</div>
										{jumpMetrics.peakPower != null && (() => {
											const pwr = parseFloat(jumpMetrics.peakPower!);
											const z = powerZone(pwr);
											return (
												<div className={`p-2 rounded-lg ${z.color === "text-green-500" ? "bg-green-500/10" : z.color === "text-blue-400" ? "bg-blue-400/10" : "bg-muted/10"}`}>
													<p className={`text-lg font-black ${z.color}`}>
														{pwr.toFixed(0)}<span className="text-[10px] ml-1 font-bold">W</span>
													</p>
													<p className="text-[9px] text-muted-foreground uppercase">
														Potência Pico · Sayers (1999) · {z.label}
													</p>
												</div>
											);
										})()}
										{!patientMass && (
											<p className="text-[9px] text-amber-500 font-medium">
												↑ Informe a massa para calcular potência
											</p>
										)}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Gait Analysis Dashboard (Morin 2005) */}
						<Card className="border-none shadow-sm bg-green-500/5">
							<CardContent className="p-4 space-y-3">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-2">
									<Activity className="h-3 w-3" /> Gait Lab · Morin (2005)
								</h4>
								{/* L/R Event Buttons: Verde=Direita, Azul=Esquerda */}
								<div className="grid grid-cols-2 gap-1">
									<Button size="sm" variant="ghost"
										className="h-7 text-[9px] bg-green-500/10 font-black text-green-600"
										onClick={() => setGaitEvents(p => [...p, { type: "contact", frame: currentFrame, side: "R" }])}>
										CONTATO D
									</Button>
									<Button size="sm" variant="ghost"
										className="h-7 text-[9px] bg-blue-500/10 font-black text-blue-600"
										onClick={() => setGaitEvents(p => [...p, { type: "contact", frame: currentFrame, side: "L" }])}>
										CONTATO E
									</Button>
									<Button size="sm" variant="ghost"
										className="h-7 text-[9px] bg-red-500/10 font-black text-red-500"
										onClick={() => setGaitEvents(p => [...p, { type: "toe-off", frame: currentFrame, side: "R" }])}>
										IMPULSO D
									</Button>
									<Button size="sm" variant="ghost"
										className="h-7 text-[9px] bg-purple-500/10 font-black text-purple-500"
										onClick={() => setGaitEvents(p => [...p, { type: "toe-off", frame: currentFrame, side: "L" }])}>
										IMPULSO E
									</Button>
								</div>
								{gaitEvents.length > 0 && (
									<Button size="sm" variant="ghost"
										className="w-full h-5 text-[9px] text-muted-foreground"
										onClick={() => setGaitEvents([])}>
										Limpar {gaitEvents.length} eventos
									</Button>
								)}

								{gaitMetrics && (() => {
									const osc = oscillationZone(gaitMetrics.oscillationCm);
									const cad = cadenceZone(gaitMetrics.cadenceVal);
									return (
										<div className="space-y-2 pt-2 border-t border-green-500/10">
											{/* Cadência */}
											<div className="flex justify-between items-end">
												<div>
													<span className="text-[9px] font-bold text-muted-foreground uppercase block">Cadência</span>
													<span className="text-[9px] text-muted-foreground">{cad.label}</span>
												</div>
												<div className="text-right">
													<span className={`text-xl font-black ${cad.color}`}>{gaitMetrics.cadence}</span>
													<span className="text-[9px] font-bold text-muted-foreground ml-1">spm</span>
												</div>
											</div>

											{/* Oscilação Vertical */}
											<div className={`p-2 rounded-lg ${osc.bg}`}>
												<div className="flex justify-between items-end">
													<div>
														<span className="text-[9px] font-bold text-muted-foreground uppercase block">Oscilação Vertical</span>
														<span className={`text-[9px] font-medium ${osc.color}`}>{osc.label}</span>
													</div>
													<div className="text-right">
														<span className={`text-xl font-black ${osc.color}`}>{gaitMetrics.oscillation}</span>
														<span className="text-[9px] font-bold text-muted-foreground ml-1">cm</span>
													</div>
												</div>
											</div>

											{/* Tempos brutos */}
											<div className="grid grid-cols-2 gap-2">
												<div className="text-center p-1.5 bg-muted/10 rounded-lg">
													<p className="text-sm font-black">{gaitMetrics.tcMs}<span className="text-[9px] ml-0.5">ms</span></p>
													<p className="text-[8px] text-muted-foreground uppercase font-bold">tc (Contato)</p>
												</div>
												<div className="text-center p-1.5 bg-muted/10 rounded-lg">
													<p className="text-sm font-black">{gaitMetrics.tfMs}<span className="text-[9px] ml-0.5">ms</span></p>
													<p className="text-[8px] text-muted-foreground uppercase font-bold">tf (Voo)</p>
												</div>
											</div>

											{/* Rigidez (requer dados do paciente) */}
											{gaitMetrics.legStiffness && gaitMetrics.kvert ? (
												<div className="space-y-1 pt-1 border-t border-green-500/10">
													<p className="text-[9px] font-black uppercase text-muted-foreground">Rigidez · Sine-Wave</p>
													<div className="grid grid-cols-2 gap-2">
														<div className="text-center p-1.5 bg-muted/10 rounded-lg">
															<p className="text-sm font-black text-primary">{gaitMetrics.legStiffness}</p>
															<p className="text-[8px] text-muted-foreground uppercase font-bold">kleg (kN/m)</p>
														</div>
														<div className="text-center p-1.5 bg-muted/10 rounded-lg">
															<p className="text-sm font-black text-primary">{gaitMetrics.kvert}</p>
															<p className="text-[8px] text-muted-foreground uppercase font-bold">kvert (kN/m)</p>
														</div>
													</div>
												</div>
											) : (
												<p className="text-[9px] text-amber-500 font-medium">
													↑ Informe massa + comp. perna para rigidez
												</p>
											)}
										</div>
									);
								})()}
							</CardContent>
						</Card>

						{/* ── Trajectory / Auto-Track Panel ── */}
					{activeTool === "trajectory" && (
						<Card className="border-none shadow-sm bg-orange-500/5">
							<CardContent className="p-4 space-y-3">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
									<TrendingUp className="h-3 w-3" /> Rastreamento de Ponto
								</h4>
								{aiEnabled ? (
									<div className="space-y-2">
										<p className="text-[9px] text-green-500 font-bold uppercase">AI ON — Selecione o ponto a rastrear:</p>
										{KP_GROUPS.map(grp => (
											<div key={grp.label} className="space-y-1">
												<p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{grp.label}</p>
												<div className="flex flex-wrap gap-1">
													{grp.indices.map(kpIdx => {
														const tracked = trackedTrajs.find(t => t.keypointIdx === kpIdx);
														return (
															<button key={kpIdx}
																className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${tracked ? "border-transparent text-white" : "border-border hover:bg-muted/30"}`}
																style={tracked ? { backgroundColor: tracked.color } : undefined}
																onClick={() => tracked ? setTrackedTrajs(p => p.filter(t => t.keypointIdx !== kpIdx)) : addTrajectory(kpIdx)}
															>
																{KP_NAMES[kpIdx]}
															</button>
														);
													})}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="space-y-2">
										<p className="text-[9px] text-amber-500 font-medium">Ligue AI para rastreamento automático</p>
										<Button size="sm" variant="outline" className="w-full h-7 text-[9px] font-bold"
											onClick={() => addTrajectory(null)}>
											+ Trajetória Manual (clique no vídeo)
										</Button>
									</div>
								)}
								{trackedTrajs.length > 0 && (
									<div className="space-y-1 pt-2 border-t border-orange-500/10">
										<p className="text-[9px] font-black uppercase text-muted-foreground">Ativas ({trackedTrajs.length})</p>
										{trackedTrajs.map((t, i) => (
											<div key={i} className="flex items-center justify-between">
												<div className="flex items-center gap-1.5">
													<div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
													<span className="text-[9px] font-bold">{t.label}</span>
													<span className="text-[8px] text-muted-foreground">{t.points.length}pts</span>
												</div>
												<button className="text-[9px] text-red-400 hover:text-red-600"
													onClick={() => setTrackedTrajs(p => p.filter((_, j) => j !== i))}>✕</button>
											</div>
										))}
										<button className="w-full text-[9px] text-muted-foreground hover:text-foreground mt-1"
											onClick={() => { setTrackedTrajs([]); trajFrameRef.current = 0; }}>
											Limpar todas
										</button>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Reference legend */}
						<div className="text-[8px] text-muted-foreground space-y-0.5 px-1">
							<p>• Oscilação ideal: 5–10 cm (literatura)</p>
							<p>• Cadência ideal: ≥180 spm (Heiderscheit 2011)</p>
							<p>• Verde = Direita · Azul = Esquerda</p>
						</div>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
};
