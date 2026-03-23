import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
	Plus,
	Trash2,
	Eye,
	ClipboardCheck,
	Dumbbell,
	CircleDot,
	CheckCircle2,
	BookOpen,
	Info,
	ExternalLink,
	Search,
	Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { builtinClinicalTestsCatalog } from "@/data/clinicalTestsCatalog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SpecialTest {
	name: string;
	result: string;
	notes: string;
}

interface PhysicalExamFormData {
	inspection?: string;
	palpation?: string;
	posture?: string;
	specialTests?: SpecialTest[];
	rangeOfMotion?: string;
	muscleStrength?: string;
}

interface PhysicalExamFormProps {
	data: PhysicalExamFormData;
	onChange: (data: PhysicalExamFormData) => void;
	readOnly?: boolean;
}

export const PhysicalExamForm = ({
	data,
	onChange,
	readOnly = false,
}: PhysicalExamFormProps) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [isCatalogOpen, setIsCatalogOpen] = useState(false);

	const handleChange = (
		field: keyof PhysicalExamFormData,
		value: string | SpecialTest[],
	) => {
		onChange({ ...data, [field]: value });
	};

	const addSpecialTest = (name = "") => {
		const currentTests = data.specialTests || [];
		handleChange("specialTests", [
			...currentTests,
			{ name, result: "negative", notes: "" },
		]);
	};

	const updateSpecialTest = (
		index: number,
		field: keyof SpecialTest,
		value: string,
	) => {
		const newTests = [...(data.specialTests || [])];
		newTests[index] = { ...newTests[index], [field]: value };
		handleChange("specialTests", newTests);
	};

	const removeSpecialTest = (index: number) => {
		const newTests = [...(data.specialTests || [])];
		newTests.splice(index, 1);
		handleChange("specialTests", newTests);
	};

	const getTestEvidence = (testName: string) => {
		if (!testName) return null;
		const normalized = testName
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "");
		return builtinClinicalTestsCatalog.find((t) => {
			const catName = t.name
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "");
			const catNameEn = (t.name_en || "")
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "");
			return catName.includes(normalized) || normalized.includes(catName) || catNameEn.includes(normalized);
		});
	};

	const filteredCatalog = useMemo(() => {
		if (!searchQuery.trim()) return builtinClinicalTestsCatalog;
		const lowerQuery = searchQuery.toLowerCase();
		return builtinClinicalTestsCatalog.filter(
			(t) =>
				t.name.toLowerCase().includes(lowerQuery) ||
				t.target_joint.toLowerCase().includes(lowerQuery) ||
				t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
		);
	}, [searchQuery]);

	const handleSelectFromCatalog = (testName: string) => {
		addSpecialTest(testName);
		setIsCatalogOpen(false);
		setSearchQuery("");
	};

	return (
		<TooltipProvider>
			<div className="space-y-6 pb-10">
				<Card className="border-none shadow-sm bg-card/50">
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<Eye className="w-5 h-5 text-primary" />
							Inspeção e Palpação
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inspeção Visual</Label>
								<Textarea
									placeholder="Observações visuais (edema, coloração, cicatrizes...)"
									value={data.inspection || ""}
									onChange={(e) => handleChange("inspection", e.target.value)}
									readOnly={readOnly}
									rows={4}
									className="resize-none focus-visible:ring-primary/20"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Palpação</Label>
								<Textarea
									placeholder="Dor, tensão muscular, temperatura..."
									value={data.palpation || ""}
									onChange={(e) => handleChange("palpation", e.target.value)}
									readOnly={readOnly}
									rows={4}
									className="resize-none focus-visible:ring-primary/20"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Postura e Marcha</Label>
							<Textarea
								placeholder="Análise postural e padrão de marcha..."
								value={data.posture || ""}
								onChange={(e) => handleChange("posture", e.target.value)}
								readOnly={readOnly}
								rows={2}
								className="resize-none focus-visible:ring-primary/20"
							/>
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm bg-card/50 overflow-hidden">
					<CardHeader className="flex flex-row items-center justify-between bg-muted/30 pb-4">
						<CardTitle className="text-lg flex items-center gap-2">
							<ClipboardCheck className="w-5 h-5 text-primary" />
							Testes Especiais
						</CardTitle>
						{!readOnly && (
							<div className="flex gap-2">
								<Dialog open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
									<DialogTrigger asChild>
										<Button variant="outline" size="sm" className="bg-background">
											<Search className="w-4 h-4 mr-2" /> Explorar Catálogo
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
										<DialogHeader>
											<DialogTitle className="flex items-center gap-2">
												<BookOpen className="h-5 w-5 text-primary" /> Catálogo de Evidência Clínica
											</DialogTitle>
										</DialogHeader>
										<div className="relative my-4">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											<Input
												placeholder="Buscar teste por nome, articulação ou tag..."
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												className="pl-10"
											/>
										</div>
										<ScrollArea className="flex-1 pr-4">
											<div className="grid grid-cols-1 gap-3">
												{filteredCatalog.map((test) => (
													<div
														key={test.id}
														className="p-4 border rounded-xl hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group"
														onClick={() => handleSelectFromCatalog(test.name)}
													>
														<div className="flex justify-between items-start mb-1">
															<h4 className="font-bold text-sm group-hover:text-primary transition-colors">
																{test.name}
															</h4>
															<Badge variant="secondary" className="text-[10px] uppercase">
																{test.target_joint}
															</Badge>
														</div>
														<p className="text-xs text-muted-foreground line-clamp-2">
															{test.purpose}
														</p>
														<div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
															<span className="text-[10px] font-bold text-primary uppercase">Clique para selecionar</span>
														</div>
													</div>
												))}
												{filteredCatalog.length === 0 && (
													<p className="text-center py-10 text-muted-foreground italic">
														Nenhum teste encontrado para sua busca.
													</p>
												)}
											</div>
										</ScrollArea>
									</DialogContent>
								</Dialog>
								<Button onClick={() => addSpecialTest()} variant="default" size="sm" className="shadow-sm">
									<Plus className="w-4 h-4 mr-2" /> Novo Teste
								</Button>
							</div>
						)}
					</CardHeader>
					<CardContent className="pt-6">
						<div className="space-y-4">
							{(data.specialTests || []).map((test, i) => {
								const evidence = getTestEvidence(test.name);
								return (
									<div
										key={i}
										className="space-y-2 p-4 bg-background border rounded-xl shadow-sm group relative hover:ring-1 hover:ring-primary/20 transition-all"
									>
										<div className="flex flex-col md:flex-row gap-4 items-start">
											<div className="flex-1 space-y-2 w-full relative">
												<Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome do Teste</Label>
												<div className="relative">
													<Input
														placeholder="Ex: Lachman, Hawkins..."
														value={test.name}
														onChange={(e) =>
															updateSpecialTest(i, "name", e.target.value)
														}
														readOnly={readOnly}
														className={evidence ? "pr-8 font-medium border-primary/20 bg-primary/5" : "bg-muted/30 border-transparent focus:bg-background focus:border-input"}
													/>
													{evidence && (
														<div className="absolute right-2 top-1/2 -translate-y-1/2">
															<Tooltip>
																<TooltipTrigger asChild>
																	<Info className="h-4 w-4 text-primary cursor-help" />
																</TooltipTrigger>
																<TooltipContent className="max-w-[300px] p-4 space-y-2">
																	<p className="font-bold text-sm flex items-center gap-1.5 text-primary">
																		<BookOpen className="h-3.5 w-3.5" /> Referência Científica
																	</p>
																	<p className="text-xs italic leading-relaxed">
																		"{evidence.reference}"
																	</p>
																	{evidence.sensitivity_specificity && (
																		<div className="text-[10px] bg-muted p-1.5 rounded-sm">
																			<span className="font-bold">Acurácia:</span> {evidence.sensitivity_specificity}
																		</div>
																	)}
																</TooltipContent>
															</Tooltip>
														</div>
													)}
												</div>
											</div>
											<div className="w-full md:w-40 flex flex-col space-y-2">
												<Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Resultado</Label>
												{readOnly ? (
													<Badge
														variant={
															test.result === "positive" ? "destructive" : "default"
														}
														className={cn(
															"h-10 justify-center gap-2",
															test.result === "negative" && "bg-green-500 hover:bg-green-600"
														)}
													>
														{test.result === "positive" ? (
															<>
																<CircleDot className="w-4 h-4" /> Positivo
															</>
														) : (
															<>
																<CheckCircle2 className="w-4 h-4" /> Negativo
															</>
														)}
													</Badge>
												) : (
													<button
														type="button"
														onClick={() =>
															updateSpecialTest(
																i,
																"result",
																test.result === "positive" ? "negative" : "positive",
															)
														}
														className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md h-10"
														aria-label={`Alternar resultado para ${test.result === "positive" ? "negativo" : "positivo"}`}
													>
														<Badge
															variant={
																test.result === "positive" ? "destructive" : "default"
															}
															className={cn(
																"cursor-pointer transition-all hover:opacity-80 py-2 px-4 h-full w-full justify-center gap-2 text-sm",
																test.result === "negative"
																	? "bg-green-500 hover:bg-green-600 font-bold"
																	: "font-bold"
															)}
														>
															{test.result === "positive" ? (
																<>
																	<CircleDot className="w-4 h-4" /> Positivo (+)
																</>
															) : (
																<>
																	<CheckCircle2 className="w-4 h-4" /> Negativo (-)
																</>
															)}
														</Badge>
													</button>
												)}
											</div>
											<div className="flex-[1.5] w-full space-y-2">
												<Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Observações</Label>
												<Input
													placeholder="Ex: Reprodução da dor habitual..."
													value={test.notes || ""}
													onChange={(e) =>
														updateSpecialTest(i, "notes", e.target.value)
													}
													readOnly={readOnly}
													className="bg-muted/30 border-transparent focus:bg-background focus:border-input"
												/>
											</div>
											{!readOnly && (
												<div className="md:pt-6">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => removeSpecialTest(i)}
														className="text-destructive hover:bg-destructive/10"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</div>
											)}
										</div>
										
										{/* Expanded Evidence Box */}
										{evidence && (
											<div className="mt-2 text-[11px] bg-primary/5 border border-primary/10 rounded-xl p-3 animate-in slide-in-from-top-1 duration-200">
												<div className="flex items-start gap-3">
													<div className="p-1.5 rounded-lg bg-primary/10 text-primary">
														<Sparkles className="h-4 w-4" />
													</div>
													<div className="space-y-1">
														<div className="flex items-center gap-2">
															<p className="font-bold text-primary uppercase tracking-widest text-[9px]">
																Evidência Científica Reconhecida
															</p>
															{evidence.sensitivity_specificity && (
																<Badge variant="outline" className="text-[9px] py-0 h-4 bg-background border-primary/20 text-primary/80">
																	Acurácia Validada
																</Badge>
															)}
														</div>
														<p className="text-foreground/80 leading-relaxed italic pr-4">
															"{evidence.reference}"
														</p>
														{evidence.evidence_resources && evidence.evidence_resources.length > 0 && (
															<div className="flex gap-3 mt-2">
																{evidence.evidence_resources.map((res, idx) => (
																	<a 
																		key={idx} 
																		href={res.url} 
																		target="_blank" 
																		rel="noopener noreferrer"
																		className="flex items-center gap-1.5 text-primary hover:underline font-bold text-[10px] bg-background px-2 py-1 rounded-md border border-primary/10 shadow-sm"
																	>
																		<ExternalLink className="h-3 w-3" /> {res.title}
																	</a>
																))}
															</div>
														)}
													</div>
												</div>
											</div>
										)}
									</div>
								);
							})}
							{(!data.specialTests || data.specialTests.length === 0) && (
								<div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl bg-muted/20">
									<ClipboardCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
									<p className="text-muted-foreground text-sm font-medium">
										Nenhum teste especial registrado.
									</p>
									<p className="text-xs text-muted-foreground/60 mt-1">
										Use o catálogo ou adicione um teste manualmente acima.
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm bg-card/50">
					<CardHeader>
						<CardTitle className="text-lg flex items-center gap-2">
							<Dumbbell className="w-5 h-5 text-primary" />
							Amplitude de Movimento (ADM) e Força
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ADM (Graus)</Label>
								<Textarea
									placeholder="Ex: Flexão Joelho D: 120º, E: 135º..."
									value={
										typeof data.rangeOfMotion === "string"
											? data.rangeOfMotion
											: ""
									}
									onChange={(e) => handleChange("rangeOfMotion", e.target.value)}
									readOnly={readOnly}
									className="resize-none focus-visible:ring-primary/20 min-h-[100px]"
								/>
								<p className="text-[10px] text-muted-foreground italic">
									Descreva as amplitudes mensuradas (Goniometria).
								</p>
							</div>
							<div className="space-y-2">
								<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Força Muscular (Escala de Oxford 0-5)</Label>
								<Textarea
									placeholder="Ex: Quadríceps D: 4, E: 5..."
									value={
										typeof data.muscleStrength === "string"
											? data.muscleStrength
											: ""
									}
									onChange={(e) => handleChange("muscleStrength", e.target.value)}
									readOnly={readOnly}
									className="resize-none focus-visible:ring-primary/20 min-h-[100px]"
								/>
								<p className="text-[10px] text-muted-foreground italic">
									Registre o grau de força contra resistência.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</TooltipProvider>
	);
};
