import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { KinoveaStudio } from "@/components/analysis/KinoveaStudio";
import { AssessmentInstruction } from "@/components/clinical/AssessmentInstruction";
import { Camera, Video, Activity, LayoutGrid, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BiomechanicsAnalysisPage() {
	const [activeTab, setActiveTab] = useState("instructions");
	const [selectedTest, setSelectedTest] = useState<string | null>(null);

	const tests = {
		gait: {
			id: "morin_gait",
			title: "Análise de Corrida (Esteira)",
			steps: [
				"Posicione o paciente na esteira em velocidade constante.",
				"Capture 10 segundos de vídeo lateral (plano sagital).",
				"Marque o primeiro contato do calcanhar e a impulsão.",
			],
			positioning: "Câmera a 1 metro de altura, 3 metros de distância, visão lateral.",
		},
		jump: {
			id: "bosco_jump",
			title: "Salto Vertical (Bosco Test)",
			steps: [
				"Peça ao paciente para realizar um Salto Contramovimento (CMJ).",
				"Capture o vídeo em Slow Motion (240fps) no plano frontal.",
				"Identifique os frames exatos de decolagem e aterrissagem.",
			],
			positioning: "Câmera ao nível do solo ou levemente elevada, visão frontal.",
		},
		posture: {
			id: "sapo_posture",
			title: "Postura e Escoliose (Adams)",
			steps: [
				"Paciente em pé, braços relaxados (Anterior/Posterior).",
				"Para escoliose, peça a flexão do tronco (Adams Test).",
				"Use a grade clínica para alinhar os processos espinhosos.",
			],
			positioning: "Câmera no nível dos ombros, tripé obrigatório.",
		},
	};

	const renderContent = () => {
		if (activeTab === "instructions") {
			return (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-700">
					{Object.entries(tests).map(([key, test]) => (
						<AssessmentInstruction
							key={key}
							testId={test.id}
							title={test.title}
							steps={test.steps}
							positioning={test.positioning}
							onStart={() => {
								setSelectedTest(key);
								setActiveTab("analysis");
							}}
						/>
					))}
				</div>
			);
		}

		return (
			<div className="space-y-6 animate-in zoom-in-95 duration-500">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm" onClick={() => setActiveTab("instructions")}>
							Voltar aos Testes
						</Button>
						<h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
							<LayoutGrid className="h-5 w-5 text-primary" />
							{tests[selectedTest as keyof typeof tests]?.title || "Análise Ativa"}
						</h2>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" className="gap-2">
							<FileText className="h-4 w-4" /> Relatório Científico
						</Button>
					</div>
				</div>
				<div className="bg-card border shadow-2xl rounded-3xl p-4 overflow-hidden">
					<KinoveaStudio />
				</div>
			</div>
		);
	};

	return (
		<MainLayout>
			<div className="min-h-screen bg-background/50 pb-20">
				<div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-4">
					<div className="max-w-7xl mx-auto flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
								<BarChart3 className="h-6 w-6 text-primary" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h1 className="text-2xl font-black text-foreground tracking-tighter">
										BIOMECHANICS LAB
									</h1>
									<Badge className="bg-primary text-white font-black text-[10px]">
										V3 ENGINE
									</Badge>
								</div>
								<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
									Ciência do Movimento • Suporte à Decisão Clínica
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="max-w-7xl mx-auto px-4 py-8">
					{renderContent()}
				</div>
			</div>
		</MainLayout>
	);
}
