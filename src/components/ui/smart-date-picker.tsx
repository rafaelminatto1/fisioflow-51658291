import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface SmartDatePickerProps {
	date?: Date;
	onChange?: (date?: Date) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	fromYear?: number;
	toYear?: number;
	enableManualInput?: boolean;
}

export function SmartDatePicker({
	date,
	onChange,
	placeholder = "Selecione uma data",
	className,
	disabled,
	fromYear = 1900,
	toYear = new Date().getFullYear() + 10,
	enableManualInput = true,
}: SmartDatePickerProps) {
	const [inputValue, setInputValue] = React.useState(
		date ? format(date, "dd/MM/yyyy") : "",
	);
	const [month, setMonth] = React.useState<Date>(date || new Date());

	React.useEffect(() => {
		if (date) {
			setInputValue(format(date, "dd/MM/yyyy"));
			setMonth(date);
		} else {
			setInputValue("");
		}
	}, [date]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;

		// Mask for DD/MM/YYYY
		const cleaned = value.replace(/\D/g, "");
		let formatted = cleaned;
		if (cleaned.length > 2) {
			formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
		}
		if (cleaned.length > 4) {
			formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
		}

		setInputValue(formatted);

		if (formatted.length === 10) {
			const parsedDate = parse(formatted, "dd/MM/yyyy", new Date());
			if (isValid(parsedDate)) {
				onChange?.(parsedDate);
				setMonth(parsedDate);
			}
		}
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Popover onOpenChange={(open) => {
				if (open && date) {
					setMonth(date);
				}
			}}>
				<PopoverTrigger asChild>
					<Button
						variant={"outline"}
						disabled={disabled}
						className={cn(
							"flex-1 justify-start text-left font-normal h-10 rounded-xl border-slate-200 hover:border-primary/50 transition-all",
							!date && "text-muted-foreground"
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
					className="w-auto p-0 rounded-2xl shadow-xl border-slate-200"
					align="start"
				>
					<Calendar
						mode="single"
						selected={date}
						onSelect={(newDate) => {
							onChange?.(newDate);
						}}
						month={month}
						onMonthChange={setMonth}
						initialFocus
						captionLayout="dropdown"
						fromYear={fromYear}
						toYear={toYear}
						classNames={{
							caption_dropdowns: "flex justify-center gap-1 mb-2",
							dropdown: "flex items-center bg-slate-50 dark:bg-slate-900 rounded-md px-1 py-0.5 text-xs font-medium",
							vhidden: "hidden", // react-day-picker dropdown label
						}}
					/>
				</PopoverContent>
			</Popover>
			{enableManualInput && (
				<Input
					placeholder="DD/MM/AAAA"
					value={inputValue}
					onChange={handleInputChange}
					className="w-[120px] h-10 rounded-xl border-slate-200 text-center text-sm"
					maxLength={10}
					disabled={disabled}
				/>
			)}
		</div>
	);
}
