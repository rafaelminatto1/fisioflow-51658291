import { Star, MoreHorizontal, Layout, Trash2, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
			className="group relative rounded-xl overflow-hidden cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
			style={{ height: 100, ...bgStyle }}
			onClick={() => navigate(`/boards/${board.id}`)}
			role="button"
			aria-label={`Abrir board ${board.name}`}
		>
			{/* Overlay */}
			<div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />

			{/* Content */}
			<div className="absolute inset-0 p-3 flex flex-col justify-between">
				<div className="flex items-start justify-between">
					<span className="font-semibold text-white text-sm leading-tight drop-shadow line-clamp-2">
						{board.icon && <span className="mr-1">{board.icon}</span>}
						{board.name}
					</span>

					{/* Actions (visible on hover) */}
					<div
						className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={(e) => e.stopPropagation()}
					>
						<Button
							variant="ghost"
							size="icon"
							className={cn(
								"h-6 w-6 text-white hover:bg-white/20",
								board.is_starred && "opacity-100",
							)}
							onClick={() => onStar(board.id, !board.is_starred)}
						>
							<Star
								className={cn(
									"h-3.5 w-3.5",
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
									<Layout className="h-4 w-4 mr-2" />
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

				{/* Task count */}
				<div className="flex items-center gap-1">
					<span className="text-white/80 text-xs drop-shadow">
						{board.task_count ?? 0} tarefa
						{Number(board.task_count ?? 0) !== 1 ? "s" : ""}
					</span>
				</div>
			</div>
		</div>
	);
}
