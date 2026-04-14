import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { boardLabelsApi } from "@/api/v2";
import type { BoardLabel } from "@/types/boards";
import { LABEL_PRESET_COLORS } from "@/types/boards";

interface BoardLabelManagerProps {
	boardId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface LabelFormState {
	name: string;
	color: string;
	description: string;
}

const DEFAULT_FORM: LabelFormState = {
	name: "",
	color: LABEL_PRESET_COLORS[4].value, // Azul fisio
	description: "",
};

export function BoardLabelManager({
	boardId,
	open,
	onOpenChange,
}: BoardLabelManagerProps) {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<LabelFormState>(DEFAULT_FORM);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [customColor, setCustomColor] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["boards", boardId, "labels"],
		queryFn: () => boardLabelsApi.list(boardId),
		enabled: open && !!boardId,
	});

	const labels: BoardLabel[] = (data?.data ?? []) as BoardLabel[];

	const createMutation = useMutation({
		mutationFn: (d: { name: string; color: string; description?: string }) =>
			boardLabelsApi.create(boardId, d),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["boards", boardId, "labels"] });
			setForm(DEFAULT_FORM);
			setEditingId(null);
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: Record<string, unknown>;
		}) => boardLabelsApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["boards", boardId, "labels"] });
			setForm(DEFAULT_FORM);
			setEditingId(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => boardLabelsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["boards", boardId, "labels"] });
			setDeleteId(null);
		},
	});

	const handleSubmit = () => {
		if (!form.name.trim()) return;
		if (editingId) {
			updateMutation.mutate({
				id: editingId,
				data: {
					name: form.name.trim(),
					color: form.color,
					description: form.description || null,
				},
			});
		} else {
			createMutation.mutate({
				name: form.name.trim(),
				color: form.color,
				description: form.description || undefined,
			});
		}
	};

	const handleEdit = (label: BoardLabel) => {
		setEditingId(label.id);
		setForm({
			name: label.name,
			color: label.color,
			description: label.description ?? "",
		});
	};

	const handleCancel = () => {
		setEditingId(null);
		setForm(DEFAULT_FORM);
	};

	const handleColorPick = (color: string) => {
		setForm((prev) => ({ ...prev, color }));
		setCustomColor("");
	};

	const handleCustomColor = (v: string) => {
		setCustomColor(v);
		if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
			setForm((prev) => ({ ...prev, color: v }));
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Tag className="h-4 w-4" />
							Gerenciar Etiquetas
						</DialogTitle>
					</DialogHeader>

					{/* Form */}
					<div className="space-y-3 border rounded-xl p-4 bg-muted/30">
						<p className="text-sm font-medium">
							{editingId ? "Editar etiqueta" : "Nova etiqueta"}
						</p>

						<Input
							placeholder="Nome da etiqueta (ex: Urgente, Revisão, Compra...)"
							value={form.name}
							onChange={(e) =>
								setForm((prev) => ({ ...prev, name: e.target.value }))
							}
							onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
						/>

						{/* Preview */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground">Preview:</span>
							<Badge
								className="text-xs"
								style={{
									backgroundColor: form.color + "33",
									color: form.color,
									borderColor: form.color + "55",
								}}
							>
								{form.name || "Etiqueta"}
							</Badge>
						</div>

						{/* Color presets */}
						<div>
							<p className="text-xs text-muted-foreground mb-2">Cor</p>
							<div className="flex flex-wrap gap-2">
								{LABEL_PRESET_COLORS.map((preset) => (
									<button
										key={preset.value}
										type="button"
										title={preset.label}
										onClick={() => handleColorPick(preset.value)}
										className={cn(
											"w-7 h-7 rounded-full border-2 transition-all",
											form.color === preset.value
												? "border-foreground scale-110"
												: "border-transparent hover:scale-105",
										)}
										style={{ backgroundColor: preset.value }}
									>
										{form.color === preset.value && (
											<Check className="h-3 w-3 mx-auto text-white drop-shadow" />
										)}
									</button>
								))}

								{/* Custom hex input */}
								<div className="flex items-center gap-1.5">
									<div
										className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-[10px] text-muted-foreground cursor-pointer"
										title="Cor customizada"
									>
										#
									</div>
									<Input
										placeholder="#3B82F6"
										value={customColor}
										onChange={(e) => handleCustomColor(e.target.value)}
										className="h-7 w-24 text-xs px-2"
									/>
								</div>
							</div>
						</div>

						<div className="flex justify-end gap-2 pt-1">
							{editingId && (
								<Button variant="ghost" size="sm" onClick={handleCancel}>
									Cancelar
								</Button>
							)}
							<Button
								size="sm"
								onClick={handleSubmit}
								disabled={!form.name.trim() || isPending}
							>
								<Plus className="h-3.5 w-3.5 mr-1" />
								{editingId ? "Salvar" : "Criar etiqueta"}
							</Button>
						</div>
					</div>

					{/* Labels list */}
					<div className="space-y-2 max-h-64 overflow-y-auto">
						{isLoading && (
							<p className="text-sm text-muted-foreground text-center py-4">
								Carregando...
							</p>
						)}
						{!isLoading && labels.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-4">
								Nenhuma etiqueta criada ainda.
							</p>
						)}
						{labels.map((label) => (
							<div
								key={label.id}
								className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 bg-background"
							>
								<div className="flex items-center gap-2 min-w-0">
									<div
										className="w-4 h-4 rounded-full shrink-0"
										style={{ backgroundColor: label.color }}
									/>
									<span className="text-sm font-medium truncate">
										{label.name}
									</span>
									{label.description && (
										<span className="text-xs text-muted-foreground truncate hidden sm:block">
											— {label.description}
										</span>
									)}
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7"
										onClick={() => handleEdit(label)}
									>
										<Pencil className="h-3.5 w-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 text-destructive hover:text-destructive"
										onClick={() => setDeleteId(label.id)}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteId}
				onOpenChange={() => setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir etiqueta?</AlertDialogTitle>
						<AlertDialogDescription>
							A etiqueta será removida do board. Tarefas que a usam não serão
							afetadas, mas a cor não será mais exibida.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteId && deleteMutation.mutate(deleteId)}
							className="bg-destructive text-destructive-foreground"
						>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
