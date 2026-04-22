import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	ChevronDown,
	ChevronUp,
	Minus,
	Plus,
	Trash2,
	Copy,
	Check,
} from "lucide-react";
import { COLOR_OPTIONS } from "@/types/appointment-types";
import { cn } from "@/lib/utils";
import type { AppointmentType } from "@/types/appointment-types";

interface AppointmentTypeCardProps {
	type: AppointmentType;
	isExpanded: boolean;
	onToggleExpand: () => void;
	onUpdate: (data: Partial<AppointmentType>) => void;
	onRemove: () => void;
	onDuplicate: () => void;
	onToggleActive: () => void;
}

function BufferBadge({
	before,
	after,
}: {
	before: number;
	after: number;
}) {
	if (before === 0 && after === 0) return null;
	return (
		<span className="text-xs text-muted-foreground">
			Buffer {before}+{after} min
		</span>
	);
}

export function AppointmentTypeCard({
	type,
	isExpanded,
	onToggleExpand,
	onUpdate,
	onRemove,
	onDuplicate,
	onToggleActive,
}: AppointmentTypeCardProps) {
	return (
		<div
			className={cn(
				"rounded-lg border overflow-hidden transition-all shadow-sm",
				!type.isActive && "opacity-60",
			)}
		>
			<button
				type="button"
				className={cn(
					"w-full p-4 flex items-center justify-between cursor-pointer transition-colors text-left",
					isExpanded
						? "bg-slate-50 dark:bg-slate-900/50 border-b"
						: "bg-card hover:bg-muted/30",
				)}
				onClick={onToggleExpand}
				aria-expanded={isExpanded}
			>
				<div className="flex items-center gap-3">
					<div
						className="w-4 h-4 rounded-full shrink-0"
						style={{ backgroundColor: type.color }}
					/>
					<span className="text-sm font-medium">{type.name}</span>
				</div>
				<span className="flex items-center gap-3">
					<span className="px-2 py-1 bg-muted text-foreground rounded text-xs font-mono uppercase">
						{type.durationMinutes} min
					</span>
					<span className="hidden sm:inline">
						<BufferBadge
							before={type.bufferBeforeMinutes}
							after={type.bufferAfterMinutes}
						/>
					</span>
					<Switch
						checked={type.isActive}
						onCheckedChange={onToggleActive}
						onClick={(e) => e.stopPropagation()}
						className="hidden sm:flex"
					/>
					{isExpanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</span>
			</button>

			{isExpanded && (
				<div className="p-4 bg-card space-y-4">
					<div className="col-span-2">
						<Label className="text-xs text-muted-foreground uppercase tracking-wider">
							Nome do Atendimento
						</Label>
						<Input
							value={type.name}
							onChange={(e) => onUpdate({ name: e.target.value })}
							className="mt-1"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label className="text-xs text-muted-foreground uppercase tracking-wider">
								Duração (min)
							</Label>
							<div className="flex items-center gap-3 mt-1 border rounded-lg p-2">
								<input
									type="range"
									min={15}
									max={120}
									step={5}
									value={type.durationMinutes}
									onChange={(e) =>
										onUpdate({
											durationMinutes: parseInt(e.target.value, 10),
										})
									}
									className="flex-1 accent-violet-500"
								/>
								<span className="font-mono text-sm w-10 text-center">
									{type.durationMinutes}
								</span>
							</div>
						</div>

						<div>
							<Label className="text-xs text-muted-foreground uppercase tracking-wider">
								Máximo por dia
							</Label>
							<div className="flex items-center border rounded-lg mt-1 h-[42px] overflow-hidden">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-full rounded-none px-3"
									onClick={() => {
										if (type.maxPerDay === null) onUpdate({ maxPerDay: 10 });
										else if (type.maxPerDay > 1)
											onUpdate({ maxPerDay: type.maxPerDay - 1 });
									}}
								>
									<Minus className="h-3 w-3" />
								</Button>
								<span className="flex-1 text-center text-sm font-medium">
									{type.maxPerDay === null ? "Ilimitado" : type.maxPerDay}
								</span>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-full rounded-none px-3"
									onClick={() =>
										onUpdate({
											maxPerDay:
												type.maxPerDay === null ? 1 : type.maxPerDay + 1,
										})
									}
								>
									<Plus className="h-3 w-3" />
								</Button>
							</div>
						</div>

						<div>
							<Label className="text-xs text-muted-foreground uppercase tracking-wider">
								Buffer Antes (min)
							</Label>
							<div className="flex items-center gap-3 mt-1 border rounded-lg p-2">
								<input
									type="range"
									min={0}
									max={30}
									step={5}
									value={type.bufferBeforeMinutes}
									onChange={(e) =>
										onUpdate({
											bufferBeforeMinutes: parseInt(e.target.value, 10),
										})
									}
									className="flex-1 accent-violet-500"
								/>
								<span className="font-mono text-sm w-8 text-center">
									{type.bufferBeforeMinutes}
								</span>
							</div>
						</div>

						<div>
							<Label className="text-xs text-muted-foreground uppercase tracking-wider">
								Buffer Depois (min)
							</Label>
							<div className="flex items-center gap-3 mt-1 border rounded-lg p-2">
								<input
									type="range"
									min={0}
									max={30}
									step={5}
									value={type.bufferAfterMinutes}
									onChange={(e) =>
										onUpdate({
											bufferAfterMinutes: parseInt(e.target.value, 10),
										})
									}
									className="flex-1 accent-violet-500"
								/>
								<span className="font-mono text-sm w-8 text-center">
									{type.bufferAfterMinutes}
								</span>
							</div>
						</div>
					</div>

					<div>
						<Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
							Cor de Identificação
						</Label>
						<div className="flex gap-2">
							{COLOR_OPTIONS.map((c) => (
								<button
									key={c}
									type="button"
									onClick={() => onUpdate({ color: c })}
									className={cn(
										"w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-110",
										type.color === c && "ring-2 ring-offset-2 ring-violet-400",
									)}
									style={{ backgroundColor: c }}
								>
									{type.color === c && (
										<Check className="h-4 w-4 text-white" />
									)}
								</button>
							))}
						</div>
					</div>

					<div className="flex items-center justify-between pt-3 border-t">
						<div className="flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={onDuplicate}
								className="text-xs gap-1"
							>
								<Copy className="h-3 w-3" />
								Duplicar
							</Button>
							{!type.isDefault && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={onRemove}
									className="text-xs gap-1 text-red-500 hover:text-red-600"
								>
									<Trash2 className="h-3 w-3" />
									Excluir
								</Button>
							)}
						</div>
						<div className="flex items-center gap-2">
							<Label
								htmlFor={`active-${type.id}`}
								className="text-xs text-muted-foreground cursor-pointer"
							>
								{type.isActive ? "Ativo" : "Inativo"}
							</Label>
							<Switch
								id={`active-${type.id}`}
								checked={type.isActive}
								onCheckedChange={onToggleActive}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
