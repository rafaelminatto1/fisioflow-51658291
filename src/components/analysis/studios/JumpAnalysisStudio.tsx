import React, { useRef, useState, useMemo } from 'react';
import Webcam from "react-webcam";
import { Stage, Layer } from 'react-konva';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cpu, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

import { useMoveNet, useTrajectory } from '@/hooks/biomechanics';
import { calcJumpMetrics } from '@/utils/biomechanics-formulas';

import { MoveNetSkeleton } from '../canvas/MoveNetSkeleton';
import { TrajectoryLines } from '../canvas/TrajectoryLines';

import { PatientSetupPanel } from '../panels/PatientSetupPanel';
import { JumpMetricsPanel } from '../panels/JumpMetricsPanel';
import { TrajectoryPanel } from '../panels/TrajectoryPanel';
import { PhastTestsPanel } from '../panels/PhastTestsPanel';

export const JumpAnalysisStudio: React.FC = () => {
	const webcamRef = useRef<Webcam>(null);
	const stageRef = useRef<any>(null);

	const [currentFrame, setCurrentFrame] = useState(0);
	const [fps, setFps] = useState(240);
	const [patientMass, setPatientMass] = useState<number | null>(null);

	const [jumpEvents, setJumpEvents] = useState<{ takeoff?: number; landing?: number }>({});

	const { aiEnabled, aiLoading, poseKeypoints, startMoveNet, stopMoveNet } = useMoveNet(webcamRef as any);

	const {
		trackedTrajs,
		addTrajectory,
		handleCanvasClick,
		removeTrajectory,
		removeTrajectoryByKeypoint,
		clearTrajectories,
	} = useTrajectory(poseKeypoints, aiEnabled, currentFrame, { width: 800, height: 600 });

	const jumpMetrics = useMemo(() => calcJumpMetrics(jumpEvents.takeoff, jumpEvents.landing, fps, patientMass), [jumpEvents, fps, patientMass]);

	return (
		<div className="flex flex-col gap-6 h-full">
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<Card className="lg:col-span-3 relative overflow-hidden bg-black border-2 border-primary/20 rounded-3xl shadow-2xl h-[600px]">
					<div className="relative w-full h-full">
						<Webcam
							ref={webcamRef}
							audio={false}
							className="absolute inset-0 w-full h-full object-cover opacity-60"
						/>
						<Stage width={800} height={600} className="absolute inset-0 z-10" ref={stageRef} onClick={(e) => {
							const pos = e.target.getStage()?.getPointerPosition();
							if (pos) handleCanvasClick(pos.x, pos.y);
						}}>
							<Layer>
								{aiEnabled && <MoveNetSkeleton poseKeypoints={poseKeypoints} />}
								<TrajectoryLines trajectories={trackedTrajs} />
							</Layer>
						</Stage>
					</div>

					<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 z-30">
						<Button
							variant={aiEnabled ? "default" : "ghost"}
							size="sm"
							disabled={aiLoading}
							onClick={() => aiEnabled ? stopMoveNet() : startMoveNet()}
							className={`rounded-xl gap-2 text-xs font-black ${aiEnabled ? "bg-green-600 hover:bg-green-700" : ""}`}
						>
							<Cpu className="h-4 w-4" />
							{aiLoading ? "CARREGANDO..." : aiEnabled ? "AI ON" : "AI OFF"}
						</Button>
						<div className="h-6 w-px bg-white/20 mx-1" />
						<div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
							<Button size="icon" variant="ghost" className="h-8 w-8 text-white"
								onClick={() => setCurrentFrame(f => Math.max(0, f - 1))}>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<span className="text-white text-[10px] font-black self-center px-1 min-w-[40px] text-center">
								{currentFrame}
							</span>
							<Button size="icon" variant="ghost" className="h-8 w-8 text-white"
								onClick={() => setCurrentFrame(f => f + 1)}>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
						<Badge variant="secondary" className="text-[9px] font-black">{fps} fps</Badge>
					</div>
				</Card>

				<div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
					<PatientSetupPanel
						patientMass={patientMass} setPatientMass={setPatientMass}
						legLength={null} setLegLength={() => {}}
						runSpeed={0} setRunSpeed={() => {}}
						showLegLength={false} showRunSpeed={false}
					/>
					<JumpMetricsPanel
						jumpEvents={jumpEvents} setJumpEvents={setJumpEvents}
						currentFrame={currentFrame} jumpMetrics={jumpMetrics}
						patientMass={patientMass}
					/>
					<PhastTestsPanel />
					<TrajectoryPanel
						trackedTrajs={trackedTrajs} aiEnabled={aiEnabled}
						addTrajectory={addTrajectory} removeTrajectory={removeTrajectory}
						removeTrajectoryByKeypoint={removeTrajectoryByKeypoint} clearTrajectories={clearTrajectories}
					/>
				</div>
			</div>
		</div>
	);
};
