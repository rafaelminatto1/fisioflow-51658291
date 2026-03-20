import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
	ClipboardList,
	Plus,
	Pencil,
	Trash2,
	Eye,
	Settings,
	BookOpen,
	Copy,
	Download,
	Upload,
	Play,
	Sparkles,
	Loader2,
	Save,
	FileText,
	CheckCircle2,
	LayoutGrid,
	List as ListIcon,
	Star,
} from "lucide-react";
import { toast } from "sonner";
import {
	useEvaluationForms,
	useCreateEvaluationForm,
	useUpdateEvaluationForm,
	useDeleteEvaluationForm,
	useDuplicateEvaluationForm,
	EvaluationFormFormData,
} from "@/hooks/useEvaluationForms";
import { EvaluationForm, TemplateFilters } from "@/types/clinical-forms";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { StandardFormsManager } from "@/components/clinical/StandardFormsManager";
import {
	useImportEvaluationForm,
	EvaluationFormImportData,
} from "@/hooks/useEvaluationForms";
import { DynamicFieldRenderer } from "@/components/evaluation/DynamicFieldRenderer";
// New components
import { PageHeader } from "@/components/evaluation/PageHeader";
import { TemplateGrid } from "@/components/evaluation/TemplateGrid";
import { TemplateFilters as TemplateFiltersComponent } from "@/components/evaluation/TemplateFilters";
import { useToggleFavorite } from "@/hooks/useTemplateFavorites";
import { useTemplateStats } from "@/hooks/useTemplateStats";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface EvaluationFormField {
	tipo_campo: string;
	label: string;
	placeholder?: string;
	opcoes: string | string[];
	ordem: number;
	obrigatorio: boolean;
	grupo?: string;
	descricao?: string;
	minimo?: number;
	maximo?: number;
}

const TIPOS_FICHA = [
	{ value: "anamnese", label: "Anamnese" },
	{ value: "avaliacao_postural", label: "Avaliação Postural" },
	{ value: "avaliacao_funcional", label: "Avaliação Funcional" },
	{ value: "esportiva", label: "Fisioterapia Esportiva" },
	{ value: "ortopedica", label: "Fisioterapia Ortopédica" },
	{ value: "neurologica", label: "Fisioterapia Neurológica" },
	{ value: "respiratoria", label: "Fisioterapia Respiratória" },
	{ value: "padrao", label: "Padrão" },
	{ value: "custom", label: "Personalizada" },
];

export default function EvaluationFormsPage() {
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const [activeTab, setActiveTab] = useState<"minhas" | "padrao">("minhas");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [editingForm, setEditingForm] = useState<EvaluationForm | null>(null);
	const [previewForm, setPreviewForm] = useState<EvaluationForm | null>(null);

	const [filters, setFilters] = useState<TemplateFilters>({
		search: "",
		category: undefined,
		favorites: false,
		sortBy: "name",
	});

	const toggleFavoriteMutation = useToggleFavorite();
	const { data: stats } = useTemplateStats();
	const importMutation = useImportEvaluationForm();
	const createMutation = useCreateEvaluationForm();
	const updateMutation = useUpdateEvaluationForm();
	const deleteMutation = useDeleteEvaluationForm();
	const duplicateMutation = useDuplicateEvaluationForm();

	const [formData, setFormData] = useState<EvaluationFormFormData>({
		nome: "",
		tipo: "anamnese",
		descricao: "",
		referencias: "",
		ativo: true,
	});

	const { data: forms = [], isLoading } = useEvaluationForms(filters.category);

	const favoritesSet = useMemo(
		() => new Set(forms.filter((f) => f.is_favorite).map((f) => f.id)),
		[forms],
	);

	const filteredForms = useMemo(() => {
		let result = [...forms];
		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			result = result.filter(
				(f) =>
					f.nome.toLowerCase().includes(searchLower) ||
					f.descricao?.toLowerCase().includes(searchLower),
			);
		}
		if (filters.favorites) {
			result = result.filter((f) => f.is_favorite);
		}
		switch (filters.sortBy) {
			case "recent":
				result.sort((a, b) => {
					if (!a.last_used_at) return 1;
					if (!b.last_used_at) return -1;
					return (
						new Date(b.last_used_at).getTime() -
						new Date(a.last_used_at).getTime()
					);
				});
				break;
			case "usage":
				result.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
				break;
			case "name":
			default:
				result.sort((a, b) => a.nome.localeCompare(b.nome));
				break;
		}
		return result;
	}, [forms, filters]);

	const quickAccessTemplates = useMemo(() => {
		const favorites = forms.filter((f) => f.is_favorite);
		const recentlyUsed = forms
			.filter((f) => f.last_used_at && !f.is_favorite)
			.sort(
				(a, b) =>
					new Date(b.last_used_at!).getTime() -
					new Date(a.last_used_at!).getTime(),
			)
			.slice(0, 6 - favorites.length);
		return [...favorites, ...recentlyUsed].slice(0, 6);
	}, [forms]);

	const handleOpenDialog = (form?: EvaluationForm) => {
		if (form) {
			setEditingForm(form);
			setFormData({
				nome: form.nome,
				tipo: form.tipo,
				descricao: form.descricao || "",
				referencias: form.referencias || "",
				ativo: form.ativo,
			});
		} else {
			setEditingForm(null);
			setFormData({
				nome: "",
				tipo: "anamnese",
				descricao: "",
				referencias: "",
				ativo: true,
			});
		}
		setIsDialogOpen(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (editingForm) {
			await updateMutation.mutateAsync({ id: editingForm.id, ...formData });
		} else {
			const result = await createMutation.mutateAsync(formData);
			if (result?.id) {
				navigate(`/cadastros/fichas-avaliacao/${result.id}/campos`);
				return;
			}
		}
		setIsDialogOpen(false);
	};

	const handleDelete = async () => {
		if (deleteId) {
			await deleteMutation.mutateAsync(deleteId);
			setDeleteId(null);
		}
	};

	const handleUseTemplate = (templateId: string) => {
		toast.success("Template selecionado! Redirecionando para configuração...");
		navigate(`/cadastros/fichas-avaliacao/${templateId}/campos`);
	};

	const handleToggleFavorite = (templateId: string) => {
		const template = forms.find((f) => f.id === templateId);
		if (template) {
			toggleFavoriteMutation.mutate({
				templateId,
				isFavorite: template.is_favorite || false,
			});
		}
	};

	const handleExport = (form: EvaluationForm) => {
		const exportData: EvaluationFormImportData = {
			nome: form.nome,
			descricao: form.descricao,
			tipo: form.tipo,
			referencias: form.referencias,
			fields: (form.evaluation_form_fields || []).map(
				(f: EvaluationFormField) => ({
					tipo_campo: f.tipo_campo,
					label: f.label,
					placeholder: f.placeholder,
					opcoes:
						typeof f.opcoes === "string" ? JSON.parse(f.opcoes) : f.opcoes,
					ordem: f.ordem,
					obrigatorio: f.obrigatorio,
					grupo: f.grupo,
					descricao: f.descricao,
					minimo: f.minimo,
					maximo: f.maximo,
				}),
			),
		};
		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${form.nome.toLowerCase().replace(/\s+/g, "_")}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success("Template exportado com sucesso.");
	};

	const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);
				await importMutation.mutateAsync(json);
			} catch (error) {
				logger.error("Erro ao ler arquivo JSON", error, "EvaluationFormsPage");
				toast.error("Erro ao ler arquivo JSON. Verifique o formato.");
			}
		};
		reader.readAsText(file);
		e.target.value = "";
	};

	return (
		<MainLayout>
			<div className="space-y-6">
				<PageHeader
					title="Fichas de Avaliação"
					description="Crie fichas personalizáveis ou use modelos prontos para avaliação de pacientes"
					icon={ClipboardList}
					stats={
						stats
							? {
									total: stats.total,
									favorites: stats.favorites,
									recentlyUsed: stats.recentlyUsed,
								}
							: undefined
					}
					action={
						<Button
							onClick={() => handleOpenDialog()}
							className="rounded-xl shadow-lg gap-2"
						>
							<Plus className="h-4 w-4" />
							Nova Ficha
						</Button>
					}
				/>

				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as "minhas" | "padrao")}
				>
					<TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100 p-1 rounded-xl">
						<TabsTrigger
							value="minhas"
							className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
						>
							Minhas Fichas
						</TabsTrigger>
						<TabsTrigger
							value="padrao"
							className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
						>
							Fichas Padrão
						</TabsTrigger>
					</TabsList>

					<TabsContent value="minhas" className="space-y-6 mt-4">
						<TemplateFiltersComponent
							filters={filters}
							onFiltersChange={setFilters}
							totalCount={forms.length}
							favoritesCount={favoritesSet.size}
						/>

						{quickAccessTemplates.length > 0 && (
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Sparkles className="h-5 w-5 text-primary" />
									<h2 className="text-lg font-bold text-slate-800">
										Acesso Rápido
									</h2>
									<Badge
										variant="secondary"
										className="text-[10px] font-bold uppercase rounded-lg h-5 px-2 bg-slate-100 text-slate-500"
									>
										Favoritos e Recentes
									</Badge>
								</div>
								<TemplateGrid
									templates={quickAccessTemplates}
									favorites={favoritesSet}
									isLoading={isLoading}
									onToggleFavorite={handleToggleFavorite}
									onEdit={(id) =>
										navigate(`/cadastros/fichas-avaliacao/${id}/campos`)
									}
									onDuplicate={(id) => duplicateMutation.mutate(id)}
									onDelete={setDeleteId}
									onPreview={setPreviewForm}
									onUse={handleUseTemplate}
									maxItems={6}
								/>
							</div>
						)}

						<Separator className="bg-slate-100" />

						<div className="space-y-4">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
								<div className="flex items-center gap-2">
									<FileText className="h-5 w-5 text-slate-400" />
									<h2 className="text-lg font-bold text-slate-800">
										Todos os Templates ({filteredForms.length})
									</h2>
								</div>
								<div className="flex items-center gap-2 self-end sm:self-auto">
									<div className="flex items-center bg-slate-100 p-1 rounded-xl mr-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setViewMode("grid")}
											className={cn(
												"h-8 w-8 p-0 rounded-lg",
												viewMode === "grid"
													? "bg-white shadow-sm text-primary"
													: "text-slate-500",
											)}
										>
											<LayoutGrid className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setViewMode("list")}
											className={cn(
												"h-8 w-8 p-0 rounded-lg",
												viewMode === "list"
													? "bg-white shadow-sm text-primary"
													: "text-slate-500",
											)}
										>
											<ListIcon className="h-4 w-4" />
										</Button>
									</div>
									<input
										type="file"
										id="import-file"
										className="hidden"
										accept=".json"
										onChange={handleImportFile}
									/>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											document.getElementById("import-file")?.click()
										}
										className="rounded-xl h-9"
									>
										<Upload className="h-4 w-4 mr-2" />
										Importar
									</Button>
								</div>
							</div>

							{isLoading ? (
								<div className="flex items-center justify-center py-12">
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
								</div>
							) : filteredForms.length === 0 ? (
								<Card className="border-slate-100 shadow-sm">
									<CardContent className="flex flex-col items-center justify-center py-16">
										<FileText className="h-10 w-10 text-slate-300 mb-4" />
										<h3 className="text-lg font-bold text-slate-800">
											Nenhuma ficha encontrada
										</h3>
										<p className="text-slate-500 text-sm mb-6">
											Comece criando uma nova ficha personalizada.
										</p>
										<Button
											onClick={() => handleOpenDialog()}
											className="rounded-xl gap-2"
										>
											<Plus className="h-4 w-4" />
											Criar Primeira Ficha
										</Button>
									</CardContent>
								</Card>
							) : viewMode === "grid" ? (
								<TemplateGrid
									templates={filteredForms}
									favorites={favoritesSet}
									onToggleFavorite={handleToggleFavorite}
									onEdit={(id) =>
										navigate(`/cadastros/fichas-avaliacao/${id}/campos`)
									}
									onDuplicate={(id) => duplicateMutation.mutate(id)}
									onDelete={setDeleteId}
									onPreview={setPreviewForm}
									onUse={handleUseTemplate}
								/>
							) : (
								<Card className="border-slate-100 shadow-sm overflow-hidden">
									<CardContent className="p-0">
										<div className="overflow-x-auto">
											<Table>
												<TableHeader>
													<TableRow className="border-slate-100">
														<TableHead className="w-[10px]"></TableHead>
														<TableHead className="font-bold text-xs uppercase tracking-wider">
															Nome
														</TableHead>
														<TableHead className="w-[60px] text-center font-bold text-xs uppercase tracking-wider">
															Ref
														</TableHead>
														<TableHead className="font-bold text-xs uppercase tracking-wider">
															Tipo
														</TableHead>
														<TableHead className="font-bold text-xs uppercase tracking-wider">
															Campos
														</TableHead>
														<TableHead className="text-right font-bold text-xs uppercase tracking-wider pr-6">
															Ações
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{filteredForms.map((form) => (
														<TableRow
															key={form.id}
															className="border-slate-100"
														>
															<TableCell className="pl-4">
																<Button
																	variant="ghost"
																	size="icon"
																	className={cn(
																		"h-8 w-8 rounded-full",
																		favoritesSet.has(form.id)
																			? "text-yellow-500"
																			: "text-slate-300",
																	)}
																	onClick={() => handleToggleFavorite(form.id)}
																>
																	<Star
																		className={cn(
																			"h-4 w-4",
																			favoritesSet.has(form.id) &&
																				"fill-yellow-500",
																		)}
																	/>
																</Button>
															</TableCell>
															<TableCell>
																<p className="font-bold text-slate-700">
																	{form.nome}
																</p>
																{form.descricao && (
																	<p className="text-xs text-slate-400 truncate max-w-[200px]">
																		{form.descricao}
																	</p>
																)}
															</TableCell>
															<TableCell className="text-center">
																{form.referencias && (
																	<BookOpen className="h-4 w-4 text-primary/70 inline-block" />
																)}
															</TableCell>
															<TableCell>
																<Badge
																	variant="secondary"
																	className="rounded-lg bg-blue-50 text-blue-700"
																>
																	{TIPOS_FICHA.find(
																		(t) => t.value === form.tipo,
																	)?.label || form.tipo}
																</Badge>
															</TableCell>
															<TableCell className="text-slate-500 text-sm font-medium">
																{form.evaluation_form_fields?.length || 0}{" "}
																campos
															</TableCell>
															<TableCell className="text-right pr-6">
																<div className="flex items-center justify-end gap-1">
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => handleUseTemplate(form.id)}
																		className="h-8 w-8"
																	>
																		<Play className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() =>
																			duplicateMutation.mutate(form.id)
																		}
																		className="h-8 w-8"
																	>
																		<Copy className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => setPreviewForm(form)}
																		className="h-8 w-8"
																	>
																		<Eye className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => handleOpenDialog(form)}
																		className="h-8 w-8"
																	>
																		<Pencil className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => setDeleteId(form.id)}
																		className="h-8 w-8 text-destructive"
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</div>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					</TabsContent>

					<TabsContent value="padrao" className="mt-4">
						<StandardFormsManager />
					</TabsContent>
				</Tabs>

				<CustomModal
					open={isDialogOpen}
					onOpenChange={setIsDialogOpen}
					isMobile={isMobile}
					contentClassName="max-w-2xl h-[90vh]"
				>
					<CustomModalHeader onClose={() => setIsDialogOpen(false)}>
						<CustomModalTitle className="flex items-center gap-2">
							{editingForm ? (
								<Pencil className="h-5 w-5 text-primary" />
							) : (
								<Plus className="h-5 w-5 text-primary" />
							)}
							{editingForm ? "Editar Ficha" : "Nova Ficha de Avaliação"}
						</CustomModalTitle>
					</CustomModalHeader>
					<CustomModalBody className="p-6 space-y-6">
						<form
							onSubmit={handleSubmit}
							id="evaluation-form-form"
							className="space-y-6"
						>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="col-span-1 md:col-span-2 space-y-2">
									<Label
										htmlFor="nome"
										className="font-bold text-xs uppercase text-slate-500"
									>
										Nome da Ficha *
									</Label>
									<Input
										id="nome"
										value={formData.nome}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, nome: e.target.value }))
										}
										required
										className="rounded-xl"
									/>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="tipo"
										className="font-bold text-xs uppercase text-slate-500"
									>
										Tipo *
									</Label>
									<Select
										value={formData.tipo}
										onValueChange={(value) =>
											setFormData((prev) => ({ ...prev, tipo: value }))
										}
									>
										<SelectTrigger className="rounded-xl">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{TIPOS_FICHA.map((t) => (
												<SelectItem key={t.value} value={t.value}>
													{t.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label
										htmlFor="descricao"
										className="font-bold text-xs uppercase text-slate-500"
									>
										Descrição
									</Label>
									<Input
										id="descricao"
										value={formData.descricao || ""}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												descricao: e.target.value,
											}))
										}
										className="rounded-xl"
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="referencias"
									className="font-bold text-xs uppercase text-slate-500"
								>
									Referências
								</Label>
								<Textarea
									id="referencias"
									value={formData.referencias || ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											referencias: e.target.value,
										}))
									}
									rows={4}
									className="rounded-xl resize-none"
								/>
							</div>
						</form>
					</CustomModalBody>
					<CustomModalFooter isMobile={isMobile} className="bg-slate-50">
						<Button
							variant="ghost"
							onClick={() => setIsDialogOpen(false)}
							className="font-bold"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							form="evaluation-form-form"
							disabled={createMutation.isPending || updateMutation.isPending}
							className="rounded-xl px-8 font-bold"
						>
							{createMutation.isPending || updateMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : editingForm ? (
								"Salvar"
							) : (
								"Criar"
							)}
						</Button>
					</CustomModalFooter>
				</CustomModal>

				<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
					<AlertDialogContent className="rounded-3xl p-6">
						<AlertDialogHeader>
							<AlertDialogTitle className="font-bold">
								Confirmar exclusão?
							</AlertDialogTitle>
							<AlertDialogDescription>
								Esta ação não pode ser desfeita.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter className="mt-6 gap-2">
							<AlertDialogCancel className="rounded-xl">
								Cancelar
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								className="bg-destructive text-white rounded-xl"
							>
								Excluir
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<CustomModal
					open={!!previewForm}
					onOpenChange={() => setPreviewForm(null)}
					isMobile={isMobile}
					contentClassName="max-w-3xl h-[95vh]"
				>
					<CustomModalHeader onClose={() => setPreviewForm(null)}>
						<CustomModalTitle className="text-2xl font-bold">
							{previewForm?.nome}
						</CustomModalTitle>
					</CustomModalHeader>
					<CustomModalBody>
						<ScrollArea className="h-full p-6 space-y-6">
							{previewForm?.descricao && (
								<p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl">
									{previewForm.descricao}
								</p>
							)}
							{previewForm && (
								<DynamicFieldRenderer
									fields={(previewForm.evaluation_form_fields || [])
										.map((f: EvaluationFormField) => ({
											...f,
											section: f.grupo,
											min: f.minimo,
											max: f.maximo,
											description: f.descricao,
											opcoes:
												typeof f.opcoes === "string"
													? JSON.parse(f.opcoes)
													: f.opcoes,
										}))
										.sort(
											(a: EvaluationFormField, b: EvaluationFormField) =>
												a.ordem - b.ordem,
										)}
									values={{}}
									onChange={() => {}}
									readOnly={true}
								/>
							)}
						</ScrollArea>
					</CustomModalBody>
					<CustomModalFooter isMobile={isMobile} className="bg-slate-50">
						<Button
							variant="ghost"
							onClick={() => setPreviewForm(null)}
							className="font-bold"
						>
							Fechar
						</Button>
						<Button
							onClick={() => {
								if (previewForm) {
									const id = previewForm.id;
									setPreviewForm(null);
									handleUseTemplate(id);
								}
							}}
							className="rounded-xl px-8 font-bold bg-emerald-600 text-white"
						>
							Usar Template
						</Button>
					</CustomModalFooter>
				</CustomModal>
			</div>
		</MainLayout>
	);
}
