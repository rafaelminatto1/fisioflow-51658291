import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	MoreVertical,
	Edit,
	Trash2,
	FileText,
	Calendar,
	Phone,
	Mail,
	UserCheck,
} from "lucide-react";
import { useSubmit, useNavigate } from "react-router";
import { PatientEditModal } from "./PatientEditModal";
import { PatientDeleteDialog } from "./PatientDeleteDialog";
import { toast } from "@/hooks/use-toast";
import type { PatientRow as Patient } from "@/types/workers";

interface PatientActionsProps {
	patient: Patient;
}

const statusOptions = [
	{ value: "Inicial", label: "Inicial", icon: "🆕" },
	{ value: "Em Tratamento", label: "Em Tratamento", icon: "💚" },
	{ value: "Recuperação", label: "Recuperação", icon: "⚡" },
	{ value: "Concluído", label: "Concluído", icon: "✅" },
] as const;

export const PatientActions: React.FC<PatientActionsProps> = ({ patient }) => {
	const navigate = useNavigate();

	const [editModalOpen, setEditModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const submit = useSubmit();

	const handleQuickCall = () => {
		if (patient.phone) {
			window.open(`tel:${patient.phone}`);
		} else {
			toast({
				title: "Telefone não cadastrado",
				description: "Este paciente não possui telefone cadastrado.",
				variant: "destructive",
			});
		}
	};

	const handleQuickEmail = () => {
		if (patient.email) {
			window.open(`mailto:${patient.email}`);
		} else {
			toast({
				title: "Email não cadastrado",
				description: "Este paciente não possui email cadastrado.",
				variant: "destructive",
			});
		}
	};

	const handleSchedule = () => {
		navigate("/");
	};

	const handleViewEvolution = () => {
		navigate(`/patients/${patient.id}?tab=clinical`);
	};

	const handleStatusChange = (
		status: "Inicial" | "Em Tratamento" | "Recuperação" | "Concluído",
	) => {
		submit(
			{ intent: "updateStatus", id: patient.id, status },
			{ method: "post" }
		);
	};

	const currentStatus = statusOptions.find((s) => s.value === patient.status);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0"
						data-testid={`patient-actions-${patient.id}`}
						data-patient-id={patient.id}
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="w-48"
					data-testid={`patient-actions-menu-${patient.id}`}
				>
					{/* Quick Actions */}
					<div className="px-2 py-1.5">
						<p className="text-xs font-semibold text-muted-foreground mb-1">
							Ações Rápidas
						</p>
					</div>

					<DropdownMenuItem onClick={handleQuickCall}>
						<Phone className="mr-2 h-4 w-4" />
						Ligar
					</DropdownMenuItem>

					<DropdownMenuItem onClick={handleQuickEmail}>
						<Mail className="mr-2 h-4 w-4" />
						Enviar Email
					</DropdownMenuItem>

					<DropdownMenuItem onClick={handleSchedule}>
						<Calendar className="mr-2 h-4 w-4" />
						Agendar Sessão
					</DropdownMenuItem>

					<DropdownMenuItem onClick={handleViewEvolution}>
						<FileText className="mr-2 h-4 w-4" />
						Ver Evolução
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					{/* Status */}
					<div className="px-2 py-1.5">
						<p className="text-xs font-semibold text-muted-foreground mb-1">
							Status
						</p>
						<p className="text-xs text-muted-foreground">
							Atual: {currentStatus?.icon} {currentStatus?.label}
						</p>
					</div>

					{statusOptions
						.filter((s) => s.value !== patient.status)
						.map((option) => (
							<DropdownMenuItem
								key={option.value}
								onClick={() => handleStatusChange(option.value)}
							>
								<UserCheck className="mr-2 h-4 w-4" />
								Mudar para {option.icon} {option.label}
							</DropdownMenuItem>
						))}

					<DropdownMenuSeparator />

					{/* Edit and Delete */}
					<DropdownMenuItem
						onClick={() => setEditModalOpen(true)}
						data-testid={`patient-edit-${patient.id}`}
					>
						<Edit className="mr-2 h-4 w-4" />
						Editar
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={() => setDeleteDialogOpen(true)}
						className="text-destructive focus:text-destructive"
						data-testid={`patient-delete-${patient.id}`}
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Excluir
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Modals */}
			<PatientEditModal
				open={editModalOpen}
				onOpenChange={setEditModalOpen}
				patientId={patient.id}
			/>

			<PatientDeleteDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
				patientId={patient.id}
				patientName={patient.full_name}
			/>
		</>
	);
};
