import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ServerSideVideoAnalyzer } from "@/components/analysis/video/ServerSideVideoAnalyzer";
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

export default function BiomechanicsAnalysisPage() {
	const [activeView, setActiveTab] = useState<"hub" | "instructions" | "library">("hub");
	const [selectedTest, setSelectedTest] = useState<string | null>(null);
	const navigate = useNavigate();

	const categories = [
		{
			id: "gait",
			title: "Corrida & Marcha",
			subtitle: "Análise em Esteira",
			icon: Activity,
			color: "text-green-500",
			bg: "bg-green-500/10",
			reference: "Morin et al. (2005)",
			description: "Métricas de cadência, oscilação vertical e tempo de contato.",
            route: "/clinical/biomechanics/gait"
		},
		{
			id: "jump",
			title: "Performance de Salto",
			subtitle: "MyJump Lab",
			icon: Zap,
			color: "text-blue-500",
			bg: "bg-blue-500/10",
			reference: "Bosco et al. (1983)",
			description: "Altura de salto (CMJ/SJ), RSI e perfil de força-velocidade.",
            route: "/clinical/biomechanics/jump"
		},
		{
			id: "posture",
			title: "Postura & Escoliose",
			subtitle: "Adams & SAPO",
			icon: User,
			color: "text-purple-500",
			bg: "bg-purple-500/10",
			reference: "Karachalios (1999)",
			description: "Avaliação fotogramétrica e ângulo de rotação de tronco (ATR).",
            route: "/clinical/biomechanics/posture"
		},
		{
			id: "functional",
			title: "Gesto Funcional",
			subtitle: "Kinovea Free",
			icon: Move,
			color: "text-orange-500",
			bg: "bg-orange-500/10",
			reference: "Clinical Biomechanics",
			description: "Análise livre de agachamento, arremesso ou gestos específicos.",
            route: "/clinical/biomechanics/functional"
		}
	];

	const tests = {
		gait: {
			id: "morin_gait",
			title: "Análise de Corrida (Esteira)",
			steps: [
				"Posicione o iPhone 15 lateralmente à esteira (3 metros).",
				"Grave em 240fps para máxima precisão temporal.",
				"Marque os pontos de Contato e Impulsão para gerar as métricas.",
			],
			positioning: "Câmera a 1 metro de altura, plano sagital.",
		},
		jump: {
			id: "bosco_jump",
			title: "Salto Vertical (Bosco Test)",
			steps: [
				"Capture o salto completo do início ao fim (plano frontal).",
				"Identifique o frame exato onde os pés perdem contato com o solo.",
				"Identifique o frame do primeiro contato no pouso.",
			],
			positioning: "iPhone no chão ou tripé baixo, visão frontal total.",
		},
		posture: {
			id: "sapo_posture",
			title: "Postura e Escoliose",
			steps: [
				"Paciente em posição ortostática neutra.",
				"Para Escoliose: Realizar o teste de inclinação de Adams.",
				"Utilizar a linha de prumo digital para referências verticais.",
			],
			positioning: "Tripé obrigatório, câmera nivelada pelos ombros.",
		},
		functional: {
			id: "kinovea_free",
			title: "Análise de Gesto Esportivo",
			steps: [
				"Grave o movimento específico do atleta.",
				"Use a ferramenta de Trajetória para rastrear pontos críticos.",
				"Compare ângulos em diferentes fases do movimento.",
			],
			positioning: "Livre, dependendo do gesto analisado.",
		}
	};

	const renderHub = () => (
		<div className="space-y-8 animate-in fade-in duration-700">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{categories.map((cat) => (
					<Card 
						key={cat.id} 
						className="group cursor-pointer hover:border-primary/50 hover:shadow-xl transition-all duration-300 overflow-hidden border-2"
						onClick={() => {
							setSelectedTest(cat.id);
							setActiveTab("instructions");
						}}
					>
						<CardContent className="p-0">
							<div className={`p-6 ${cat.bg} flex justify-between items-start`}>
								<div className={`p-3 rounded-2xl bg-background shadow-sm ${cat.color}`}>
									<cat.icon className="h-6 w-6" />
								</div>
								<Badge variant="secondary" className="text-[8px] font-black uppercase">
									{cat.reference}
								</Badge>
							</div>
							<div className="p-6 space-y-2">
								<div>
									<p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{cat.subtitle}</p>
									<h3 className="text-xl font-bold tracking-tighter">{cat.title}</h3>
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									{cat.description}
								</p>
								<div className="pt-4 flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
									VER INSTRUÇÕES <PlayCircle className="ml-2 h-4 w-4" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

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
				const test = tests[selectedTest as keyof typeof tests];
                const routeInfo = categories.find(c => c.id === selectedTest)?.route;
				return (
					<AssessmentInstruction
						testId={test.id}
						title={test.title}
						steps={test.steps}
						positioning={test.positioning}
						onStart={() => {
                            if (routeInfo) navigate(routeInfo);
                        }}
					/>
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
							<ServerSideVideoAnalyzer exerciseName="Biomecânica Livre" />
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
