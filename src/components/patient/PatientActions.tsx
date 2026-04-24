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
	Archive,
	FileText,
	Calendar,
	Phone,
	Mail,
	UserCheck,
	MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2";
import { APP_ROUTES, patientRoutes } from "@/lib/routing/appRoutes";
import { PatientEditModal } from "./PatientEditModal";
import { PatientDeleteDialog } from "./PatientDeleteDialog";
import { toast } from "@/hooks/use-toast";
import type { PatientRow as Patient } from "@/types/workers";
import { cn } from "@/lib/utils";

interface PatientActionsProps {
	patient: Patient;
	variant?: "default" | "speed-dial";
}

const statusOptions = [
	{ value: "Inicial", label: "Inicial", icon: "🆕" },
	{ value: "Em Tratamento", label: "Em Tratamento", icon: "💚" },
	{ value: "Recuperação", label: "Recuperação", icon: "⚡" },
	{ value: "Concluído", label: "Concluído", icon: "✅" },
] as const;

export const PatientActions: React.FC<PatientActionsProps> = ({ patient, variant = "default" }) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [editModalOpen, setEditModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const handleWhatsApp = () => {
		if (patient.phone) {
			const cleanPhone = patient.phone.replace(/\D/g, "");
			window.open(`https://wa.me/55${cleanPhone}`, "_blank");
		} else {
			toast({
				title: "Telefone não cadastrado",
				description: "Este paciente não possui telefone cadastrado.",
				variant: "destructive",
			});
		}
	};

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
		navigate(APP_ROUTES.AGENDA);
	};

	const handleViewEvolution = () => {
		navigate(patientRoutes.clinicalTab(patient.id));
	};

	const handleStatusChange = async (
		status: "Inicial" | "Em Tratamento" | "Recuperação" | "Concluído",
	) => {
		try {
			await patientsApi.update(patient.id, { status });
			queryClient.invalidateQueries({ queryKey: ["patients"] });
			queryClient.invalidateQueries({ queryKey: ["patients-list"] });
			toast({ description: `Status atualizado para "${status}".` });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Erro ao atualizar status";
			toast({ variant: "destructive", description: msg });
		}
	};

	const currentStatus = statusOptions.find((s) => s.value === patient.status);

	if (variant === "speed-dial") {
		return (
			<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all duration-300"
					onClick={handleWhatsApp}
					title="WhatsApp"
				>
					<MessageSquare className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-300"
					onClick={handleSchedule}
					title="Agendar"
				>
					<Calendar className="h-4 w-4" />
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-xl hover:bg-secondary transition-all"
						>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-premium border-border/40">
						<div className="px-2 py-2 mb-1">
							<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paciente</p>
							<p className="text-sm font-bold truncate">{patient.full_name}</p>
						</div>
						<DropdownMenuSeparator className="opacity-50" />
						
						<DropdownMenuItem onClick={handleViewEvolution} className="rounded-lg py-2.5">
							<FileText className="mr-3 h-4 w-4 text-blue-500" />
							<span className="font-medium">Ver Prontuário</span>
						</DropdownMenuItem>

						<DropdownMenuItem onClick={handleQuickCall} className="rounded-lg py-2.5">
							<Phone className="mr-3 h-4 w-4 text-green-500" />
							<span className="font-medium">Ligar</span>
						</DropdownMenuItem>

						<DropdownMenuItem onClick={handleQuickEmail} className="rounded-lg py-2.5">
							<Mail className="mr-3 h-4 w-4 text-orange-500" />
							<span className="font-medium">Enviar E-mail</span>
						</DropdownMenuItem>

						<DropdownMenuSeparator className="opacity-50" />
						
						<div className="px-2 py-2">
							<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Mudar Status</p>
							<div className="grid grid-cols-2 gap-1">
								{statusOptions.map((opt) => (
									<Button 
										key={opt.value}
										variant={patient.status === opt.value ? "default" : "outline"}
										size="sm"
										className="text-[10px] h-7 px-1 justify-start gap-1"
										onClick={() => handleStatusChange(opt.value)}
									>
										<span>{opt.icon}</span>
										<span className="truncate">{opt.label}</span>
									</Button>
								))}
							</div>
						</div>

						<DropdownMenuSeparator className="opacity-50" />

						<DropdownMenuItem onClick={() => setEditModalOpen(true)} className="rounded-lg py-2.5">
							<Edit className="mr-3 h-4 w-4 text-slate-500" />
							<span className="font-medium">Editar Cadastro</span>
						</DropdownMenuItem>

						<DropdownMenuItem 
							onClick={() => setDeleteDialogOpen(true)}
							className="rounded-lg py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
						>
							<Archive className="mr-3 h-4 w-4" />
							<span className="font-medium">Arquivar Paciente</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				{editModalOpen && (
					<PatientEditModal
						open={editModalOpen}
						onOpenChange={setEditModalOpen}
						patientId={patient.id}
					/>
				)}

				{deleteDialogOpen && (
					<PatientDeleteDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}
						patientId={patient.id}
						patientName={patient.full_name}
					/>
				)}
			</div>
		);
	}

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

					<DropdownMenuItem onClick={handleWhatsApp}>
						<MessageSquare className="mr-2 h-4 w-4" />
						WhatsApp
					</DropdownMenuItem>

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
						<Archive className="mr-2 h-4 w-4" />
						Arquivar
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Modals */}
			{editModalOpen && (
				<PatientEditModal
					open={editModalOpen}
					onOpenChange={setEditModalOpen}
					patientId={patient.id}
				/>
			)}

			{deleteDialogOpen && (
				<PatientDeleteDialog
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
					patientId={patient.id}
					patientName={patient.full_name}
				/>
			)}
		</>
	);
};
