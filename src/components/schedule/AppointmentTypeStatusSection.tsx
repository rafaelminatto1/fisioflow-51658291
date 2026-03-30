import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	APPOINTMENT_STATUSES,
	APPOINTMENT_TYPES,
	STATUS_COLORS,
	STATUS_LABELS,
} from "@/constants/appointments";
import { cn } from "@/lib/utils";
import type {
	AppointmentFormData,
	AppointmentStatus,
	AppointmentType,
} from "@/types/appointment";

const premiumFieldBaseClass =
	"w-full justify-between rounded-xl border border-blue-100 bg-white px-3 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 data-[state=open]:border-blue-300 data-[state=open]:bg-blue-50/50";

const premiumFieldClass = `${premiumFieldBaseClass} h-11 text-xs sm:text-sm`;

const premiumSelectContentClass =
	"rounded-xl border border-blue-100 bg-white p-1 shadow-lg backdrop-blur-sm";

interface AppointmentTypeStatusSectionProps {
	disabled: boolean;
}

export function AppointmentTypeStatusSection({
	disabled,
}: AppointmentTypeStatusSectionProps) {
	const {
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<AppointmentFormData>();

	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="space-y-2">
				<Label id="type-label" className="text-xs sm:text-sm font-medium">
					Tipo *
				</Label>
				<Select
					value={watch("type")}
					onValueChange={(value) => setValue("type", value as AppointmentType)}
					disabled={disabled}
				>
					<SelectTrigger
						className={cn(
							premiumFieldClass,
							errors.type &&
								"border-destructive text-destructive shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)]",
						)}
						data-testid="appointment-type"
						aria-labelledby="type-label"
						aria-required="true"
						aria-invalid={!!errors.type}
						aria-describedby={errors.type ? "type-error" : undefined}
					>
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent className={premiumSelectContentClass}>
						{APPOINTMENT_TYPES.map((type) => (
							<SelectItem key={type} value={type}>
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.type && (
					<p id="type-error" className="text-xs text-destructive font-medium">
						{(errors.type as { message?: string })?.message}
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label id="status-label" className="text-xs sm:text-sm font-medium">
					Status *
				</Label>
				<Select
					value={watch("status")}
					onValueChange={(value) =>
						setValue("status", value as AppointmentStatus)
					}
					disabled={disabled}
				>
					<SelectTrigger
						className={premiumFieldClass}
						aria-labelledby="status-label"
						aria-required="true"
					>
						<SelectValue placeholder="Selecione o status" />
					</SelectTrigger>
					<SelectContent className={premiumSelectContentClass}>
						{APPOINTMENT_STATUSES.map((status) => (
							<SelectItem key={status} value={status}>
								<div className="flex items-center gap-2">
									<div
										className={cn(
											"w-2 h-2 rounded-full",
											STATUS_COLORS[status],
										)}
									/>
									{STATUS_LABELS[status]}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
