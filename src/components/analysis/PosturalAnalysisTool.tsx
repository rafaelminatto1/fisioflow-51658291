import React, { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import {
	Camera,
	RefreshCcw,
	Grid,
	Maximize2,
	AlertCircle,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Mock MediaPipe for UI development if not installed
// In a real scenario, we would use @mediapipe/pose
interface Landmark {
	x: number;
	y: number;
	z?: number;
	visibility?: number;
}

interface PosturalAnalysisToolProps {
	onCapture?: (image: string, analysis: any) => void;
	patientName?: string;
}

export const PosturalAnalysisTool: React.FC<PosturalAnalysisToolProps> = ({
	onCapture,
	patientName,
}) => {
	const webcamRef = useRef<Webcam>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isAiActive, setIsAiActive] = useState(true);
	const [showGrid, setShowGrid] = useState(true);
	const [showAngles, setShowAngles] = useState(true);
	const [capturedImages, setCapturedImages] = useState<
		{ url: string; type: string }[]
	>([]);
	const [,setIsProcessing] = useState(false);
	const [cameraError, setCameraError] = useState<string | null>(null);

	// Animation frame for drawing
	const requestRef = useRef<number>();

	const drawOverlay = useCallback(() => {
		if (!canvasRef.current || !webcamRef.current) return;

		const ctx = canvasRef.current.getContext("2d");
		if (!ctx) return;

		// Match canvas to webcam
		const video = webcamRef.current.video;
		if (video && video.readyState === 4) {
			canvasRef.current.width = video.videoWidth;
			canvasRef.current.height = video.videoHeight;

			ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

			// 1. Draw Grid
			if (showGrid) {
				ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
				ctx.lineWidth = 1;
				const spacing = 50;

				for (let x = 0; x < canvasRef.current.width; x += spacing) {
					ctx.beginPath();
					ctx.moveTo(x, 0);
					ctx.lineTo(x, canvasRef.current.height);
					ctx.stroke();
				}
				for (let y = 0; y < canvasRef.current.height; y += spacing) {
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(canvasRef.current.width, y);
					ctx.stroke();
				}

				// Center line (Plumb Line)
				ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
				ctx.lineWidth = 2;
				ctx.setLineDash([5, 5]);
				ctx.beginPath();
				ctx.moveTo(canvasRef.current.width / 2, 0);
				ctx.lineTo(canvasRef.current.width / 2, canvasRef.current.height);
				ctx.stroke();
				ctx.setLineDash([]);
			}

			// 2. Draw Mock AI Landmarks (Simulating MediaPipe)
			if (isAiActive) {
				const w = canvasRef.current.width;
				const h = canvasRef.current.height;

				// Mock points
				const mockLandmarks = {
					head: { x: w * 0.5, y: h * 0.2 },
					shoulders: [
						{ x: w * 0.4, y: h * 0.35 },
						{ x: w * 0.6, y: h * 0.35 },
					],
					hips: [
						{ x: w * 0.42, y: h * 0.6 },
						{ x: w * 0.58, y: h * 0.6 },
					],
					knees: [
						{ x: w * 0.43, y: h * 0.8 },
						{ x: w * 0.57, y: h * 0.8 },
					],
					ankles: [
						{ x: w * 0.43, y: h * 0.95 },
						{ x: w * 0.57, y: h * 0.95 },
					],
				};

				ctx.fillStyle = "#00ff00";
				ctx.strokeStyle = "#00ff00";
				ctx.lineWidth = 3;

				// Draw Skeleton Lines
				ctx.beginPath();
				ctx.moveTo(mockLandmarks.shoulders[0].x, mockLandmarks.shoulders[0].y);
				ctx.lineTo(mockLandmarks.shoulders[1].x, mockLandmarks.shoulders[1].y);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(mockLandmarks.hips[0].x, mockLandmarks.hips[0].y);
				ctx.lineTo(mockLandmarks.hips[1].x, mockLandmarks.hips[1].y);
				ctx.stroke();

				// Draw Joints
				[
					mockLandmarks.head,
					...mockLandmarks.shoulders,
					...mockLandmarks.hips,
					...mockLandmarks.knees,
					...mockLandmarks.ankles,
				].forEach((p) => {
					ctx.beginPath();
					ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
					ctx.fill();
					ctx.strokeStyle = "white";
					ctx.stroke();
				});

				// 3. Draw Angles (Head tilt simulation)
				if (showAngles) {
					ctx.fillStyle = "white";
					ctx.font = "bold 16px Inter";
					ctx.fillText(
						"Alinhamento: 98%",
						mockLandmarks.head.x + 20,
						mockLandmarks.head.y,
					);
					ctx.fillText(
						"Nível: 0.5°",
						mockLandmarks.shoulders[1].x + 10,
						mockLandmarks.shoulders[1].y,
					);
				}
			}
		}

		requestRef.current = requestAnimationFrame(drawOverlay);
	}, [showGrid, isAiActive, showAngles]);

	useEffect(() => {
		requestRef.current = requestAnimationFrame(drawOverlay);
		return () => {
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
		};
	}, [drawOverlay]);

	const captureSnapshot = (type: string) => {
		if (webcamRef.current) {
			const imageSrc = webcamRef.current.getScreenshot();
			if (imageSrc) {
				setCapturedImages((prev) => [{ url: imageSrc, type }, ...prev]);
				if (onCapture) onCapture(imageSrc, { type, angles: {} });
			}
		}
	};

	return (
		<TooltipProvider>
			<div className="flex flex-col gap-6 h-full min-h-[600px]">
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
					{/* Main Viewport */}
					<Card className="lg:col-span-3 relative overflow-hidden bg-black border-2 border-primary/20 rounded-2xl shadow-2xl group">
						{cameraError ? (
							<div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
								<AlertCircle className="h-12 w-12 text-destructive mb-4" />
								<h3 className="text-xl font-bold">Erro na Câmera</h3>
								<p className="text-muted-foreground mt-2">{cameraError}</p>
								<Button
									variant="outline"
									className="mt-6 border-white/20"
									onClick={() => window.location.reload()}
								>
									Tentar Novamente
								</Button>
							</div>
						) : (
							<>
								<Webcam
									ref={webcamRef}
									audio={false}
									screenshotFormat="image/jpeg"
									videoConstraints={{
										facingMode: "user",
										width: 1280,
										height: 720,
									}}
									onUserMediaError={() =>
										setCameraError(
											"Não foi possível acessar a webcam. Verifique as permissões.",
										)
									}
									className="w-full h-full object-cover"
								/>
								<canvas
									ref={canvasRef}
									className="absolute inset-0 w-full h-full pointer-events-none"
								/>

								{/* HUD Overlay */}
								<div className="absolute top-4 left-4 flex flex-col gap-2">
									<Badge className="bg-primary/80 backdrop-blur-md text-white border-none px-3 py-1 gap-2">
										<span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
										AI Ativo: Pose Tracking
									</Badge>
									{patientName && (
										<Badge
											variant="outline"
											className="bg-black/40 backdrop-blur-md text-white border-white/20 font-medium"
										>
											Paciente: {patientName}
										</Badge>
									)}
								</div>

								{/* Floating Controls */}
								<div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300">
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												size="icon"
												variant={showGrid ? "default" : "ghost"}
												onClick={() => setShowGrid(!showGrid)}
												className="rounded-xl h-12 w-12"
											>
												<Grid className="h-5 w-5" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Grade Clínica</TooltipContent>
									</Tooltip>

									<div className="h-8 w-px bg-white/10 mx-1" />

									<Button
										onClick={() => captureSnapshot("Anterior")}
										className="h-14 px-8 rounded-xl bg-white text-black hover:bg-white/90 font-bold gap-2"
									>
										<Camera className="h-5 w-5" /> Capture Anterior
									</Button>

									<div className="h-8 w-px bg-white/10 mx-1" />

									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												size="icon"
												variant={isAiActive ? "default" : "ghost"}
												onClick={() => setIsAiActive(!isAiActive)}
												className="rounded-xl h-12 w-12"
											>
												<RefreshCcw
													className={cn(
														"h-5 w-5",
														isAiActive && "animate-spin-slow",
													)}
												/>
											</Button>
										</TooltipTrigger>
										<TooltipContent>Recalibrar AI</TooltipContent>
									</Tooltip>
								</div>
							</>
						)}
					</Card>

					{/* Sidebar Tools */}
					<div className="flex flex-col gap-6">
						<Card className="border-none shadow-sm bg-card/50">
							<CardContent className="p-6 space-y-6">
								<div className="space-y-4">
									<h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
										Configurações AI
									</h4>

									<div className="flex items-center justify-between">
										<Label htmlFor="ai-toggle" className="text-sm font-medium">
											Tracking de Pontos
										</Label>
										<Switch
											id="ai-toggle"
											checked={isAiActive}
											onCheckedChange={setIsAiActive}
										/>
									</div>

									<div className="flex items-center justify-between">
										<Label
											htmlFor="angle-toggle"
											className="text-sm font-medium"
										>
											Cálculo de Ângulos
										</Label>
										<Switch
											id="angle-toggle"
											checked={showAngles}
											onCheckedChange={setShowAngles}
										/>
									</div>

									<div className="space-y-2 pt-2">
										<div className="flex justify-between items-center">
											<Label className="text-xs">Sensibilidade</Label>
											<span className="text-[10px] font-mono">0.85</span>
										</div>
										<Slider
											defaultValue={[85]}
											max={100}
											step={1}
											className="py-2"
										/>
									</div>
								</div>

								<div className="h-px bg-border" />

								<div className="space-y-4">
									<h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
										Vistas Sugeridas
									</h4>
									<div className="grid grid-cols-2 gap-2">
										<Button
											variant="outline"
											size="sm"
											className="text-[10px] h-8 uppercase"
											onClick={() => captureSnapshot("Anterior")}
										>
											Anterior
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="text-[10px] h-8 uppercase"
											onClick={() => captureSnapshot("Lateral D")}
										>
											Lateral D
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="text-[10px] h-8 uppercase"
											onClick={() => captureSnapshot("Lateral E")}
										>
											Lateral E
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="text-[10px] h-8 uppercase"
											onClick={() => captureSnapshot("Posterior")}
										>
											Posterior
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Gallery */}
						<div className="flex-1 space-y-4 overflow-hidden flex flex-col">
							<h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex justify-between">
								Capturas <span>{capturedImages.length}</span>
							</h4>
							<ScrollArea className="flex-1">
								<div className="grid grid-cols-1 gap-3 pr-4">
									{capturedImages.map((img, idx) => (
										<div
											key={idx}
											className="relative group rounded-xl overflow-hidden border bg-background shadow-sm animate-in zoom-in-95"
										>
											<img
												src={img.url}
												alt={img.type}
												className="w-full h-24 object-cover"
											/>
											<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
												<Button
													size="icon"
													variant="secondary"
													className="h-8 w-8"
												>
													<Maximize2 className="h-4 w-4" />
												</Button>
												<Button
													size="icon"
													variant="destructive"
													className="h-8 w-8"
													onClick={() =>
														setCapturedImages((prev) =>
															prev.filter((_, i) => i !== idx),
														)
													}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
											<div className="absolute bottom-1 left-1">
												<Badge className="bg-primary text-[10px] px-1.5 py-0 h-4">
													{img.type}
												</Badge>
											</div>
										</div>
									))}
									{capturedImages.length === 0 && (
										<div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl text-muted-foreground/40">
											<Camera className="h-8 w-8 mb-2" />
											<p className="text-[10px] uppercase font-bold">
												Nenhuma captura
											</p>
										</div>
									)}
								</div>
							</ScrollArea>
						</div>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
};
