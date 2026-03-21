import { useState, useRef, useEffect, memo } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import {
	Plus,
	MoreHorizontal,
	Trash2,
	Pencil,
	AlertCircle,
	GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	KanbanCardV2,
	KanbanCardContent,
} from "@/components/tarefas/v2/KanbanCardV2";
import type { BoardColumn } from "@/types/boards";
import type { Tarefa } from "@/types/tarefas";

interface KanbanColumnFullProps {
	column: BoardColumn;
	index: number;
	tarefas: Tarefa[];
	onAddTask: (columnId: string) => void;
	onEditTask: (tarefa: Tarefa) => void;
	onViewTask: (tarefa: Tarefa) => void;
	onDeleteTask: (id: string) => void;
	onRenameColumn: (id: string, name: string) => void;
	onDeleteColumn: (id: string) => void;
	onUpdateColumnWip: (id: string, wipLimit: number | null) => void;
}

export const KanbanColumnFull = memo(function KanbanColumnFull({
	column,
	index,
	tarefas,
	onAddTask,
	onEditTask,
	onViewTask,
	onDeleteTask,
	onRenameColumn,
	onDeleteColumn,
	onUpdateColumnWip,
}: KanbanColumnFullProps) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(column.name);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [wipInput, setWipInput] = useState(String(column.wip_limit ?? ""));
	const [wipEditOpen, setWipEditOpen] = useState(false);
	const renameRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isRenaming) renameRef.current?.focus();
	}, [isRenaming]);

	const isOverWip = !!column.wip_limit && tarefas.length > column.wip_limit;
	const isAtWip = !!column.wip_limit && tarefas.length === column.wip_limit;

	const handleRenameSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		const trimmed = renameValue.trim();
		if (trimmed && trimmed !== column.name) {
			onRenameColumn(column.id, trimmed);
		} else {
			setRenameValue(column.name);
		}
		setIsRenaming(false);
	};

	const handleWipSave = () => {
		const val = wipInput.trim();
		const num = val === "" ? null : Number(val);
		if (val !== "" && (!Number.isInteger(num) || num! < 1)) return;
		onUpdateColumnWip(column.id, num);
		setWipEditOpen(false);
	};

	return (
		<>
			<Draggable draggableId={`col-${column.id}`} index={index}>
				{(colProvided, colSnapshot) => (
					<div
						ref={colProvided.innerRef}
						{...colProvided.draggableProps}
						className={cn(
							"flex w-[320px] min-w-[320px] flex-col rounded-[24px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,250,252,0.9))] shadow-sm transition-all duration-200",
							isOverWip && "ring-2 ring-red-500/50",
							colSnapshot.isDragging && "shadow-2xl opacity-90",
						)}
					>
						{/* Column Header */}
						<div
							className="flex items-center gap-2 rounded-t-[24px] p-3"
							style={{ backgroundColor: column.color ?? "#E2E8F0" }}
						>
							{/* Drag handle */}
							<div
								{...colProvided.dragHandleProps}
								className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground"
							>
								<GripVertical className="h-4 w-4" />
							</div>

							{/* Column name (click to rename) */}
							{isRenaming ? (
								<form onSubmit={handleRenameSubmit} className="flex-1">
									<input
										ref={renameRef}
										className="w-full bg-white/80 rounded px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
										value={renameValue}
										onChange={(e) => setRenameValue(e.target.value)}
										onBlur={handleRenameSubmit}
										onKeyDown={(e) => {
											if (e.key === "Escape") {
												setRenameValue(column.name);
												setIsRenaming(false);
											}
										}}
									/>
								</form>
							) : (
								<h3
									className="flex-1 font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors"
									onClick={() => setIsRenaming(true)}
									title="Clique para renomear"
								>
									{column.name}
								</h3>
							)}

							{/* WIP badge */}
							<Tooltip>
								<TooltipTrigger>
									<Badge
										variant="secondary"
										className={cn(
											"text-xs px-2 py-0.5 rounded-full",
											isOverWip && "bg-red-500/20 text-red-700",
											isAtWip &&
												!isOverWip &&
												"bg-yellow-500/20 text-yellow-700",
										)}
									>
										{tarefas.length}
										{column.wip_limit ? `/${column.wip_limit}` : ""}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									{isOverWip
										? `Limite WIP excedido! (${tarefas.length}/${column.wip_limit})`
										: isAtWip
											? "Limite WIP atingido"
											: `${tarefas.length} tarefa(s)`}
								</TooltipContent>
							</Tooltip>
							{isOverWip && (
								<AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
							)}

							{/* Actions */}
							<div className="flex items-center gap-0.5 flex-shrink-0">
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6"
									onClick={() => onAddTask(column.id)}
								>
									<Plus className="h-3.5 w-3.5" />
								</Button>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="h-6 w-6">
											<MoreHorizontal className="h-3.5 w-3.5" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-44">
										<DropdownMenuItem onClick={() => setIsRenaming(true)}>
											<Pencil className="h-4 w-4 mr-2" />
											Renomear
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => {
												setWipInput(String(column.wip_limit ?? ""));
												setWipEditOpen(true);
											}}
										>
											<AlertCircle className="h-4 w-4 mr-2" />
											Limite WIP
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="text-destructive"
											onClick={() => setDeleteConfirmOpen(true)}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Deletar Coluna
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/* WIP Edit inline */}
						{wipEditOpen && (
							<div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
								<span className="text-xs text-muted-foreground flex-1">
									Limite WIP (vazio = sem limite):
								</span>
								<Input
									className="h-7 w-16 text-xs"
									type="number"
									min={1}
									value={wipInput}
									onChange={(e) => setWipInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleWipSave();
										if (e.key === "Escape") setWipEditOpen(false);
									}}
									autoFocus
								/>
								<Button
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={handleWipSave}
								>
									OK
								</Button>
							</div>
						)}

						{/* Droppable task area */}
						<Droppable
							droppableId={column.id}
							type="TASK"
							getContainerForClone={() => document.body}
							renderClone={(provided, _snapshot, rubric) => {
								const tarefa = tarefas.find((t) => t.id === rubric.draggableId);
								if (!tarefa) return null;
								return (
									<div
										ref={provided.innerRef}
										{...provided.draggableProps}
										style={provided.draggableProps.style}
										className="rounded-xl shadow-2xl border-2 border-primary bg-card opacity-95 cursor-grabbing ring-2 ring-primary/20 overflow-hidden w-[264px]"
									>
										<KanbanCardContent tarefa={tarefa} variant="ghost" />
									</div>
								);
							}}
						>
							{(provided, snapshot) => (
								<ScrollArea className="h-[calc(100vh-420px)] flex-1">
									<div
										ref={provided.innerRef}
										{...provided.droppableProps}
										className={cn(
											"min-h-[200px] space-y-3 p-3 transition-colors duration-200",
											snapshot.isDraggingOver && "bg-primary/5",
										)}
									>
										{tarefas.map((tarefa, idx) => (
											<KanbanCardV2
												key={tarefa.id}
												tarefa={tarefa}
												index={idx}
												onEdit={onEditTask}
												onView={onViewTask}
												onDelete={onDeleteTask}
											/>
										))}
										{provided.placeholder}
										{tarefas.length === 0 && !snapshot.isDraggingOver && (
											<div
												className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-xl cursor-pointer hover:border-primary/30 hover:bg-muted/50 transition-colors"
												onClick={() => onAddTask(column.id)}
											>
												<Plus className="h-7 w-7 text-muted-foreground/40 mb-2" />
												<p className="text-xs text-muted-foreground">
													Adicionar tarefa
												</p>
											</div>
										)}
										{tarefas.length === 0 && snapshot.isDraggingOver && (
											<div className="h-20 border-2 border-dashed border-primary/50 rounded-xl bg-primary/5 flex items-center justify-center">
												<p className="text-sm text-primary">Solte aqui</p>
											</div>
										)}
									</div>
								</ScrollArea>
							)}
						</Droppable>

						{/* Quick add bottom */}
						<div className="p-2 pt-0">
							<Button
								variant="ghost"
								className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
								onClick={() => onAddTask(column.id)}
							>
								<Plus className="h-3.5 w-3.5 mr-1.5" />
								Adicionar tarefa
							</Button>
						</div>
					</div>
				)}
			</Draggable>

			{/* Delete confirm */}
			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Deletar coluna "{column.name}"?</AlertDialogTitle>
						<AlertDialogDescription>
							As tarefas desta coluna não serão apagadas, mas perderão a
							associação com a coluna.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground"
							onClick={() => {
								onDeleteColumn(column.id);
								setDeleteConfirmOpen(false);
							}}
						>
							Deletar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
});
