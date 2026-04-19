import { PatientCard } from "@fisioflow/ui";
import { PatientActions } from "@/components/patient/PatientActions";
import { usePrefetchPatientOnHover } from "@/hooks/performance";
import { useNavPreload } from "@/hooks/useIntelligentPreload";
import { patientRoutes } from "@/lib/routing/appRoutes";
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
		preloadRoute(patientRoutes.profile(patient.id));
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
				condition={
					<div className="flex flex-col gap-1">
						<span>{patient.mainCondition || "Sem patologia definida"}</span>
						{patient.hasSurgery && (
							<span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 w-fit">
								Pós-cirúrgico
							</span>
						)}
					</div>
				}
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
