import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	AlertTriangle,
	CalendarIcon,
	Check,
	ChevronDown,
	Clock,
	Wand2,
	Zap,
} from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AppointmentFormData } from "@/types/appointment";

interface AppointmentDateTimeSectionProps {
	disabled: boolean;
	timeSlots: string[];
	isCalendarOpen: boolean;
	setIsCalendarOpen: (open: boolean) => void;
	getMinCapacityForInterval: (
		day: number,
		time: string,
		duration: number,
	) => number;
	conflictCount: number;
	onAutoSchedule?: () => void;
	watchedDateStr?: string;
	watchedTime?: string;
	watchedDuration?: number;
}

export function AppointmentDateTimeSection({
	disabled,
	timeSlots,
	isCalendarOpen,
	setIsCalendarOpen,
	getMinCapacityForInterval,
	conflictCount,
	onAutoSchedule,
	watchedDateStr,
	watchedTime,
	watchedDuration,
}: AppointmentDateTimeSectionProps) {
	const {
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<AppointmentFormData>();

	const resolvedDateStr = watchedDateStr ?? watch("appointment_date");
	const resolvedTime = watchedTime ?? watch("appointment_time");
	const resolvedDuration = watchedDuration ?? watch("duration");

	const watchedDate = resolvedDateStr
		? typeof resolvedDateStr === "string"
			? parseISO(resolvedDateStr)
			: (resolvedDateStr as Date)
		: null;

	const maxCapacity =
		watchedDate && resolvedTime && resolvedDuration
			? getMinCapacityForInterval(
					watchedDate.getDay(),
					resolvedTime,
					resolvedDuration,
				)
			: 0;
	const exceedsCapacity = conflictCount >= maxCapacity;

	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label
					id="date-label"
					className="text-xs font-medium text-slate-500 flex items-center gap-1.5"
				>
					<CalendarIcon className="h-3.5 w-3.5" />
					Data do Atendimento *
				</Label>

				<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className={cn(
								"h-10 w-full justify-between items-center rounded-lg border border-slate-200 bg-white px-3 text-left hover:border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors",
								!watchedDate && "text-slate-400",
								errors.appointment_date &&
									"border-red-300 bg-red-50/30 text-red-600",
							)}
							disabled={disabled}
						>
							<div className="flex items-center gap-2.5">
								<CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
								<div className="flex flex-col items-start leading-tight">
									<span className="text-sm font-medium text-slate-700">
										{watchedDate
											? format(watchedDate, "dd 'de' MMMM, yyyy", {
													locale: ptBR,
												})
											: "Selecionar data"}
									</span>
									{watchedDate && (
										<span className="text-xs text-slate-400">
											{format(watchedDate, "EEEE", { locale: ptBR })}
										</span>
									)}
								</div>
							</div>
							<ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-auto p-0 border border-slate-200 shadow-lg rounded-xl overflow-hidden"
						align="start"
					>
						<div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
							<span className="text-xs font-medium text-slate-500">
								Selecionar data
							</span>
							<div className="flex gap-1">
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2.5 text-xs font-medium hover:bg-slate-100 text-slate-600 rounded-md"
									onClick={() => {
										setValue("appointment_date", format(new Date(), "yyyy-MM-dd"));
										setIsCalendarOpen(false);
									}}
								>
									Hoje
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2.5 text-xs font-medium hover:bg-slate-100 text-slate-600 rounded-md"
									onClick={() => {
										setValue(
											"appointment_date",
											format(addDays(new Date(), 1), "yyyy-MM-dd"),
										);
										setIsCalendarOpen(false);
									}}
								>
									Amanhã
								</Button>
							</div>
						</div>
						<div className="p-1">
							<Calendar
								mode="single"
								selected={watchedDate || undefined}
								onSelect={(date) => {
									if (date) {
										setValue("appointment_date", format(date, "yyyy-MM-dd"));
									}
									setIsCalendarOpen(false);
								}}
								locale={ptBR}
								initialFocus
							/>
						</div>
					</PopoverContent>
				</Popover>
				{errors.appointment_date && (
					<p
						id="date-error"
						className="text-xs text-red-500 flex items-center gap-1 mt-1"
					>
						<AlertTriangle className="h-3 w-3" />
						{(errors.appointment_date as { message?: string })?.message}
					</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
							<Clock className="h-3.5 w-3.5" />
							Horário
						</Label>
						{onAutoSchedule && !disabled && (
							<button
								type="button"
								className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors"
								onClick={onAutoSchedule}
							>
								<Wand2 className="h-3 w-3" />
								Sugerir
							</button>
						)}
					</div>
					<Select
						value={resolvedTime}
						onValueChange={(value) => setValue("appointment_time", value)}
						disabled={disabled}
					>
						<SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
							<SelectValue placeholder="Horário" />
						</SelectTrigger>
						<SelectContent className="rounded-lg border-slate-200 max-h-60">
							{timeSlots.map((slot) => (
								<SelectItem key={slot} value={slot} className="text-sm">
									{slot}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
						<Zap className="h-3.5 w-3.5" />
						Duração
					</Label>
					<Select
						value={resolvedDuration?.toString()}
						onValueChange={(value) =>
							setValue("duration", Number.parseInt(value, 10))
						}
						disabled={disabled}
					>
						<SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="rounded-lg border-slate-200">
							<SelectItem value="30" className="text-sm">
								30 min
							</SelectItem>
							<SelectItem value="45" className="text-sm">
								45 min
							</SelectItem>
							<SelectItem value="60" className="text-sm">
								1 hora
							</SelectItem>
							<SelectItem value="90" className="text-sm">
								1h 30min
							</SelectItem>
							<SelectItem value="120" className="text-sm">
								2 horas
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{watchedDate && resolvedTime && (
				<div
					className={cn(
						"flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
						exceedsCapacity
							? "border-red-200 bg-red-50 text-red-700"
							: conflictCount > 0
								? "border-amber-200 bg-amber-50 text-amber-700"
								: "border-emerald-200 bg-emerald-50 text-emerald-700",
					)}
				>
					{exceedsCapacity ? (
						<AlertTriangle className="h-4 w-4 shrink-0" />
					) : (
						<Check className="h-4 w-4 shrink-0" />
					)}
					<div className="flex flex-col min-w-0">
						<span className="font-medium text-sm">
							{exceedsCapacity
								? "Horário indisponível"
								: conflictCount > 0
									? "Com outros agendamentos"
									: "Horário disponível"}
						</span>
						<span className="text-xs opacity-80">
							{exceedsCapacity
								? "Capacidade máxima atingida"
								: conflictCount > 0
									? `${conflictCount}/${maxCapacity} ocupado — ainda há vaga`
									: "Profissional sem conflitos"}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}
