import { useEffect } from "react";
import { AlertTriangle, Check, Package } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	RadioGroup,
	RadioGroupItem,
} from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePatientPackages } from "@/hooks/usePackages";
import { cn } from "@/lib/utils";
import type { AppointmentFormData } from "@/types/appointment";
import { NewPackagePopover } from "./NewPackagePopover";

const premiumFieldBaseClass =
	"w-full justify-between rounded-xl border border-blue-100 bg-white px-3 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 data-[state=open]:border-blue-300 data-[state=open]:bg-blue-50/50";

const premiumFieldClass = `${premiumFieldBaseClass} h-11 text-xs sm:text-sm`;

const premiumSelectContentClass =
	"rounded-xl border border-blue-100 bg-white p-1 shadow-lg backdrop-blur-sm";

interface AppointmentPaymentTabProps {
	disabled: boolean;
	watchPaymentStatus: string;
	watchPaymentMethod: string;
	watchPaymentAmount: number;
	patientId?: string;
	patientName?: string;
}

export function AppointmentPaymentTab({
	disabled,
	watchPaymentStatus,
	watchPaymentMethod,
	watchPaymentAmount,
	patientId,
	patientName,
}: AppointmentPaymentTabProps) {
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
			setValue("payment_status", "paid_single");
			setValue("payment_amount", 180);
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
			setValue("payment_amount", 170);
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
}
