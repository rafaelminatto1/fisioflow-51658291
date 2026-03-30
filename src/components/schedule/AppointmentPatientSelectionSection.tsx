import { User } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import type { Patient } from "@/types";
import type { AppointmentFormData } from "@/types/appointment";

interface AppointmentPatientSelectionSectionProps {
	patients: Patient[];
	isLoading: boolean;
	disabled: boolean;
	onCreateNew: (name: string) => void;
	fallbackPatientName?: string;
	fallbackDescription?: string;
}

export function AppointmentPatientSelectionSection({
	patients,
	isLoading,
	disabled,
	onCreateNew,
	fallbackPatientName,
	fallbackDescription,
}: AppointmentPatientSelectionSectionProps) {
	const {
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<AppointmentFormData>();

	return (
		<div className="space-y-2">
			<Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
				<User className="h-3.5 w-3.5 text-primary" />
				Paciente *
			</Label>
			<PatientCombobox
				patients={patients}
				value={watch("patient_id")}
				onValueChange={(value) =>
					setValue("patient_id", value, {
						shouldDirty: true,
						shouldTouch: true,
						shouldValidate: true,
					})
				}
				onCreateNew={onCreateNew}
				fallbackDisplayName={fallbackPatientName}
				fallbackDescription={fallbackDescription}
				disabled={disabled || isLoading}
				aria-invalid={!!errors.patient_id}
				aria-describedby={errors.patient_id ? "patient-id-error" : undefined}
			/>
			{errors.patient_id && (
				<p id="patient-id-error" className="text-xs text-destructive">
					{(errors.patient_id as { message?: string })?.message}
				</p>
			)}
		</div>
	);
}
