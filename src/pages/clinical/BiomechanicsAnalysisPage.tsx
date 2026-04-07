import React, { Suspense, lazy, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AssessmentInstruction } from "@/components/clinical/AssessmentInstruction";
import { 
	Video, 
	Activity, 
	Zap, 
	User, 
	Move,
	Upload,
	PlayCircle,
	Clock,
	History,
    BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { biomechanicsProtocols } from "@/data/biomechanicsEvidence";

const ServerSideVideoAnalyzer = lazy(() =>
	import("@/components/analysis/video/ServerSideVideoAnalyzer").then((module) => ({
		default: module.ServerSideVideoAnalyzer,
	})),
);

type HubMode = keyof Pick<
	typeof biomechanicsProtocols,
	"gait" | "jump" | "posture" | "functional"
>;

export default function BiomechanicsAnalysisPage() {
	const [activeView, setActiveTab] = useState<"hub" | "instructions" | "library">("hub");
	const [selectedTest, setSelectedTest] = useState<HubMode | null>(null);
	const navigate = useNavigate();

	const categories = [
		{
			id: "gait" as const,
			title: "Corrida & Marcha",
			subtitle: "Análise 2D em Esteira",
			icon: Activity,
			color: "text-green-500",
			bg: "bg-green-500/10",
			reference: "Morin et al. (2005) + confiabilidade 2D",
			description: "Cadência, tempo de contato, corrida em esteira e comparação frame a frame.",
            route: "/clinical/biomechanics/gait"
		},
		{
			id: "jump" as const,
			title: "Performance de Salto",
			subtitle: "CMJ / My Jump",
			icon: Zap,
			color: "text-blue-500",
			bg: "bg-blue-500/10",
			reference: "Bosco + My Jump",
			description: "Altura de salto, tempo de voo, potência e comparação entre tentativas.",
            route: "/clinical/biomechanics/jump"
		},
		{
			id: "posture" as const,
			title: "Postura & Escoliose",
			subtitle: "Adams & SAPO",
			icon: User,
			color: "text-slate-400",
			bg: "bg-slate-500/10",
			reference: "Karachalios (1999)",
			description: "Avaliação fotogramétrica e ângulo de rotação de tronco (ATR).",
            route: "/clinical/biomechanics/posture"
		},
		{
			id: "functional" as const,
			title: "Gesto Funcional",
			subtitle: "Vídeo 2D Assistido",
			icon: Move,
			color: "text-orange-500",
			bg: "bg-orange-500/10",
			reference: "FMS / observação clínica",
			description: "Agachamento, gesto esportivo e testes funcionais com checkpoints e overlays.",
            route: "/clinical/biomechanics/functional"
		}
	];

	const renderHub = () => (
		<div className="space-y-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
				{categories.map((cat, idx) => (
                    <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card 
                            className="group cursor-pointer bg-slate-900/40 backdrop-blur-xl border-white/5 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-all duration-500 overflow-hidden"
                            onClick={() => {
                                setSelectedTest(cat.id);
                                setActiveTab("instructions");
                            }}
                        >
                            <CardContent className="p-0">
                                <div className={`p-8 ${cat.bg} relative overflow-hidden group-hover:scale-105 transition-transform duration-700`}>
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <cat.icon className="h-24 w-24 -mr-8 -mt-8 rotate-12" />
                                    </div>
                                    <div className={`p-4 rounded-2xl bg-slate-950 shadow-2xl border border-white/10 ${cat.color} relative z-10`}>
                                        <cat.icon className="h-7 w-7" />
                                    </div>
                                    <div className="mt-6 relative z-10">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase text-white/40 border-white/10 bg-black/20">
                                            {cat.reference}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-8 space-y-3 bg-gradient-to-b from-transparent to-slate-950/50">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-primary/60 tracking-[0.2em] mb-1">{cat.subtitle}</p>
                                        <h3 className="text-2xl font-black tracking-tighter text-white">{cat.title}</h3>
                                    </div>
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                        {cat.description}
                                    </p>
									<div className="grid grid-cols-1 gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300">
										<div>
											<p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
												Captura ideal
											</p>
											<p>{biomechanicsProtocols[cat.id].captureAngles[0]}</p>
										</div>
										<div>
											<p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
												Saída principal
											</p>
											<p>{biomechanicsProtocols[cat.id].measuredOutputs[0]}</p>
										</div>
									</div>
                                    <div className="pt-4 flex items-center text-[10px] font-black text-primary tracking-widest uppercase opacity-0 group-hover:opacity-100 translate-y-2group-hover:translate-y-0 transition-all duration-300">
                                        INICIAR PROTOCOLO <PlayCircle className="ml-2 h-4 w-4" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
				))}
            </motion.div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-bold flex items-center gap-2">
						<Video className="h-5 w-5 text-primary" />
						Biblioteca de Vídeos (iPhone 15)
					</h3>
					<Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/clinical/biomechanics/gait")}>
						<Upload className="h-4 w-4" /> Nova Análise Direta
					</Button>
					<Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setActiveTab("library")}>
						Biblioteca
					</Button>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[1, 2].map((i) => (
						<Card key={i} className="bg-muted/30 border-dashed">
							<CardContent className="p-4 flex gap-4 items-center">
								<div className="h-16 w-24 bg-black rounded-lg flex items-center justify-center relative overflow-hidden group">
									<PlayCircle className="h-6 w-6 text-white z-10 opacity-50 group-hover:opacity-100 transition-opacity" />
									<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-bold truncate">Análise Esteira_00{i}.mov</p>
									<p className="text-[10px] text-muted-foreground flex items-center gap-1">
										<Clock className="h-3 w-3" /> 240 fps • 1080p
									</p>
									<p className="text-[10px] text-muted-foreground">Há 2 dias</p>
								</div>
								<Button size="icon" variant="ghost" className="h-8 w-8">
									<History className="h-4 w-4" />
								</Button>
							</CardContent>
						</Card>
					))}
					<Card className="border-dashed flex items-center justify-center py-6 bg-muted/10">
						<p className="text-xs text-muted-foreground font-medium">Ver todos os vídeos...</p>
					</Card>
				</div>
			</div>
		</div>
	);

	const renderContent = () => {
		switch (activeView) {
			case "hub":
				return renderHub();
			case "instructions":
				if (!selectedTest) return renderHub();
				const protocol = biomechanicsProtocols[selectedTest];
                const routeInfo = categories.find(c => c.id === selectedTest)?.route;
				return (
					<div className="space-y-6">
						<AssessmentInstruction
							testId={`${selectedTest}-guided-protocol`}
							title={protocol.title}
							steps={protocol.executionSteps}
							positioning={protocol.captureAngles.join(" • ")}
							onStart={() => {
	                            if (routeInfo) navigate(routeInfo);
	                        }}
						/>
						<div className="grid gap-4 lg:grid-cols-2">
							{protocol.guidedTemplates.map((template) => (
								<Card
									key={template.id}
									className="border-white/10 bg-slate-950/40 backdrop-blur-xl"
								>
									<CardContent className="space-y-4 p-5">
										<div className="space-y-2">
											<p className="text-[10px] font-black uppercase tracking-widest text-primary/70">
												Template guiado
											</p>
											<h3 className="text-lg font-black tracking-tight text-white">
												{template.title}
											</h3>
											<p className="text-sm text-slate-400">{template.goal}</p>
										</div>
										<div className="space-y-2 text-sm text-slate-300">
											<p>
												<span className="font-bold text-slate-100">
													Captura:
												</span>{" "}
												{template.capturePreset}
											</p>
											<p>
												<span className="font-bold text-slate-100">
													Ideal para:
												</span>{" "}
												{template.idealFor}
											</p>
										</div>
										<ul className="space-y-1 text-sm text-slate-400">
											{template.checklist.map((item) => (
												<li key={item}>• {item}</li>
											))}
										</ul>
										<Button
											className="w-full"
											onClick={() => {
												if (routeInfo) navigate(routeInfo);
											}}
										>
											Abrir análise
										</Button>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				);
			case "library":
				return (
					<div className="space-y-6 animate-in fade-in duration-500">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
								<History className="h-5 w-5 text-primary" /> Biblioteca de Análises
							</h2>
							<Button variant="default" size="sm" className="gap-2"
								onClick={() => navigate("/clinical/biomechanics/functional")}>
								<Upload className="h-4 w-4" /> Nova Análise
							</Button>
						</div>
						<div className="bg-card border shadow-sm rounded-2xl p-4">
							<Suspense
								fallback={
									<div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
										Carregando biblioteca de vídeos...
									</div>
								}
							>
								<ServerSideVideoAnalyzer exerciseName="Biomecânica Livre" />
							</Suspense>
						</div>
						<p className="text-[10px] text-muted-foreground text-center">
							Vídeos são salvos no R2 (media.moocafisio.com.br) e analisados pelo Gemini 1.5 Pro
						</p>
					</div>
				);
			default:
				return renderHub();
		}
	};

	return (
		<MainLayout>
			<div className="min-h-screen bg-background/50 pb-20">
				<div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-4 print:hidden">
					<div className="max-w-7xl mx-auto flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
								<BarChart3 className="h-6 w-6 text-primary" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h1 className="text-2xl font-black text-foreground tracking-tighter">
										BIOMECHANICS LAB
									</h1>
									<Badge className="bg-primary text-white font-black text-[10px] px-2 py-0.5">
										V3 KINOVEA ENGINE
									</Badge>
								</div>
								<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
									<span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
									Sistema de Suporte à Decisão Clínica Ativo
								</p>
							</div>
						</div>
						{activeView !== "hub" && (
							<Button variant="outline" size="sm" onClick={() => setActiveTab("hub")} className="font-bold text-xs uppercase">
								Menu Principal
							</Button>
						)}
					</div>
				</div>

				<div className="max-w-7xl mx-auto px-4 py-8">
					{renderContent()}
				</div>
			</div>
		</MainLayout>
	);
}
