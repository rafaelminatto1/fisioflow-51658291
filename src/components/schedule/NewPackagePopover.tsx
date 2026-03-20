import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { PackagePlus, Loader2, Coins, CalendarDays } from "lucide-react";
import { useSessionPackages, usePurchasePackage } from "@/hooks/usePackages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const newPackageSchema = z.object({
	template_id: z.string().optional(),
	sessions_count: z.number().min(1, "Mínimo de 1 sessão"),
	price: z.number().min(0, "Valor não pode ser negativo"),
	payment_method: z.string().min(1, "Selecione a forma de pagamento"),
});

type NewPackageFormData = z.infer<typeof newPackageSchema>;

interface PresetPackageConfig {
	name: string;
	sessionsCount: number;
	totalPrice: number;
	validityDays?: number;
	title?: string;
	description?: string;
	submitLabel?: string;
}

interface NewPackagePopoverProps {
	patientId: string;
	onPackageCreated: (packageId: string) => void;
	disabled?: boolean;
	triggerLabel?: string;
	triggerClassName?: string;
	presetPackage?: PresetPackageConfig;
}

export function NewPackagePopover({
	patientId,
	onPackageCreated,
	disabled,
	triggerLabel,
	triggerClassName,
	presetPackage,
}: NewPackagePopoverProps) {
	const [open, setOpen] = useState(false);
	const {
		data: templates,
		isLoading: isLoadingTemplates,
		isError,
		error,
	} = useSessionPackages();
	const { mutateAsync: purchasePackage, isPending: isPurchasing } =
		usePurchasePackage();
	const isPresetMode = Boolean(presetPackage);

	const form = useForm<NewPackageFormData>({
		resolver: zodResolver(newPackageSchema),
		defaultValues: {
			template_id: "",
			sessions_count: presetPackage?.sessionsCount ?? 10,
			price: presetPackage?.totalPrice ?? 0,
			payment_method: "",
		},
	});

	const {
		watch,
		setValue,
		setError,
		clearErrors,
		handleSubmit,
		reset,
		formState: { errors },
	} = form;
	const watchedTemplateId = watch("template_id");

	useEffect(() => {
		if (!presetPackage) return;
		setValue("sessions_count", presetPackage.sessionsCount);
		setValue("price", presetPackage.totalPrice);
		clearErrors("template_id");
	}, [clearErrors, presetPackage, setValue]);

	// Automatic update of defaults when template changes
	useEffect(() => {
		if (!isPresetMode && watchedTemplateId && templates) {
			const template = templates.find((t) => t.id === watchedTemplateId);
			if (template) {
				setValue("sessions_count", template.sessions_count);
				setValue("price", template.price);
			}
		}
	}, [isPresetMode, watchedTemplateId, templates, setValue]);

	const onSubmit = async (data: NewPackageFormData) => {
		if (!patientId) {
			toast.error("Selecione um paciente primeiro.");
			return;
		}

		if (!isPresetMode && !data.template_id) {
			setError("template_id", {
				type: "manual",
				message: "Selecione um modelo de pacote",
			});
			return;
		}

		try {
			const result = await purchasePackage({
				patient_id: patientId,
				package_id: isPresetMode ? undefined : data.template_id,
				name: presetPackage?.name,
				custom_sessions: data.sessions_count,
				custom_price: data.price,
				payment_method: data.payment_method,
				validity_days: presetPackage?.validityDays,
			});

			toast.success("Pacote criado com sucesso!");
			onPackageCreated(result.id);
			setOpen(false);
			reset({
				template_id: "",
				sessions_count: presetPackage?.sessionsCount ?? 10,
				price: presetPackage?.totalPrice ?? 0,
				payment_method: "",
			});
		} catch (error) {
			console.error(error);
			// Toast is handled in the hook
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						"h-9 gap-2 border-dashed border-primary/40 hover:border-primary/60 hover:bg-primary/5 text-primary",
						triggerClassName,
					)}
					disabled={disabled || !patientId}
					title={
						!patientId
							? "Selecione um paciente primeiro"
							: (triggerLabel ?? "Vender novo pacote")
					}
				>
					<PackagePlus className="h-4 w-4" />
					<span>{triggerLabel ?? "Novo Pacote"}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-4" align="start">
				<div className="space-y-4">
					<div className="space-y-1">
						<h4 className="font-medium leading-none flex items-center gap-2">
							<PackagePlus className="h-4 w-4 text-primary" />
							{presetPackage?.title ?? "Vender Novo Pacote"}
						</h4>
						<p className="text-xs text-muted-foreground">
							{presetPackage?.description ??
								"Configure os detalhes da venda para este paciente."}
						</p>
					</div>

					<form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
						{isPresetMode ? (
							<div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-xs font-semibold text-foreground">
											{presetPackage?.name}
										</p>
										<p className="mt-1 text-[10px] text-muted-foreground">
											Pacote padrão lançado direto para o paciente já escolhido
											no modal.
										</p>
									</div>
									<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
										{watch("sessions_count")} sessões
									</span>
								</div>
							</div>
						) : (
							<div className="space-y-1.5">
								<Label className="text-xs">Modelo de Pacote</Label>
								<Select
									onValueChange={(val) => setValue("template_id", val)}
									value={watch("template_id")}
									disabled={isLoadingTemplates || isPurchasing}
								>
									<SelectTrigger className="h-8 text-xs">
										<SelectValue placeholder="Selecione um modelo..." />
									</SelectTrigger>
									<SelectContent>
										{isLoadingTemplates ? (
											<div className="p-2 text-xs text-center text-muted-foreground">
												Carregando...
											</div>
										) : isError ? (
											<div className="p-2 text-xs text-center text-destructive">
												Erro ao carregar modelos
											</div>
										) : (
											templates?.map((t) => (
												<SelectItem key={t.id} value={t.id} className="text-xs">
													{t.name}
												</SelectItem>
											))
										)}
										{!isLoadingTemplates &&
											!isError &&
											(!templates || templates.length === 0) && (
												<div className="p-2 text-xs text-center text-muted-foreground">
													Nenhum modelo encontrado
												</div>
											)}
									</SelectContent>
								</Select>
								{errors.template_id && (
									<p className="text-[10px] text-destructive">
										{errors.template_id.message}
									</p>
								)}
							</div>
						)}

						<div className="grid grid-cols-2 gap-3">
							{/* Sessions Count */}
							<div className="space-y-1.5">
								<Label className="text-xs flex items-center gap-1.5">
									<CalendarDays className="h-3 w-3 text-muted-foreground" />
									Sessões
								</Label>
								<Input
									type="number"
									{...form.register("sessions_count", { valueAsNumber: true })}
									className="h-8 text-xs"
									min={1}
									disabled={isPurchasing}
								/>
								{errors.sessions_count && (
									<p className="text-[10px] text-destructive">
										{errors.sessions_count.message}
									</p>
								)}
							</div>

							{/* Price */}
							<div className="space-y-1.5">
								<Label className="text-xs flex items-center gap-1.5">
									<Coins className="h-3 w-3 text-muted-foreground" />
									Valor Total
								</Label>
								<div className="relative">
									<span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
										R$
									</span>
									<Input
										type="number"
										step="0.01"
										{...form.register("price", { valueAsNumber: true })}
										className="h-8 text-xs pl-7"
										min={0}
										disabled={isPurchasing}
									/>
								</div>
								{errors.price && (
									<p className="text-[10px] text-destructive">
										{errors.price.message}
									</p>
								)}
							</div>
						</div>

						{/* Payment Method */}
						<div className="space-y-1.5">
							<Label className="text-xs">Forma de Pagamento</Label>
							<Select
								onValueChange={(val) => setValue("payment_method", val)}
								value={watch("payment_method")}
								disabled={isPurchasing}
							>
								<SelectTrigger className="h-8 text-xs">
									<SelectValue placeholder="Selecione..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="pix">PIX</SelectItem>
									<SelectItem value="dinheiro">Dinheiro</SelectItem>
									<SelectItem value="debito">Débito</SelectItem>
									<SelectItem value="credito">Crédito</SelectItem>
								</SelectContent>
							</Select>
							{errors.payment_method && (
								<p className="text-[10px] text-destructive">
									{errors.payment_method.message}
								</p>
							)}
						</div>

						<Button
							type="submit"
							className="w-full h-8 text-xs"
							disabled={isPurchasing}
						>
							{isPurchasing ? (
								<>
									<Loader2 className="mr-2 h-3 w-3 animate-spin" />
									Processando...
								</>
							) : (
								(presetPackage?.submitLabel ?? "Confirmar Venda")
							)}
						</Button>
					</form>
				</div>
			</PopoverContent>
		</Popover>
	);
}
