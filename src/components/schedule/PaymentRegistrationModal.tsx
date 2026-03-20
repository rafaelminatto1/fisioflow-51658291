import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	CalendarIcon,
	Loader2,
	DollarSign,
	BadgeCheck,
	CreditCard,
	Wallet,
	Banknote,
} from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FinancialService } from "@/services/financialService";
import { useUpdateAppointment } from "@/hooks/useAppointments";
import type { Appointment } from "@/types/appointment";
import { useIsMobile } from "@/hooks/use-mobile";

const paymentSchema = z.object({
	type: z.enum(["single_session", "package"]),
	amount: z.number().min(0.01, "Valor deve ser maior que zero"),
	method: z.string().min(1, "Selecione um método de pagamento"),
	date: z.date(),
	description: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentRegistrationModalProps {
	appointment: Appointment;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function PaymentRegistrationModal({
	appointment,
	open,
	onOpenChange,
	onSuccess,
}: PaymentRegistrationModalProps) {
	const isMobile = useIsMobile();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { mutateAsync: updateAppointment } = useUpdateAppointment();

	const form = useForm<PaymentFormValues>({
		resolver: zodResolver(paymentSchema),
		defaultValues: {
			type: "single_session",
			amount: appointment.payment_amount
				? Number(appointment.payment_amount)
				: 0,
			method: "pix",
			date: new Date(),
			description: "",
		},
	});

	const {
		register,
		setValue,
		watch,
		handleSubmit,
		formState: { errors },
		reset,
	} = form;

	// Reset form when modal opens
	useEffect(() => {
		if (open) {
			reset({
				type: "single_session",
				amount: appointment.payment_amount
					? Number(appointment.payment_amount)
					: 0,
				method: "pix",
				date: new Date(),
				description: `Pagamento referente ao atendimento de ${appointment.patientName}`,
			});
		}
	}, [open, appointment, reset]);

	const date = watch("date");
	const type = watch("type");

	const onSubmit = async (data: PaymentFormValues) => {
		setIsSubmitting(true);
		try {
			// 1. Create Financial Transaction
			await FinancialService.createTransaction({
				tipo: "receita",
				category: data.type === "package" ? "Pacote" : "Atendimento",
				descricao: data.description || `Pagamento - ${appointment.patientName}`,
				valor: data.amount,
				status: "concluido",
				metadata: {
					appointmentId: appointment.id,
					patientId: appointment.patientId,
					paymentMethod: data.method,
					paymentType: data.type,
				},
				user_id: appointment.therapistId,
			});

			// 2. Update Appointment Status
			await updateAppointment({
				appointmentId: appointment.id,
				updates: {
					payment_status: "paid",
				},
			});

			toast.success("Pagamento registrado com sucesso!");
			onSuccess?.();
			onOpenChange(false);
		} catch (error) {
			console.error("Erro ao registrar pagamento:", error);
			toast.error("Erro ao registrar pagamento. Tente novamente.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-md"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<CustomModalTitle className="flex items-center gap-2">
					<DollarSign className="h-5 w-5 text-emerald-600" />
					Registrar Pagamento
				</CustomModalTitle>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<div className="px-6 py-4 space-y-6">
					<div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-2">
						<p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">
							Paciente
						</p>
						<p className="text-sm font-semibold text-emerald-900">
							{appointment.patientName}
						</p>
					</div>

					<form
						id="payment-form"
						onSubmit={handleSubmit(onSubmit)}
						className="space-y-4"
					>
						{/* Tipo de Pagamento */}
						<div className="space-y-2">
							<Label className="font-semibold text-xs">
								Tipo de Referência
							</Label>
							<Select
								value={watch("type")}
								onValueChange={(val) =>
									setValue("type", val as "single_session" | "package")
								}
							>
								<SelectTrigger className="rounded-xl border-slate-200">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="single_session">Sessão Avulsa</SelectItem>
									<SelectItem value="package">Pacote / Plano</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Valor */}
						<div className="space-y-2">
							<Label htmlFor="amount" className="font-semibold text-xs">
								Valor Recebido (R$)
							</Label>
							<div className="relative">
								<DollarSign className="absolute left-3 top-3 h-4 w-4 text-emerald-600" />
								<Input
									id="amount"
									type="number"
									step="0.01"
									className="pl-9 rounded-xl border-slate-200 h-11 text-lg font-bold"
									placeholder="0.00"
									{...register("amount", { valueAsNumber: true })}
								/>
							</div>
							{errors.amount && (
								<p className="text-[10px] text-destructive font-medium">
									{errors.amount.message}
								</p>
							)}
						</div>

						{/* Método de Pagamento */}
						<div className="space-y-2">
							<Label className="font-semibold text-xs">
								Forma de Pagamento
							</Label>
							<Select
								value={watch("method")}
								onValueChange={(val) => setValue("method", val)}
							>
								<SelectTrigger className="rounded-xl border-slate-200">
									<SelectValue placeholder="Selecione..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pix">
										<div className="flex items-center gap-2">
											<Wallet className="h-4 w-4 text-emerald-500" />
											Pix
										</div>
									</SelectItem>
									<SelectItem value="credit_card">
										<div className="flex items-center gap-2">
											<CreditCard className="h-4 w-4 text-blue-500" />
											Cartão de Crédito
										</div>
									</SelectItem>
									<SelectItem value="debit_card">
										<div className="flex items-center gap-2">
											<CreditCard className="h-4 w-4 text-purple-500" />
											Cartão de Débito
										</div>
									</SelectItem>
									<SelectItem value="cash">
										<div className="flex items-center gap-2">
											<Banknote className="h-4 w-4 text-orange-500" />
											Dinheiro
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
							{errors.method && (
								<p className="text-[10px] text-destructive font-medium">
									{errors.method.message}
								</p>
							)}
						</div>

						{/* Data */}
						<div className="space-y-2">
							<Label className="font-semibold text-xs">
								Data do Recebimento
							</Label>
							<Popover>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										className={cn(
											"w-full justify-start text-left font-normal rounded-xl border-slate-200 h-11",
											!date && "text-muted-foreground",
										)}
									>
										<CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
										{date ? (
											format(date, "PPP", { locale: ptBR })
										) : (
											<span>Selecione a data</span>
										)}
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0 z-[110]" align="start">
									<Calendar
										mode="single"
										selected={date}
										onSelect={(d) => d && setValue("date", d)}
										initialFocus
										locale={ptBR}
									/>
								</PopoverContent>
							</Popover>
						</div>
					</form>
				</div>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile}>
				<Button
					type="button"
					variant="ghost"
					className="rounded-xl h-11 px-6 font-bold text-slate-500"
					onClick={() => onOpenChange(false)}
					disabled={isSubmitting}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					form="payment-form"
					disabled={isSubmitting}
					className="rounded-xl h-11 px-8 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-bold uppercase tracking-wider"
				>
					{isSubmitting ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<BadgeCheck className="h-4 w-4" />
					)}
					Confirmar Pagamento
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
}
