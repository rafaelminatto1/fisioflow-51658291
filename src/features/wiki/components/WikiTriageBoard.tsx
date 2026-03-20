import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	AlertTriangle,
	MoreVertical,
	Edit,
	ArrowLeft,
	Clock,
	ShieldCheck,
} from "lucide-react";
import type { WikiPage } from "@/types/wiki";
import type { TriageStatus } from "@/features/wiki/triage/triageUtils";

interface TriageColumnProps {
	droppableId: TriageStatus;
	title: string;
	pages: WikiPage[];
	onOpenPage: (page: WikiPage) => void;
	dragEnabled: boolean;
	onMoveStatus: (page: WikiPage, status: TriageStatus) => void;
	wipLimit: number;
}

function TriageColumn({
	droppableId,
	title,
	pages,
	onOpenPage,
	dragEnabled,
	onMoveStatus,
	wipLimit,
}: TriageColumnProps) {
	const isOverLimit = wipLimit < 999 && pages.length > wipLimit;

	return (
		<Card className={isOverLimit ? "border-amber-400 bg-amber-50/10" : ""}>
			<CardContent className="p-3">
				<div className="mb-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<h4
							className={`text-sm font-semibold ${isOverLimit ? "text-amber-700" : ""}`}
						>
							{title}
						</h4>
						{isOverLimit && (
							<AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
						)}
					</div>
					<Badge variant={isOverLimit ? "destructive" : "secondary"}>
						{pages.length} {wipLimit < 999 && `/ ${wipLimit}`}
					</Badge>
				</div>

				{isOverLimit && (
					<p className="mb-2 text-[10px] text-amber-600 font-medium">
						Limite WIP excedido ({pages.length}/{wipLimit})
					</p>
				)}

				<Droppable droppableId={droppableId} isDropDisabled={!dragEnabled}>
					{(provided, snapshot) => (
						<div
							ref={provided.innerRef}
							{...provided.droppableProps}
							className={`min-h-[140px] space-y-2 rounded-md p-1 transition-colors ${
								snapshot.isDraggingOver ? "bg-muted/60" : "bg-muted/20"
							}`}
						>
							{pages.map((page, index) => (
								<Draggable
									key={page.id}
									draggableId={page.id}
									index={index}
									isDragDisabled={!dragEnabled}
								>
									{(dragProvided, dragSnapshot) => (
										<div
											ref={dragProvided.innerRef}
											{...dragProvided.draggableProps}
											{...dragProvided.dragHandleProps}
											className={`group relative w-full rounded-md border bg-background p-3 text-left shadow-sm transition ${
												dragSnapshot.isDragging
													? "ring-2 ring-primary/50"
													: "hover:border-primary/40"
											}`}
										>
											<div className="flex items-start justify-between gap-2">
												<button
													type="button"
													className="flex-1 text-left"
													onClick={() => onOpenPage(page)}
												>
													<p className="line-clamp-2 text-sm font-medium group-hover:text-primary transition-colors">
														{page.title}
													</p>
												</button>

												<div className="flex items-center gap-1">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
															>
																<MoreVertical className="h-3 w-3" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() => onOpenPage(page)}
															>
																<Edit className="mr-2 h-3 w-3" />
																Abrir página
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">
																Mover para
															</DropdownMenuLabel>
															<DropdownMenuItem
																disabled={droppableId === "backlog"}
																onClick={() => onMoveStatus(page, "backlog")}
															>
																<ArrowLeft className="mr-2 h-3 w-3" />
																Backlog
															</DropdownMenuItem>
															<DropdownMenuItem
																disabled={droppableId === "in-progress"}
																onClick={() =>
																	onMoveStatus(page, "in-progress")
																}
															>
																<Clock className="mr-2 h-3 w-3" />
																Em execução
															</DropdownMenuItem>
															<DropdownMenuItem
																disabled={droppableId === "done"}
																onClick={() => onMoveStatus(page, "done")}
															>
																<ShieldCheck className="mr-2 h-3 w-3" />
																Concluído
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>

											<div className="mt-2 flex items-center justify-between">
												<div className="flex flex-wrap gap-1">
													{page.tags
														.filter((tag) => !tag.startsWith("triage-"))
														.slice(0, 2)
														.map((tag) => (
															<Badge
																key={`${page.id}-${tag}`}
																variant="secondary"
																className="text-[10px] py-0 h-4"
															>
																{tag}
															</Badge>
														))}
												</div>
												<span className="text-[9px] text-muted-foreground opacity-60">
													{page.template_id?.split("-")[0] || "manual"}
												</span>
											</div>
										</div>
									)}
								</Draggable>
							))}
							{provided.placeholder}
						</div>
					)}
				</Droppable>
			</CardContent>
		</Card>
	);
}

interface WikiTriageBoardProps {
	triageBuckets: Record<TriageStatus, WikiPage[]>;
	onDragEnd: (result: any) => void;
	onOpenPage: (page: WikiPage) => void;
	onMoveStatus: (page: WikiPage, status: TriageStatus) => void;
	dragEnabled: boolean;
	wipLimits: Record<TriageStatus, number>;
}

export function WikiTriageBoard({
	triageBuckets,
	onDragEnd,
	onOpenPage,
	onMoveStatus,
	dragEnabled,
	wipLimits,
}: WikiTriageBoardProps) {
	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<div className="grid gap-3 md:grid-cols-3">
				<TriageColumn
					droppableId="backlog"
					title="Backlog"
					pages={triageBuckets.backlog}
					onOpenPage={onOpenPage}
					dragEnabled={dragEnabled}
					onMoveStatus={onMoveStatus}
					wipLimit={wipLimits.backlog}
				/>
				<TriageColumn
					droppableId="in-progress"
					title="Em execução"
					pages={triageBuckets["in-progress"]}
					onOpenPage={onOpenPage}
					dragEnabled={dragEnabled}
					onMoveStatus={onMoveStatus}
					wipLimit={wipLimits["in-progress"]}
				/>
				<TriageColumn
					droppableId="done"
					title="Concluído"
					pages={triageBuckets.done}
					onOpenPage={onOpenPage}
					dragEnabled={dragEnabled}
					onMoveStatus={onMoveStatus}
					wipLimit={wipLimits.done}
				/>
			</div>
		</DragDropContext>
	);
}
