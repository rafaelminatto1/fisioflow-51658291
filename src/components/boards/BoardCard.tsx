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
			className="group relative overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
			style={{ minHeight: 212, ...bgStyle }}
			onClick={() => navigate(`/boards/${board.id}`)}
			role="button"
			aria-label={`Abrir board ${board.name}`}
		>
			<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.8))] transition-colors group-hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.86))]" />
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.26),transparent_35%)]" />

			<div className="absolute inset-0 flex flex-col justify-between p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-2">
						<Badge className="rounded-full border-0 bg-white/15 px-2.5 text-white backdrop-blur-sm hover:bg-white/15">
							<LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
							Board
						</Badge>
						<div className="flex items-start gap-3">
							{board.icon && (
								<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-xl backdrop-blur-sm">
									{board.icon}
								</div>
							)}
							<div className="min-w-0">
								<div className="line-clamp-2 text-base font-semibold leading-tight text-white">
									{board.name}
								</div>
								<div className="mt-2 line-clamp-2 text-sm text-white/74">
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
							className={cn("h-8 w-8 text-white hover:bg-white/15")}
							onClick={() => onStar(board.id, !board.is_starred)}
						>
							<Star
								className={cn(
									"h-4 w-4",
									board.is_starred && "fill-yellow-300 text-yellow-300",
								)}
							/>
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 text-white hover:bg-white/20"
								>
									<MoreHorizontal className="h-3.5 w-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								onClick={(e) => e.stopPropagation()}
							>
								<DropdownMenuItem
									onClick={() => navigate(`/boards/${board.id}`)}
								>
									<LayoutGrid className="mr-2 h-4 w-4" />
									Abrir Board
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive"
									onClick={() => onDelete(board.id)}
								>
									<Archive className="h-4 w-4 mr-2" />
									Arquivar
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center gap-2 text-xs text-white/78">
						<div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-sm">
							{board.task_count ?? 0} tarefa
							{Number(board.task_count ?? 0) !== 1 ? "s" : ""}
						</div>
						<div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-sm">
							Atualizado{" "}
							{formatDistanceToNow(new Date(board.updated_at), {
								addSuffix: true,
								locale: ptBR,
							})}
						</div>
					</div>

					<div className="flex items-center justify-between text-sm text-white">
						<div className="flex items-center gap-2 text-white/76">
							<Clock3 className="h-4 w-4" />
							<span>Abra para trabalhar no fluxo</span>
						</div>
						<div className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-950 opacity-90 transition-transform group-hover:translate-x-0.5">
							Entrar
							<ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
