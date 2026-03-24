import React, { useRef, useState } from 'react';
import Webcam from "react-webcam";
import { Stage, Layer } from 'react-konva';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, ChevronLeft, ChevronRight, Ruler, TrendingUp, Upload, Play, Pause } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

import { useMoveNet, useTrajectory, useGoniometer, useOpticalFlow, useAutoAngles } from '@/hooks/biomechanics';
import { generateBiomechanicsReport } from '@/utils/biomechanics-reports';
import { FunctionalTestType, FunctionalAssessment } from '@/types/biomechanics';

import { MoveNetSkeleton } from '../canvas/MoveNetSkeleton';
import { GoniometerOverlay } from '../canvas/GoniometerOverlay';
import { TrajectoryLines } from '../canvas/TrajectoryLines';
import { PointTrackerOverlay } from '../canvas/PointTrackerOverlay';
import { AutoAngleOverlay } from '../canvas/AutoAngleOverlay';

import { TrajectoryPanel } from '../panels/TrajectoryPanel';
import { InclinometerPanel } from '../panels/InclinometerPanel';
import { GoniometerPanel } from '../panels/GoniometerPanel';
import { PhastAssessmentPanel } from '../panels/PhastAssessmentPanel';
import { RealTimeMetricsChart } from '../charts/RealTimeMetricsChart';

interface FunctionalAnalysisStudioProps {
	onDataUpdate?: (data: any) => void;
}

export const FunctionalAnalysisStudio: React.FC<FunctionalAnalysisStudioProps> = ({ onDataUpdate }) => {
	const webcamRef = useRef<Webcam>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const stageRef = useRef<any>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [videoMode, setVideoMode] = useState<"webcam" | "file">("webcam");
	const [videoSrc, setVideoSrc] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentFrame, setCurrentFrame] = useState(0);
	const [fps, setFps] = useState(30); // Default to 30, can be adjusted
	const [activeTool, setActiveTool] = useState<"none" | "goniometer" | "trajectory" | "tracking" | "auto_angles">("auto_angles");
	const [snapshots, setSnapshots] = useState<string[]>([]);
	const [activeTest, setActiveTest] = useState<FunctionalTestType | 'none'>('none');
	const [assessment, setAssessment] = useState<FunctionalAssessment | null>(null);
	const [autoAngleHistory, setAutoAngleHistory] = useState<Array<{ frame: number } & Record<string, number>>>([]);

	const { aiEnabled, aiLoading, poseKeypoints, startMoveNet, stopMoveNet } = useMoveNet(
		(videoMode === "webcam" ? webcamRef : videoRef) as any
	);

	const {
		trackedTrajs,
		addTrajectory,
		handleCanvasClick,
		removeTrajectory,
		removeTrajectoryByKeypoint,
		clearTrajectories,
	} = useTrajectory(poseKeypoints, aiEnabled, currentFrame, { width: 800, height: 600 });

	const { points: goniometerPoints, updatePoint, currentAngle, clearGoniometer, linkedKP, linkKeypoint, isRecording, toggleRecording, angleHistory } = useGoniometer(undefined, poseKeypoints, { width: 800, height: 600 });

	const { trackedPoints, addPointToTrack, processFrame, setTrackedPoints } = useOpticalFlow(
		(videoMode === "webcam" ? webcamRef : videoRef) as any
	);

	const { angles: autoAngles } = useAutoAngles(poseKeypoints || []);

	React.useEffect(() => {
		if (aiEnabled && autoAngles.length > 0) {
			const record: any = { frame: currentFrame };
			autoAngles.forEach(a => {
				record[a.name] = a.value;
			});
			setAutoAngleHistory(prev => [...prev.slice(-99), record]);
		}
	}, [autoAngles, aiEnabled, currentFrame]);

	// Processing loop for Optical Flow (simplified for now)
	React.useEffect(() => {
		let frameId: number;
		const loop = () => {
			processFrame();
			frameId = requestAnimationFrame(loop);
		};
		if (activeTool === "tracking") {
			frameId = requestAnimationFrame(loop);
		}
		return () => cancelAnimationFrame(frameId);
	}, [activeTool, processFrame]);

	const captureKeyframe = () => {
		if (stageRef.current) {
			const dataUrl = (stageRef.current as any).toDataURL();
			setSnapshots(prev => [...prev, dataUrl]);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const url = URL.createObjectURL(file);
			setVideoSrc(url);
			setVideoMode("file");
		}
	};

	const seekToFrame = (frame: number) => {
		if (videoRef.current) {
			videoRef.current.currentTime = frame / fps;
			setCurrentFrame(frame);
		}
	};

	const togglePlayback = () => {
		if (videoRef.current) {
			if (isPlaying) videoRef.current.pause();
			else videoRef.current.play();
			setIsPlaying(!isPlaying);
		}
	};

	React.useEffect(() => {
		if (videoMode === "file" && videoRef.current) {
			const v = videoRef.current;
			const update = () => {
				setCurrentFrame(Math.floor(v.currentTime * fps));
				if (aiEnabled || activeTool === "tracking") processFrame();
			};
			v.addEventListener('timeupdate', update);
			return () => v.removeEventListener('timeupdate', update);
		}
	}, [videoMode, fps, aiEnabled, activeTool, processFrame]);

	const exportReport = () => {
		generateBiomechanicsReport({
			patientName: "Paciente Teste", // In production, get from context
			date: new Date(),
			type: 'Functional',
			metrics: {
				currentAngle: `${currentAngle}°`,
				trajectoriesCount: trackedTrajs.length,
				trackingPoints: trackedPoints.length,
				fps
			},
			snapshots,
			asymmetry: null // Functional might not have it yet
		});
	};

	return (
		<div className="flex flex-col gap-6 h-full">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* ── Video Canvas ─────────────────────────────────────── */}
				<Card className="lg:col-span-3 relative overflow-hidden bg-slate-950 border-none rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] h-[600px] group/canvas">
					<div className="relative w-full h-full flex items-center justify-center overflow-hidden">
						{videoMode === "webcam" ? (
							<Webcam
								ref={webcamRef}
								audio={false}
								className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity group-hover/canvas:opacity-80"
							/>
						) : (
							<video
								ref={videoRef}
								src={videoSrc || ""}
								className="absolute inset-0 w-full h-full object-contain opacity-80"
								playsInline
								muted
							/>
						)}
						<Stage width={800} height={600} className="absolute inset-0 z-10 cursor-crosshair" ref={stageRef} onClick={(e) => {
							const pos = e.target.getStage()?.getPointerPosition();
							if (pos) {
								if (activeTool === "trajectory") handleCanvasClick(pos.x, pos.y);
								if (activeTool === "tracking") addPointToTrack(pos);
							}
						}}>
							<Layer>
								{aiEnabled && <MoveNetSkeleton poseKeypoints={poseKeypoints} />}
								{activeTool === "auto_angles" && aiEnabled && <AutoAngleOverlay angles={autoAngles} />}
								{activeTool === "goniometer" && <GoniometerOverlay points={goniometerPoints} onPointMove={updatePoint} />}
								<TrajectoryLines trajectories={trackedTrajs} />
								<PointTrackerOverlay trackedPoints={trackedPoints} onTogglePoint={(id) => {
									setTrackedPoints((prev: any[]) => prev.map((p: any) => p.id === id ? { ...p, active: !p.active } : p));
								}} />
							</Layer>
						</Stage>
					</div>

					{activeTool === "goniometer" && (
						<motion.div 
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							className="absolute top-6 left-6 z-20 bg-slate-900/80 backdrop-blur-xl text-white text-2xl font-black px-5 py-2 rounded-2xl border border-white/10 shadow-2xl"
						>
							{currentAngle}°
						</motion.div>
					)}

					{/* Control HUD */}
					<div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/60 backdrop-blur-3xl p-3 rounded-[2rem] border border-white/10 z-30 shadow-2xl">
						<input 
							type="file" 
							className="hidden" 
							ref={fileInputRef} 
							accept="video/*" 
							onChange={handleFileUpload} 
						/>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => fileInputRef.current?.click()}
							className="rounded-full h-10 w-10 hover:bg-white/10 transition-colors"
						>
							<Upload className="h-5 w-5 text-blue-400" />
						</Button>

						{videoMode === "file" && (
							<Button
								variant="ghost"
								size="icon"
								onClick={togglePlayback}
								className="rounded-full h-10 w-10 hover:bg-white/10"
							>
								{isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
							</Button>
						)}

						<div className="h-8 w-px bg-white/10 mx-1" />
						
						<Button
							variant={aiEnabled ? "default" : "ghost"}
							size="sm"
							disabled={aiLoading}
							onClick={() => aiEnabled ? stopMoveNet() : startMoveNet()}
							className={`rounded-2xl gap-2 text-[10px] font-black tracking-widest uppercase px-4 h-10 transition-all ${aiEnabled ? "bg-green-600 hover:bg-green-700 shadow-[0_0_20px_rgba(34,197,94,0.4)] border-none" : "hover:bg-white/5"}`}
						>
							<Cpu className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
							{aiLoading ? "Loading..." : aiEnabled ? "AI Active" : "Pose Detection"}
						</Button>
						<div className="h-6 w-px bg-white/20 mx-1" />
						<Button
							variant={activeTool === "auto_angles" ? "default" : "ghost"}
							size="sm" onClick={() => setActiveTool(activeTool === "auto_angles" ? "none" : "auto_angles")}
							className={`rounded-xl gap-2 text-xs font-black ${activeTool === "auto_angles" ? "bg-indigo-600 shadow-lg shadow-indigo-500/30" : ""}`}
						>
							<Cpu className="h-4 w-4" /> ÂNGULOS AUTO
						</Button>
						<div className="h-6 w-px bg-white/20 mx-1" />
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
							variant={activeTool === "tracking" ? "default" : "ghost"}
							size="sm" onClick={() => setActiveTool(activeTool === "tracking" ? "none" : "tracking")}
							className="rounded-xl gap-2 text-xs font-black"
						>
							<TrendingUp className="h-4 w-4 text-amber-500" /> GENERIC TRACK
						</Button>
						<Button
							variant="ghost" size="sm" onClick={captureKeyframe}
							className="rounded-xl gap-2 text-xs font-black text-blue-500"
						>
							<Cpu className="h-4 w-4" /> SNAPSHOT
						</Button>
						<div className="h-8 w-px bg-white/10 mx-1" />
						<div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
							<Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white rounded-xl"
								onClick={() => seekToFrame(Math.max(0, currentFrame - 1))}>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<div className="flex flex-col items-center justify-center px-3 min-w-[60px]">
								<span className="text-white text-[10px] font-black tracking-tighter tabular-nums">
									{currentFrame}
								</span>
								<span className="text-[6px] text-white/40 font-black uppercase">Frame</span>
							</div>
							<Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white rounded-xl"
								onClick={() => seekToFrame(currentFrame + 1)}>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
						<Badge variant="outline" className="text-[9px] font-black border-white/10 text-white/60 px-3 py-1 rounded-full">{fps} FPS</Badge>
					</div>
				</Card>

				{/* ── Metrics Sidebar ──────────────────────────────────── */}
				<div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
					{/* PHAST Test Selector */}
					<Card className="border-none bg-indigo-600 shadow-xl shadow-indigo-500/20 overflow-hidden">
						<CardContent className="p-5 space-y-4">
							<h3 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
								<Cpu className="h-4 w-4" /> Protocolos PHAST
							</h3>
							<div className="grid grid-cols-2 gap-2">
								{[
									{ id: 'y-balance', label: 'Y-Balance' },
									{ id: 'hop-test', label: 'Hop Test' },
									{ id: 'less', label: 'LESS' },
									{ id: 'squat', label: 'Squat/Lunge' }
								].map(test => (
									<Button 
										key={test.id}
										variant={activeTest === test.id ? "secondary" : "ghost"}
										className={`h-9 text-[10px] font-black rounded-xl border border-white/10 ${activeTest === test.id ? "bg-white text-indigo-600" : "text-white hover:bg-white/10"}`}
										onClick={() => {
											setActiveTest(test.id as any);
											setAssessment({
												type: test.id as any,
												status: 'in_progress',
												score: null,
												asymmetry: null,
												observations: [],
												metrics: {}
											});
											startMoveNet();
											setActiveTool('auto_angles');
										}}
									>
										{test.label}
									</Button>
								))}
							</div>
						</CardContent>
					</Card>

					<InclinometerPanel />

                    <GoniometerPanel
                        currentAngle={currentAngle}
                        angleHistory={angleHistory}
                        isRecording={isRecording}
                        linkedKP={linkedKP}
                        toggleRecording={toggleRecording}
                        clearGoniometer={clearGoniometer}
                        linkKeypoint={linkKeypoint}
                        onPointClick={seekToFrame}
                    />
					
					<TrajectoryPanel
						trackedTrajs={trackedTrajs} aiEnabled={aiEnabled}
						addTrajectory={addTrajectory} removeTrajectory={removeTrajectory}
						removeTrajectoryByKeypoint={removeTrajectoryByKeypoint} clearTrajectories={clearTrajectories}
					/>

					{aiEnabled && activeTool === 'auto_angles' && (
						<RealTimeMetricsChart 
							data={autoAngleHistory}
							selectedAngles={['left_knee', 'right_knee', 'trunk_lean']}
						/>
					)}

					{assessment && activeTest !== 'none' && (
						<PhastAssessmentPanel 
							assessment={assessment}
							autoAngles={autoAngles}
							onUpdate={(data) => {
								const newAssessment = { ...assessment, ...data };
								setAssessment(newAssessment);
								onDataUpdate?.({ 
									assessment: newAssessment,
									currentAngle,
									autoAngles
								});
							}}
						/>
					)}

					<Card className="border-none shadow-sm bg-indigo-500/5">
						<CardContent className="p-4 space-y-3">
							<h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
								<TrendingUp className="h-3 w-3" /> Exportador Pro
							</h4>
							<p className="text-[9px] text-muted-foreground uppercase font-bold">
								{snapshots.length} frames capturados
							</p>
							<Button 
								className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs font-black gap-2 h-9 rounded-xl"
								disabled={snapshots.length === 0}
								onClick={exportReport}
							>
								GERAR RELATÓRIO PDF
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};
