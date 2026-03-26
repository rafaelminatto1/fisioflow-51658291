import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Badge } from "@/components/ui/badge";
import {
	Plus,
	Edit2,
	Trash2,
	FileJson,
	Loader2,
	Save,
} from "lucide-react";
import { toast } from "sonner";
import {
	useCreateEvaluationForm,
	useDeleteEvaluationForm,
	useEvaluationForms,
	useUpdateEvaluationForm,
} from "@/hooks/useEvaluationForms";
import { useIsMobile } from "@/hooks/use-mobile";

interface Template {
	id: string;
	title: string;
	description: string;
	category: string;
	content: Record<string, unknown>;
	is_active: boolean;
}

export const EvaluationTemplateManager = () => {
	const isMobile = useIsMobile();
	const [isOpen, setIsOpen] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
	const queryClient = useQueryClient();

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		category: "",
		content: "{}",
	});

	const { data: forms = [], isLoading } = useEvaluationForms();
	const createTemplate = useCreateEvaluationForm();
	const updateTemplate = useUpdateEvaluationForm();
	const deleteTemplate = useDeleteEvaluationForm();

	const templates: Template[] = forms.map((form) => ({
		id: form.id,
		title: form.nome,
		description: form.descricao || "",
		category: form.tipo || "",
		content: (form.configuracao as Record<string, unknown>) || {},
		is_active: Boolean(form.ativo),
	}));

	const saveMutation = useMutation({
		mutationFn: async (data: typeof formData) => {
			// Validate JSON content
			const contentJson: Record<string, unknown> =
				typeof data.content === "string"
					? JSON.parse(data.content)
					: data.content;

			const payload = {
				nome: data.title,
				description: data.description,
				tipo: data.category || "geral",
				configuracao: contentJson,
				ativo: true,
			};

			if (editingTemplate) {
				await updateTemplate.mutateAsync({
					id: editingTemplate.id,
					...payload,
				});
			} else {
				await createTemplate.mutateAsync(payload);
			}
		},
		onSuccess: () => {
			toast.success(
				editingTemplate ? "Template atualizado!" : "Template criado!",
			);
			queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
			setIsOpen(false);
			resetForm();
		},
		onError: (err: Error) => {
			toast.error("Erro ao salvar: " + err.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			await deleteTemplate.mutateAsync(id);
		},
		onSuccess: () => {
			toast.success("Template removido.");
			queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
		},
	});

	const resetForm = () => {
		setFormData({
			title: "",
			description: "",
			category: "",
			content: '{\n  "physical_exam": {},\n  "vital_signs": {}\n}',
		});
		setEditingTemplate(null);
	};

	const handleEdit = (template: Template) => {
		setEditingTemplate(template);
		setFormData({
			title: template.title,
			description: template.description || "",
			category: template.category || "",
			content: JSON.stringify(template.content, null, 2),
		});
		setIsOpen(true);
	};

	const handleSubmit = () => {
		if (!formData.title) return toast.error("Título é obrigatório");
		try {
			JSON.parse(formData.content);
		} catch {
			return toast.error("JSON inválido no conteúdo");
		}
		saveMutation.mutate(formData);
	};

	return (
		<Card className="max-w-4xl mx-auto shadow-sm border-slate-100">
			<CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 pb-4">
				<div>
					<CardTitle className="text-xl font-bold flex items-center gap-2">
						<FileJson className="h-5 w-5 text-primary" />
						Modelos de Avaliação
					</CardTitle>
					<CardDescription>
						Gerencie os templates usados nas avaliações clínicas.
					</CardDescription>
				</div>
				<Button
					onClick={() => {
						resetForm();
						setIsOpen(true);
					}}
					className="rounded-xl shadow-lg"
				>
					<Plus className="w-4 h-4 mr-2" /> Novo Template
				</Button>
			</CardHeader>
			<CardContent className="p-0">
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent border-slate-100">
									<TableHead className="font-bold text-xs uppercase tracking-wider pl-6">
										Título
									</TableHead>
									<TableHead className="font-bold text-xs uppercase tracking-wider">
										Categoria
									</TableHead>
									<TableHead className="font-bold text-xs uppercase tracking-wider">
										Status
									</TableHead>
									<TableHead className="text-right font-bold text-xs uppercase tracking-wider pr-6">
										Ações
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(templates as Template[]).map((template: Template) => (
									<TableRow
										key={template.id}
										className="hover:bg-slate-50/50 border-slate-100"
									>
										<TableCell className="font-semibold text-slate-700 pl-6">
											{template.title}
										</TableCell>
										<TableCell>
											<Badge
												variant="secondary"
												className="rounded-lg bg-blue-50 text-blue-700 border-blue-100"
											>
												{template.category || "Geral"}
											</Badge>
										</TableCell>
										<TableCell>
											{template.is_active ? (
												<Badge className="bg-emerald-500 rounded-lg h-5 text-[10px]">
													Ativo
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="text-muted-foreground rounded-lg h-5 text-[10px]"
												>
													Inativo
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-right pr-6">
											<div className="flex items-center justify-end gap-1">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary"
													onClick={() => handleEdit(template)}
													aria-label={`Editar template ${template.title}`}
												>
													<Edit2 className="w-4 h-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10"
													aria-label={`Excluir template ${template.title}`}
													onClick={() => {
														if (confirm("Tem certeza que deseja excluir?"))
															deleteMutation.mutate(template.id);
													}}
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
								{templates.length === 0 && (
									<TableRow>
										<TableCell
											colSpan={4}
											className="text-center py-12 text-muted-foreground"
										>
											<div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
												<FileJson className="h-8 w-8 text-slate-300" />
											</div>
											<p className="font-medium">Nenhum template cadastrado.</p>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>
				)}

				<CustomModal
					open={isOpen}
					onOpenChange={setIsOpen}
					isMobile={isMobile}
					contentClassName="max-w-2xl h-[90vh]"
				>
					<CustomModalHeader onClose={() => setIsOpen(false)}>
						<CustomModalTitle className="flex items-center gap-2">
							{editingTemplate ? (
								<Edit2 className="h-5 w-5 text-primary" />
							) : (
								<Plus className="h-5 w-5 text-primary" />
							)}
							{editingTemplate
								? "Editar Template de Avaliação"
								: "Novo Template de Avaliação"}
						</CustomModalTitle>
					</CustomModalHeader>

					<CustomModalBody className="p-0 sm:p-0">
						<div className="p-6 space-y-6">
							<p className="text-sm text-muted-foreground">
								Configure a estrutura base para as novas avaliações clínicas.
							</p>

							<div className="grid gap-6">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="font-bold text-xs uppercase text-slate-500">
											Título do Modelo *
										</Label>
										<Input
											value={formData.title}
											onChange={(e) =>
												setFormData({ ...formData, title: e.target.value })
											}
											placeholder="Ex: Avaliação de Joelho"
											className="rounded-xl border-slate-200"
										/>
									</div>
									<div className="space-y-2">
										<Label className="font-bold text-xs uppercase text-slate-500">
											Categoria
										</Label>
										<Input
											value={formData.category}
											onChange={(e) =>
												setFormData({ ...formData, category: e.target.value })
											}
											placeholder="Ex: Ortopedia"
											className="rounded-xl border-slate-200"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label className="font-bold text-xs uppercase text-slate-500">
										Descrição Curta
									</Label>
									<Input
										value={formData.description}
										onChange={(e) =>
											setFormData({ ...formData, description: e.target.value })
										}
										placeholder="Breve descrição do objetivo deste modelo..."
										className="rounded-xl border-slate-200"
									/>
								</div>

								<div className="space-y-2">
									<Label className="font-bold text-xs uppercase text-slate-500 flex items-center justify-between">
										Configuração JSON
										<Badge variant="outline" className="text-[10px] font-mono">
											Expert Only
										</Badge>
									</Label>
									<div className="relative group">
										<Textarea
											value={formData.content}
											onChange={(e) =>
												setFormData({ ...formData, content: e.target.value })
											}
											className="font-mono text-xs rounded-xl border-slate-200 bg-slate-900 text-slate-100 min-h-[300px] p-4 selection:bg-primary/30"
											spellCheck={false}
										/>
									</div>
									<div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
										<p className="text-[10px] text-amber-800 leading-relaxed">
											<strong>Dica:</strong> A estrutura deve conter chaves como{" "}
											<code>treatment_plan</code>, <code>physical_exam</code> e{" "}
											<code>vital_signs</code> para que o sistema reconheça
											automaticamente os campos.
										</p>
									</div>
								</div>
							</div>
						</div>
					</CustomModalBody>

					<CustomModalFooter isMobile={isMobile} className="bg-slate-50">
						<Button
							variant="ghost"
							onClick={() => setIsOpen(false)}
							className="rounded-xl h-11 px-6 font-bold text-slate-500"
						>
							Cancelar
						</Button>
						<Button
							onClick={handleSubmit}
							disabled={saveMutation.isPending}
							className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider"
						>
							{saveMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							Salvar Template
						</Button>
					</CustomModalFooter>
				</CustomModal>
			</CardContent>
		</Card>
	);
};
