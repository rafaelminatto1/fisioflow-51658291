import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tarefa } from "@/types/tarefas";
import { useBoardLabels } from "@/contexts/BoardLabelsContext";
import "react-day-picker/dist/style.css";

interface BoardCalendarViewProps {
	tarefas: Tarefa[];
	onViewTask: (tarefa: Tarefa) => void;
}

export function BoardCalendarView({
	tarefas,
	onViewTask,
}: BoardCalendarViewProps) {
	const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
	const { labelsMap } = useBoardLabels();

	const tasksWithDueDate = tarefas.filter((t) => !!t.data_vencimento);

	const getDayTasks = (day: Date) =>
		tasksWithDueDate.filter((t) =>
			isSameDay(new Date(t.data_vencimento!), day),
		);

	const dayTasksMap = tasksWithDueDate.reduce(
		(acc, t) => {
			const dateKey = t.data_vencimento!.split("T")[0];
			if (!acc[dateKey]) acc[dateKey] = [];
			acc[dateKey].push(t);
			return acc;
		},
		{} as Record<string, Tarefa[]>,
	);

	const selectedDayTasks = selectedDay ? getDayTasks(selectedDay) : [];

	const modifiers = {
		hasTasks: Object.keys(dayTasksMap).map((d) => new Date(d + "T12:00:00")),
	};

	const modifiersStyles = {
		hasTasks: { fontWeight: 700 },
	};

	return (
		<div className="flex flex-col gap-6 xl:flex-row">
			{/* Calendar */}
			<div className="flex-shrink-0">
				<DayPicker
					mode="single"
					selected={selectedDay}
					onSelect={setSelectedDay}
					locale={ptBR}
					modifiers={modifiers}
					modifiersStyles={modifiersStyles}
					components={{
						DayButton: ({ day, modifiers: _modifiers, ...props }) => {
							const dateKey = format(day.date, "yyyy-MM-dd");
							const count = dayTasksMap[dateKey]?.length ?? 0;
							return (
								<button {...props} className={cn("relative", props.className)}>
									<span>{day.date.getDate()}</span>
									{count > 0 && (
										<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
									)}
								</button>
							);
						},
					}}
					className="rounded-[24px] border border-border/60 bg-card p-4 shadow-sm"
				/>
			</div>

			{/* Tasks for selected day */}
			<div className="flex-1 rounded-[24px] border border-border/60 bg-card p-4 shadow-sm">
				<h3 className="mb-4 text-sm font-semibold text-muted-foreground">
					{selectedDay
						? `Tarefas em ${format(selectedDay, "d 'de' MMMM", { locale: ptBR })}`
						: "Selecione um dia"}
				</h3>

				{selectedDayTasks.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4">
						{selectedDay ? "Nenhuma tarefa com vencimento neste dia." : ""}
					</p>
				) : (
					<div className="space-y-2">
						{selectedDayTasks.map((tarefa) => (
							<div
								key={tarefa.id}
								className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border/50 p-3 transition-colors hover:bg-muted/30"
								onClick={() => onViewTask(tarefa)}
							>
								<div
									className={cn(
										"w-1.5 h-10 rounded-full flex-shrink-0",
										tarefa.prioridade === "URGENTE"
											? "bg-red-500"
											: tarefa.prioridade === "ALTA"
												? "bg-orange-500"
												: tarefa.prioridade === "MEDIA"
													? "bg-yellow-500"
													: "bg-green-500",
									)}
								/>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium truncate">
										{tarefa.titulo}
									</p>
									{tarefa.descricao && (
										<p className="text-xs text-muted-foreground truncate">
											{tarefa.descricao}
										</p>
									)}
								</div>
								<div className="flex gap-1 flex-shrink-0">
									{tarefa.label_ids?.slice(0, 2).map((id) => {
										const label = labelsMap.get(id);
										if (!label) return null;
										return (
											<Badge
												key={id}
												variant="outline"
												className="text-xs px-1.5 py-0 border-0"
												style={{
													backgroundColor: `${label.color}25`,
													color: label.color,
												}}
											>
												{label.name}
											</Badge>
										);
									})}
									{!tarefa.label_ids?.length && (
										<Badge variant="outline" className="text-xs">
											{tarefa.status}
										</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
