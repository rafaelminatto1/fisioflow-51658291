import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	CalendarIcon,
	Tag,
	X,
	CheckSquare,
	Paperclip,
	Plus,
	Trash2,
	Flag,
	Link2,
	BookOpen,
	Upload,
	ExternalLink,
	FileText,
	Image,
	Video,
	File,
	User,
	CheckCircle2,
	Clock,
	History,
	Loader2,
	Save,
	ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tarefa,
	TarefaStatus,
	TarefaPrioridade,
	TarefaTipo,
	TeamMember,
	STATUS_LABELS,
	PRIORIDADE_LABELS,
	TIPO_LABELS,
	PRIORIDADE_COLORS,
	STATUS_COLORS,
} from "@/types/tarefas";
import { useUpdateTarefa, useCreateTarefa, useTarefas } from "@/hooks/useTarefas";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBoardLabels } from "@/contexts/BoardLabelsContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { boardChecklistTemplatesApi } from "@/api/v2";
import type { BoardChecklistTemplate } from "@/types/boards";

const attachmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string(),
	type: z.enum(["file", "link", "image", "video", "document"]),
	size: z.number().optional(),
	created_at: z.string(),
});

const referenceSchema = z.object({
	id: z.string(),
	title: z.string().min(1, "Título é obrigatório"),
	url: z.string().optional(),
	author: z.string().optional(),
	year: z.string().optional(),
	type: z.enum(["article", "book", "website", "video", "internal", "other"]),
	description: z.string().optional(),
	created_at: z.string(),
});

const checklistItemSchema = z.object({
	id: z.string(),
	text: z.string(),
	completed: z.boolean(),
	due_date: z.string().optional(),
	assignee_id: z.string().optional(),
});

const checklistSchema = z.object({
	id: z.string(),
	title: z.string(),
	items: z.array(checklistItemSchema),
});

const tarefaDetailSchema = z.object({
	titulo: z.string().min(1, "Título é obrigatório"),
	descricao: z.string().optional(),
	status: z.enum([
		"BACKLOG",
		"A_FAZER",
		"EM_PROGRESSO",
		"REVISAO",
		"CONCLUIDO",
		"ARQUIVADO",
	] as const),
	prioridade: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const),
	tipo: z.enum([
		"TAREFA",
		"BUG",
		"FEATURE",
		"MELHORIA",
		"DOCUMENTACAO",
		"REUNIAO",
	] as const),
	data_vencimento: z.date().optional().nullable(),
	start_date: z.date().optional().nullable(),
	tags: z.array(z.string()).default([]),
	project_id: z.string().optional().nullable(),
	parent_id: z.string().optional().nullable(),
	responsavel_id: z.string().optional().nullable(),
	checklists: z.array(checklistSchema).optional(),
	attachments: z.array(attachmentSchema).optional(),
	references: z.array(referenceSchema).optional(),
	dependencies: z.array(z.string()).default([]),
	requires_acknowledgment: z.boolean().default(false),
});

type TarefaDetailFormData = z.infer<typeof tarefaDetailSchema>;

interface TaskDetailModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tarefa: Tarefa | null;
	teamMembers: TeamMember[];
}

export function TaskDetailModal({
	open,
	onOpenChange,
	tarefa,
	teamMembers,
}: TaskDetailModalProps) {
	const isMobile = useIsMobile();
	const updateTarefa = useUpdateTarefa();
	const createTarefa = useCreateTarefa();

	const { data: allTarefas } = useTarefas();

	// Board labels context (provided by KanbanFull or empty outside board context)
	const { labels: boardLabels, labelsMap } = useBoardLabels();
	const boardId = tarefa?.board_id;

	// Checklist templates
	const { data: templatesData } = useQuery({
		queryKey: ["boards", boardId, "checklist-templates"],
		queryFn: () => boardChecklistTemplatesApi.list(boardId!),
		enabled: !!boardId,
	});
	const checklistTemplates: BoardChecklistTemplate[] = (
		templatesData?.data ?? []
	) as BoardChecklistTemplate[];

	const useTemplateMutation = useMutation({
		mutationFn: (templateId: string) =>
			boardChecklistTemplatesApi.use(templateId),
	});

	const saveTemplateMutation = useMutation({
		mutationFn: (data: { name: string; items: unknown[] }) =>
			boardChecklistTemplatesApi.create(boardId!, {
				name: data.name,
				items: data.items,
			}),
		onSuccess: () => toast.success("Template salvo com sucesso!"),
	});

	const [activeTab, setActiveTab] = useState("details");
	const [newChecklistTitle, setNewChecklistTitle] = useState("");
	const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
	const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
	const [saveTemplateName, setSaveTemplateName] = useState("");
	const [depSearch, setDepSearch] = useState("");

	// Stable ref to always have the latest onSubmit without stale closures
	const onSubmitRef = useRef<(data: TarefaDetailFormData) => Promise<void>>(
		async () => {},
	);
	const triggerSave = useCallback(() => {
		form.handleSubmit((data) => onSubmitRef.current(data))();
	}, [form]);

	const form = useForm<TarefaDetailFormData>({
		resolver: zodResolver(tarefaDetailSchema),
		defaultValues: {
			titulo: "",
			descricao: "",
			status: "A_FAZER",
			prioridade: "MEDIA",
			tipo: "TAREFA",
			data_vencimento: null,
			start_date: null,
			tags: [],
			project_id: null,
			parent_id: null,
			responsavel_id: null,
			checklists: [],
			attachments: [],
			references: [],
			dependencies: [],
			requires_acknowledgment: false,
		},
	});

	const {
		fields: checklistFields,
		append: appendChecklist,
		remove: removeChecklist,
		update: updateChecklist,
	} = useFieldArray({
		control: form.control,
		name: "checklists",
	});

	const {
		fields: attachmentFields,
		append: appendAttachment,
		remove: removeAttachment,
	} = useFieldArray({
		control: form.control,
		name: "attachments",
	});

	const {
		fields: referenceFields,
		append: appendReference,
		remove: removeReference,
	} = useFieldArray({
		control: form.control,
		name: "references",
	});

	const tags = form.watch("tags");

	useEffect(() => {
		if (tarefa) {
			form.reset({
				titulo: tarefa.titulo,
				descricao: tarefa.descricao || "",
				status: tarefa.status,
				prioridade: tarefa.prioridade,
				tipo: tarefa.tipo || "TAREFA",
				data_vencimento: tarefa.data_vencimento
					? new Date(tarefa.data_vencimento)
					: null,
				start_date: tarefa.start_date ? new Date(tarefa.start_date) : null,
				tags: tarefa.tags || [],
				project_id: tarefa.project_id || null,
				parent_id: tarefa.parent_id || null,
				responsavel_id: tarefa.responsavel_id || null,
				checklists: tarefa.checklists || [],
				attachments: tarefa.attachments || [],
				references: tarefa.references || [],
				dependencies: tarefa.dependencies || [],
				requires_acknowledgment: tarefa.requires_acknowledgment || false,
			});
			setSelectedLabelIds(tarefa.label_ids ?? []);
		}
	}, [tarefa, form]);

	const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const input = e.currentTarget;
			const value = input.value.trim();

			if (value && !tags.includes(value)) {
				form.setValue("tags", [...tags, value]);
				input.value = "";
			}
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		form.setValue(
			"tags",
			tags.filter((t) => t !== tagToRemove),
		);
	};

	const addChecklist = () => {
		if (newChecklistTitle.trim()) {
			appendChecklist({
				id: crypto.randomUUID(),
				title: newChecklistTitle,
				items: [],
			});
			setNewChecklistTitle("");
		}
	};

	const addChecklistItem = (checklistIndex: number) => {
		const checklist = checklistFields[checklistIndex];
		const updatedItems = [
			...checklist.items,
			{ id: crypto.randomUUID(), text: "", completed: false },
		];
		updateChecklist(checklistIndex, { ...checklist, items: updatedItems });
	};

	const updateChecklistItem = (
		checklistIndex: number,
		itemIndex: number,
		updates: Partial<{ text: string; completed: boolean }>,
	) => {
		const checklist = checklistFields[checklistIndex];
		const updatedItems = [...checklist.items];
		updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...updates };
		updateChecklist(checklistIndex, { ...checklist, items: updatedItems });
	};

	const removeChecklistItem = (checklistIndex: number, itemIndex: number) => {
		const checklist = checklistFields[checklistIndex];
		const updatedItems = checklist.items.filter((_, i) => i !== itemIndex);
		updateChecklist(checklistIndex, { ...checklist, items: updatedItems });
	};

	const addAttachment = (type: "link" | "file") => {
		appendAttachment({
			id: crypto.randomUUID(),
			name: "",
			url: "",
			type,
			created_at: new Date().toISOString(),
		});
	};

	const addReference = () => {
		appendReference({
			id: crypto.randomUUID(),
			title: "",
			url: "",
			author: "",
			year: "",
			type: "article",
			description: "",
			created_at: new Date().toISOString(),
		});
	};

	const checklists = form.watch("checklists");

	const checklistProgress = useMemo(() => {
		const checklistItems = checklists || [];
		const totalItems = checklistItems.reduce(
			(acc, cl) => acc + cl.items.length,
			0,
		);
		const completedItems = checklistItems.reduce(
			(acc, cl) => acc + cl.items.filter((i) => i.completed).length,
			0,
		);
		return totalItems > 0
			? {
					completed: completedItems,
					total: totalItems,
					percent: (completedItems / totalItems) * 100,
				}
			: null;
	}, [checklists]);

	const onSubmit = useCallback(async (data: TarefaDetailFormData) => {
		if (!tarefa) return;

		try {
			await updateTarefa.mutateAsync({
				id: tarefa.id,
				titulo: data.titulo,
				descricao: data.descricao,
				status: data.status,
				prioridade: data.prioridade,
				tipo: data.tipo,
				project_id: data.project_id,
				parent_id: data.parent_id,
				responsavel_id: data.responsavel_id,
				data_vencimento: data.data_vencimento?.toISOString().split("T")[0],
				start_date: data.start_date?.toISOString().split("T")[0],
				tags: data.tags,
				label_ids: selectedLabelIds,
				checklists: data.checklists,
				attachments: data.attachments,
				references: data.references,
				dependencies: data.dependencies,
				...(data.status === "CONCLUIDO" && !tarefa.completed_at
					? { completed_at: new Date().toISOString() }
					: {}),
			});
			toast.success("Tarefa atualizada com sucesso!");
		} catch {
			// Error handled in hook
		}
	}, [tarefa, updateTarefa, selectedLabelIds]);

	// Keep ref always pointing to latest onSubmit (avoids stale closures)
	useEffect(() => {
		onSubmitRef.current = onSubmit;
	}, [onSubmit]);

	const handleAutoSave = () => {
		if (form.formState.isDirty) {
			form.handleSubmit(onSubmit)();
		}
	};

	if (!tarefa) return null;

	const getFileIcon = (type: string) => {
		switch (type) {
			case "image":
				return <Image className="h-4 w-4" />;
			case "video":
				return <Video className="h-4 w-4" />;
			case "document":
				return <FileText className="h-4 w-4" />;
			default:
				return <File className="h-4 w-4" />;
		}
	};

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-3xl h-[95vh]"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<Badge
							className={cn(
								"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
								STATUS_COLORS[tarefa.status].bg,
								STATUS_COLORS[tarefa.status].text,
							)}
						>
							{STATUS_LABELS[tarefa.status]}
						</Badge>
						<Badge
							className={cn(
								"text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
								PRIORIDADE_COLORS[tarefa.prioridade],
							)}
						>
							<Flag className="h-3 w-3 mr-1" />
							{PRIORIDADE_LABELS[tarefa.prioridade]}
						</Badge>
					</div>
					<CustomModalTitle className="text-xl font-bold text-slate-800 leading-tight">
						{tarefa.titulo}
					</CustomModalTitle>
					<div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-widest">
						<Clock className="h-3 w-3" />
						Criado{" "}
						{formatDistanceToNow(new Date(tarefa.created_at), {
							addSuffix: true,
							locale: ptBR,
						})}
					</div>
				</div>
			</CustomModalHeader>

			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex-1 flex flex-col overflow-hidden"
			>
				<TabsList className="bg-slate-50 border-b rounded-none px-6 h-12 justify-start gap-4 overflow-x-auto scrollbar-hide">
					<TabsTrigger
						value="details"
						className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-t-lg h-9 mt-auto"
					>
						<FileText className="h-4 w-4 mr-2" />
						Detalhes
					</TabsTrigger>
					<TabsTrigger
						value="checklists"
						className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-t-lg h-9 mt-auto"
					>
						<CheckSquare className="h-4 w-4 mr-2" />
						Checklists
						{checklistProgress && (
							<Badge variant="outline" className="ml-2 text-[10px] h-4 px-1">
								{checklistProgress.completed}/{checklistProgress.total}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="attachments"
						className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-t-lg h-9 mt-auto"
					>
						<Paperclip className="h-4 w-4 mr-2" />
						Anexos
						{attachmentFields.length > 0 && (
							<Badge variant="outline" className="ml-2 text-[10px] h-4 px-1">
								{attachmentFields.length}
							</Badge>
						)}
					</TabsTrigger>
					<TabsTrigger
						value="references"
						className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-t-lg h-9 mt-auto"
					>
						<BookOpen className="h-4 w-4 mr-2" />
						Wiki / Refs
					</TabsTrigger>
					<TabsTrigger
						value="audit"
						className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-t-lg h-9 mt-auto text-orange-600 data-[state=active]:text-orange-700"
					>
						<ShieldAlert className="h-4 w-4 mr-2" />
						Auditoria
					</TabsTrigger>
				</TabsList>

				<CustomModalBody className="p-0 sm:p-0">
					<Form {...form}>
						<form
							id="task-detail-form"
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-6"
						>
							<ScrollArea className="h-full">
								<div className="p-6">
									{/* Details Tab */}
									<TabsContent value="details" className="mt-0 space-y-6">
										<FormField
											control={form.control}
											name="titulo"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="font-bold text-xs text-slate-500 uppercase">
														Título da Tarefa
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															onBlur={handleAutoSave}
															className="rounded-xl border-slate-200 font-semibold"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="descricao"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="font-bold text-xs text-slate-500 uppercase">
														Descrição e Contexto
													</FormLabel>
													<FormControl>
														<RichTextEditor
															value={field.value ?? ""}
															onValueChange={(html) => {
																field.onChange(html);
															}}
															placeholder="Descreva a tarefa... Use / para comandos"
															onBlur={handleAutoSave}
															className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50/50"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
											<FormField
												control={form.control}
												name="status"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="font-bold text-xs text-slate-500 uppercase">
															Status
														</FormLabel>
														<Select
															onValueChange={(v) => {
																field.onChange(v);
																handleAutoSave();
															}}
															value={field.value}
														>
															<FormControl>
																<SelectTrigger className="rounded-xl border-slate-200">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																{(
																	Object.keys(STATUS_LABELS) as TarefaStatus[]
																).map((status) => (
																	<SelectItem key={status} value={status}>
																		{STATUS_LABELS[status]}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="prioridade"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="font-bold text-xs text-slate-500 uppercase">
															Prioridade
														</FormLabel>
														<Select
															onValueChange={(v) => {
																field.onChange(v);
																handleAutoSave();
															}}
															value={field.value}
														>
															<FormControl>
																<SelectTrigger className="rounded-xl border-slate-200">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																{(
																	Object.keys(
																		PRIORIDADE_LABELS,
																	) as TarefaPrioridade[]
																).map((p) => (
																	<SelectItem key={p} value={p}>
																		<div className="flex items-center gap-2">
																			<div
																				className={cn(
																					"w-2 h-2 rounded-full",
																					PRIORIDADE_COLORS[p].split(" ")[0],
																				)}
																			/>
																			{PRIORIDADE_LABELS[p]}
																		</div>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</FormItem>
												)}
											/>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
											<FormField
												control={form.control}
												name="tipo"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="font-bold text-xs text-slate-500 uppercase">
															Tipo
														</FormLabel>
														<Select
															onValueChange={(v) => {
																field.onChange(v);
																handleAutoSave();
															}}
															value={field.value}
														>
															<FormControl>
																<SelectTrigger className="rounded-xl border-slate-200">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																{(Object.keys(TIPO_LABELS) as TarefaTipo[]).map(
																	(t) => (
																		<SelectItem key={t} value={t}>
																			{TIPO_LABELS[t]}
																		</SelectItem>
																	),
																)}
															</SelectContent>
														</Select>
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="responsavel_id"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="font-bold text-xs text-slate-500 uppercase">
															Responsável
														</FormLabel>
														<Select
															onValueChange={(v) => {
																field.onChange(v === "none" ? null : v);
																handleAutoSave();
															}}
															value={field.value || "none"}
														>
															<FormControl>
																<SelectTrigger className="rounded-xl border-slate-200">
																	<SelectValue placeholder="Nenhum" />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="none">
																	<div className="flex items-center gap-2">
																		<User className="h-4 w-4 text-slate-400" />
																		Nenhum
																	</div>
																</SelectItem>
																{teamMembers.map((member) => (
																	<SelectItem key={member.id} value={member.id}>
																		<div className="flex items-center gap-2">
																			<Avatar className="h-5 w-5">
																				<AvatarImage src={member.avatar_url} />
																				<AvatarFallback className="text-[10px]">
																					{member.full_name
																						?.slice(0, 2)
																						.toUpperCase()}
																				</AvatarFallback>
																			</Avatar>
																			{member.full_name}
																		</div>
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</FormItem>
												)}
											/>
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
											<FormField
												control={form.control}
												name="data_vencimento"
												render={({ field }) => (
													<FormItem className="flex flex-col">
														<FormLabel className="font-bold text-xs text-slate-500 uppercase">
															Prazo de Entrega
														</FormLabel>
														<Popover>
															<PopoverTrigger asChild>
																<FormControl>
																	<Button
																		variant="outline"
																		className={cn(
																			"w-full pl-3 text-left font-normal rounded-xl border-slate-200 h-11",
																			!field.value && "text-muted-foreground",
																		)}
																	>
																		{field.value ? (
																			format(field.value, "dd/MM/yyyy")
																		) : (
																			<span>Definir prazo</span>
																		)}
																		<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
																	</Button>
																</FormControl>
															</PopoverTrigger>
															<PopoverContent
																className="w-auto p-0 z-[110]"
																align="start"
															>
																<Calendar
																	mode="single"
																	selected={field.value || undefined}
																	onSelect={(d) => {
																		field.onChange(d);
																		handleAutoSave();
																	}}
																	initialFocus
																	locale={ptBR}
																/>
															</PopoverContent>
														</Popover>
													</FormItem>
												)}
											/>

											<div className="space-y-2">
												<Label className="font-bold text-xs text-slate-500 uppercase">
													Etiquetas
												</Label>

												{/* Board labels (colored, managed) */}
												{boardId && boardLabels.length > 0 && (
													<div className="space-y-2">
														<div className="flex flex-wrap gap-1.5">
															{boardLabels.map((label) => {
																const active = selectedLabelIds.includes(label.id);
																return (
																	<button
																		key={label.id}
																		type="button"
																			onClick={() => {
																				setSelectedLabelIds((prev) => {
																					const next = active
																						? prev.filter((id) => id !== label.id)
																						: [...prev, label.id];
																					setTimeout(() => triggerSave(), 0);
																					return next;
																				});
																			}}
																		className={cn(
																			"flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all",
																			active ? "ring-2 ring-offset-1" : "opacity-60 hover:opacity-100",
																		)}
																		style={
																			active
																				? {
																						backgroundColor: label.color + "22",
																						color: label.color,
																						borderColor: label.color + "66",
																						ringColor: label.color,
																					}
																				: {
																						backgroundColor: "transparent",
																						color: label.color,
																						borderColor: label.color + "44",
																					}
																		}
																	>
																		<span
																			className="w-2.5 h-2.5 rounded-full"
																			style={{ backgroundColor: label.color }}
																		/>
																		{label.name}
																		{active && <X className="h-2.5 w-2.5 ml-0.5" />}
																	</button>
																);
															})}
														</div>
														<p className="text-[11px] text-muted-foreground">
															Clique para adicionar ou remover etiquetas do board.
														</p>
													</div>
												)}

												{/* Legacy text tags */}
												<div>
													<Label className="font-bold text-xs text-slate-400 uppercase">
														Tags livres
													</Label>
													<div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] mt-1">
														<Tag className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
														<Input
															placeholder="Digite e pressione Enter para adicionar..."
															onKeyDown={handleAddTag}
															className="flex-1 border-none bg-transparent focus-visible:ring-0 h-7 text-sm"
														/>
													</div>
													{tags.length > 0 && (
														<div className="flex flex-wrap gap-1.5 mt-2">
															{tags.map((tag, i) => (
																<Badge
																	key={i}
																	variant="secondary"
																	className="gap-1 rounded-lg px-2 py-1 bg-white border-slate-200 text-slate-600"
																>
																	{tag}
																	<X
																		className="h-3 w-3 cursor-pointer hover:text-destructive"
																		onClick={() => {
																			handleRemoveTag(tag);
																			handleAutoSave();
																		}}
																	/>
																</Badge>
															))}
														</div>
													)}
												</div>
											</div>
										</div>
											{/* Dependencies section */}
											<div>
												<Label className="font-bold text-xs text-slate-400 uppercase">
													Dependências (bloqueadores)
												</Label>
												<p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
													Tarefas que precisam ser concluídas antes desta.
												</p>
												{form.watch("dependencies").length > 0 && (
													<div className="flex flex-col gap-1.5 mb-2">
														{form.watch("dependencies").map((depId) => {
															const dep = allTarefas?.find((t) => t.id === depId);
															return (
																<div key={depId} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-slate-50/60 px-3 py-2 text-sm">
																	<span className="truncate font-medium">{dep?.titulo ?? depId}</span>
																	<button
																		type="button"
																		onClick={() => {
																			const current = form.getValues("dependencies");
																			form.setValue("dependencies", current.filter((id) => id !== depId));
																			handleAutoSave();
																		}}
																		className="shrink-0 text-slate-400 hover:text-destructive"
																	>
																		<X className="h-3.5 w-3.5" />
																	</button>
																</div>
															);
														})}
													</div>
												)}
												<div className="relative">
													<Input
														placeholder="Buscar tarefa para adicionar como dependência..."
														value={depSearch}
														onChange={(e) => setDepSearch(e.target.value)}
														className="h-9 rounded-xl text-sm"
													/>
													{depSearch.length >= 2 && (
														<div className="absolute z-10 mt-1 w-full rounded-xl border border-border/60 bg-popover shadow-md overflow-hidden">
															{(allTarefas ?? []).filter((t) =>
																t.id !== tarefa?.id &&
																!form.getValues("dependencies").includes(t.id) &&
																t.titulo.toLowerCase().includes(depSearch.toLowerCase())
															).slice(0, 6).map((t) => (
																<button
																	key={t.id}
																	type="button"
																	className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/60 transition-colors"
																	onClick={() => {
																		const current = form.getValues("dependencies");
																		form.setValue("dependencies", [...current, t.id]);
																		setDepSearch("");
																		handleAutoSave();
																	}}
																>
																	<span className="truncate">{t.titulo}</span>
																	<Badge variant="outline" className="shrink-0 text-[10px] px-1.5">{t.status}</Badge>
																</button>
															))}
															{(allTarefas ?? []).filter((t) =>
																t.id !== tarefa?.id &&
																!form.getValues("dependencies").includes(t.id) &&
																t.titulo.toLowerCase().includes(depSearch.toLowerCase())
															).length === 0 && (
																<p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
															)}
														</div>
													)}
												</div>
											</div>
									</TabsContent>

									{/* Checklists Tab */}
									<TabsContent value="checklists" className="mt-0 space-y-6">
										{checklistProgress && (
											<Card className="border-emerald-100 bg-emerald-50/30 overflow-hidden">
												<CardContent className="p-4">
													<div className="flex items-center justify-between mb-2">
														<span className="text-xs font-bold text-emerald-700 uppercase">
															Progresso do Checklist
														</span>
														<span className="text-sm font-bold text-emerald-700">
															{checklistProgress.completed}/
															{checklistProgress.total} (
															{Math.round(checklistProgress.percent)}%)
														</span>
													</div>
													<Progress
														value={checklistProgress.percent}
														className="h-2 bg-emerald-100"
													/>
												</CardContent>
											</Card>
										)}

										<div className="space-y-2">
											<div className="flex items-center gap-2">
												<Input
													placeholder="Novo checklist (ex: Documentação, Testes...)"
													value={newChecklistTitle}
													onChange={(e) => setNewChecklistTitle(e.target.value)}
													onKeyDown={(e) => e.key === "Enter" && addChecklist()}
													className="rounded-xl border-slate-200"
												/>
												<Button
													type="button"
													onClick={addChecklist}
													disabled={!newChecklistTitle.trim()}
													className="rounded-xl px-4 bg-slate-900"
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>

											{/* Template actions (only when in board context) */}
											{boardId && (
												<div className="flex gap-2">
													{checklistTemplates.length > 0 && (
														<Popover>
															<PopoverTrigger asChild>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className="h-8 rounded-xl gap-1.5 text-xs"
																>
																	<CheckCircle2 className="h-3.5 w-3.5" />
																	Aplicar template
																</Button>
															</PopoverTrigger>
															<PopoverContent className="w-64 p-2" align="start">
																<p className="text-xs font-medium text-muted-foreground px-1 pb-1">
																	Selecione um template
																</p>
																{checklistTemplates.map((tpl) => (
																	<button
																		key={tpl.id}
																		type="button"
																		onClick={() => {
																			useTemplateMutation.mutate(tpl.id);
																			// Apply items as a new checklist
																			appendChecklist({
																				id: crypto.randomUUID(),
																				title: tpl.name,
																				items: tpl.items.map((item) => ({
																					id: crypto.randomUUID(),
																					text: item.text,
																					completed: false,
																				})),
																			});
																		}}
																		className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
																	>
																		<div className="flex-1 min-w-0">
																			<p className="font-medium truncate">
																				{tpl.name}
																			</p>
																			{tpl.items.length > 0 && (
																				<p className="text-xs text-muted-foreground">
																					{tpl.items.length} ite
																					{tpl.items.length === 1 ? "m" : "ns"}
																					{tpl.usage_count > 0 &&
																						` · usado ${tpl.usage_count}x`}
																				</p>
																			)}
																		</div>
																	</button>
																))}
															</PopoverContent>
														</Popover>
													)}

													{checklistFields.length > 0 && (
														<Popover
															open={saveTemplateOpen}
															onOpenChange={(o) => {
																setSaveTemplateOpen(o);
																if (o)
																	setSaveTemplateName(
																		checklistFields[0]?.title ?? "",
																	);
															}}
														>
															<PopoverTrigger asChild>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	className="h-8 rounded-xl gap-1.5 text-xs"
																	disabled={saveTemplateMutation.isPending}
																>
																	<Save className="h-3.5 w-3.5" />
																	Salvar como template
																</Button>
															</PopoverTrigger>
															<PopoverContent className="w-64 p-3" align="start">
																<p className="text-xs font-medium mb-2">
																	Nome do template
																</p>
																<Input
																	placeholder="Ex: Avaliação inicial"
																	value={saveTemplateName}
																	onChange={(e) =>
																		setSaveTemplateName(e.target.value)
																	}
																	onKeyDown={(e) => {
																		if (e.key === "Enter" && saveTemplateName.trim()) {
																			const items = checklistFields.flatMap(
																				(cl) =>
																					cl.items.map((item) => ({
																						text: item.text,
																					})),
																			);
																			saveTemplateMutation.mutate({
																				name: saveTemplateName.trim(),
																				items,
																			});
																			setSaveTemplateOpen(false);
																		}
																	}}
																	autoFocus
																	className="mb-2"
																/>
																<div className="flex gap-2">
																	<Button
																		size="sm"
																		variant="ghost"
																		className="flex-1 h-7 text-xs"
																		onClick={() => setSaveTemplateOpen(false)}
																	>
																		Cancelar
																	</Button>
																	<Button
																		size="sm"
																		className="flex-1 h-7 text-xs"
																		disabled={
																			!saveTemplateName.trim() ||
																			saveTemplateMutation.isPending
																		}
																		onClick={() => {
																			const items = checklistFields.flatMap(
																				(cl) =>
																					cl.items.map((item) => ({
																						text: item.text,
																					})),
																			);
																			saveTemplateMutation.mutate({
																				name: saveTemplateName.trim(),
																				items,
																			});
																			setSaveTemplateOpen(false);
																		}}
																	>
																		Salvar
																	</Button>
																</div>
															</PopoverContent>
														</Popover>
													)}
												</div>
											)}
										</div>

										<div className="space-y-4">
											{checklistFields.map((checklist, checklistIndex) => (
												<Card
													key={checklist.id}
													className="border-slate-100 shadow-sm overflow-hidden"
												>
													<CardHeader className="p-4 border-b bg-slate-50/50">
														<div className="flex items-center justify-between">
															<CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-wider">
																<CheckCircle2 className="h-4 w-4 text-emerald-500" />
																{checklist.title}
															</CardTitle>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-slate-400 hover:text-destructive"
																onClick={() => removeChecklist(checklistIndex)}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													</CardHeader>
													<CardContent className="p-4 space-y-2 bg-white">
														{checklist.items.map((item, itemIndex) => (
															<div
																key={item.id}
																className="flex items-center gap-3 group bg-slate-50/50 p-2 rounded-xl transition-all hover:bg-slate-50"
															>
																<Checkbox
																	checked={item.completed}
																	onCheckedChange={(checked) => {
																		updateChecklistItem(
																			checklistIndex,
																			itemIndex,
																			{ completed: !!checked },
																		);
																		handleAutoSave();
																	}}
																	className="rounded-md"
																/>
																<Input
																	value={item.text}
																	onChange={(e) =>
																		updateChecklistItem(
																			checklistIndex,
																			itemIndex,
																			{ text: e.target.value },
																		)
																	}
																	onBlur={handleAutoSave}
																	className={cn(
																		"h-8 flex-1 border-none focus-visible:ring-0 bg-transparent text-sm font-medium",
																		item.completed &&
																			"line-through text-slate-400 font-normal",
																	)}
																	placeholder="O que precisa ser feito?"
																/>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	title="Converter em tarefa"
																	className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600"
																	onClick={async () => {
																		if (!item.text.trim()) return;
																		await createTarefa.mutateAsync({
																			titulo: item.text.trim(),
																			status: "A_FAZER",
																			prioridade: tarefa?.prioridade ?? "MEDIA",
																			tipo: "TAREFA",
																			board_id: tarefa?.board_id ?? undefined,
																			column_id: tarefa?.column_id ?? undefined,
																			parent_id: tarefa?.id,
																		});
																		removeChecklistItem(checklistIndex, itemIndex);
																		handleAutoSave();
																	}}
																>
																	<ExternalLink className="h-3.5 w-3.5" />
																</Button>
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
																	onClick={() => {
																		removeChecklistItem(
																			checklistIndex,
																			itemIndex,
																		);
																		handleAutoSave();
																	}}
																>
																	<X className="h-3.5 w-3.5" />
																</Button>
															</div>
														))}
														<Button
															type="button"
															variant="ghost"
															size="sm"
															className="w-full h-9 rounded-xl border border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 mt-2"
															onClick={() => addChecklistItem(checklistIndex)}
														>
															<Plus className="h-3.5 w-3.5 mr-2" />
															Adicionar item ao checklist
														</Button>
													</CardContent>
												</Card>
											))}
										</div>
									</TabsContent>

									{/* Attachments Tab */}
									<TabsContent value="attachments" className="mt-0 space-y-6">
										<div className="flex items-center gap-3">
											<Button
												type="button"
												variant="outline"
												onClick={() => addAttachment("link")}
												className="rounded-xl flex-1 h-11 gap-2 border-slate-200"
											>
												<Link2 className="h-4 w-4" />
												Adicionar Link
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() => addAttachment("file")}
												className="rounded-xl flex-1 h-11 gap-2 border-slate-200"
											>
												<Upload className="h-4 w-4" />
												Upload Arquivo
											</Button>
										</div>

										<div className="grid grid-cols-1 gap-3">
											{attachmentFields.map((attachment, index) => (
												<Card
													key={attachment.id}
													className="border-slate-100 shadow-sm overflow-hidden"
												>
													<CardContent className="p-3">
														<div className="flex items-center gap-3">
															<div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
																{getFileIcon(attachment.type)}
															</div>
															<div className="flex-1 min-w-0 space-y-1">
																<Input
																	value={form.watch(
																		`attachments.${index}.name`,
																	)}
																	onChange={(e) =>
																		form.setValue(
																			`attachments.${index}.name`,
																			e.target.value,
																		)
																	}
																	placeholder="Nome do anexo..."
																	className="h-7 border-none bg-transparent focus-visible:ring-0 font-bold text-sm p-0"
																	onBlur={handleAutoSave}
																/>
																<Input
																	value={form.watch(`attachments.${index}.url`)}
																	onChange={(e) =>
																		form.setValue(
																			`attachments.${index}.url`,
																			e.target.value,
																		)
																	}
																	placeholder="URL ou Caminho..."
																	className="h-5 border-none bg-transparent focus-visible:ring-0 font-mono text-[10px] p-0 text-slate-400"
																	onBlur={handleAutoSave}
																/>
															</div>
															<div className="flex items-center gap-1">
																{attachment.url && (
																	<Button
																		type="button"
																		variant="ghost"
																		size="icon"
																		className="h-8 w-8 rounded-lg text-slate-400"
																		onClick={() =>
																			window.open(attachment.url, "_blank")
																		}
																	>
																		<ExternalLink className="h-4 w-4" />
																	</Button>
																)}
																<Button
																	type="button"
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive"
																	onClick={() => {
																		removeAttachment(index);
																		handleAutoSave();
																	}}
																>
																	<Trash2 className="h-4 w-4" />
																</Button>
															</div>
														</div>
													</CardContent>
												</Card>
											))}
										</div>
									</TabsContent>

									{/* Wiki Tab */}
									<TabsContent value="references" className="mt-0 space-y-6">
										<div className="flex items-center justify-between">
											<h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
												Base de Conhecimento
											</h4>
											<Button
												type="button"
												onClick={addReference}
												size="sm"
												className="rounded-xl gap-2 bg-slate-900 h-8"
											>
												<Plus className="h-3.5 w-3.5" />
												Nova Ref
											</Button>
										</div>

										<div className="space-y-4">
											{referenceFields.map((reference, index) => (
												<Card
													key={reference.id}
													className="border-slate-100 shadow-sm overflow-hidden"
												>
													<CardContent className="p-4 space-y-4">
														<div className="flex items-center justify-between">
															<Select
																onValueChange={(v) => {
																	form.setValue(
																		`references.${index}.type`,
																		v as any,
																	);
																	handleAutoSave();
																}}
																value={form.watch(`references.${index}.type`)}
															>
																<SelectTrigger className="w-32 h-8 rounded-lg border-slate-200 text-xs">
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="article">
																		Artigo
																	</SelectItem>
																	<SelectItem value="book">Livro</SelectItem>
																	<SelectItem value="website">
																		Website
																	</SelectItem>
																	<SelectItem value="video">Vídeo</SelectItem>
																	<SelectItem value="internal">
																		Interno
																	</SelectItem>
																</SelectContent>
															</Select>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-slate-400"
																onClick={() => {
																	removeReference(index);
																	handleAutoSave();
																}}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>

														<Input
															value={form.watch(`references.${index}.title`)}
															onChange={(e) =>
																form.setValue(
																	`references.${index}.title`,
																	e.target.value,
																)
															}
															placeholder="Título da obra..."
															className="rounded-xl border-slate-200 font-bold"
															onBlur={handleAutoSave}
														/>

														<div className="grid grid-cols-2 gap-3">
															<Input
																value={form.watch(`references.${index}.author`)}
																onChange={(e) =>
																	form.setValue(
																		`references.${index}.author`,
																		e.target.value,
																	)
																}
																placeholder="Autor..."
																className="rounded-xl h-9 text-xs border-slate-200"
																onBlur={handleAutoSave}
															/>
															<Input
																value={form.watch(`references.${index}.year`)}
																onChange={(e) =>
																	form.setValue(
																		`references.${index}.year`,
																		e.target.value,
																	)
																}
																placeholder="Ano..."
																className="rounded-xl h-9 text-xs border-slate-200"
																onBlur={handleAutoSave}
															/>
														</div>
													</CardContent>
												</Card>
											))}
										</div>
									</TabsContent>

									<TabsContent value="audit" className="m-0 mt-4 px-6 pb-6">
										<div className="space-y-4">
											<div className="flex items-center justify-between">
												<h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
													Histórico de Responsabilidade
												</h4>
												<div className="flex items-center gap-2">
													<span className="text-[10px] font-bold text-slate-500">
														Requer Aceite:
													</span>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => {
															const val = !form.getValues(
																"requires_acknowledgment",
															);
															form.setValue("requires_acknowledgment", val);
															handleAutoSave();
														}}
														className={cn(
															"h-6 px-2 rounded-lg text-[10px] font-black uppercase",
															form.watch("requires_acknowledgment")
																? "bg-orange-500 text-white"
																: "bg-slate-100 text-slate-500",
														)}
													>
														{form.watch("requires_acknowledgment")
															? "ATIVADO"
															: "DESATIVADO"}
													</Button>
												</div>
											</div>

											{tarefa?.acknowledgments &&
											tarefa.acknowledgments.length > 0 ? (
												<div className="space-y-3">
													{tarefa.acknowledgments.map((ack, idx) => (
														<div
															key={idx}
															className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
														>
															<div className="h-8 w-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
																<User className="h-4 w-4 text-slate-400" />
															</div>
															<div className="flex-1">
																<div className="flex items-center justify-between">
																	<span className="text-xs font-bold text-slate-900">
																		{ack.user_name}
																	</span>
																	{ack.acknowledged_at && (
																		<span className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-lg border border-green-100 uppercase">
																			ACEITO
																		</span>
																	)}
																</div>
																<div className="flex flex-col gap-1 mt-1">
																	{ack.read_at && (
																		<span className="text-[10px] text-slate-500 flex items-center gap-1">
																			<Eye className="h-3 w-3" /> Visualizado em{" "}
																			{new Date(ack.read_at).toLocaleString()}
																		</span>
																	)}
																	{ack.acknowledged_at && (
																		<span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
																			<CheckCircle2 className="h-3 w-3 text-green-500" />{" "}
																			Aceito em{" "}
																			{new Date(
																				ack.acknowledged_at,
																			).toLocaleString()}
																		</span>
																	)}
																</div>
															</div>
														</div>
													))}
												</div>
											) : (
												<div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
													<ShieldAlert className="h-10 w-10 text-slate-300 mb-3" />
													<p className="text-xs font-bold text-slate-500 uppercase tracking-tight">
														Nenhuma confirmação registrada
													</p>
													<p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
														Ative o "Requer Aceite" para rastrear quem leu e
														confirmou esta tarefa.
													</p>
												</div>
											)}
										</div>
									</TabsContent>
								</div>
							</ScrollArea>
						</form>
					</Form>
				</CustomModalBody>

				<CustomModalFooter
					isMobile={isMobile}
					className="bg-slate-50 border-t-0"
				>
					<div className="flex items-center justify-between w-full">
						<div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
							<History className="h-3.5 w-3.5" />
							Auto-save ativo
						</div>
						<div className="flex items-center gap-3">
							{tarefa?.requires_acknowledgment &&
								!tarefa.acknowledgments?.find(
									(a) => a.user_id === user?.uid && a.acknowledged_at,
								) && (
									<Button
										type="button"
										variant="outline"
										className="rounded-xl h-11 px-6 border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 font-bold tracking-wide shadow-sm"
										onClick={async (e) => {
											e.preventDefault();
											if (!tarefa || !user) return;

											const newAck = {
												user_id: user.uid,
												user_name: user.displayName || user.email || "Usuário",
												read_at: new Date().toISOString(),
												acknowledged_at: new Date().toISOString(),
											};

											const currentAcks = tarefa.acknowledgments || [];
											const updatedAcks = [
												...currentAcks.filter((a) => a.user_id !== user.uid),
												newAck,
											];

											updateTarefa.mutate({
												id: tarefa.id,
												updates: { acknowledgments: updatedAcks },
											});

											toast.success(
												"Ciente registrado com sucesso! A auditoria foi atualizada.",
											);
										}}
										disabled={updateTarefa.isPending}
									>
										<CheckCircle2 className="h-4 w-4 mr-2" />
										Li e Entendi
									</Button>
								)}
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
								className="rounded-xl h-11 px-6 font-bold text-slate-500"
							>
								Fechar
							</Button>
							<Button
								type="submit"
								form="task-detail-form"
								disabled={updateTarefa.isPending}
								className="rounded-xl h-11 px-8 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider"
							>
								{updateTarefa.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Save className="h-4 w-4 mr-2" />
								)}
								Salvar Agora
							</Button>
						</div>
					</div>
				</CustomModalFooter>
			</Tabs>
		</CustomModal>
	);
}
