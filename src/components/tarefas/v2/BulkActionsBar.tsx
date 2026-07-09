import { Archive, Trash2, X, Flag, UserRound, ArrowRightCircle } from "lucide-react";
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
  TarefaStatus,
  TarefaPrioridade,
  TeamMember,
  STATUS_LABELS,
  PRIORIDADE_LABELS,
} from "@/types/tarefas";

interface BulkActionsBarProps {
  count: number;
  teamMembers: TeamMember[];
  onSetStatus: (status: TarefaStatus) => void;
  onSetPrioridade: (prioridade: TarefaPrioridade) => void;
  onSetResponsavel: (userId: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}

const STATUSES: TarefaStatus[] = ["BACKLOG", "A_FAZER", "EM_PROGRESSO", "REVISAO", "CONCLUIDO"];
const PRIORIDADES: TarefaPrioridade[] = ["BAIXA", "MEDIA", "ALTA", "URGENTE"];

export function BulkActionsBar({
  count,
  teamMembers,
  onSetStatus,
  onSetPrioridade,
  onSetResponsavel,
  onArchive,
  onDelete,
  onClear,
}: BulkActionsBarProps) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-2 rounded-2xl border bg-background px-4 py-2 shadow-lg">
      <span className="text-sm font-bold pr-2 border-r">
        {count} selecionada{count > 1 ? "s" : ""}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowRightCircle className="h-4 w-4" />
            Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Mover para</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUSES.map((s) => (
            <DropdownMenuItem key={s} onClick={() => onSetStatus(s)}>
              {STATUS_LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Flag className="h-4 w-4" />
            Prioridade
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {PRIORIDADES.map((p) => (
            <DropdownMenuItem key={p} onClick={() => onSetPrioridade(p)}>
              {PRIORIDADE_LABELS[p]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {teamMembers.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <UserRound className="h-4 w-4" />
              Responsável
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[280px] overflow-y-auto">
            {teamMembers.map((m) => (
              <DropdownMenuItem key={m.id} onClick={() => onSetResponsavel(m.id)}>
                {m.full_name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Button variant="ghost" size="sm" className="gap-1.5" onClick={onArchive}>
        <Archive className="h-4 w-4" />
        Arquivar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-red-600 hover:text-red-700"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
