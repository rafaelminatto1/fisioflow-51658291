/**
 * Marketing ROI Calculator Page
 *
 * Calculate return on investment for marketing campaigns
 */

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Calculator, DollarSign, Users, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { calculateMarketingROI } from "@/services/marketing/marketingService";
import { useAuth } from "@/contexts/AuthContext";
import { subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface ROIMetrics {
	totalLeads: number;
	costPerLead: number;
	conversionRate: number;
	roi: number;
	returnOnAdSpend: number;
}

export function ROICalculatorContent() {
	const { profile } = useAuth();
	const organizationId = profile?.organization_id || "";

	const [period, setPeriod] = useState<"30" | "60" | "90" | "custom">("30");
	const [adSpend, setAdSpend] = useState<string>("");
	const [avgTicket, setAvgTicket] = useState<string>("500");
	const [calculating, setCalculating] = useState(false);
	const [results, setResults] = useState<ROIMetrics | null>(null);

	const handleCalculate = async () => {
		if (!adSpend || parseFloat(adSpend) <= 0) {
			toast.error("Informe o valor investido em anúncios");
			return;
		}

		setCalculating(true);

		try {
			const days = parseInt(period);
			const endDate = new Date();
			const startDate = subMonths(endDate, days / 30);

			const metrics = await calculateMarketingROI(
				organizationId,
				startDate,
				endDate,
				parseFloat(adSpend),
			);

			// Override with custom average ticket if provided
			const ticket = parseFloat(avgTicket) || 500;
			const totalRevenue =
				metrics.totalLeads * (metrics.conversionRate / 100) * ticket;
			const roi =
				((totalRevenue - parseFloat(adSpend)) / parseFloat(adSpend)) * 100;
			const roas = totalRevenue / parseFloat(adSpend);

			setResults({
				...metrics,
				roi,
				returnOnAdSpend: roas,
			});

			toast.success("Cálculo realizado com sucesso");
		} catch (error) {
			console.error("Error calculating ROI:", error);
			toast.error("Erro ao calcular ROI. Tente novamente.");
		} finally {
			setCalculating(false);
		}
	};

	const getROIStatus = (roi: number) => {
		if (roi >= 300)
			return {
				label: "Excelente",
				color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
			};
		if (roi >= 100)
			return {
				label: "Bom",
				color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
			};
		if (roi >= 0)
			return {
				label: "Regular",
				color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
			};
		return {
			label: "Prejuízo",
			color: "bg-red-500/10 text-red-600 border-red-500/20",
		};
	};

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(value);
	};

	const formatPercent = (value: number) => {
		return `${value.toFixed(1)}%`;
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<Calculator className="h-6 w-6" />
						Calculadora de ROI
					</h2>
					<p className="text-muted-foreground mt-1">
						Analise o retorno dos seus investimentos em anúncios
					</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				<Card className="md:col-span-1">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<DollarSign className="h-4 w-4" />
							Dados da Campanha
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label className="text-xs uppercase tracking-wider text-muted-foreground">
								Período
							</Label>
							<Select
								value={period}
								onValueChange={(value: any) => setPeriod(value)}
							>
								<SelectTrigger className="h-9">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="30">Últimos 30 dias</SelectItem>
									<SelectItem value="60">Últimos 60 dias</SelectItem>
									<SelectItem value="90">Últimos 90 dias</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-xs uppercase tracking-wider text-muted-foreground">
								Investimento Ads (R$)
							</Label>
							<Input
								type="number"
								placeholder="Ex: 1000"
								value={adSpend}
								onChange={(e) => setAdSpend(e.target.value)}
								className="h-9"
							/>
						</div>

						<div className="space-y-2">
							<Label className="text-xs uppercase tracking-wider text-muted-foreground">
								Ticket Médio (R$)
							</Label>
							<Input
								type="number"
								placeholder="Ex: 500"
								value={avgTicket}
								onChange={(e) => setAvgTicket(e.target.value)}
								className="h-9"
							/>
						</div>

						<Button
							onClick={handleCalculate}
							disabled={calculating}
							className="w-full"
						>
							{calculating ? "Calculando..." : "Calcular ROI"}
						</Button>
					</CardContent>
				</Card>

				<Card className="md:col-span-2">
					<CardContent className="pt-6">
						{results ? (
							<div className="space-y-6">
								<div className="text-center p-6 rounded-xl bg-muted/30 border border-border/50">
									<p className="text-sm text-muted-foreground mb-1">
										ROI da Campanha
									</p>
									<div className="flex items-center justify-center gap-3">
										<p className="text-5xl font-bold tracking-tighter">
											{formatPercent(results.roi)}
										</p>
										<Badge
											variant="outline"
											className={cn(
												"px-3 py-1 rounded-full text-xs font-bold",
												getROIStatus(results.roi).color,
											)}
										>
											{getROIStatus(results.roi).label}
										</Badge>
									</div>
								</div>

								<div className="grid gap-4 md:grid-cols-2">
									<div className="p-4 border rounded-xl bg-card">
										<div className="flex items-center gap-2 text-muted-foreground mb-1">
											<Users className="h-3.5 w-3.5" />
											<span className="text-xs font-bold uppercase tracking-wider">
												Leads
											</span>
										</div>
										<p className="text-xl font-bold">{results.totalLeads}</p>
									</div>

									<div className="p-4 border rounded-xl bg-card">
										<div className="flex items-center gap-2 text-muted-foreground mb-1">
											<PiggyBank className="h-3.5 w-3.5" />
											<span className="text-xs font-bold uppercase tracking-wider">
												ROAS
											</span>
										</div>
										<p className="text-xl font-bold">
											{results.returnOnAdSpend.toFixed(2)}x
										</p>
									</div>
								</div>

								<div className="p-4 border rounded-xl bg-muted/20 space-y-2">
									<div className="flex justify-between text-xs text-muted-foreground uppercase tracking-widest font-bold">
										<span>Resumo Financeiro</span>
									</div>
									<div className="flex justify-between text-sm">
										<span>Investimento:</span>
										<span className="font-mono text-red-500">
											-{formatCurrency(Number(adSpend))}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span>Receita Bruta Estimada:</span>
										<span className="font-mono text-emerald-500">
											+
											{formatCurrency(
												results.totalLeads *
													(results.conversionRate / 100) *
													Number(avgTicket),
											)}
										</span>
									</div>
								</div>
							</div>
						) : (
							<div className="text-center py-12">
								<Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
								<p className="text-muted-foreground text-sm font-medium">
									Preencha os dados e clique em calcular
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default function ROICalculatorPage() {
	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto">
				<ROICalculatorContent />
			</div>
		</MainLayout>
	);
}
