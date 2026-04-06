import React, { useState, useEffect } from "react";
import { 
	Plus, 
	History, 
	Activity, 
	ChevronRight, 
	BarChart3, 
	Eye,
	ArrowLeftRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosturalAnalysisTool } from "./PosturalAnalysisTool";
import { biomechanicsApi, BiomechanicsAssessment } from "@/api/v2/biomechanics";
import { biomechanicsPersistenceService } from "@/services/biomechanics/persistenceService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

interface BiomechanicsLabProps {
	patientId: string;
	patientName: string;
}

export const BiomechanicsLab: React.FC<BiomechanicsLabProps> = ({
	patientId,
	patientName,
}) => {
	const [activeTab, setActiveTab] = useState("history");
	const [assessments, setAssessments] = useState<BiomechanicsAssessment[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { toast } = useToast();

	const loadHistory = async () => {
		try {
			setIsLoading(true);
			const { data } = await biomechanicsApi.listByPatient(patientId);
			setAssessments(data);
		} catch (error) {
			console.error("Erro ao carregar histórico:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadHistory();
	}, [patientId]);

	const handleCapture = async (image: string, analysis: any) => {
		try {
			await biomechanicsPersistenceService.saveAssessment({
				patientId,
				type: "static_posture",
				mediaData: image,
				landmarks: analysis.landmarks,
				observations: `Vista: ${analysis.type}`,
			});
			toast({ title: "Sucesso", description: "Avaliação postural salva no laboratório." });
			setActiveTab("history");
			loadHistory();
		} catch {
			toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar avaliação." });
		}
	};

	return (
		<div className="flex flex-col gap-6 p-2 max-w-7xl mx-auto">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Laboratório de Biomecânica</h1>
					<p className="text-muted-foreground">Análise postural e de movimento para {patientName}</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => setActiveTab("new-posture")} className="gap-2">
						<Plus className="h-4 w-4" /> Nova Postura
					</Button>
					<Button variant="outline" onClick={() => setActiveTab("new-dynamic")} className="gap-2 text-primary border-primary/20 bg-primary/5">
						<Activity className="h-4 w-4" /> Nova Dinâmica
					</Button>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList className="grid w-full grid-cols-3 max-w-[400px]">
					<TabsTrigger value="history" className="gap-2">
						<History className="h-4 w-4" /> Histórico
					</TabsTrigger>
					<TabsTrigger value="new-posture" className="gap-2">
						<Eye className="h-4 w-4" /> Postural
					</TabsTrigger>
					<TabsTrigger value="new-dynamic" className="gap-2">
						<Activity className="h-4 w-4" /> Dinâmica
					</TabsTrigger>
				</TabsList>

				<TabsContent value="history" className="mt-6">
					{isLoading ? (
						<div className="flex items-center justify-center py-20">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						</div>
					) : assessments.length === 0 ? (
						<Card className="border-dashed">
							<CardContent className="flex flex-col items-center justify-center py-20 text-center">
								<Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
								<h3 className="text-lg font-semibold">Sem avaliações</h3>
								<p className="text-muted-foreground max-w-xs mx-auto mt-2">
									O histórico do laboratório está vazio. Inicie uma nova análise postural ou dinâmica.
								</p>
								<div className="mt-6 flex gap-3">
									<Button onClick={() => setActiveTab("new-posture")}>Iniciar Lab Postura</Button>
								</div>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{assessments.map((item) => (
								<Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all group border-primary/10">
									<div className="aspect-[4/3] relative bg-black overflow-hidden">
										<img 
											src={item.mediaUrl} 
											className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
											alt="Assessment preview" 
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
										<div className="absolute top-3 right-3">
											<Badge className="bg-primary/90 text-[10px] uppercase">{item.type.replace('_', ' ')}</Badge>
										</div>
										<div className="absolute bottom-3 left-3 text-white">
											<p className="text-xs opacity-70">
												{format(new Date(item.createdAt), "dd 'de' MMMM", { locale: ptBR })}
											</p>
											<p className="font-bold">Avaliação Biomecânica</p>
										</div>
									</div>
									<CardContent className="p-4">
										<div className="flex items-center justify-between mb-4">
											<div className="flex gap-1">
												<Badge variant="secondary" className="text-[10px]">{item.analysisData.landmarks?.length || 0} pts</Badge>
												{item.analysisData.angles && (
													<Badge variant="secondary" className="text-[10px]">{Object.keys(item.analysisData.angles).length} ângulos</Badge>
												)}
											</div>
											<Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
												<ChevronRight className="h-4 w-4" />
											</Button>
										</div>
										<div className="grid grid-cols-2 gap-2">
											<Button variant="outline" size="sm" className="gap-2 text-[11px] h-8">
												<BarChart3 className="h-3 w-3" /> Relatório
											</Button>
											<Button variant="outline" size="sm" className="gap-2 text-[11px] h-8">
												<ArrowLeftRight className="h-3 w-3" /> Comparar
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</TabsContent>

				<TabsContent value="new-posture" className="mt-6 min-h-[700px]">
					<PosturalAnalysisTool 
						patientName={patientName} 
						onCapture={handleCapture}
					/>
				</TabsContent>

				<TabsContent value="new-dynamic" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Análise de Vídeo (Corrida/Marcha)</CardTitle>
							<CardDescription>Carregue um vídeo para análise frame-a-frame assistida por IA.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
								<input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" />
								<Activity className="h-12 w-12 text-primary mb-4" />
								<h3 className="font-bold">Selecionar Vídeo</h3>
								<p className="text-muted-foreground text-sm max-w-xs mt-2">Arraste um vídeo gravado ou clique para escolher um arquivo.</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};
