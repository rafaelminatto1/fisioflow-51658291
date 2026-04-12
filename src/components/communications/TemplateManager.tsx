import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
	useCreateWhatsAppTemplate,
	useDeleteWhatsAppTemplate,
	useUpdateWhatsAppTemplate,
	useWhatsAppTemplates,
} from "@/hooks/useWhatsAppTemplates";
import type { WhatsAppTemplateRecord } from "@/types/workers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CheckCircle2,
	FileText,
	Pencil,
	Plus,
	RefreshCw,
	Save,
	Trash2,
} from "lucide-react";

type TemplateFormValues = {
	name: string;
	category: string;
	content: string;
	status: string;
};

const EMPTY_FORM: TemplateFormValues = {
	name: "",
	category: "general",
	content: "",
	status: "ativo",
};

const STATUS_OPTIONS = [
	{ value: "ativo", label: "Ativo" },
	{ value: "inativo", label: "Inativo" },
];

function extractVariables(content: string) {
	return Array.from(content.matchAll(/\{\{([^}]+)\}\}/g))
		.map((match) => match[1]?.trim())
		.filter((value): value is string => Boolean(value))
		.filter((value, index, values) => values.indexOf(value) === index);
}

function getStatusLabel(status?: string) {
	return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function TemplateManager() {
	const { data: templates = [], isLoading } = useWhatsAppTemplates();
	const createTemplate = useCreateWhatsAppTemplate();
	const updateTemplate = useUpdateWhatsAppTemplate();
	const deleteTemplate = useDeleteWhatsAppTemplate();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [formMode, setFormMode] = useState<"create" | "edit">("create");
	const [formValues, setFormValues] =
		useState<TemplateFormValues>(EMPTY_FORM);
	const [formTemplateId, setFormTemplateId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] =
		useState<WhatsAppTemplateRecord | null>(null);

	const selectedTemplate = templates.find((template) => template.id === selectedId);
	const contentVariables = useMemo(
		() => extractVariables(editContent),
		[editContent],
	);

	const handleSelect = (template: WhatsAppTemplateRecord) => {
		setSelectedId(template.id);
		setEditContent(template.content);
	};

	const openCreateDialog = () => {
		setFormMode("create");
		setFormTemplateId(null);
		setFormValues(EMPTY_FORM);
		setIsDialogOpen(true);
	};

	const openEditDialog = (template: WhatsAppTemplateRecord) => {
		setFormMode("edit");
		setFormTemplateId(template.id);
		setFormValues({
			name: template.name,
			category: template.category ?? "general",
			content: template.content,
			status: template.status ?? "ativo",
		});
		setIsDialogOpen(true);
	};

	const resetDialog = () => {
		setIsDialogOpen(false);
		setFormMode("create");
		setFormTemplateId(null);
		setFormValues(EMPTY_FORM);
	};

	const handleDialogSubmit = async () => {
		const payload = {
			...formValues,
			variables: extractVariables(formValues.content),
		};

		if (!payload.name.trim() || !payload.content.trim()) return;

		if (formMode === "edit" && formTemplateId) {
			const updated = await updateTemplate.mutateAsync({
				id: formTemplateId,
				...payload,
			});
			setSelectedId(updated.id);
			setEditContent(updated.content);
			resetDialog();
			return;
		}

		const created = await createTemplate.mutateAsync(payload);
		setSelectedId(created.id);
		setEditContent(created.content);
		resetDialog();
	};

	const handleQuickSave = async () => {
		if (!selectedTemplate) return;

		const updated = await updateTemplate.mutateAsync({
			id: selectedTemplate.id,
			content: editContent,
			variables: contentVariables,
		});
		setEditContent(updated.content);
	};

	const handleDelete = async (target: WhatsAppTemplateRecord | null) => {
		if (!target) return;

		await deleteTemplate.mutateAsync(target.id);
		if (selectedId === target.id) {
			setSelectedId(null);
			setEditContent("");
		}
		setDeleteTarget(null);
	};

	const isSaving =
		createTemplate.isPending ||
		updateTemplate.isPending ||
		deleteTemplate.isPending;

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="col-span-1 h-[calc(100vh-16rem)] flex flex-col">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between gap-3">
							<CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
								Meus Templates
							</CardTitle>
							<Button
								variant="outline"
								size="sm"
								className="h-8 rounded-lg gap-1.5 font-black uppercase text-[10px] tracking-widest"
								onClick={openCreateDialog}
							>
								<Plus className="h-3.5 w-3.5" />
								Novo
							</Button>
						</div>
					</CardHeader>
					<ScrollArea className="flex-1">
						<div className="p-2 space-y-1">
							{isLoading ? (
								[1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-16 w-full rounded-xl" />
								))
							) : templates.length === 0 ? (
								<p className="text-center p-8 text-xs text-muted-foreground uppercase font-bold tracking-widest">
									Nenhum template encontrado
								</p>
							) : (
								templates.map((template) => (
									<div
										key={template.id}
										className={cn(
											"group flex items-center gap-1 rounded-xl transition-all",
											selectedId === template.id
												? "bg-primary text-primary-foreground shadow-md"
												: "hover:bg-accent",
										)}
									>
										<button
											type="button"
											onClick={() => handleSelect(template)}
											className="min-w-0 flex-1 text-left p-3"
										>
											<div className="flex items-center gap-2 mb-1">
												<FileText className="h-3 w-3 shrink-0" />
												<span className="text-xs font-black uppercase tracking-tight truncate">
													{template.name}
												</span>
											</div>
											<p
												className={cn(
													"text-[10px] line-clamp-1 opacity-70",
													selectedId === template.id
														? "text-primary-foreground"
														: "text-muted-foreground",
												)}
											>
												{template.content}
											</p>
										</button>
										<div className="flex shrink-0 pr-2">
											<Button
												variant="ghost"
												size="sm"
												className={cn(
													"h-8 w-8 rounded-lg p-0",
													selectedId === template.id &&
														"text-primary-foreground hover:text-primary-foreground",
												)}
												onClick={() => openEditDialog(template)}
												aria-label={`Editar ${template.name}`}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className={cn(
													"h-8 w-8 rounded-lg p-0 text-destructive hover:text-destructive",
													selectedId === template.id &&
														"text-primary-foreground hover:text-primary-foreground",
												)}
												onClick={() => setDeleteTarget(template)}
												aria-label={`Excluir ${template.name}`}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								))
							)}
						</div>
					</ScrollArea>
				</Card>

				<Card className="col-span-1 md:col-span-2 h-[calc(100vh-16rem)] flex flex-col">
					{selectedTemplate ? (
						<>
							<CardHeader className="border-b bg-muted/20">
								<div className="flex items-center justify-between gap-4">
									<div className="space-y-1 min-w-0">
										<CardTitle className="text-lg font-black tracking-tight truncate">
											{selectedTemplate.name}
										</CardTitle>
										<div className="flex flex-wrap items-center gap-2">
											<Badge
												variant="outline"
												className="text-[10px] font-black uppercase tracking-widest"
											>
												{selectedTemplate.category ?? "general"}
											</Badge>
											<Badge className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 border-green-500/20">
												{getStatusLabel(selectedTemplate.status)}
											</Badge>
										</div>
									</div>
									<div className="flex shrink-0 gap-2">
										<Button
											variant="outline"
											size="sm"
											className="rounded-lg gap-1.5 font-black uppercase text-[10px] tracking-widest"
											onClick={() => openEditDialog(selectedTemplate)}
										>
											<Pencil className="h-3.5 w-3.5" />
											Editar
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="rounded-lg gap-1.5 font-black uppercase text-[10px] tracking-widest text-destructive hover:text-destructive"
											onClick={() => setDeleteTarget(selectedTemplate)}
										>
											<Trash2 className="h-3.5 w-3.5" />
											Excluir
										</Button>
										<Button
											onClick={handleQuickSave}
											disabled={
												updateTemplate.isPending ||
												editContent === selectedTemplate.content
											}
											className="rounded-lg font-black uppercase text-[10px] tracking-widest gap-2"
										>
											{updateTemplate.isPending ? (
												<RefreshCw className="h-3 w-3 animate-spin" />
											) : (
												<Save className="h-3 w-3" />
											)}
											Salvar
										</Button>
									</div>
								</div>
							</CardHeader>
							<CardContent className="flex-1 p-6 space-y-6 overflow-auto">
								<div className="space-y-3">
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
											Conteúdo da Mensagem
										</label>
										<div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
											<CheckCircle2 className="h-3 w-3" />
											<span className="text-[9px] font-black uppercase tracking-tighter">
												Variáveis:{" "}
												{contentVariables.length > 0
													? contentVariables
															.map((variable) => `{{${variable}}}`)
															.join(", ")
													: "{{name}}, {{date}}, {{time}}"}
											</span>
										</div>
									</div>
									<Textarea
										value={editContent}
										onChange={(e) => setEditContent(e.target.value)}
										className="min-h-[240px] text-sm leading-relaxed rounded-lg border-border/40 focus:ring-primary/20 resize-none font-medium"
										placeholder="Escreva o conteúdo do template aqui..."
									/>
								</div>

								<div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border/40 space-y-2">
									<h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
										Boas práticas
									</h4>
									<p className="text-xs text-muted-foreground leading-relaxed">
										Use variáveis entre chaves duplas para personalização. Ex:
										{" {{name}}"}, {"{{date}}"} e {"{{time}}"}.
									</p>
								</div>
							</CardContent>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
							<div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center opacity-30">
								<FileText className="h-8 w-8" />
							</div>
							<div className="max-w-xs space-y-1">
								<p className="text-sm font-black uppercase tracking-tight">
									Selecione um template
								</p>
								<p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
									Escolha um template à esquerda para editar o conteúdo ou use
									Novo para criar uma mensagem reutilizável.
								</p>
							</div>
						</div>
					)}
				</Card>
			</div>

			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					if (open) {
						setIsDialogOpen(true);
						return;
					}
					resetDialog();
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="text-xl font-black tracking-tight">
							{formMode === "edit" ? "Editar Template" : "Novo Template"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="grid gap-2">
							<Label>Nome</Label>
							<Input
								value={formValues.name}
								onChange={(event) =>
									setFormValues((current) => ({
										...current,
										name: event.target.value,
									}))
								}
								placeholder="Ex: Confirmação de agendamento"
							/>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label>Categoria</Label>
								<Input
									value={formValues.category}
									onChange={(event) =>
										setFormValues((current) => ({
											...current,
											category: event.target.value,
										}))
									}
									placeholder="appointment, reminder, clinical..."
								/>
							</div>
							<div className="grid gap-2">
								<Label>Status</Label>
								<Select
									value={formValues.status}
									onValueChange={(value) =>
										setFormValues((current) => ({
											...current,
											status: value,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione o status" />
									</SelectTrigger>
									<SelectContent>
										{STATUS_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="grid gap-2">
							<Label>Conteúdo</Label>
							<Textarea
								value={formValues.content}
								onChange={(event) =>
									setFormValues((current) => ({
										...current,
										content: event.target.value,
									}))
								}
								rows={8}
								className="resize-none rounded-lg"
								placeholder="Olá {{name}}, sua sessão foi confirmada para {{date}} às {{time}}."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={resetDialog} disabled={isSaving}>
							Cancelar
						</Button>
						<Button
							onClick={handleDialogSubmit}
							disabled={
								isSaving ||
								!formValues.name.trim() ||
								!formValues.content.trim()
							}
						>
							{isSaving ? "Salvando..." : "Salvar Template"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir template?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta ação remove o template da biblioteca de mensagens.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteTemplate.isPending}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								void handleDelete(deleteTarget);
							}}
							disabled={deleteTemplate.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteTemplate.isPending ? "Excluindo..." : "Excluir"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
