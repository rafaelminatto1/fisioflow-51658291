import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { calculateAge, exportToCSV } from "@/lib/utils";
import { PatientHelpers } from "@/types";

export function usePatientsExport() {
	const exportPatients = useCallback((patients: any[], statsMap: any) => {
		const data = patients.map((patient) => {
			const patientName = PatientHelpers.getName(patient);
			const patientStats = statsMap[patient.id];
			return {
				name: patientName || "Sem nome",
				email: patient.email || "",
				phone: patient.phone || "",
				age: calculateAge(patient.birth_date),
				gender: patient.gender || "",
				condition: patient.main_condition || "",
				status: patient.status || "",
				progress: patient.progress || 0,
				sessions: patientStats?.sessionsCompleted || 0,
				firstEvaluation: patientStats?.firstEvaluationDate || "",
			};
		});

		const headers = [
			"Nome",
			"Email",
			"Telefone",
			"Idade",
			"Gênero",
			"Condição Principal",
			"Status",
			"Progresso",
			"Sessões",
			"Primeira Avaliação",
		];
		const success = exportToCSV(data, "pacientes.csv", headers);

		if (success) {
			toast({
				title: "Exportação concluída!",
				description: "Lista de pacientes exportada com sucesso.",
			});
		} else {
			toast({
				title: "Erro na exportação",
				description: "Não foi possível exportar a lista de pacientes.",
				variant: "destructive",
			});
		}
	}, []);

	return { exportPatients };
}
