/**
 * ScheduleToolbar - Single-row compact toolbar for Schedule page
 * Following Material Design 3 App Bar specs and industry best practices
 * (Google Calendar, Cron, Akiflow, Notion Calendar)
 */

import React from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
	ChevronLeft,
	ChevronRight,
	Settings as SettingsIcon,
	CheckSquare,
	Plus,
	Stethoscope,
	Trash2,
	Sparkles,
	MoreVertical,
	Zap,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdvancedFilters } from "./AdvancedFilters";
import { ScheduleConfigIconButton } from "./ScheduleConfigButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";

export interface ScheduleToolbarProps {
	currentDate: Date;
	viewType: "day" | "week" | "month";
	onViewChange: (view: "day" | "week" | "month") => void;
	isSelectionMode: boolean;
	onToggleSelection: () => void;
	onCreateAppointment: () => void;
	filters: {
		status: string[];
		types: string[];
		therapists: string[];
	};
	onFiltersChange: (filters: {
		status: string[];
		types: string[];
		therapists: string[];
	}) => void;
	onClearFilters: () => void;
	onCancelAllToday?: () => void;
}

const VIEW_LABELS = {
	day: "Dia",
	week: "Semana",
	month: "Mês",
} as const;

export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = ({
	currentDate,
	viewType,
	onViewChange,
	isSelectionMode,
	onToggleSelection,
	onCreateAppointment,
	filters,
	onFiltersChange,
	onClearFilters,
	onCancelAllToday,
}) => {
	const isMobile = useIsMobile();

	// Format current date range based on view type
	const formattedDateRange = React.useMemo(() => {
		switch (viewType) {
			case "day":
				return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
			case "week": {
				const weekStart = startOfWeek(currentDate, { locale: ptBR });
				const weekEnd = endOfWeek(currentDate, { locale: ptBR });
				if (weekStart.getMonth() === weekEnd.getMonth()) {
					return format(weekStart, "MMMM 'de' yyyy", { locale: ptBR });
				}
				return `${format(weekStart, "MMM", { locale: ptBR })} - ${format(weekEnd, "MMM 'de' yyyy", { locale: ptBR })}`;
			}
			case "month":
				return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
			default:
				return "";
		}
	}, [currentDate, viewType]);

	// For desktop - show all controls
	const DesktopToolbar = () => (
		<div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-40">
			{/* Left Group: Brand Logo (Stitch style: 'WORKBENCH' equivalent) */}
			<div className="flex items-center gap-6">
				<Link to="/agenda" className="flex items-center gap-2 hover:opacity-80 transition-all">
					<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
						<Stethoscope className="w-4 h-4 text-white" />
					</div>
					<span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">
						FISIOFLOW
					</span>
				</Link>

				<div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />

				{/* Date Navigation Block */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => window.dispatchEvent(new CustomEvent("schedule-navigate", { detail: { direction: "prev" } }))}
							className="h-7 w-7 p-0 rounded-md hover:bg-white dark:hover:bg-slate-800"
						>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => window.dispatchEvent(new CustomEvent("schedule-navigate", { detail: { direction: "next" } }))}
							className="h-7 w-7 p-0 rounded-md hover:bg-white dark:hover:bg-slate-800"
						>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
					
					<SmartDatePicker
						date={currentDate}
						onChange={(date) => date && window.dispatchEvent(new CustomEvent("schedule-date-change", { detail: date }))}
						className="h-9 px-3 border-none bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 font-bold text-sm tracking-tight min-w-[160px]"
						placeholder={formattedDateRange}
					/>
				</div>
			</div>

			{/* Center Group: Navigation Tabs (Stitch: Agenda, Patients, Analytics) */}
			<div className="flex items-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
				<Button
					variant="ghost"
					className="px-6 py-2 h-8 text-[11px] font-black uppercase tracking-widest rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/10"
				>
					Agenda
				</Button>
				<Button
					variant="ghost"
					asChild
					className="px-6 py-2 h-8 text-[11px] font-black uppercase tracking-widest rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
				>
					<Link to="/patients">Pacientes</Link>
				</Button>
				<Button
					variant="ghost"
					asChild
					className="px-6 py-2 h-8 text-[11px] font-black uppercase tracking-widest rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
				>
					<Link to="/analytics">Analytics</Link>
				</Button>
			</div>

			{/* Right Group: Capacity indicator + Gear Button + Actions */}
			<div className="flex items-center gap-4">
				{/* Capacity Indicator (Stitch style) */}
				<div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100/50 dark:border-blue-800/30">
					<div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
						<Zap className="w-3 h-3 text-white fill-white" />
					</div>
					<span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
						Capacidade: 84%
					</span>
				</div>

				<div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

				<div className="flex items-center gap-1.5">
					<AdvancedFilters
						filters={filters}
						onChange={onFiltersChange}
						onClear={onClearFilters}
					/>

					{/* Engrenagem Button (Prominent as requested) */}
					<ScheduleConfigIconButton className="h-9 w-9 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition-all" />
					
					<Button
						onClick={onCreateAppointment}
						className="h-9 px-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/10 font-bold text-[11px] uppercase tracking-widest ml-2"
					>
						<Plus className="w-3.5 h-3.5" />
						Agendar
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-9 w-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
							>
								<MoreVertical className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-56 p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800"
						>
							<DropdownMenuItem className="rounded-xl gap-2 font-medium">
								<Sparkles className="w-4 h-4 text-amber-500" />
								Otimizar Agenda (AI)
							</DropdownMenuItem>
							<DropdownMenuItem className="rounded-xl gap-2 font-medium" onClick={onToggleSelection}>
								<CheckSquare className="w-4 h-4 text-blue-500" />
								{isSelectionMode ? "Sair do modo seleção" : "Seleção em massa"}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);

	// For mobile - compact simplified view
	const MobileToolbar = () => (
		<div className="flex flex-col gap-4 px-4 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => window.dispatchEvent(new CustomEvent("schedule-navigate", { detail: { direction: "prev" } }))}
						className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800"
					>
						<ChevronLeft className="w-5 h-5" />
					</Button>

					<SmartDatePicker
						date={currentDate}
						onChange={(date) => date && window.dispatchEvent(new CustomEvent("schedule-date-change", { detail: date }))}
						className="h-9 min-w-[120px] border-none bg-transparent font-black text-sm px-1"
						placeholder={format(currentDate, "MMM yyyy", { locale: ptBR })}
					/>

					<Button
						variant="ghost"
						size="icon"
						onClick={() => window.dispatchEvent(new CustomEvent("schedule-navigate", { detail: { direction: "next" } }))}
						className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800"
					>
						<ChevronRight className="w-5 h-5" />
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<ScheduleConfigIconButton className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800" />
					<Button
						onClick={onCreateAppointment}
						size="icon"
						className="h-10 w-10 bg-blue-600 text-white rounded-xl shadow-lg"
					>
						<Plus className="w-6 h-6" />
					</Button>
				</div>
			</div>

			<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
				{(["day", "week", "month"] as const).map((view) => (
					<Button
						key={view}
						variant={viewType === view ? "default" : "outline"}
						size="sm"
						onClick={() => onViewChange(view)}
						className={cn(
							"h-8 px-4 rounded-lg font-bold text-[10px] uppercase tracking-widest",
							viewType === view
								? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
								: "border-slate-200 text-slate-500",
						)}
					>
						{VIEW_LABELS[view]}
					</Button>
				))}
				<div className="ml-auto">
					<AdvancedFilters
						filters={filters}
						onChange={onFiltersChange}
						onClear={onClearFilters}
					/>
				</div>
			</div>
		</div>
	);

	return isMobile ? <MobileToolbar /> : <DesktopToolbar />;
};
