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
import { Archive, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patientsApi } from "@/api/v2";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
	const [hardDelete, setHardDelete] = useState(false);
	const queryClient = useQueryClient();
	const { user, profile } = useAuth();

	const isAdmin = 
		user?.email === "rafael.minatto@yahoo.com.br" || 
		profile?.role === "admin";

	const handleAction = async () => {
		setIsArchiving(true);
		try {
			if (hardDelete && isAdmin) {
				await patientsApi.delete(patientId, "hard");
				toast.success(`Paciente "${patientName}" excluído definitivamente.`);
			} else {
				await patientsApi.delete(patientId);
				toast.success(`Paciente "${patientName}" arquivado com sucesso.`);
			}
			queryClient.invalidateQueries({ queryKey: ["patients"] });
			queryClient.invalidateQueries({ queryKey: ["patients-list"] });
			onOpenChange(false);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Erro ao processar solicitação";
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
							{hardDelete ? (
								<Trash2 className="w-6 h-6 text-destructive" />
							) : (
								<Archive className="w-6 h-6 text-muted-foreground" />
							)}
						</div>
						<div>
							<AlertDialogTitle>
								{hardDelete ? "Excluir Definitivamente" : "Arquivar Paciente"}
							</AlertDialogTitle>
						</div>
					</div>
				</AlertDialogHeader>

				<AlertDialogDescription className="py-4">
					{hardDelete ? (
						<div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-destructive mb-4">
							<p className="flex items-center gap-2 font-bold mb-1">
								<AlertTriangle className="h-4 w-4" />
								ATENÇÃO: AÇÃO IRREVERSÍVEL
							</p>
							Esta ação excluirá permanentemente todos os registros do paciente{" "}
							<strong>"{patientName}"</strong>, incluindo histórico clínico,
							evoluções e exames. Esta ação não é recomendada por razões legais.
						</div>
					) : (
						<>
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
						</>
					)}
				</AlertDialogDescription>

				{isAdmin && (
					<div className="flex items-center space-x-2 mb-4 p-3 bg-muted/30 rounded-lg">
						<Checkbox 
							id="hard-delete-toggle" 
							checked={hardDelete} 
							onCheckedChange={(checked) => setHardDelete(!!checked)}
						/>
						<Label htmlFor="hard-delete-toggle" className="text-xs cursor-pointer">
							Eu sou o administrador e desejo realizar a <strong>exclusão definitiva</strong>
						</Label>
					</div>
				)}

				<AlertDialogFooter className="gap-2">
					<AlertDialogCancel disabled={isArchiving}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleAction}
						disabled={isArchiving}
						className={hardDelete ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}
						data-testid={`patient-archive-confirm-${patientId}`}
						data-patient-id={patientId}
					>
						{isArchiving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processando...
							</>
						) : hardDelete ? (
							<>
								<Trash2 className="mr-2 h-4 w-4" />
								Sim, Excluir Definitivamente
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
