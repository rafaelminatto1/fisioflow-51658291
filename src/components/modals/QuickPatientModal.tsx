import React, { useEffect, useTransition, memo } from "react";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreatePatient } from "@/hooks/usePatientCrud";
import { useOrganizations } from "@/hooks/useOrganizations";
import { toast } from "sonner";
import {
	UserPlus,
	Loader2,
	Phone,
	Mail,
	BadgeCheck,
	AlertCircle,
} from "lucide-react";
import { formatPhoneInput } from "@/utils/formatInputs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ===== Schema de validação =====
const quickPatientSchema = z.object({
	full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
	phone: z.string().optional(),
	email: z.string().email("E-mail inválido").optional().or(z.literal("")),
	send_welcome_whatsapp: z.boolean().default(true),
});

type QuickPatientFormData = z.infer<typeof quickPatientSchema>;

interface QuickPatientModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	suggestedName?: string;
	onSuccess?: (patient: { id: string; name: string }) => void;
}

const QuickPatientModalComponent: React.FC<QuickPatientModalProps> = ({
	open,
	onOpenChange,
	suggestedName = "",
	onSuccess,
}) => {
	const isMobile = useIsMobile();
	const [isPending, startTransition] = useTransition();
	const { currentOrganization } = useOrganizations();
	const createMutation = useCreatePatient();

	const {
		register,
		handleSubmit,
		control,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = useForm<QuickPatientFormData>({
		resolver: zodResolver(quickPatientSchema),
		defaultValues: {
			full_name: suggestedName,
			phone: "",
			email: "",
			send_welcome_whatsapp: true,
		},
	});

	// Atualizar nome sugerido quando o modal abrir
	useEffect(() => {
		if (open) {
			reset({
				full_name: suggestedName,
				phone: "",
				email: "",
				send_welcome_whatsapp: true,
			});
		}
	}, [open, suggestedName, reset]);

	const onSubmit = async (data: QuickPatientFormData) => {
		if (!currentOrganization?.id) {
			toast.error("Organização não identificada");
			return;
		}

		startTransition(async () => {
			try {
				const result = await createMutation.mutateAsync({
					...data,
					organization_id: currentOrganization.id,
					status: "Inicial",
				});

				toast.success("Paciente cadastrado com sucesso!");
				onSuccess?.({ id: result.id, name: result.full_name });
				onOpenChange(false);
			} catch (error) {
				console.error("[QuickPatientModal] Erro ao criar:", error);
				// Toast de erro já é disparado pelo hook
			}
		});
	};

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatPhoneInput(e.target.value);
		setValue("phone", formatted);
	};

	const isLoading = isPending || createMutation.isPending;

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-md"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<CustomModalTitle className="flex items-center gap-2">
					<UserPlus className="h-5 w-5 text-primary" />
					Cadastro Rápido de Paciente
				</CustomModalTitle>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<div className="px-6 py-4 space-y-6">
					<p className="text-sm text-muted-foreground">
						Cadastre as informações essenciais para realizar o agendamento
						agora.
					</p>

					<form
						id="quick-patient-form"
						onSubmit={handleSubmit(onSubmit)}
						className="space-y-4"
					>
						{/* Nome Completo */}
						<div className="space-y-2">
							<Label
								htmlFor="quick-name"
								className="font-bold text-xs uppercase tracking-wider text-slate-500"
							>
								Nome Completo *
							</Label>
							<Input
								id="quick-name"
								placeholder="Ex: Maria Oliveira"
								className={cn(
									"rounded-xl border-slate-200 h-11 font-medium",
									errors.full_name && "border-destructive",
								)}
								{...register("full_name")}
								autoFocus
							/>
							{errors.full_name && (
								<p className="text-[10px] text-destructive font-bold uppercase">
									{errors.full_name.message}
								</p>
							)}
						</div>

						<div className="grid grid-cols-1 gap-4">
							{/* Telefone */}
							<div className="space-y-2">
								<Label
									htmlFor="quick-phone"
									className="font-bold text-xs uppercase tracking-wider text-slate-500"
								>
									Telefone / WhatsApp
								</Label>
								<div className="relative">
									<Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
									<Input
										id="quick-phone"
										placeholder="(00) 00000-0000"
										className="pl-9 rounded-xl border-slate-200 h-11"
										value={watch("phone") || ""}
										onChange={handlePhoneChange}
									/>
								</div>
							</div>

							{/* Email */}
							<div className="space-y-2">
								<Label
									htmlFor="quick-email"
									className="font-bold text-xs uppercase tracking-wider text-slate-500"
								>
									E-mail (opcional)
								</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
									<Input
										id="quick-email"
										type="email"
										placeholder="exemplo@email.com"
										className={cn(
											"pl-9 rounded-xl border-slate-200 h-11",
											errors.email && "border-destructive",
										)}
										{...register("email")}
									/>
								</div>
								{errors.email && (
									<p className="text-[10px] text-destructive font-bold uppercase">
										{errors.email.message}
									</p>
								)}
							</div>
						</div>

						{/* Welcome WhatsApp */}
						<div className="pt-2">
							<div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:bg-slate-100/50">
								<Controller
									name="send_welcome_whatsapp"
									control={control}
									render={({ field }) => (
										<Checkbox
											id="send-welcome"
											checked={field.value}
											onCheckedChange={field.onChange}
											className="rounded-md"
										/>
									)}
								/>
								<div className="space-y-0.5">
									<Label
										htmlFor="send-welcome"
										className="text-sm font-bold text-slate-700 cursor-pointer"
									>
										Enviar boas-vindas via WhatsApp
									</Label>
									<p className="text-[10px] text-slate-500 leading-tight">
										O paciente receberá uma mensagem automática com o link do
										portal.
									</p>
								</div>
							</div>
						</div>
					</form>

					{!currentOrganization?.id && (
						<div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-bold uppercase">
							<AlertCircle className="h-4 w-4 shrink-0" />
							Selecione uma organização antes de cadastrar
						</div>
					)}
				</div>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					type="button"
					variant="ghost"
					className="rounded-xl h-11 px-6 font-bold text-slate-500"
					onClick={() => onOpenChange(false)}
					disabled={isLoading}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					form="quick-patient-form"
					className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
					disabled={isLoading || !currentOrganization?.id}
				>
					{isLoading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<BadgeCheck className="h-4 w-4" />
					)}
					Cadastrar e Usar
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
};

export const QuickPatientModal = memo(
	QuickPatientModalComponent,
	(prevProps, nextProps) => {
		return (
			prevProps.open === nextProps.open &&
			prevProps.suggestedName === nextProps.suggestedName
		);
	},
);

QuickPatientModal.displayName = "QuickPatientModal";
