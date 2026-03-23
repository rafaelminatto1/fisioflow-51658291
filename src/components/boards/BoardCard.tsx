import { ArrowUpRight, Clock3, LayoutGrid, MoreHorizontal, Star, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Board } from "@/types/boards";

interface BoardCardProps {
	board: Board;
	onStar: (id: string, starred: boolean) => void;
	onDelete: (id: string) => void;
}

export function BoardCard({ board, onStar, onDelete }: BoardCardProps) {
	const navigate = useNavigate();

	const bgStyle = board.background_image
		? {
				backgroundImage: `url(${board.background_image})`,
				backgroundSize: "cover",
				backgroundPosition: "center",
			}
		: { backgroundColor: board.background_color ?? "#0079BF" };

	return (
		<div
			className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card shadow-premium-sm transition-all hover:-translate-y-1.5 hover:shadow-premium-lg"
			style={{ minHeight: 220, ...bgStyle }}
			onClick={() => navigate(`/boards/${board.id}`)}
			role="button"
			aria-label={`Abrir board ${board.name}`}
		>
			<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.15),rgba(15,23,42,0.85))] transition-colors group-hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.05),rgba(15,23,42,0.9))]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_40%)]" />

			<div className="absolute inset-0 flex flex-col justify-between p-5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-3">
						<Badge className="rounded-full border-0 bg-white/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md hover:bg-white/20 transition-colors">
							<LayoutGrid className="mr-1.5 h-3 w-3" />
							Board
						</Badge>
						<div className="flex items-start gap-3">
							{board.icon && (
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl backdrop-blur-md border border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-500">
									{board.icon}
								</div>
							)}
							<div className="min-w-0">
								<div className="line-clamp-2 text-lg font-black leading-tight text-white tracking-tight">
									{board.name}
								</div>
								<div className="mt-2 line-clamp-2 text-xs font-medium text-white/60 leading-relaxed">
									{board.description ||
										"Fluxo visual para priorizar, acompanhar e concluir o trabalho do time."}
								</div>
							</div>
						</div>
					</div>

					<div
						className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
						onClick={(e) => e.stopPropagation()}
					>
						<Button
							variant="ghost"
							size="icon"
							className={cn("h-9 w-9 text-white rounded-full hover:bg-white/10")}
							onClick={() => onStar(board.id, !board.is_starred)}
						>
							<Star
								className={cn(
									"h-4 w-4 transition-all",
									board.is_starred && "fill-amber-400 text-amber-400 scale-110",
								)}
							/>
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 text-white/60 hover:bg-white/10 rounded-full hover:text-white transition-colors"
								>
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								className="rounded-2xl border-border/40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-2 shadow-premium-lg"
								onClick={(e) => e.stopPropagation()}
							>
								<DropdownMenuItem
									className="rounded-xl px-4 py-2 font-bold text-xs uppercase tracking-wider gap-3"
									onClick={() => navigate(`/boards/${board.id}`)}
								>
									<LayoutGrid className="h-4 w-4 text-primary" />
									Abrir Board
								</DropdownMenuItem>
								<DropdownMenuSeparator className="my-1 opacity-50" />
								<DropdownMenuItem
									className="rounded-xl px-4 py-2 font-bold text-xs uppercase tracking-wider gap-3 text-destructive focus:text-destructive focus:bg-destructive/5"
									onClick={() => onDelete(board.id)}
								>
									<Archive className="h-4 w-4" />
									Arquivar
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<div className="rounded-full border border-white/5 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/80 backdrop-blur-md">
							{board.task_count ?? 0} tarefa{Number(board.task_count ?? 0) !== 1 ? "s" : ""}
						</div>
						<div className="rounded-full border border-white/5 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/80 backdrop-blur-md">
							{formatDistanceToNow(new Date(board.updated_at), {
								addSuffix: true,
								locale: ptBR,
							})}
						</div>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-white/50 group-hover:text-white/80 transition-colors">
							<Clock3 className="h-3.5 w-3.5" />
							<span>Trabalhar no fluxo</span>
						</div>
						<div className="rounded-full bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-950 shadow-premium-sm transition-all group-hover:scale-105 active:scale-95">
							Entrar
							<ArrowUpRight className="ml-1.5 inline h-3 w-3" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
