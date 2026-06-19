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
import { AlertTriangle, MoreVertical, Edit, ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <Card className={cn(
      "bg-slate-50/50 border-slate-200/60 rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]",
      isOverLimit && "border-orange-400 bg-orange-50/10"
    )}>
      <CardContent className="p-4 flex flex-col h-full">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "text-xs font-bold uppercase tracking-widest text-slate-500",
              isOverLimit && "text-orange-700"
            )}>
              {title}
            </h4>
            {isOverLimit && <AlertTriangle className="h-4 w-4 text-orange-500 animate-pulse" />}
          </div>
          <Badge 
            variant={isOverLimit ? "destructive" : "secondary"}
            className={cn(
              "rounded-lg font-bold px-2 py-0.5",
              !isOverLimit && "bg-white text-slate-600 border-slate-200"
            )}
          >
            {pages.length} {wipLimit < 999 && `/ ${wipLimit}`}
          </Badge>
        </div>

        {isOverLimit && (
          <p className="mb-3 text-[10px] text-orange-600 font-bold uppercase tracking-wide">
            Limite WIP excedido
          </p>
        )}

        <Droppable droppableId={droppableId} isDropDisabled={!dragEnabled}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "flex-1 space-y-3 rounded-lg p-1 transition-all duration-200",
                snapshot.isDraggingOver ? "bg-blue-50/50" : "bg-transparent"
              )}
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
                      className={cn(
                        "group relative w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all duration-200",
                        dragSnapshot.isDragging
                          ? "ring-2 ring-blue-500/50 shadow-lg scale-[1.02] z-50"
                          : "hover:border-blue-400/40 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="flex-1 text-left"
                          onClick={() => onOpenPage(page)}
                        >
                          <p className="line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-display">
                            {page.title}
                          </p>
                        </button>

                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100"
                              >
                                <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-lg">
                              <DropdownMenuItem 
                                className="rounded-lg focus:bg-blue-50 focus:text-blue-700"
                                onClick={() => onOpenPage(page)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Abrir página
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Mover para
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                className="rounded-lg focus:bg-slate-50"
                                disabled={droppableId === "backlog"}
                                onClick={() => onMoveStatus(page, "backlog")}
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Backlog
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-lg focus:bg-slate-50"
                                disabled={droppableId === "in-progress"}
                                onClick={() => onMoveStatus(page, "in-progress")}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Em execução
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-lg focus:bg-green-50 focus:text-green-700"
                                disabled={droppableId === "done"}
                                onClick={() => onMoveStatus(page, "done")}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Concluído
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50">
                        <div className="flex flex-wrap gap-1.5">
                          {(page.tags || [])
                            .filter((tag) => tag && !tag.startsWith("triage-"))
                            .slice(0, 2)
                            .map((tag) => (
                              <Badge
                                key={`${page.id}-${tag}`}
                                variant="secondary"
                                className="text-[9px] uppercase tracking-wider font-bold h-4.5 bg-slate-100 text-slate-500 border-transparent rounded-md"
                              >
                                #{tag}
                              </Badge>
                            ))}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tight text-slate-300">
                          {typeof page.template_id === "string"
                            ? page.template_id.split("-")[0]
                            : "manual"}
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
