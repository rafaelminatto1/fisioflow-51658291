import * as React from "react";
import {
	format,
	getYear,
	getMonth,
	setYear,
	setMonth,
	parse,
	isValid,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

interface SmartDatePickerProps {
	date?: Date;
	onChange?: (date?: Date) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	fromYear?: number;
	toYear?: number;
	showYearPicker?: boolean;
}

export function SmartDatePicker({
	date,
	onChange,
	placeholder = "Selecione uma data",
	className,
	disabled,
	fromYear = 1920,
	toYear = new Date().getFullYear() + 5,
	showYearPicker = true,
}: SmartDatePickerProps) {
	const [month, setMonthDate] = React.useState<Date>(date || new Date());

	const years = React.useMemo(() => {
		const yearsArray = [];
		for (let i = toYear; i >= fromYear; i--) {
			yearsArray.push(i);
		}
		return yearsArray;
	}, [fromYear, toYear]);

	const months = [
		"Janeiro",
		"Fevereiro",
		"Março",
		"Abril",
		"Maio",
		"Junho",
		"Julho",
		"Agosto",
		"Setembro",
		"Outubro",
		"Novembro",
		"Dezembro",
	];

	const handleYearChange = (year: string) => {
		const newDate = setYear(month, parseInt(year));
		setMonthDate(newDate);
	};

	const handleMonthChange = (monthIndex: string) => {
		const newDate = setMonth(month, parseInt(monthIndex));
		setMonthDate(newDate);
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={"outline"}
					disabled={disabled}
					className={cn(
						"w-full justify-start text-left font-normal h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-all hover:border-primary/50 focus:ring-4 focus:ring-primary/10",
						!date && "text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4 text-primary" />
					{date ? (
						format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-4 rounded-3xl shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
				align="start"
			>
				{showYearPicker && (
					<div className="flex gap-2 mb-4">
						<Select
							value={getMonth(month).toString()}
							onValueChange={handleMonthChange}
						>
							<SelectTrigger className="flex-1 h-9 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-none">
								<SelectValue placeholder="Mês" />
							</SelectTrigger>
							<SelectContent className="rounded-xl">
								{months.map((m, index) => (
									<SelectItem
										key={m}
										value={index.toString()}
										className="text-xs"
									>
										{m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={getYear(month).toString()}
							onValueChange={handleYearChange}
						>
							<SelectTrigger className="w-[100px] h-9 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-900 border-none">
								<SelectValue placeholder="Ano" />
							</SelectTrigger>
							<SelectContent className="rounded-xl max-h-[300px]">
								{years.map((y) => (
									<SelectItem key={y} value={y.toString()} className="text-xs">
										{y}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<Calendar
					mode="single"
					selected={date}
					onSelect={onChange}
					month={month}
					onMonthChange={setMonthDate}
					initialFocus
					locale={ptBR}
					className="rounded-xl border-none p-0"
					classNames={{
						day_selected:
							"bg-primary text-white hover:bg-primary hover:text-white rounded-xl shadow-lg shadow-primary/30 font-bold",
						day_today:
							"bg-slate-100 dark:bg-slate-800 text-primary font-black rounded-xl",
						day: "h-9 w-9 p-0 font-medium aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors",
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
