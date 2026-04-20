import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BOARD_PRESET_COLORS } from "@/types/boards";

const BOARD_ICONS = [
	"📋",
	"🏥",
	"📢",
	"🔬",
	"🎯",
	"💼",
	"🚀",
	"⚡",
	"🌟",
	"🎨",
];

interface CreateBoardModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: {
		name: string;
		description?: string;
		background_color: string;
		icon: string;
	}) => void;
	isLoading?: boolean;
}

export function CreateBoardModal({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: CreateBoardModalProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [selectedColor, setSelectedColor] = useState(
		BOARD_PRESET_COLORS[0].value,
	);
	const [selectedIcon, setSelectedIcon] = useState(BOARD_ICONS[0]);

	useEffect(() => {
		if (open) return;

		setName("");
		setDescription("");
		setSelectedColor(BOARD_PRESET_COLORS[0].value);
		setSelectedIcon(BOARD_ICONS[0]);
	}, [open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		onSubmit({
			name: name.trim(),
			description: description.trim() || undefined,
			background_color: selectedColor,
			icon: selectedIcon,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Plus className="h-5 w-5" />
						Criar Board
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Preview */}
					<div
						className="h-24 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-inner transition-colors"
						style={{ backgroundColor: selectedColor }}
					>
						<span className="mr-2 text-2xl">{selectedIcon}</span>
						<span className="drop-shadow">{name || "Nome do Board"}</span>
					</div>

					{/* Name */}
					<div className="space-y-1">
						<Label htmlFor="board-name">Nome do Board *</Label>
						<Input
							id="board-name"
							placeholder="Ex: Clínica Geral, Marketing, Sprint..."
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
							required
						/>
					</div>

					{/* Description */}
					<div className="space-y-1">
						<Label htmlFor="board-desc">Descrição (opcional)</Label>
						<Textarea
							id="board-desc"
							placeholder="Descreva o propósito deste board..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
						/>
					</div>

					{/* Icon selection */}
					<div className="space-y-1">
						<Label>Ícone</Label>
						<div className="flex flex-wrap gap-2">
							{BOARD_ICONS.map((icon) => (
								<button
									key={icon}
									type="button"
									className={cn(
										"text-xl p-1.5 rounded-lg border-2 transition-all hover:scale-110",
										selectedIcon === icon
											? "border-primary bg-primary/10"
											: "border-transparent hover:border-muted-foreground/30",
									)}
									onClick={() => setSelectedIcon(icon)}
								>
									{icon}
								</button>
							))}
						</div>
					</div>

					{/* Color selection */}
					<div className="space-y-1">
						<Label>Cor de Fundo</Label>
						<div className="flex flex-wrap gap-2">
							{BOARD_PRESET_COLORS.map((color) => (
								<button
									key={color.value}
									type="button"
									className={cn(
										"h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
										selectedColor === color.value
											? "border-foreground scale-110 shadow-md"
											: "border-transparent",
									)}
									style={{ backgroundColor: color.value }}
									title={color.label}
									onClick={() => setSelectedColor(color.value)}
								/>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={!name.trim() || isLoading}>
							{isLoading ? "Criando..." : "Criar Board"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
