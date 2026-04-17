import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Archive, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patientsApi } from "@/api/v2";

interface PatientDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	patientId: string;
	patientName: string;
}

export const PatientDeleteDialog: React.FC<PatientDeleteDialogProps> = ({
	open,
	onOpenChange,
	patientId,
	patientName,
}) => {
	const [isArchiving, setIsArchiving] = useState(false);
	const queryClient = useQueryClient();

	const handleArchive = async () => {
		setIsArchiving(true);
		try {
			await patientsApi.delete(patientId);
			queryClient.invalidateQueries({ queryKey: ["patients"] });
			toast.success(`Paciente "${patientName}" arquivado com sucesso.`);
			onOpenChange(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Erro ao arquivar paciente";
			toast.error(msg);
		} finally {
			setIsArchiving(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
							<Archive className="w-6 h-6 text-muted-foreground" />
						</div>
						<div>
							<AlertDialogTitle>Arquivar Paciente</AlertDialogTitle>
						</div>
					</div>
				</AlertDialogHeader>

				<AlertDialogDescription className="py-4">
					Tem certeza que deseja arquivar o paciente{" "}
					<span className="font-semibold text-foreground">"{patientName}"</span>
					?
					<br />
					<br />
					O paciente será marcado como <strong>Arquivado</strong> e não
					aparecerá nas listagens ativas. Todos os dados, histórico clínico e
					evoluções serão{" "}
					<strong className="text-foreground">preservados</strong> conforme
					exigido pela legislação vigente (CFisio / LGPD).
				</AlertDialogDescription>

				<AlertDialogFooter className="gap-2">
					<AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleArchive}
						disabled={isArchiving}
						className="bg-primary text-primary-foreground hover:bg-primary/90"
						data-testid={`patient-archive-confirm-${patientId}`}
						data-patient-id={patientId}
					>
						{isArchiving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Arquivando...
							</>
						) : (
							<>
								<Archive className="mr-2 h-4 w-4" />
								Sim, Arquivar Paciente
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default PatientDeleteDialog;
