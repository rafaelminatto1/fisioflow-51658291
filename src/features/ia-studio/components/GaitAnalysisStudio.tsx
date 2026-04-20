import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
	Activity, 
	X, 
	Upload, 
	Play, 
	Pause, 
	RotateCcw, 
	Zap, 
	ChevronLeft, 
	Save,
	LayoutGrid,
	Crosshair,
	Share2,
	Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GaitAnalysisStudioProps {
	isOpen: boolean;
	onClose: () => void;
}

export const GaitAnalysisStudio: React.FC<GaitAnalysisStudioProps> = ({ isOpen, onClose }) => {
	const [videoFile, setVideoFile] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisProgress, setAnalysisProgress] = useState(0);
	const [showVectors, setShowVectors] = useState(true);
	
	const videoRef = useRef<HTMLVideoElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setVideoFile(URL.createObjectURL(file));
			setIsAnalyzing(true);
			// Simulação de processamento de IA
			let p = 0;
			const interval = setInterval(() => {
				p += 2;
				setAnalysisProgress(p);
				if (p >= 100) {
					clearInterval(interval);
					setIsAnalyzing(false);
				}
			}, 100);
		}
	};

	const togglePlay = () => {
		if (videoRef.current) {
			if (isPlaying) videoRef.current.pause();
			else videoRef.current.play();
			setIsPlaying(!isPlaying);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[200] bg-slate-950 flex flex-col"
				>
					{/* Header Premium */}
					<header className="p-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-md">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
								<Activity className="text-white w-6 h-6" />
							</div>
							<div>
								<h2 className="text-xl font-black text-white tracking-tight uppercase">GaitStudio <span className="text-blue-500">2.0</span></h2>
								<p className="text-[10px] text-blue-400 uppercase font-black tracking-widest">Advanced Gait & Posture AI</p>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Button variant="outline" className="border-white/10 text-white rounded-xl h-10 gap-2 bg-white/5 hover:bg-white/10">
								<Share2 className="w-4 h-4" /> Exportar
							</Button>
							<Button variant="ghost" size="icon" onClick={onClose} className="text-white/50 hover:text-white rounded-full">
								<X className="w-6 h-6" />
							</Button>
						</div>
					</header>

					<div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-6 gap-6">
						{/* Viewport Area */}
						<div className="flex-1 relative bg-black rounded-[40px] overflow-hidden border border-white/5 shadow-2xl group">
							{!videoFile ? (
								<div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-8">
									<div className="w-24 h-24 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
										<Upload className="w-10 h-10 text-blue-500" />
									</div>
									<div className="space-y-3">
										<h3 className="text-2xl font-black text-white uppercase tracking-tighter">Importar Ciclo de Marcha</h3>
										<p className="text-slate-500 max-w-sm font-medium">Faça o upload de um vídeo do paciente caminhando (lateral ou frontal) para análise biomecânica completa.</p>
									</div>
									<Button onClick={() => fileInputRef.current?.click()} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-10 h-14 font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20">
										Selecionar Vídeo
									</Button>
									<input type="file" hidden ref={fileInputRef} accept="video/*" onChange={handleFileUpload} />
								</div>
							) : (
								<>
									<video 
										ref={videoRef}
										src={videoFile}
										className="w-full h-full object-contain"
										loop
										playbackRate={playbackRate}
									/>
									
									{/* Vector Overlay Simulation */}
									{showVectors && !isAnalyzing && (
										<div className="absolute inset-0 pointer-events-none z-10">
											{/* Centro de Massa Tracking */}
											<div className="absolute top-[45%] left-1/2 w-4 h-4 -ml-2 -mt-2 bg-yellow-400 rounded-full shadow-[0_0_15px_#fbbf24] animate-pulse" />
											<div className="absolute top-[20%] left-1/2 w-[2px] h-[60%] bg-blue-500/30 -ml-[1px]" />
											
											{/* Vector indicators */}
											<div className="absolute bottom-[15%] left-[45%] flex flex-col items-center">
												<div className="h-20 w-[3px] bg-emerald-500 shadow-[0_0_10px_#10b981]" />
												<Badge className="mt-2 bg-emerald-500 text-white border-none font-black text-[9px]">GRF VECTOR</Badge>
											</div>
										</div>
									)}

									{/* Scanning/Processing Overlay */}
									<AnimatePresence>
										{isAnalyzing && (
											<motion.div 
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-12"
											>
												<div className="w-full max-w-md space-y-6">
													<div className="flex justify-between items-end">
														<div className="space-y-1">
															<span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Processando Marcha</span>
															<h4 className="text-xl font-bold text-white">IA Neural Pose Inference</h4>
														</div>
														<span className="text-2xl font-black text-white">{analysisProgress}%</span>
													</div>
													<Progress value={analysisProgress} className="h-2 bg-white/10" />
													<div className="flex gap-2">
														<Badge variant="outline" className="bg-white/5 border-white/10 text-white/50">33 Landmarks</Badge>
														<Badge variant="outline" className="bg-white/5 border-white/10 text-white/50">Kinematic Mapping</Badge>
													</div>
												</div>
											</motion.div>
										)}
									</AnimatePresence>

									{/* Controls HUD */}
									<div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl p-3 px-6 rounded-full border border-white/10 shadow-2xl z-40">
										<Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => { if(videoRef.current) videoRef.current.currentTime = 0 }}>
											<RotateCcw className="w-5 h-5" />
										</Button>
										<Button variant="secondary" size="icon" className="w-12 h-12 bg-white text-black hover:bg-white/90 rounded-full shadow-lg" onClick={togglePlay}>
											{isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black" />}
										</Button>
										<div className="w-[1px] h-6 bg-white/10 mx-2" />
										<div className="flex items-center gap-1">
											{[0.25, 0.5, 1].map(rate => (
												<Button 
													key={rate}
													onClick={() => { setPlaybackRate(rate); if(videoRef.current) videoRef.current.playbackRate = rate; }}
													variant="ghost" 
													className={cn("h-8 text-[10px] font-black px-2 rounded-lg", playbackRate === rate ? "bg-blue-600 text-white" : "text-white/50 hover:text-white")}
												>
													{rate}X
												</Button>
											))}
										</div>
									</div>
								</>
							)}
						</div>

						{/* Metrics Sidebar */}
						<aside className="w-full lg:w-[380px] space-y-6 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
							<Card className="bg-slate-900/50 border-white/5 rounded-[32px] overflow-hidden shrink-0">
								<CardContent className="p-6 space-y-6">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Filtros Biomecânicos</h3>
										<Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 text-blue-500 bg-blue-500/10"><LayoutGrid className="w-4 h-4" /></Button>
									</div>
									<div className="space-y-3">
										<div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-violet-500/20 rounded-lg"><Eye className="w-4 h-4 text-violet-400" /></div>
												<span className="text-xs font-bold text-slate-200">Vetores de Força</span>
											</div>
											<Switch checked={showVectors} onCheckedChange={setShowVectors} />
										</div>
										<div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
											<div className="flex items-center gap-3">
												<div className="p-2 bg-yellow-500/20 rounded-lg"><Crosshair className="w-4 h-4 text-yellow-400" /></div>
												<span className="text-xs font-bold text-slate-200">Centro de Massa</span>
											</div>
											<Switch checked={showVectors} onCheckedChange={setShowVectors} />
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Analytics Breakdown */}
							<div className="flex-1 space-y-4">
								<div className="flex items-center gap-2 px-2">
									<div className="w-1 h-4 bg-blue-500 rounded-full" />
									<h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Sinais Críticos de Marcha</h4>
								</div>
								
								{[
									{ label: "Oscilação Lateral do Tronco", value: "4.2°", status: "Alerta", color: "text-amber-500", bg: "bg-amber-500/10" },
									{ label: "Simetria de Passo (D/E)", value: "88%", status: "Ideal", color: "text-emerald-500", bg: "bg-emerald-500/10" },
									{ label: "Cadência", value: "92 p/min", status: "Baixa", color: "text-blue-400", bg: "bg-blue-400/10" },
									{ label: "Carga de Impacto Estimada", value: "2.1G", status: "Foco", color: "text-red-500", bg: "bg-red-500/10" }
								].map((m, i) => (
									<Card key={i} className="bg-white/5 border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-colors">
										<CardContent className="p-4 flex items-center justify-between">
											<div className="space-y-1">
												<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{m.label}</p>
												<h5 className="text-xl font-black text-white">{m.value}</h5>
											</div>
											<Badge className={cn("border-none text-[10px] font-black uppercase px-3 py-1", m.bg, m.color)}>{m.status}</Badge>
										</CardContent>
									</Card>
								))}
							</div>

							<Button className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm gap-3 shadow-xl shadow-blue-500/20 mt-auto">
								<Save className="w-5 h-5" /> Sincronizar com SOAP
							</Button>
						</aside>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default GaitAnalysisStudio;
