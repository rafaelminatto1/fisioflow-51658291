import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
	Mic, 
	Activity, 
	MessageSquare, 
	TrendingUp, 
	Zap, 
	ChevronRight,
	ShieldCheck,
	Lock,
	User,
	MonitorPlay
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScribeDrawer } from "@/features/ia-studio/components/ScribeDrawer";
import { FisioADM } from "@/features/ia-studio/components/FisioADM";
import { FisioRetention } from "@/features/ia-studio/components/FisioRetention";
import { FisioPredictIndicator } from "@/features/ia-studio/components/FisioPredictIndicator";
import { GaitAnalysisStudio } from "@/features/ia-studio/components/GaitAnalysisStudio";
import { PremiumReportGenerator } from "@/features/ia-studio/components/PremiumReportGenerator";
import { cn } from "@/lib/utils";

const IAStudio = () => {
	const [isScribeOpen, setIsScribeOpen] = useState(false);
	const [isADMOpen, setIsADMOpen] = useState(false);
	const [isGaitOpen, setIsGaitOpen] = useState(false);
	const [activeFeatureTab, setActiveFeatureTab] = useState<"retention" | "predict" | "report" | null>(null);

	const features = [
		{
			id: "scribe",
			title: "FisioAmbient",
			subtitle: "AI Ambient Scribe",
			desc: "Transcrição clínica inteligente e geração automática de SOAP.",
			icon: <Mic className="w-6 h-6" />,
			color: "bg-violet-500",
			action: () => setIsScribeOpen(true),
			status: "Ativo",
		},
		{
			id: "adm",
			title: "FisioADM",
			subtitle: "Bio-Vision ROM",
			desc: "Medição de amplitude de movimento via câmera em tempo real.",
			icon: <Activity className="w-6 h-6" />,
			color: "bg-blue-500",
			action: () => setIsADMOpen(true),
			status: "Ativo",
		},
		{
			id: "gait",
			title: "GaitStudio",
			subtitle: "Análise de Marcha",
			desc: "Análise biomecânica de vídeo com overlay de vetores e centro de massa.",
			icon: <MonitorPlay className="w-6 h-6" />,
			color: "bg-cyan-500",
			action: () => setIsGaitOpen(true),
			status: "Ativo",
		},
		{
			id: "report",
			title: "Premium Reports",
			subtitle: "Relatórios IA",
			desc: "Geração de documentos PDF premium dual (Médico e Paciente) via IA.",
			icon: <FileText className="w-6 h-6" />,
			color: "bg-indigo-500",
			action: () => setActiveFeatureTab(activeFeatureTab === "report" ? null : "report"),
			status: "Ativo",
		},
		{
			id: "retention",
			title: "FisioRetention",
			subtitle: "Agente Proativo",
			desc: "Automação de WhatsApp para reduzir no-show e churn.",
			icon: <MessageSquare className="w-6 h-6" />,
			color: "bg-emerald-500",
			action: () => setActiveFeatureTab(activeFeatureTab === "retention" ? null : "retention"),
			status: "Ativo",
		},
		{
			id: "predict",
			title: "FisioPredict",
			subtitle: "Predição de Alta",
			desc: "Análise preditiva de tempo de tratamento e alta clínica.",
			icon: <TrendingUp className="w-6 h-6" />,
			color: "bg-amber-500",
			action: () => setActiveFeatureTab(activeFeatureTab === "predict" ? null : "predict"),
			status: "Ativo",
		}
	];

	return (
		<MainLayout>
			<div className="p-8 max-w-7xl mx-auto space-y-12 pb-32">
				{/* Hero Section */}
				<header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden">
					<div className="space-y-4 relative z-10">
						<div className="flex items-center gap-2">
							<Badge className="bg-violet-600/10 text-violet-400 border-violet-500/20 hover:bg-violet-600/20 transition-colors">
								<Zap className="w-3 h-3 mr-1" /> Inteligência de Borda
							</Badge>
							<Badge variant="outline" className="text-slate-400 border-slate-800">v4.6 Premium Access</Badge>
						</div>
						<h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
							IA Studio <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500">Central</span>
						</h1>
						<p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg leading-relaxed font-medium">
							Potencialize sua prática clínica com as ferramentas de inteligência artificial mais avançadas da fisioterapia. Automação, precisão e retenção em um só lugar.
						</p>
					</div>
					
					<div className="flex gap-3 relative z-10">
						<Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-8 h-14 font-bold shadow-xl shadow-slate-200 dark:shadow-none transition-all hover:scale-105 active:scale-95">
							<Zap className="w-5 h-5 mr-2 text-amber-400 fill-amber-400" />
							Upgrade Pro
						</Button>
					</div>

					<div className="absolute -top-20 -right-20 w-96 h-96 bg-violet-500/10 blur-[100px] rounded-full" />
				</header>

				{/* Features Grid */}
				<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
					{features.map((feature, idx) => (
						<motion.div
							key={feature.title}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: idx * 0.1 }}
						>
							<Card 
								className={cn(
									"group h-full border-none shadow-xl shadow-slate-200/50 dark:shadow-none dark:bg-slate-900/50 dark:border dark:border-slate-800 hover:ring-2 hover:ring-violet-500/30 transition-all duration-500 rounded-[32px] overflow-hidden flex flex-col cursor-pointer",
									activeFeatureTab === feature.id && "ring-2 ring-violet-500/50 shadow-violet-500/10"
								)} 
								onClick={feature.action}
							>
								<CardHeader className="p-8 pb-4">
									<div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-${feature.color.split('-')[1]}-500/30 group-hover:scale-110 transition-transform duration-500`}>
										{feature.icon}
									</div>
									<div className="space-y-1">
										<div className="flex items-center justify-between">
											<span className="text-[10px] uppercase font-black tracking-widest text-slate-400">{feature.subtitle}</span>
											<Badge variant="secondary" className="text-[9px] h-5 rounded-full px-2">
												{feature.status === 'Ativo' ? <Zap className="w-2.5 h-2.5 mr-1 fill-violet-500 text-violet-500" /> : <Lock className="w-2.5 h-2.5 mr-1" />}
												{feature.status}
											</Badge>
										</div>
										<CardTitle className="text-xl font-bold group-hover:text-violet-600 transition-colors leading-tight">{feature.title}</CardTitle>
									</div>
								</CardHeader>
								<CardContent className="p-8 pt-0 flex-1 flex flex-col justify-between">
									<p className="text-xs text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
										{feature.desc}
									</p>
									<Button variant="ghost" className="w-full justify-between group/btn hover:bg-violet-50 text-violet-600 dark:hover:bg-violet-900/20 rounded-xl px-4 font-bold transition-all h-9 text-xs uppercase tracking-widest">
										{feature.status === 'Ativo' ? 'Acessar' : 'Configurar'}
										<ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</section>

				{/* Detailed Feature View */}
				<AnimatePresence mode="wait">
					{activeFeatureTab === "report" && (
						<motion.div
							key="report"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							className="bg-slate-50 dark:bg-slate-900/30 p-8 rounded-[40px] border border-white/5 shadow-inner overflow-hidden"
						>
							<div className="max-w-4xl mx-auto">
								<PremiumReportGenerator patientId="test-patient-id" patientName="Paciente Teste" />
							</div>
						</motion.div>
					)}
					{activeFeatureTab === "retention" && (
						<motion.div
							key="retention"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							className="bg-slate-50 dark:bg-slate-900/30 p-8 rounded-[40px] border border-white/5 shadow-inner overflow-hidden"
						>
							<div className="max-w-4xl mx-auto">
								<FisioRetention />
							</div>
						</motion.div>
					)}

					{activeFeatureTab === "predict" && (
						<motion.div
							key="predict"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							className="bg-slate-50 dark:bg-slate-900/30 p-8 rounded-[40px] border border-white/5 shadow-inner overflow-hidden"
						>
							<div className="max-w-4xl mx-auto space-y-8">
								<div className="flex items-center justify-between">
									<h3 className="text-xl font-bold flex items-center gap-2">
										<TrendingUp className="w-6 h-6 text-amber-500" />
										Simulador de Alta Preditiva
									</h3>
									<Button variant="outline" className="rounded-xl border-white/10 h-10 gap-2">
										<User className="w-4 h-4" />
										Selecionar Paciente
									</Button>
								</div>
								
								<p className="text-slate-500 text-sm max-w-2xl font-medium">
									Selecione um paciente para ver a projeção de tratamento baseada na evolução clínica e benchmarks da clínica.
								</p>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
									<div className="p-8 rounded-[32px] bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
										<h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Configuração do Modelo</h4>
										<div className="space-y-6">
											<div className="flex justify-between items-center text-sm">
												<span className="text-slate-500 font-bold">Benchmark por CID</span>
												<Badge variant="secondary" className="rounded-lg">Hérnia de Disco (L5-S1)</Badge>
											</div>
											<div className="flex justify-between items-center text-sm">
												<span className="text-slate-500 font-bold">Frequência Semanal</span>
												<Badge variant="secondary" className="rounded-lg">2x por semana</Badge>
											</div>
											<div className="flex justify-between items-center text-sm">
												<span className="text-slate-500 font-bold">Velocidade de Ganho ADM</span>
												<Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded-lg">+12% (Alta)</Badge>
											</div>
										</div>
									</div>
									<FisioPredictIndicator patientId="test-patient-id" />
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Security & Compliance Info */}
				<footer className="p-8 rounded-[40px] bg-gradient-to-br from-slate-900 to-slate-950 text-white relative overflow-hidden">
					<div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
						<div className="space-y-4 max-w-2xl">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
									<ShieldCheck className="w-5 h-5 text-emerald-400" />
								</div>
								<h3 className="text-xl font-bold uppercase tracking-tight">Segurança & Privacidade (LGPD)</h3>
							</div>
							<p className="text-slate-400 text-sm leading-relaxed font-medium">
								O FisioFlow IA Studio foi projetado com privacidade por padrão. Os dados de voz e vídeo são processados de forma efêmera e criptografada. Nenhum dado biométrico é armazenado permanentemente sem o consentimento explícito e auditável do paciente.
							</p>
						</div>
						<Button variant="outline" className="border-slate-800 text-white hover:bg-slate-800 rounded-2xl px-6 h-12 uppercase font-black text-[10px] tracking-widest">
							Auditoria de IA
						</Button>
					</div>
					
					<div className="absolute top-1/2 left-1/4 w-32 h-32 bg-violet-600/20 blur-[60px] rounded-full" />
					<div className="absolute bottom-0 right-10 w-48 h-48 bg-emerald-600/10 blur-[80px] rounded-full" />
				</footer>
			</div>

			<ScribeDrawer 
				isOpen={isScribeOpen} 
				onClose={() => setIsScribeOpen(false)} 
				patientId="test-patient-id"
			/>

			<FisioADM
				isOpen={isADMOpen}
				onClose={() => setIsADMOpen(false)}
			/>

			<GaitAnalysisStudio
				isOpen={isGaitOpen}
				onClose={() => setIsGaitOpen(false)}
			/>
		</MainLayout>
	);
};

export default IAStudio;
