import React, { useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Sparkles,
	Wand2,
	Loader2,
	Info,
	ChevronDown,
	ChevronUp,
	Edit2,
} from "lucide-react";
import { useAI } from "@/integrations/neon/ai";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { cn } from "@/lib/utils";

export const EventPlannerAI: React.FC = () => {
	const { generate } = useAI();
	const [category, setCategory] = useState<string>("corrida");
	const [participants, setParticipants] = useState<string>("100");
	const [manualParticipants, setManualParticipants] = useState<string>("");
	const [isManual, setIsManual] = useState(false);
	const [plan, setPlan] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const { toast } = useToast();

	const generatePlan = async () => {
		setLoading(true);
		try {
			const pCount = isManual ? manualParticipants : participants;
			const prompt = `
        Aja como um gestor de eventos de fisioterapia.
        Planeje o kit clínico necessário para um evento do tipo: ${category} com aproximadamente ${pCount} participantes.

        Sugira:
        1. Quantidade de fisioterapeutas/estagiários.
        2. Materiais críticos (fitas, gel, macas, etc).
        3. Dica de ouro para este tipo de evento.

        Retorne em Markdown formatado. Responda em Português Brasileiro.
      `;

			const result = await generate(prompt, {
				userId: "event-manager",
				feature: "clinical_analysis",
				metadata: {
					category,
					participants: pCount,
				},
			});

			if (result.content) {
				setPlan(result.content);
				toast({
					title: "Planejamento Gerado",
					description: "A IA analisou os requisitos e gerou uma sugestão logística.",
				});
			} else {
				throw new Error("Resposta da IA vazia");
			}
		} catch (error) {
			logger.error("Erro ao planejar evento", error, "EventPlannerAI");
			toast({
				title: "Erro no Planejamento",
				description: "Não foi possível gerar o plano. Tente novamente em instantes.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card
			className={cn(
				"border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-sm transition-all duration-500 overflow-hidden",
				isExpanded ? "ring-2 ring-primary/20" : "hover:shadow-md",
			)}
		>
			<CardHeader
				className="pb-3 cursor-pointer select-none"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-primary/10 text-primary">
							<Sparkles className="h-5 w-5 animate-pulse" />
						</div>
						<div>
							<CardTitle className="text-primary text-lg font-black tracking-tight flex items-center gap-2">
								IA Event Planner
								<span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-widest">
									Beta
								</span>
							</CardTitle>
							<CardDescription className="font-medium">
								Otimize sua logística com inteligência artificial
							</CardDescription>
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="rounded-full h-8 w-8 p-0"
					>
						{isExpanded ? (
							<ChevronUp className="h-4 w-4" />
						) : (
							<ChevronDown className="h-4 w-4" />
						)}
					</Button>
				</div>
			</CardHeader>

			<div
				className={cn(
					"grid transition-all duration-500 ease-in-out",
					isExpanded
						? "grid-rows-[1fr] opacity-100"
						: "grid-rows-[0fr] opacity-0",
				)}
			>
				<div className="overflow-hidden">
					<CardContent className="space-y-6 pt-2">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<div className="space-y-3">
								<label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">
									Tipo de Evento
								</label>
								<Select value={category} onValueChange={setCategory}>
									<SelectTrigger className="rounded-2xl h-12 bg-background/50 border-primary/10 hover:border-primary/30 transition-colors">
										<SelectValue placeholder="Categoria" />
									</SelectTrigger>
									<SelectContent className="rounded-2xl border-primary/10">
										<SelectItem value="corrida">
											🏃 Corrida / Maratona
										</SelectItem>
										<SelectItem value="workshop">
											📚 Workshop / Curso
										</SelectItem>
										<SelectItem value="corporativo">
											🏢 Atendimento Corporativo
										</SelectItem>
										<SelectItem value="ativacao">
											🎯 Ativação de Marca
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-3">
								<label className="text-[10px] uppercase font-black text-primary tracking-widest ml-1">
									Participantes Est.
								</label>
								{isManual ? (
									<div className="relative flex items-center group">
										<Input
											type="number"
											value={manualParticipants}
											onChange={(e) => setManualParticipants(e.target.value)}
											placeholder="Ex: 250"
											className="rounded-2xl h-12 bg-background/50 border-primary/20 hover:border-primary/40 focus-visible:ring-primary/30 pr-10 transition-all"
											autoFocus
										/>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setIsManual(false)}
											className="absolute right-2 h-8 w-8 p-0 rounded-full hover:bg-primary/10 text-primary/40 hover:text-primary transition-colors"
											title="Voltar para seleção"
										>
											<ChevronDown className="h-4 w-4" />
										</Button>
									</div>
								) : (
									<Select
										value={participants}
										onValueChange={(val) => {
											if (val === "manual") {
												setIsManual(true);
											} else {
												setParticipants(val);
											}
										}}
									>
										<SelectTrigger className="rounded-2xl h-12 bg-background/50 border-primary/10 hover:border-primary/30 transition-colors">
											<SelectValue placeholder="Qtd" />
										</SelectTrigger>
										<SelectContent className="rounded-2xl border-primary/10">
											<SelectItem value="50">Até 50</SelectItem>
											<SelectItem value="100">50 a 150</SelectItem>
											<SelectItem value="300">150 a 500</SelectItem>
											<SelectItem value="1000">Acima de 500</SelectItem>
											<SelectItem
												value="manual"
												className="font-bold text-primary border-t border-primary/5 mt-1"
											>
												<span className="flex items-center gap-2">
													<Edit2 className="h-3 w-3" />
													Digitar manualmente...
												</span>
											</SelectItem>
										</SelectContent>
									</Select>
								)}
							</div>
						</div>

						<Button
							onClick={generatePlan}
							disabled={loading}
							className="w-full rounded-2xl font-black h-12 shadow-medical hover:shadow-premium-lg transition-all bg-gradient-to-r from-primary to-primary/80 border-none"
						>
							{loading ? (
								<Loader2 className="h-5 w-5 animate-spin mr-2" />
							) : (
								<Wand2 className="h-5 w-5 mr-2" />
							)}
							{loading
								? "Analisando requisitos..."
								: "Gerar Planejamento Logístico"}
						</Button>

						{plan && (
							<div className="mt-6 p-6 rounded-3xl bg-background/80 backdrop-blur-sm border border-primary/10 prose prose-sm max-w-none dark:prose-invert shadow-inner animate-in fade-in slide-in-from-top-4 duration-500">
								<div className="flex items-center gap-2 mb-4 text-primary">
									<div className="p-1.5 rounded-lg bg-primary/10">
										<Info className="h-4 w-4" />
									</div>
									<span className="text-[10px] font-black uppercase tracking-[0.2em]">
										Sugestão Clinsight AI
									</span>
								</div>
								<div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
									{plan}
								</div>
							</div>
						)}
					</CardContent>
				</div>
			</div>
		</Card>
	);
};
