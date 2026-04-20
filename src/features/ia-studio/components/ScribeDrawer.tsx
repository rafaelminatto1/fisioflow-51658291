import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
	Mic, 
	X, 
	Zap, 
	Save, 
	ChevronRight, 
	CheckCircle2, 
	AlertCircle,
	Volume2,
	BrainCircuit,
	Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScribeWaveform } from "./ScribeWaveform";
import { cn } from "@/lib/utils";
import { iaStudioApi } from "@/api/v2";
import { toast } from "sonner";

interface ScribeDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
}

type SoapSection = "S" | "O" | "A" | "P";

export const ScribeDrawer: React.FC<ScribeDrawerProps> = ({ 
	isOpen, 
	onClose,
	patientId 
}) => {
	const [activeSection, setActiveSection] = useState<SoapSection | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [consentObtained, setConsentObtained] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [transcription, setTranscription] = useState<Record<SoapSection, string>>({
		S: "", O: "", A: "", P: ""
	});

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);

	const startRecording = async (section: SoapSection) => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
				await processAudio(section, audioBlob);
				stream.getTracks().forEach(track => track.stop());
			};

			mediaRecorder.start();
			setIsRecording(true);
			setActiveSection(section);
		} catch (err) {
			console.error("Erro ao acessar microfone:", err);
			toast.error("Não foi possível acessar o microfone.");
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
		}
	};

	const processAudio = async (section: SoapSection, blob: Blob) => {
		if (!patientId) {
			toast.error("Paciente não selecionado.");
			return;
		}

		setIsProcessing(true);
		try {
			// 1. Converter Blob para Base64
			const reader = new FileReader();
			const base64Promise = new Promise<string>((resolve) => {
				reader.onloadend = () => {
					const base64String = (reader.result as string).split(',')[1];
					resolve(base64String);
				};
			});
			reader.readAsDataURL(blob);
			const audioBase64 = await base64Promise;

			// 2. Chamar API
			const response = await iaStudioApi.processScribeAudio(patientId, section, audioBase64);

			if (response.success) {
				setTranscription(prev => ({
					...prev,
					[section]: response.formattedText
				}));
				toast.success(`Seção ${section} processada com sucesso!`);
			}
		} catch (err: any) {
			console.error("Erro ao processar áudio:", err);
			toast.error("Erro ao processar áudio: " + (err.message || "Tente novamente."));
		} finally {
			setIsProcessing(false);
			setActiveSection(null);
		}
	};

	const handleToggleRecord = (section: SoapSection) => {
		if (!consentObtained) {
			toast.warning("Obtenha o consentimento do paciente primeiro.");
			return;
		}
		
		if (activeSection === section && isRecording) {
			stopRecording();
		} else if (!isRecording && !isProcessing) {
			startRecording(section);
		}
	};

	const handleIntegrate = () => {
		// Aqui integraríamos com o hook de evolução ativo
		// Por enquanto apenas fechamos e emitimos um evento/toast
		toast.success("Dados integrados ao prontuário com sucesso!");
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ x: "100%" }}
					animate={{ x: 0 }}
					exit={{ x: "100%" }}
					transition={{ type: "spring", damping: 25, stiffness: 200 }}
					className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-950/95 backdrop-blur-xl border-l border-violet-500/30 shadow-2xl z-[100] text-slate-50 flex flex-col overflow-hidden"
				>
					{/* Header */}
					<div className="p-6 border-b border-violet-500/20 flex items-center justify-between bg-gradient-to-r from-violet-900/20 to-transparent">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-violet-600 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.5)]">
								<BrainCircuit className="w-5 h-5" />
							</div>
							<div>
								<h2 className="text-lg font-bold tracking-tight">FisioAmbient</h2>
								<div className="flex items-center gap-1">
									<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
									<span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">AI Scribe Online</span>
								</div>
							</div>
						</div>
						<Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-slate-800 rounded-full">
							<X className="w-5 h-5" />
						</Button>
					</div>

					<ScrollArea className="flex-1 p-6">
						{/* Consent Section */}
						{!consentObtained ? (
							<div className="mb-8 p-4 rounded-2xl bg-violet-900/10 border border-violet-500/20">
								<h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
									<AlertCircle className="w-4 h-4 text-violet-400" />
									Requisito de Privacidade
								</h3>
								<p className="text-xs text-slate-400 mb-4 leading-relaxed">
									Para iniciar a documentação por voz, você deve confirmar a autorização verbal do paciente conforme as normas da LGPD.
								</p>
								<div className="flex items-center space-x-2">
									<Switch 
										id="consent" 
										checked={consentObtained}
										onCheckedChange={setConsentObtained}
										className="data-[state=checked]:bg-violet-600"
									/>
									<Label htmlFor="consent" className="text-xs cursor-pointer">Paciente autorizou o registro por voz</Label>
								</div>
							</div>
						) : (
							<Badge variant="outline" className="mb-8 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1">
								<CheckCircle2 className="w-3 h-3 mr-1" /> Consentimento Ativo
							</Badge>
						)}

						{/* Main PTT Grid */}
						<div className="grid grid-cols-2 gap-4 mb-8">
							{(["S", "O", "A", "P"] as SoapSection[]).map((section) => (
								<button
									key={section}
									disabled={!consentObtained || (activeSection !== null && activeSection !== section) || isProcessing}
									onClick={() => handleToggleRecord(section)}
									className={cn(
										"relative group flex flex-col items-center justify-center p-6 rounded-3xl border transition-all duration-300 overflow-hidden",
										activeSection === section && isRecording 
											? "bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
											: "bg-slate-900/50 border-slate-800 hover:border-violet-500/50",
										(!consentObtained || (activeSection !== null && activeSection !== section) || isProcessing) && "opacity-50 grayscale cursor-not-allowed"
									)}
								>
									{activeSection === section && isRecording && (
										<div className="absolute inset-0 bg-red-500/5 animate-pulse" />
									)}
									
									<div className={cn(
										"w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors",
										activeSection === section && isRecording ? "bg-red-500" : "bg-slate-800 group-hover:bg-violet-600"
									)}>
										{activeSection === section && isRecording ? <Volume2 className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
									</div>
									<span className="text-sm font-bold">{section}</span>
									<span className="text-[10px] text-slate-500 uppercase">
										{section === 'S' ? 'Subjetivo' : section === 'O' ? 'Objetivo' : section === 'A' ? 'Avaliação' : 'Plano'}
									</span>
								</button>
							))}
						</div>

						{/* Live Feedback / Waveform */}
						<AnimatePresence>
							{activeSection && isRecording && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className="mb-8"
								>
									<Card className="bg-slate-900 border-violet-500/30 overflow-hidden">
										<CardContent className="p-4 flex flex-col items-center">
											<div className="w-full flex items-center justify-between mb-4">
												<span className="text-xs font-semibold text-violet-400">Gravando Seção {activeSection}...</span>
												<span className="text-[10px] text-slate-500 animate-pulse">Gravando áudio</span>
											</div>
											<ScribeWaveform isRecording={isRecording} />
										</CardContent>
									</Card>
								</motion.div>
							)}
						</AnimatePresence>

						{/* Results / Review */}
						<div className="space-y-6">
							<h3 className="text-sm font-bold flex items-center gap-2 text-violet-400 uppercase tracking-widest">
								<Zap className="w-4 h-4" />
								Revisão da IA
							</h3>
							
							{(["S", "O", "A", "P"] as SoapSection[]).map((section) => (
								transcription[section] && (
									<motion.div
										key={section}
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition-colors"
									>
										<div className="flex items-center justify-between mb-2">
											<Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20">{section}</Badge>
											<Button variant="ghost" size="sm" className="h-7 text-[10px] hover:text-violet-400">Editar</Button>
										</div>
										<p className="text-sm text-slate-300 leading-relaxed italic">
											"{transcription[section]}"
										</p>
									</motion.div>
								)
							))}

							{Object.values(transcription).every(t => !t) && !isProcessing && (
								<div className="text-center py-12 px-6">
									<Mic className="w-8 h-8 text-slate-800 mx-auto mb-4" />
									<p className="text-slate-500 text-sm italic">Ocupe suas mãos com o paciente. Deixe que eu cuido da documentação.</p>
								</div>
							)}

							{isProcessing && (
								<div className="flex flex-col items-center py-8">
									<Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
									<p className="text-sm text-violet-400 font-medium">Refinando termos técnicos...</p>
								</div>
							)}
						</div>
					</ScrollArea>

					{/* Footer Action */}
					<div className="p-6 bg-slate-950 border-t border-violet-500/20">
						<Button 
							onClick={handleIntegrate}
							disabled={Object.values(transcription).every(t => !t) || isProcessing}
							className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-bold gap-2 shadow-[0_10px_30px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
						>
							<Save className="w-5 h-5" />
							Confirmar e Integrar ao Prontuário
						</Button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default ScribeDrawer;
