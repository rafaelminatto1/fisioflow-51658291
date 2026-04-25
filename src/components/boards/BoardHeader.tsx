import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Star,
  MoreHorizontal,
  Layout,
  List,
  Calendar,
  Pencil,
  Archive,
  Clock3,
  Menu,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Board } from "@/types/boards";

export type BoardView = "kanban" | "list" | "calendar";

interface BoardHeaderProps {
  board: Board;
  currentView: BoardView;
  onViewChange: (view: BoardView) => void;
  onRename: (name: string) => void;
  onStar: () => void;
  onArchive: () => void;
  onRefresh?: () => void;
  onOpenSidebar?: () => void;
  stats?: {
    taskCount: number;
    columnCount: number;
    completedCount: number;
    overdueCount: number;
  };
}

export function BoardHeader({
  board,
  currentView,
  onViewChange,
  onRename,
  onStar,
  onArchive,
  onRefresh,
  onOpenSidebar,
  stats,
}: BoardHeaderProps) {
  const navigate = useNavigate();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(board.name);

  const bgStyle = board.background_image
    ? {
        backgroundImage: `url(${board.background_image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: board.background_color ?? "#0079BF" };

  const handleRenameSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== board.name) onRename(trimmed);
    else setRenameValue(board.name);
    setIsRenaming(false);
  };

  return (
    <div
      className="relative overflow-hidden border-b border-border/60"
      style={{ ...bgStyle, minHeight: 196 }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(15,23,42,0.68),rgba(15,23,42,0.82))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_32%)]" />

      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:bg-white/15 hover:text-white"
            onClick={() => navigate("/boards")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Badge
            variant="secondary"
            className="rounded-full border-0 bg-white/12 px-3 py-1 text-white/85"
          >
            Boards
          </Badge>
          <Badge
            variant="secondary"
            className="rounded-full border-0 bg-white/12 px-3 py-1 text-white/85"
          >
            <Clock3 className="mr-1.5 h-3.5 w-3.5" />
            Atualizado{" "}
            {formatDistanceToNow(new Date(board.updated_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            {onOpenSidebar && (
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/15 bg-white/10 text-white hover:bg-white/15 lg:hidden"
                onClick={onOpenSidebar}
              >
                <Menu className="mr-2 h-4 w-4" />
                Resumo
              </Button>
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:bg-white/15 hover:text-white"
                onClick={onRefresh}
                title="Atualizar board"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "text-white/80 hover:bg-white/15 hover:text-white",
                board.is_starred && "text-yellow-300",
              )}
              onClick={onStar}
            >
              <Star className={cn("h-5 w-5", board.is_starred && "fill-yellow-300")} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:bg-white/15 hover:text-white"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Renomear Board
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar Board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            {isRenaming ? (
              <form onSubmit={handleRenameSubmit} className="max-w-xl">
                <Input
                  className="h-12 border-white/20 bg-white/14 text-lg font-semibold text-white placeholder:text-white/60"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setRenameValue(board.name);
                      setIsRenaming(false);
                    }
                  }}
                  autoFocus
                />
              </form>
            ) : (
              <div className="space-y-2">
                <h1
                  className="flex cursor-pointer items-center gap-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
                  onClick={() => setIsRenaming(true)}
                  title="Clique para renomear"
                >
                  {board.icon && (
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-2xl">
                      {board.icon}
                    </span>
                  )}
                  <span>{board.name}</span>
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-white/78 sm:text-base">
                  {board.description ||
                    "Coordene o trabalho por fluxo visual, acompanhe prazos e mantenha o time alinhado sem perder contexto."}
                </p>
              </div>
            )}
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-white/65">Tarefas</div>
                <div className="mt-2 text-2xl font-semibold text-white">{stats.taskCount}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-white/65">Colunas</div>
                <div className="mt-2 text-2xl font-semibold text-white">{stats.columnCount}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.16em] text-white/65">Concluídas</div>
                <div className="mt-2 text-2xl font-semibold text-white">{stats.completedCount}</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-white/65">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Risco
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">{stats.overdueCount}</div>
              </div>
            </div>
          )}
        </div>

        <Tabs value={currentView} onValueChange={(value) => onViewChange(value as BoardView)}>
          <TabsList className="h-auto flex-wrap rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm">
            <TabsTrigger
              value="kanban"
              className="gap-2 rounded-xl px-4 py-2 text-white/78 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              <Layout className="h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="gap-2 rounded-xl px-4 py-2 text-white/78 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="gap-2 rounded-xl px-4 py-2 text-white/78 data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
