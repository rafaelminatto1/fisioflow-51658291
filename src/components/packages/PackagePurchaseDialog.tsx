import { useState } from "react";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Package,
	Calendar,
	DollarSign,
	Check,
	Loader2,
	BadgeCheck,
	ShoppingBag,
} from "lucide-react";
import {
	useSessionPackages,
	usePurchasePackage,
	type SessionPackage,
} from "@/hooks/usePackages";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface PackagePurchaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	patientId: string;
	patientName: string;
	onSuccess?: () => void;
}

export function PackagePurchaseDialog({
	open,
	onOpenChange,
	patientId,
	patientName,
	onSuccess,
}: PackagePurchaseDialogProps) {
	const isMobile = useIsMobile();
	const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
		null,
	);
	const { data: packages, isLoading } = useSessionPackages();
	const purchaseMutation = usePurchasePackage();

	const selectedPackage = packages?.find((p) => p.id === selectedPackageId);

	const handlePurchase = async () => {
		if (!selectedPackageId) return;

		try {
			await purchaseMutation.mutateAsync({
				patient_id: patientId,
				package_id: selectedPackageId,
			});

			onSuccess?.();
			onOpenChange(false);
			setSelectedPackageId(null);
		} catch (error) {
			// Error handled by mutation
		}
	};

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(value);
	};

	const getPricePerSession = (pkg: SessionPackage) => {
		return pkg.price / pkg.sessions_count;
	};

	return (
		<CustomModal
			open={open}
			onOpenChange={onOpenChange}
			isMobile={isMobile}
			contentClassName="max-w-2xl h-[90vh]"
		>
			<CustomModalHeader onClose={() => onOpenChange(false)}>
				<div className="flex flex-col gap-1">
					<CustomModalTitle className="flex items-center gap-2 text-xl font-bold">
						<ShoppingBag className="h-5 w-5 text-primary" />
						Venda de Pacote
					</CustomModalTitle>
					<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
						Paciente: <span className="text-slate-900">{patientName}</span>
					</p>
				</div>
			</CustomModalHeader>

			<CustomModalBody className="p-0 sm:p-0">
				<ScrollArea className="h-full">
					<div className="p-6 space-y-6">
						{isLoading ? (
							<div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
								<p className="text-sm font-medium">
									Carregando pacotes disponíveis...
								</p>
							</div>
						) : packages && packages.length > 0 ? (
							<RadioGroup
								value={selectedPackageId || ""}
								onValueChange={setSelectedPackageId}
								className="grid gap-3"
							>
								{packages
									.filter((p) => p.is_active)
									.map((pkg) => {
										const pricePerSession = getPricePerSession(pkg);
										const isSelected = selectedPackageId === pkg.id;
										const isBestValue =
											packages.length > 1 &&
											pricePerSession ===
												Math.min(...packages.map((p) => getPricePerSession(p)));

										return (
											<Label
												key={pkg.id}
												htmlFor={pkg.id}
												className="cursor-pointer"
											>
												<div
													className={cn(
														"relative p-4 rounded-2xl border-2 transition-all duration-200",
														isSelected
															? "border-primary bg-primary/5 shadow-md scale-[1.01]"
															: "border-slate-100 bg-white hover:border-slate-300",
													)}
												>
													<div className="flex items-start gap-4">
														<RadioGroupItem
															value={pkg.id}
															id={pkg.id}
															className="mt-1"
														/>

														<div className="flex-1 space-y-3">
															<div className="flex items-center justify-between">
																<div className="flex items-center gap-2">
																	<span className="font-bold text-slate-800">
																		{pkg.name}
																	</span>
																	{isBestValue && (
																		<Badge className="bg-emerald-500 hover:bg-emerald-600 rounded-lg text-[10px] h-5">
																			Melhor custo
																		</Badge>
																	)}
																</div>
																<span className="text-lg font-black text-primary">
																	{formatCurrency(pkg.price)}
																</span>
															</div>

															{pkg.description && (
																<p className="text-xs text-slate-500 leading-relaxed italic">
																	{pkg.description}
																</p>
															)}

															<div className="flex flex-wrap gap-x-4 gap-y-2">
																<div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
																	<Check className="w-3.5 h-3.5 text-emerald-500" />
																	<span>{pkg.sessions_count} sessões</span>
																</div>
																<div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
																	<Calendar className="w-3.5 h-3.5 text-blue-500" />
																	<span>{pkg.validity_days} dias</span>
																</div>
																<div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
																	<DollarSign className="w-3.5 h-3.5 text-amber-500" />
																	<span>
																		{formatCurrency(pricePerSession)}/sessão
																	</span>
																</div>
															</div>
														</div>
													</div>
												</div>
											</Label>
										);
									})}
							</RadioGroup>
						) : (
							<div className="text-center py-12 border-2 border-dashed rounded-3xl border-slate-100">
								<Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
								<p className="text-sm font-bold text-slate-400">
									Nenhum pacote disponível para venda.
								</p>
								<p className="text-xs text-slate-400 mt-1">
									Configure seus pacotes no módulo financeiro.
								</p>
							</div>
						)}

						{/* Resumo da compra */}
						{selectedPackage && (
							<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
								<Card className="border-slate-900 border-2 bg-slate-900 text-white shadow-xl rounded-3xl overflow-hidden">
									<CardContent className="p-5">
										<h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
											Resumo da Transação
										</h4>
										<div className="space-y-3">
											<div className="flex justify-between items-center text-sm">
												<span className="text-slate-400">
													Pacote Selecionado:
												</span>
												<span className="font-bold">
													{selectedPackage.name}
												</span>
											</div>
											<div className="flex justify-between items-center text-sm">
												<span className="text-slate-400">
													Crédito de Sessões:
												</span>
												<span className="font-bold">
													{selectedPackage.sessions_count} sessões
												</span>
											</div>
											<div className="pt-3 border-t border-slate-800 flex justify-between items-center">
												<span className="text-sm font-bold uppercase">
													Total a Pagar:
												</span>
												<span className="text-2xl font-black text-white">
													{formatCurrency(selectedPackage.price)}
												</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						)}
					</div>
				</ScrollArea>
			</CustomModalBody>

			<CustomModalFooter isMobile={isMobile} className="bg-slate-50 border-t-0">
				<Button
					variant="ghost"
					onClick={() => onOpenChange(false)}
					className="rounded-xl h-11 px-6 font-bold text-slate-500"
				>
					Cancelar
				</Button>
				<Button
					onClick={handlePurchase}
					disabled={!selectedPackageId || purchaseMutation.isPending}
					className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
				>
					{purchaseMutation.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<BadgeCheck className="h-4 w-4" />
					)}
					Confirmar Compra
				</Button>
			</CustomModalFooter>
		</CustomModal>
	);
}
