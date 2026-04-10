import React from "react";
import { UserPlus, Loader2, BadgeCheck } from "lucide-react";
import { PatientForm } from "./PatientForm";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patientsApi } from "@/api/v2";

interface PatientCreateModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const PatientCreateModal: React.FC<PatientCreateModalProps> = ({
	open,
	onOpenChange,
}) => {
	const isMobile = useIsMobile();
	const { currentOrganization, isCurrentOrgLoading, currentOrgError } =
		useOrganizations();
	const queryClient = useQueryClient();
	const formRef = React.useRef<HTMLFormElement>(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	const isLoading = isSubmitting;

	const handleExternalSubmit = () => {
		if (formRef.current) {
			formRef.current.requestSubmit();
		}
	};

	const handleSubmit = async (
		data: Parameters<typeof patientsApi.create>[0],
	) => {
		setIsSubmitting(true);
		try {
			console.log("[PatientCreateModal] Enviando dados do paciente...", {
				full_name: data.full_name,
				organization_id: data.organization_id,
			});
			const result = await patientsApi.create(data);
			console.log("[PatientCreateModal] Paciente criado com sucesso:", result);
			toast.success(`${data.full_name} foi cadastrado com sucesso!`);
			queryClient.invalidateQueries({ queryKey: ["patients"] });
			onOpenChange(false);
		} catch (err: unknown) {
			console.error("[PatientCreateModal] Erro ao criar paciente:", err);
			const msg =
				err instanceof Error ? err.message : "Erro ao cadastrar paciente";
			toast.error(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-4xl"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<CustomModalTitle className="flex items-center gap-2">
					<UserPlus className="w-5 h-5 text-primary" />
					Novo Paciente
				</CustomModalTitle>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<div className="px-6 py-4">
					<p className="text-sm text-muted-foreground mb-6">
						Preencha os dados do paciente. Os campos marcados com * são
						obrigatórios.
					</p>

					{isCurrentOrgLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-center space-y-4">
								<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
								<p className="text-muted-foreground">
									Carregando organização...
								</p>
							</div>
						</div>
					) : currentOrgError || !currentOrganization?.id ? (
						<div className="bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 text-center">
							<p className="font-medium">Erro ao carregar organização</p>
							<p className="text-sm opacity-80 mt-1">
								Não foi possível identificar sua organização atual.
							</p>
						</div>
					) : (
						<PatientForm
							ref={formRef}
							organizationId={currentOrganization.id}
							isLoading={isLoading}
							hideActions={true}
							intent="create"
							onSubmit={handleSubmit}
							onCancel={() => onOpenChange(false)}
						/>
					)}
				</div>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					type="button"
					variant="ghost"
					className="rounded-xl h-11 px-6 font-bold text-slate-500 hover:bg-slate-100"
					onClick={() => onOpenChange(false)}
					disabled={isLoading}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					onClick={handleExternalSubmit}
					className="rounded-xl h-11 px-8 gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
					disabled={isLoading || isCurrentOrgLoading || !!currentOrgError}
				>
					{isLoading ? (
						<div className="flex items-center gap-2">
							<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
							Salvando...
						</div>
					) : (
						<>
							<BadgeCheck className="w-4 h-4" />
							Cadastrar Paciente
						</>
					)}
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
};

export default PatientCreateModal;
