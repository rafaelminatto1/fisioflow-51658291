import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PosturalAnalysisTool } from "@/components/analysis/PosturalAnalysisTool";
import { Camera, Video, Activity, LayoutGrid, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BiomechanicsAnalysisPage() {
	const [activeMode, setActiveMode] = useState<"live" | "video">("live");

	return (
		<MainLayout>
			<div className="min-h-screen bg-background/50 pb-20">
				{/* Premium Header */}
				<div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-4">
					<div className="max-w-7xl mx-auto flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
								<Activity className="h-5 w-5 text-primary" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h1 className="text-xl font-bold text-foreground tracking-tight">
										Laboratório de Biomecânica
									</h1>
									<Badge
										variant="outline"
										className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5"
									>
										Kinovea Engine
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground mt-0.5">
									Análise cinemática 2D com tracking sem marcadores (IA).
								</p>
							</div>
						</div>

						<div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
							<Button
								variant={activeMode === "live" ? "default" : "ghost"}
								size="sm"
								className="text-xs gap-2"
								onClick={() => setActiveMode("live")}
							>
								<Camera className="h-4 w-4" />
								Câmera Ao Vivo
							</Button>
							<Button
								variant={activeMode === "video" ? "default" : "ghost"}
								size="sm"
								className="text-xs gap-2"
								onClick={() => setActiveMode("video")}
							>
								<Video className="h-4 w-4" />
								Vídeo Gravado
							</Button>
						</div>
					</div>
				</div>

				<div className="max-w-7xl mx-auto px-4 py-8">
					{activeMode === "live" ? (
						<div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-bold flex items-center gap-2">
									<LayoutGrid className="h-5 w-5 text-muted-foreground" />
									Captura e Análise em Tempo Real
								</h2>
								<Button variant="outline" size="sm" className="gap-2">
									<FileText className="h-4 w-4" />
									Exportar Relatório
								</Button>
							</div>
							<div className="bg-card border shadow-sm rounded-2xl p-4">
								<PosturalAnalysisTool />
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-muted/10 text-center animate-in fade-in duration-500">
							<div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
								<Video className="h-8 w-8 text-primary" />
							</div>
							<h3 className="text-xl font-bold mb-2">
								Importar Vídeo (120/240fps)
							</h3>
							<p className="text-sm text-muted-foreground max-w-md mb-6">
								Faça upload de vídeos gravados com o aplicativo móvel para
								realizar análise de tracking ponto a ponto, medição de ângulos
								(ADM) e cinemática linear.
							</p>
							<Button size="lg" className="gap-2 shadow-lg">
								<Camera className="h-5 w-5" />
								Selecionar Arquivo de Vídeo
							</Button>
						</div>
					)}
				</div>
			</div>
		</MainLayout>
	);
}
