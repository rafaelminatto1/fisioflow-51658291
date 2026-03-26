import { PatientCard } from "@fisioflow/ui";
import { PatientActions } from "@/components/patients/PatientActions";
import { usePrefetchPatientOnHover } from "@/hooks/performance";
import { useNavPreload } from "@/hooks/useIntelligentPreload";
import { PatientHelpers } from "@/types";

interface PatientListItemProps {
	patient: any;
	stats: any;
	onClick: () => void;
}

export const PatientListItem = ({
	patient,
	stats,
	onClick,
}: PatientListItemProps) => {
	const { prefetch } = usePrefetchPatientOnHover(patient.id);
	const { preloadRoute } = useNavPreload();

	const handleMouseEnter = () => {
		prefetch();
		preloadRoute(`/patients/${patient.id}`);
	};

	const patientName = PatientHelpers.getName(patient);

	return (
		<button
			type="button"
			onMouseEnter={handleMouseEnter}
			data-testid={`patient-card-${patient.id}`}
			data-patient-id={patient.id}
			className="h-full w-full text-left magnetic-button card-premium-hover"
		>
			<PatientCard
				name={patientName || "Sem Nome"}
				condition={patient.main_condition}
				status={patient.status}
				stats={{
					sessionsCompleted: stats?.sessionsCompleted || 0,
					nextAppointment: stats?.nextAppointmentDate
						? new Date(stats.nextAppointmentDate).toLocaleDateString("pt-BR")
						: undefined,
				}}
				onClick={onClick}
				actions={<PatientActions patient={patient} />}
				className="h-full"
			/>
		</button>
	);
};
