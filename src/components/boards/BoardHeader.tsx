import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ArrowLeft,
	Star,
	MoreHorizontal,
	Layout,
	List,
	Calendar,
	Pencil,
	Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Board } from "@/types/boards";

export type BoardView = "kanban" | "list" | "calendar";

interface BoardHeaderProps {
	board: Board;
	currentView: BoardView;
	onViewChange: (view: BoardView) => void;
	onRename: (name: string) => void;
	onStar: () => void;
	onArchive: () => void;
}

export function BoardHeader({
	board,
	currentView,
	onViewChange,
	onRename,
	onStar,
	onArchive,
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
		<div className="relative" style={{ ...bgStyle, minHeight: 110 }}>
			{/* Overlay */}
			<div className="absolute inset-0 bg-black/30" />

			{/* Content */}
			<div className="relative z-10 px-6 pt-4 pb-0 flex flex-col gap-3">
				{/* Top row */}
				<div className="flex items-center gap-3">
					<Button
						variant="ghost"
						size="icon"
						className="text-white/80 hover:text-white hover:bg-white/20"
						onClick={() => navigate("/boards")}
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>

					{isRenaming ? (
						<form onSubmit={handleRenameSubmit} className="flex-1">
							<Input
								className="bg-white/20 text-white placeholder:text-white/60 border-white/40 max-w-xs font-semibold"
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
						<h1
							className="text-white font-bold text-xl cursor-pointer hover:underline decoration-white/50 flex items-center gap-2"
							onClick={() => setIsRenaming(true)}
							title="Clique para renomear"
						>
							{board.icon && <span>{board.icon}</span>}
							{board.name}
						</h1>
					)}

					<Button
						variant="ghost"
						size="icon"
						className={cn(
							"text-white/80 hover:text-white hover:bg-white/20",
							board.is_starred && "text-yellow-300",
						)}
						onClick={onStar}
					>
						<Star
							className={cn("h-5 w-5", board.is_starred && "fill-yellow-300")}
						/>
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="text-white/80 hover:text-white hover:bg-white/20 ml-auto"
							>
								<MoreHorizontal className="h-5 w-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setIsRenaming(true)}>
								<Pencil className="h-4 w-4 mr-2" />
								Renomear Board
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive"
								onClick={onArchive}
							>
								<Archive className="h-4 w-4 mr-2" />
								Arquivar Board
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* View tabs */}
				<Tabs
					value={currentView}
					onValueChange={(v) => onViewChange(v as BoardView)}
				>
					<TabsList className="bg-white/20 border-0 h-8">
						<TabsTrigger
							value="kanban"
							className="text-white/80 data-[state=active]:bg-white/30 data-[state=active]:text-white h-7 px-3 text-xs gap-1.5"
						>
							<Layout className="h-3.5 w-3.5" />
							Quadro
						</TabsTrigger>
						<TabsTrigger
							value="list"
							className="text-white/80 data-[state=active]:bg-white/30 data-[state=active]:text-white h-7 px-3 text-xs gap-1.5"
						>
							<List className="h-3.5 w-3.5" />
							Lista
						</TabsTrigger>
						<TabsTrigger
							value="calendar"
							className="text-white/80 data-[state=active]:bg-white/30 data-[state=active]:text-white h-7 px-3 text-xs gap-1.5"
						>
							<Calendar className="h-3.5 w-3.5" />
							Calendário
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
		</div>
	);
}
