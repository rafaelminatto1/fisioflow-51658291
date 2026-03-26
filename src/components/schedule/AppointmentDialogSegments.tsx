import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	CalendarIcon,
	User,
	Package,
	AlertTriangle,
	Check,
	Zap,
	Repeat,
	Bell,
	Copy,
	Wand2,
	Clock,
} from "lucide-react";
import {
	format,
	parseISO,
	addDays,
	addWeeks,
	startOfDay,
	isBefore,
	isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
	type AppointmentType,
	type AppointmentStatus,
	type AppointmentFormData,
	type RecurringConfig,
	type RecurringDayConfig,
} from "@/types/appointment";
import { type Patient } from "@/types";
import {
	APPOINTMENT_TYPES,
	APPOINTMENT_STATUSES,
	STATUS_LABELS,
	STATUS_COLORS,
} from "@/constants/appointments";
import { EquipmentSelector, type SelectedEquipment } from "./EquipmentSelector";
import {
	AppointmentReminder,
	type AppointmentReminderData,
} from "./AppointmentReminder";
import { usePatientPackages } from "@/hooks/usePackages";
import { NewPackagePopover } from "./NewPackagePopover";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const premiumFieldBaseClass =
	"w-full justify-between rounded-xl border border-blue-100 bg-white px-3 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 data-[state=open]:border-blue-300 data-[state=open]:bg-blue-50/50";

const premiumFieldClass = `${premiumFieldBaseClass} h-11 text-xs sm:text-sm`;

const premiumSelectContentClass =
	"rounded-xl border border-blue-100 bg-white p-1 shadow-lg backdrop-blur-sm";

export const PatientSelectionSection = ({
	patients,
	isLoading,
	disabled,
	onCreateNew,
	fallbackPatientName,
	fallbackDescription,
}: {
	patients: Patient[];
	isLoading: boolean;
	disabled: boolean;
	onCreateNew: (name: string) => void;
	/** Nome do paciente recém-criado (cadastro rápido) para exibir até a lista atualizar */
	fallbackPatientName?: string;
	/** Descrição opcional para o fallback (ex.: "Recém-cadastrado") */
	fallbackDescription?: string;
}) => {
	const {
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<AppointmentFormData>();

	return (
		<div className="space-y-2">
			<Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
				<User className="h-3.5 w-3.5 text-primary" />
				Paciente *
			</Label>
			<PatientCombobox
				patients={patients}
				value={watch("patient_id")}
				onValueChange={(value) =>
					setValue("patient_id", value, {
						shouldDirty: true,
						shouldTouch: true,
						shouldValidate: true,
					})
				}
				onCreateNew={onCreateNew}
				fallbackDisplayName={fallbackPatientName}
				fallbackDescription={fallbackDescription}
				disabled={disabled || isLoading}
				aria-invalid={!!errors.patient_id}
				aria-describedby={errors.patient_id ? "patient-id-error" : undefined}
			/>
			{errors.patient_id && (
				<p id="patient-id-error" className="text-xs text-destructive">
					{(errors.patient_id as { message?: string })?.message}
				</p>
			)}
		</div>
	);
};

export const DateTimeSection = ({
	disabled,
	timeSlots,
	isCalendarOpen,
	setIsCalendarOpen,
	getMinCapacityForInterval,
	conflictCount,
	onAutoSchedule,
	watchedDateStr,
	watchedTime,
	watchedDuration,
}: {
	disabled: boolean;
	timeSlots: string[];
	isCalendarOpen: boolean;
	setIsCalendarOpen: (open: boolean) => void;
	getMinCapacityForInterval: (
		day: number,
		time: string,
		duration: number,
	) => number;
	conflictCount: number;
	onAutoSchedule?: () => void;
	watchedDateStr?: string;
	watchedTime?: string;
	watchedDuration?: number;
}) => {
	const {
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<AppointmentFormData>();
	// Use props if provided, otherwise watch (for backwards compatibility)
	const _watchedDateStr = watchedDateStr ?? watch("appointment_date");
	const _watchedTime = watchedTime ?? watch("appointment_time");
	const _watchedDuration = watchedDuration ?? watch("duration");

	const watchedDate = _watchedDateStr
		? typeof _watchedDateStr === "string"
			? parseISO(_watchedDateStr)
			: (_watchedDateStr as Date)
		: null;

	const maxCapacity =
		watchedDate && _watchedTime && _watchedDuration
			? getMinCapacityForInterval(
					watchedDate.getDay(),
					_watchedTime,
					_watchedDuration,
				)
			: 0;
	const availableSlots = maxCapacity - conflictCount;
	const exceedsCapacity = conflictCount >= maxCapacity;

	return (
		<div className="space-y-3">
			{/* Data — linha própria para não truncar */}
			<div className="space-y-2">
				<Label
					id="date-label"
					className="text-xs sm:text-sm font-medium flex items-center gap-1.5"
				>
					<CalendarIcon className="h-3.5 w-3.5 text-primary" />
					Data *
				</Label>
				<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className={cn(
								premiumFieldClass,
								"w-full justify-start font-normal",
								!watchedDate && "text-muted-foreground",
								errors.appointment_date &&
									"border-destructive text-destructive shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)]",
							)}
							disabled={disabled}
							aria-labelledby="date-label"
							aria-required="true"
							aria-invalid={!!errors.appointment_date}
							aria-describedby={
								errors.appointment_date ? "date-error" : undefined
							}
						>
							<CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-primary/80" />
							<span className="truncate">
								{watchedDate
									? format(watchedDate, "dd 'de' MMMM", { locale: ptBR })
									: "Selecionar data"}
							</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-auto rounded-[22px] border border-border/70 bg-background/95 p-0 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl"
						align="start"
					>
						<div className="p-3 border-b border-border/50 flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary"
								onClick={() => {
									setValue(
										"appointment_date",
										format(new Date(), "yyyy-MM-dd"),
									);
									setIsCalendarOpen(false);
								}}
							>
								Hoje
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary"
								onClick={() => {
									setValue(
										"appointment_date",
										format(addDays(new Date(), 1), "yyyy-MM-dd"),
									);
									setIsCalendarOpen(false);
								}}
							>
								Amanhã
							</Button>
						</div>
						<Calendar
							mode="single"
							selected={watchedDate || undefined}
							onSelect={(date) => {
								if (date) {
									setValue("appointment_date", format(date, "yyyy-MM-dd"));
								}
								setIsCalendarOpen(false);
							}}
							locale={ptBR}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
				{errors.appointment_date && (
					<p id="date-error" className="text-xs text-destructive font-medium">
						{(errors.appointment_date as { message?: string })?.message}
					</p>
				)}
			</div>

			{/* Horário + Duração — dois campos lado a lado */}
			<div className="grid grid-cols-2 gap-3">
				<div className="space-y-2 relative">
					<div className="flex items-center justify-between">
						<Label
							id="time-label"
							className="text-xs sm:text-sm font-medium flex items-center gap-1.5"
						>
							<Clock className="h-3.5 w-3.5 text-primary" />
							Horário *
						</Label>
						{onAutoSchedule && !disabled && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-6 w-6 -mt-1 -mr-1 text-primary hover:text-primary hover:bg-primary/10"
								onClick={onAutoSchedule}
								title="Sugerir melhor horário"
								aria-label="Sugerir melhor horário"
							>
								<Wand2 className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
					<Select
						value={watchedTime}
						onValueChange={(value) => setValue("appointment_time", value)}
						disabled={disabled}
					>
						<SelectTrigger
							className={cn(
								premiumFieldClass,
								errors.appointment_time &&
									"border-destructive text-destructive shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)]",
							)}
							aria-labelledby="time-label"
							aria-required="true"
							aria-invalid={!!errors.appointment_time}
							aria-describedby={
								errors.appointment_time ? "time-error" : undefined
							}
						>
							<SelectValue placeholder="Hora" />
						</SelectTrigger>
						<SelectContent
							className={cn(premiumSelectContentClass, "max-h-60")}
						>
							{timeSlots.map((slot) => (
								<SelectItem key={slot} value={slot}>
									{slot}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{errors.appointment_time && (
						<p id="time-error" className="text-xs text-destructive font-medium">
							{(errors.appointment_time as { message?: string })?.message}
						</p>
					)}
				</div>

				<div className="space-y-2">
					<Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
						<Zap className="h-3.5 w-3.5 text-primary" />
						Duração
					</Label>
					<Select
						value={watchedDuration?.toString()}
						onValueChange={(value) => setValue("duration", parseInt(value))}
						disabled={disabled}
					>
						<SelectTrigger className={premiumFieldClass}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent className={premiumSelectContentClass}>
							<SelectItem value="30">30 min</SelectItem>
							<SelectItem value="45">45 min</SelectItem>
							<SelectItem value="60">1 hora</SelectItem>
							<SelectItem value="90">1h30</SelectItem>
							<SelectItem value="120">2 horas</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{watchedDate && watchedTime && (
				<div
					className={cn(
						"flex items-center justify-between p-3 border rounded-lg text-sm transition-all",
						exceedsCapacity
							? "border-red-500/30 bg-red-500/5"
							: conflictCount > 0
								? "border-amber-500/30 bg-amber-500/5"
								: "border-emerald-500/30 bg-emerald-500/5",
					)}
				>
					<div className="flex items-center gap-2">
						{exceedsCapacity ? (
							<AlertTriangle className="w-4 h-4 text-red-600" />
						) : (
							<Check className="w-4 h-4 text-emerald-600" />
						)}
						<span
							className={cn(
								"font-medium",
								exceedsCapacity
									? "text-red-700"
									: conflictCount > 0
										? "text-amber-700"
										: "text-emerald-700",
							)}
						>
							{exceedsCapacity
								? "Horário lotado!"
								: availableSlots === maxCapacity
									? "Horário livre"
									: `${availableSlots} ${availableSlots !== 1 ? "vagas disponíveis" : "vaga disponível"}`}
						</span>
					</div>
					<Badge
						variant="outline"
						className={cn(
							"text-xs h-6",
							exceedsCapacity ? "border-red-500/50" : "border-muted",
						)}
					>
						{conflictCount}/{maxCapacity}
					</Badge>
				</div>
			)}
		</div>
	);
};

export const TypeAndStatusSection = ({ disabled }: { disabled: boolean }) => {
	const {
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<AppointmentFormData>();

	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="space-y-2">
				<Label id="type-label" className="text-xs sm:text-sm font-medium">
					Tipo *
				</Label>
				<Select
					value={watch("type")}
					onValueChange={(value) => setValue("type", value as AppointmentType)}
					disabled={disabled}
				>
					<SelectTrigger
						className={cn(
							premiumFieldClass,
							errors.type &&
								"border-destructive text-destructive shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)]",
						)}
						data-testid="appointment-type"
						aria-labelledby="type-label"
						aria-required="true"
						aria-invalid={!!errors.type}
						aria-describedby={errors.type ? "type-error" : undefined}
					>
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent className={premiumSelectContentClass}>
						{APPOINTMENT_TYPES.map((type) => (
							<SelectItem key={type} value={type}>
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.type && (
					<p id="type-error" className="text-xs text-destructive font-medium">
						{(errors.type as { message?: string })?.message}
					</p>
				)}
			</div>

			<div className="space-y-2">
				<Label id="status-label" className="text-xs sm:text-sm font-medium">
					Status *
				</Label>
				<Select
					value={watch("status")}
					onValueChange={(value) =>
						setValue("status", value as AppointmentStatus)
					}
					disabled={disabled}
				>
					<SelectTrigger
						className={premiumFieldClass}
						aria-labelledby="status-label"
						aria-required="true"
					>
						<SelectValue placeholder="Selecione o status" />
					</SelectTrigger>
					<SelectContent className={premiumSelectContentClass}>
						{APPOINTMENT_STATUSES.map((status) => (
							<SelectItem key={status} value={status}>
								<div className="flex items-center gap-2">
									<div
										className={cn(
											"w-2 h-2 rounded-full",
											STATUS_COLORS[status],
										)}
									/>
									{STATUS_LABELS[status]}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
};

export const PaymentTab = ({
	disabled,
	watchPaymentStatus,
	watchPaymentMethod,
	watchPaymentAmount,
	patientId,
	patientName,
}: {
	disabled: boolean;
	watchPaymentStatus: string;
	watchPaymentMethod: string;
	watchPaymentAmount: number;
	patientId?: string;
	patientName?: string;
}) => {
	const { register, setValue, watch } = useFormContext<AppointmentFormData>();
	const { data: patientPackages, isLoading: isLoadingPackages } =
		usePatientPackages(patientId);
	const selectedPackageId = watch("session_package_id") || "";

	const activePackages =
		patientPackages?.filter(
			(p) => p.status === "active" && (p.sessions_remaining || 0) > 0,
		) || [];
	const selectedPackage =
		activePackages.find((pkg) => pkg.id === selectedPackageId) || null;
	const resolvedPackage =
		selectedPackage || (activePackages.length === 1 ? activePackages[0] : null);
	const resolvedPatientName =
		patientName?.trim() || "Paciente selecionado acima";

	const isPaid = watchPaymentStatus !== "pending";
	const watchedStatus = watch("status");

	// Regra: Se o status for alterado para Faltou/Cancelado, resetar pagamento (não cobramos)
	useEffect(() => {
		const nonChargingStatuses = [
			"cancelado",
			"faltou",
			"faltou_com_aviso",
			"faltou_sem_aviso",
			"nao_atendido",
			"nao_atendido_sem_cobranca",
			"remarcar",
		];

		if (
			watchedStatus &&
			nonChargingStatuses.includes(watchedStatus.toLowerCase())
		) {
			if (watchPaymentStatus !== "pending") {
				setValue("payment_status", "pending");
				setValue("payment_amount", 0);
				setValue("payment_method", "");
				setValue("session_package_id", null);
			}
		}
	}, [watchedStatus, setValue, watchPaymentStatus]);

	useEffect(() => {
		if (watchPaymentStatus !== "paid_package") return;

		if (!patientId) {
			if (selectedPackageId) {
				setValue("session_package_id", null);
			}
			return;
		}

		const packageStillValid = activePackages.some(
			(pkg) => pkg.id === selectedPackageId,
		);
		if (packageStillValid) return;

		if (activePackages.length === 1) {
			setValue("session_package_id", activePackages[0].id);
			return;
		}

		if (selectedPackageId) {
			setValue("session_package_id", null);
		}
	}, [
		activePackages,
		patientId,
		selectedPackageId,
		setValue,
		watchPaymentStatus,
	]);

	const handlePaidChange = (checked: boolean) => {
		if (checked) {
			// Default to 'paid_single' when switching to paid
			setValue("payment_status", "paid_single");
			setValue("payment_amount", 180); // Default single session price
			setValue("session_package_id", null);
		} else {
			setValue("payment_status", "pending");
			setValue("payment_amount", 0);
			setValue("payment_method", "");
			setValue("installments", 1);
			setValue("session_package_id", null);
		}
	};

	const handlePaymentTypeChange = (value: string) => {
		setValue("payment_status", value);
		if (value === "paid_single") {
			setValue("payment_amount", 180);
			setValue("session_package_id", null);
		} else if (value === "paid_package") {
			setValue("payment_amount", 170); // Default package session price
			setValue("payment_method", "");
			setValue("installments", 1);
			if (activePackages.length === 1) {
				setValue("session_package_id", activePackages[0].id);
			} else {
				setValue("session_package_id", null);
			}
		}
	};

	const paymentMethods = [
		{ value: "pix", label: "PIX", icon: "📲" },
		{ value: "dinheiro", label: "Dinheiro", icon: "💵" },
		{ value: "debito", label: "Débito", icon: "💳" },
		{ value: "credito", label: "Crédito", icon: "💳" },
	];

	return (
		<div className="mt-0 space-y-4 sm:space-y-5">
			<div className="flex items-center justify-between gap-3 rounded-[24px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))]">
				<div className="min-w-0">
					<div className="mb-1 flex items-center gap-2">
						<span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
							Financeiro
						</span>
						<Badge
							variant="outline"
							className={cn(
								"h-6 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
								isPaid
									? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
									: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
							)}
						>
							{isPaid ? "Pago" : "Pendente"}
						</Badge>
					</div>
					<Label
						htmlFor="payment-status-toggle"
						className="flex flex-col gap-0.5"
					>
						<span className="font-semibold text-sm">Sessão Paga</span>
						<span className="text-xs text-muted-foreground">
							{isPaid
								? "Pagamento registrado e pronto para conferência."
								: "Pagamento ainda não registrado."}
						</span>
					</Label>
				</div>

				<Switch
					id="payment-status-toggle"
					checked={isPaid}
					onCheckedChange={handlePaidChange}
					disabled={disabled}
					className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-slate-300/80"
				/>
			</div>

			{isPaid && (
				<div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
					<div className="rounded-[24px] border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]">
						<Label className="text-xs sm:text-sm font-medium mb-2 block">
							Como foi o pagamento?
						</Label>
						<RadioGroup
							value={watchPaymentStatus}
							onValueChange={handlePaymentTypeChange}
							className="grid grid-cols-2 gap-3"
							disabled={disabled}
						>
							<Label
								className={cn(
									"group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[22px] border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 text-center transition-[transform,box-shadow,border-color,background-color] hover:-translate-y-px hover:border-primary/20 hover:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]",
									watchPaymentStatus === "paid_single" &&
										"border-primary/25 bg-gradient-to-b from-primary/[0.08] to-background shadow-[0_22px_40px_-30px_rgba(37,99,235,0.38)]",
								)}
							>
								<RadioGroupItem
									value="paid_single"
									id="paid_single"
									className="sr-only"
								/>
								<span className="mb-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
									Imediato
								</span>
								<span className="text-2xl">💵</span>
								<span className="mt-1 font-semibold text-sm">Avulso</span>
								<span className="mt-1 text-[11px] text-muted-foreground">
									Cobrança direta da sessão atual
								</span>
							</Label>
							<Label
								className={cn(
									"group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[22px] border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 text-center transition-[transform,box-shadow,border-color,background-color] hover:-translate-y-px hover:border-primary/20 hover:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]",
									watchPaymentStatus === "paid_package" &&
										"border-primary/25 bg-gradient-to-b from-primary/[0.08] to-background shadow-[0_22px_40px_-30px_rgba(37,99,235,0.38)]",
									!patientId && "cursor-not-allowed opacity-60 saturate-75",
								)}
							>
								<RadioGroupItem
									value="paid_package"
									id="paid_package"
									className="sr-only"
									disabled={!patientId}
								/>
								<span className="mb-2 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
									Fidelizado
								</span>
								<span className="text-2xl">📦</span>
								<span className="mt-1 font-semibold text-sm">Pagou pacote</span>
								<span className="mt-1 text-[11px] text-muted-foreground">
									{patientId
										? "Consome saldo ja contratado"
										: "Escolha o paciente acima para liberar"}
								</span>
							</Label>
						</RadioGroup>
					</div>

					{watchPaymentStatus === "paid_package" && (
						<div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
							<div className="rounded-[24px] border border-blue-500/15 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))]">
								<div className="flex items-start justify-between gap-3">
									<div>
										<Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
											<Package className="h-3.5 w-3.5 text-blue-600" />
											Pacote vinculado ao paciente
										</Label>
										<p className="mt-1 text-[11px] text-muted-foreground">
											O sistema usa automaticamente o paciente escolhido no
											campo acima. Nao precisa selecionar de novo.
										</p>
									</div>
									{patientId && (
										<Badge
											variant="outline"
											className="rounded-full border-blue-500/15 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300"
										>
											Vinculado
										</Badge>
									)}
								</div>

								{patientId ? (
									<div className="mt-3 rounded-[20px] border border-blue-500/15 bg-background/85 p-3 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.28)]">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="text-sm font-semibold text-foreground truncate">
													{resolvedPatientName}
												</p>
												<p className="mt-1 text-[11px] text-muted-foreground">
													Este agendamento sera marcado como pago via pacote e o
													saldo ficara contabilizado no perfil do paciente.
												</p>
											</div>
											<span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
												Perfil atualizado
											</span>
										</div>
									</div>
								) : (
									<div className="mt-3 rounded-[20px] border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-700">
										Selecione primeiro o paciente no topo do modal para
										registrar o pacote corretamente.
									</div>
								)}

								{patientId && (
									<div className="mt-3 space-y-3">
										<div className="flex items-center justify-between gap-3">
											<span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
												Saldo do paciente
											</span>
											{isLoadingPackages && (
												<span className="text-xs text-muted-foreground animate-pulse">
													Carregando...
												</span>
											)}
											{!isLoadingPackages && activePackages.length === 0 && (
												<NewPackagePopover
													patientId={patientId}
													triggerLabel="Registrar 10 sessoes"
													triggerClassName="h-10 rounded-2xl border-blue-500/25 bg-blue-500/10 px-3 text-xs font-semibold text-blue-700 shadow-[0_16px_30px_-24px_rgba(59,130,246,0.45)] hover:bg-blue-500/15 dark:text-blue-300"
													presetPackage={{
														name: "Pacote 10 Sessoes",
														sessionsCount: 10,
														totalPrice: 1700,
														validityDays: 365,
														title: "Registrar pacote de 10 sessoes",
														description:
															"O paciente ja vem preenchido pelo modal. Ao confirmar, o pacote entra no perfil dele e este agendamento fica vinculado ao saldo.",
														submitLabel: "Registrar pacote",
													}}
													onPackageCreated={(newPackageId) => {
														setValue("session_package_id", newPackageId);
													}}
												/>
											)}
										</div>

										{activePackages.length > 0 ? (
											<div className="space-y-2">
												{activePackages.length > 1 ? (
													<Select
														value={selectedPackageId}
														onValueChange={(val) =>
															setValue("session_package_id", val)
														}
														disabled={disabled}
													>
														<SelectTrigger
															className={cn(
																premiumFieldClass,
																"border-blue-200/70 bg-gradient-to-b from-blue-50/80 to-background dark:from-blue-950/20",
															)}
														>
															<SelectValue placeholder="Selecione o pacote para debitar" />
														</SelectTrigger>
														<SelectContent
															className={premiumSelectContentClass}
														>
															{activePackages.map((pkg) => (
																<SelectItem key={pkg.id} value={pkg.id}>
																	{pkg.package?.name} ({pkg.sessions_remaining}{" "}
																	sessoes restantes)
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												) : null}

												{resolvedPackage && (
													<div className="rounded-[20px] border border-blue-500/15 bg-blue-50/70 p-3 text-blue-900 shadow-[0_16px_28px_-24px_rgba(59,130,246,0.45)] dark:bg-blue-950/20 dark:text-blue-100">
														<div className="flex items-start justify-between gap-3">
															<div className="min-w-0">
																<p className="text-sm font-semibold truncate">
																	{resolvedPackage.package?.name ??
																		"Pacote ativo"}
																</p>
																<p className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-200/80">
																	{activePackages.length === 1
																		? "O pacote ativo foi vinculado automaticamente a este agendamento."
																		: "Selecione qual pacote deve ser debitado neste agendamento."}
																</p>
															</div>
															<span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700 shadow-sm dark:bg-blue-950/40 dark:text-blue-200">
																{resolvedPackage.sessions_remaining} restantes
															</span>
														</div>
													</div>
												)}

												{resolvedPackage &&
													(resolvedPackage.sessions_remaining || 0) <= 1 && (
														<div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
															<AlertTriangle className="h-3.5 w-3.5" />
															<span className="text-[10px] sm:text-xs font-medium">
																Ultima sessao deste pacote. Vale oferecer
																renovacao ao paciente.
															</span>
														</div>
													)}
											</div>
										) : !isLoadingPackages ? (
											<div className="rounded-[20px] border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-700">
												<span className="flex items-center gap-1.5 font-medium">
													<AlertTriangle className="h-3.5 w-3.5" />
													Nenhum pacote ativo com saldo
												</span>
												<p className="mt-1">
													Registre agora um pacote de 10 sessoes para este
													paciente. Assim o saldo fica salvo no perfil dele e
													este atendimento ja aparece como pago via pacote.
												</p>
											</div>
										) : null}
									</div>
								)}
							</div>
						</div>
					)}

					<div className="space-y-1.5 rounded-[24px] border border-border/70 bg-gradient-to-b from-background to-muted/20 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)]">
						<Label className="text-xs sm:text-sm font-medium">
							{watchPaymentStatus === "paid_package"
								? "Valor de Referência por Sessão (R$)"
								: "Valor da Sessão (R$)"}
						</Label>
						<div className="relative">
							<span className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary shadow-sm">
								R$
							</span>
							<input
								type="number"
								step="0.01"
								min="0"
								{...register("payment_amount", { valueAsNumber: true })}
								className="flex h-12 w-full rounded-2xl border border-border/70 bg-gradient-to-b from-background to-muted/20 px-[4.6rem] py-2 text-sm shadow-[0_12px_28px_-24px_rgba(15,23,42,0.35)] ring-offset-background transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={disabled}
							/>
						</div>
						<p className="rounded-2xl bg-muted/40 px-3 py-2 text-[10px] sm:text-xs text-muted-foreground">
							{watchPaymentStatus === "paid_package"
								? "O pacote fica contabilizado no perfil do paciente. Este valor funciona como referencia interna por sessao."
								: "Referencia rapida: pacote R$ 170/sessao, avulso R$ 180/sessao."}
						</p>
					</div>

					{watchPaymentStatus === "paid_single" ? (
						<div className="space-y-3 rounded-[24px] border border-blue-500/15 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))]">
							<Label className="text-xs sm:text-sm font-medium">
								Forma de Pagamento
							</Label>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
								{paymentMethods.map((method) => (
									<Button
										key={method.value}
										type="button"
										variant="outline"
										size="sm"
										className={cn(
											"h-14 rounded-2xl border border-border/70 bg-gradient-to-b from-background to-muted/20 text-[10px] shadow-[0_16px_30px_-26px_rgba(15,23,42,0.35)] transition-[transform,box-shadow,border-color,background-color] hover:-translate-y-px hover:border-blue-500/25 hover:bg-blue-500/[0.05]",
											watchPaymentMethod === method.value
												? "border-blue-500/25 bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_20px_36px_-28px_rgba(59,130,246,0.55)] hover:bg-blue-600"
												: "text-foreground",
										)}
										onClick={() => setValue("payment_method", method.value)}
										disabled={disabled}
									>
										<span className="text-base">{method.icon}</span>
										{method.label}
									</Button>
								))}
							</div>

							{watchPaymentMethod === "credito" && (
								<div className="space-y-1.5 pt-2 border-t border-blue-500/20">
									<Label className="text-xs sm:text-sm">
										Parcelas (até 6x sem juros)
									</Label>
									<Select
										value={watch("installments")?.toString()}
										onValueChange={(value) =>
											setValue("installments", parseInt(value))
										}
										disabled={disabled}
									>
										<SelectTrigger className={cn(premiumFieldClass, "text-sm")}>
											<SelectValue placeholder="Parcelas" />
										</SelectTrigger>
										<SelectContent className={premiumSelectContentClass}>
											{[1, 2, 3, 4, 5, 6].map((num) => (
												<SelectItem key={num} value={num.toString()}>
													{num}x de R$ {(watchPaymentAmount / num).toFixed(2)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
					) : (
						<div className="rounded-[24px] border border-blue-500/15 bg-blue-50/70 p-4 text-blue-900 shadow-[0_18px_40px_-32px_rgba(59,130,246,0.32)] dark:bg-blue-950/20 dark:text-blue-100">
							<div className="flex items-start gap-3">
								<div className="mt-0.5 rounded-full bg-white/80 p-2 shadow-sm dark:bg-blue-950/40">
									<Check className="h-4 w-4 text-blue-600 dark:text-blue-300" />
								</div>
								<div>
									<p className="text-sm font-semibold">
										Pagamento identificado por pacote
									</p>
									<p className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-200/80">
										Quando houver venda de um novo pacote, a forma de pagamento
										e registrada no cadastro do proprio pacote. Neste
										agendamento o sistema apenas vincula o saldo do paciente.
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

const WEEKDAYS = [
	{ value: 0, label: "Dom", short: "D" },
	{ value: 1, label: "Seg", short: "S" },
	{ value: 2, label: "Ter", short: "T" },
	{ value: 3, label: "Qua", short: "Q" },
	{ value: 4, label: "Qui", short: "Q" },
	{ value: 5, label: "Sex", short: "S" },
	{ value: 6, label: "Sáb", short: "S" },
];

const WEEKDAY_NAMES = [
	"Domingo",
	"Segunda-feira",
	"Terça-feira",
	"Quarta-feira",
	"Quinta-feira",
	"Sexta-feira",
	"Sábado",
];

function generateRecurringPreview(
	startDate: Date,
	config: RecurringConfig,
): { date: Date; time: string }[] {
	if (config.days.length === 0) return [];
	const sorted = [...config.days].sort((a, b) => a.day - b.day);
	const maxSessions = config.endType === "sessions" ? config.sessions : 60;
	const endDate =
		config.endType === "date" && config.endDate
			? parseISO(config.endDate)
			: null;
	const results: { date: Date; time: string }[] = [];
	const startDay = startDate.getDay();
	let weekStart = startOfDay(addDays(startDate, -startDay));
	let weeksChecked = 0;
	while (results.length < maxSessions && weeksChecked < 100) {
		for (const d of sorted) {
			const date = addDays(weekStart, d.day);
			if (isBefore(startOfDay(date), startOfDay(startDate))) continue;
			if (endDate && isAfter(startOfDay(date), startOfDay(endDate)))
				return results;
			results.push({ date, time: d.time });
			if (results.length >= maxSessions) break;
		}
		weekStart = addWeeks(weekStart, 1);
		weeksChecked++;
	}
	return results;
}

function RecurringConfigPanel({
	config,
	onChange,
	disabled,
	appointmentDate,
	appointmentTime,
}: {
	config: RecurringConfig;
	onChange: (c: RecurringConfig) => void;
	disabled: boolean;
	appointmentDate: Date;
	appointmentTime: string;
}) {
	const preview = useMemo(
		() => generateRecurringPreview(appointmentDate, config),
		[appointmentDate, config],
	);

	const toggleDay = (day: number) => {
		const exists = config.days.find((d) => d.day === day);
		if (exists) {
			onChange({ ...config, days: config.days.filter((d) => d.day !== day) });
		} else {
			const newDay: RecurringDayConfig = {
				day,
				time: appointmentTime || "09:00",
			};
			const newDays = [...config.days, newDay].sort((a, b) => a.day - b.day);
			onChange({ ...config, days: newDays });
		}
	};

	const updateDayTime = (day: number, time: string) => {
		onChange({
			...config,
			days: config.days.map((d) => (d.day === day ? { ...d, time } : d)),
		});
	};

	const endDateObj = config.endDate
		? (() => {
				try {
					return parseISO(config.endDate);
				} catch {
					return undefined;
				}
			})()
		: undefined;

	return (
		<div className="space-y-3 rounded-[20px] border border-blue-500/15 bg-background/80 p-3 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.28)]">
			{/* Dias da semana */}
			<div className="space-y-1.5">
				<Label className="text-[10px] sm:text-xs text-muted-foreground">
					Dias da semana
				</Label>
				<div className="flex flex-wrap gap-1.5">
					{WEEKDAYS.map((wd) => {
						const selected = config.days.some((d) => d.day === wd.value);
						return (
							<button
								key={wd.value}
								type="button"
								disabled={disabled}
								onClick={() => toggleDay(wd.value)}
								className={cn(
									"h-8 w-10 rounded-xl text-[11px] font-semibold border transition-all",
									selected
										? "bg-blue-500 text-white border-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.4)]"
										: "bg-background text-muted-foreground border-border/60 hover:border-blue-400/60 hover:text-blue-600",
								)}
							>
								{wd.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Horário por dia */}
			{config.days.length > 0 && (
				<div className="space-y-1.5">
					<Label className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
						<Clock className="h-3 w-3" />
						Horário por dia
					</Label>
					<div className="space-y-1.5">
						{config.days.map((d) => (
							<div key={d.day} className="flex items-center gap-2">
								<span className="text-xs text-foreground/80 w-28 shrink-0">
									{WEEKDAY_NAMES[d.day]}
								</span>
								<Input
									type="time"
									value={d.time}
									onChange={(e) => updateDayTime(d.day, e.target.value)}
									disabled={disabled}
									className="h-7 w-28 text-xs rounded-xl border-border/60 focus:border-blue-400"
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Termina */}
			<div className="space-y-1.5">
				<Label className="text-[10px] sm:text-xs text-muted-foreground">
					Termina
				</Label>
				<RadioGroup
					value={config.endType}
					onValueChange={(v) =>
						onChange({ ...config, endType: v as "sessions" | "date" })
					}
					className="space-y-1.5"
					disabled={disabled}
				>
					<div className="flex items-center gap-2">
						<RadioGroupItem value="sessions" id="end-sessions" />
						<Label htmlFor="end-sessions" className="text-xs cursor-pointer">
							Após
						</Label>
						<Input
							type="number"
							min={1}
							max={200}
							value={config.sessions}
							onChange={(e) =>
								onChange({
									...config,
									sessions: Math.max(1, parseInt(e.target.value) || 1),
								})
							}
							disabled={disabled || config.endType !== "sessions"}
							className="h-7 w-16 text-xs rounded-xl border-border/60 focus:border-blue-400"
						/>
						<Label
							htmlFor="end-sessions"
							className="text-xs cursor-pointer text-muted-foreground"
						>
							sessões
						</Label>
					</div>
					<div className="flex items-center gap-2">
						<RadioGroupItem value="date" id="end-date" />
						<Label htmlFor="end-date" className="text-xs cursor-pointer">
							Até a data
						</Label>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={disabled || config.endType !== "date"}
									className="h-7 text-xs rounded-xl border-border/60 px-2 gap-1"
								>
									<CalendarIcon className="h-3 w-3" />
									{endDateObj
										? format(endDateObj, "dd/MM/yyyy", { locale: ptBR })
										: "Selecionar"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={endDateObj}
									onSelect={(date) =>
										onChange({
											...config,
											endDate: date ? format(date, "yyyy-MM-dd") : "",
										})
									}
									disabled={(d) => d < startOfDay(appointmentDate)}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>
				</RadioGroup>
			</div>

			{/* Preview */}
			{preview.length > 0 && (
				<div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-800/40 p-2.5 space-y-1.5">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700/80 dark:text-blue-300/80">
							Preview
						</span>
						<Badge
							variant="outline"
							className="text-[10px] border-blue-400/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0"
						>
							{preview.length} sessão(ões)
						</Badge>
					</div>
					<div className="space-y-0.5 max-h-28 overflow-y-auto pr-1">
						{preview.slice(0, 10).map((item, i) => (
							<div key={i} className="flex items-center gap-2 text-[11px]">
								<span className="text-muted-foreground w-4 shrink-0">
									{i + 1}.
								</span>
								<span className="text-foreground/80">
									{format(item.date, "EEE dd/MM", { locale: ptBR })}
								</span>
								<span className="text-blue-600 dark:text-blue-400 font-medium">
									{item.time}
								</span>
							</div>
						))}
						{preview.length > 10 && (
							<div className="text-[10px] text-muted-foreground italic pl-6">
								+ {preview.length - 10} mais
							</div>
						)}
					</div>
				</div>
			)}

			{config.days.length === 0 && (
				<p className="text-[11px] text-amber-600 dark:text-amber-400">
					Selecione ao menos um dia da semana para habilitar a recorrência.
				</p>
			)}
		</div>
	);
}

export const OptionsTab = ({
	disabled,
	currentMode,
	selectedEquipments,
	setSelectedEquipments,
	recurringConfig,
	setRecurringConfig,
	reminders,
	setReminders,
	onDuplicate,
}: {
	disabled: boolean;
	currentMode: string;
	selectedEquipments: SelectedEquipment[];
	setSelectedEquipments: (equipments: SelectedEquipment[]) => void;
	recurringConfig: RecurringConfig;
	setRecurringConfig: (config: RecurringConfig) => void;
	reminders: AppointmentReminderData[];
	setReminders: (reminders: AppointmentReminderData[]) => void;
	onDuplicate?: () => void;
}) => {
	const {
		watch,
		setValue,
		formState: { errors },
	} = useFormContext<AppointmentFormData>();
	const isRecurring = watch("is_recurring");
	const appointmentDateStr = watch("appointment_date");
	const appointmentTime = watch("appointment_time");

	const appointmentDate = useMemo(() => {
		if (!appointmentDateStr) return new Date();
		try {
			return parseISO(appointmentDateStr);
		} catch {
			return new Date();
		}
	}, [appointmentDateStr]);

	return (
		<div className="mt-0 space-y-3 sm:space-y-4">
			<div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-blue-900">
							<Zap className="h-3.5 w-3.5 text-blue-500" />
							Equipamentos
						</Label>
						<p className="mt-1 text-[11px] text-muted-foreground">
							Marque os recursos usados ou reservados para esta sessão.
						</p>
					</div>
					<Badge
						variant="outline"
						className="rounded-full border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600"
					>
						{selectedEquipments.length > 0
							? `${selectedEquipments.length} selecionados`
							: "Opcional"}
					</Badge>
				</div>
				<EquipmentSelector
					selectedEquipments={selectedEquipments}
					onSelectionChange={setSelectedEquipments}
					disabled={disabled}
				/>
			</div>

			<div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<Repeat className="h-3.5 w-3.5 text-blue-600" />
							<Label
								htmlFor="is_recurring"
								className="text-xs sm:text-sm font-medium cursor-pointer text-blue-900"
							>
								Agendamento Recorrente
							</Label>
							{isRecurring && (
								<Badge
									variant="outline"
									className="rounded-full border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700"
								>
									{recurringConfig.days.length > 0
										? recurringConfig.days
												.map((d) => WEEKDAYS[d.day]?.label)
												.join("+")
										: "Semanal"}
								</Badge>
							)}
						</div>
						<p className="mt-1 text-[11px] text-muted-foreground">
							{isRecurring && recurringConfig.days.length > 0
								? `${recurringConfig.endType === "sessions" ? recurringConfig.sessions + " sessões" : "até a data"} · ${recurringConfig.days.length} dia(s)/semana`
								: "Crie múltiplas sessões de uma vez (ex: 10 sessões, seg + qua + sex)."}
						</p>
					</div>
					<Switch
						id="is_recurring"
						checked={Boolean(isRecurring)}
						onCheckedChange={(checked) =>
							setValue("is_recurring", Boolean(checked))
						}
						disabled={disabled}
						className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200"
					/>
				</div>

				{isRecurring && (
					<RecurringConfigPanel
						config={recurringConfig}
						onChange={setRecurringConfig}
						disabled={disabled}
						appointmentDate={appointmentDate}
						appointmentTime={appointmentTime || ""}
					/>
				)}
			</div>

			<div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-blue-900">
							<Bell className="h-3.5 w-3.5 text-blue-500" />
							Lembretes
						</Label>
						<p className="mt-1 text-[11px] text-muted-foreground">
							Programe avisos rápidos para evitar faltas e atrasos.
						</p>
					</div>
					<Badge
						variant="outline"
						className="rounded-full border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600"
					>
						{reminders.length > 0 ? `${reminders.length} ativos` : "Opcional"}
					</Badge>
				</div>
				<AppointmentReminder
					disabled={disabled}
					reminders={reminders}
					setReminders={setReminders}
				/>
			</div>

			<div className="space-y-2 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
				<div>
					<Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-blue-900">
						<Package className="h-3.5 w-3.5 text-blue-500" />
						Sala
					</Label>
					<p className="mt-1 text-[11px] text-muted-foreground">
						Defina onde o atendimento acontecerá.
					</p>
				</div>
				<Select
					value={watch("room") || ""}
					onValueChange={(value) => setValue("room", value)}
					disabled={disabled}
				>
					<SelectTrigger
						className={cn(premiumFieldClass, "text-sm border-blue-100")}
					>
						<SelectValue placeholder="Selecione a sala" />
					</SelectTrigger>
					<SelectContent className="rounded-lg border-blue-100">
						<SelectItem value="sala-1">🚪 Sala 01</SelectItem>
						<SelectItem value="sala-2">🚪 Sala 02</SelectItem>
						<SelectItem value="sala-3">🚪 Sala 03</SelectItem>
						<SelectItem value="pilates">🧘 Sala Pilates</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{currentMode === "edit" && onDuplicate && (
				<Button
					type="button"
					variant="outline"
					onClick={onDuplicate}
					className="w-full justify-start gap-2 h-11 rounded-xl border-blue-100 text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
				>
					<Copy className="h-4 w-4" />
					<span>Duplicar Agendamento</span>
				</Button>
			)}
		</div>
	);
};
