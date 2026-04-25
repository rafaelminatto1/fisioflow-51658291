// Gráfico de receita em tempo real

import { useEffect, useState, useCallback, useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
} from "recharts";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { financialApi, type Pagamento } from "@/api/v2";

interface RevenueData {
	date: string;
	revenue: number;
}

export function RevenueChart() {
	const [data, setData] = useState<RevenueData[]>([]);
	const [loading, setLoading] = useState(true);

	const loadRevenueData = useCallback(async () => {
		try {
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - 7);

			const response = await financialApi.pagamentos.list({
				limit: 1000,
				offset: 0,
			});
			const payments = (response?.data ?? []) as Pagamento[];
			const grouped = payments.reduce(
				(acc: Record<string, number>, payment) => {
					if (!payment.pago_em) return acc;
					const date = payment.pago_em.slice(0, 10);
					const status = String(payment.status ?? "").toLowerCase();
					if (status !== "paid" && status !== "pago") return acc;
					if (new Date(date) < startDate) return acc;
					acc[date] =
						(acc[date] || 0) + Number(payment.valor ?? payment.valor ?? 0);
					return acc;
				},
				{},
			);

			const chartData = Object.entries(grouped)
				.map(([date, revenue]) => ({
					date: format(new Date(date), "dd/MM", { locale: ptBR }),
					revenue: Number(revenue),
				}))
				.sort(
					(a, b) =>
						Number(b.date.replace("/", "")) - Number(a.date.replace("/", "")),
				)
				.reverse();

			setData(chartData);
			setLoading(false);
			return () => undefined;
		} catch (error) {
			logger.error("Erro ao carregar dados de receita", error, "RevenueChart");
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const unsubscribe = loadRevenueData();
		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [loadRevenueData]);

	const tooltipFormatter = useMemo(
		() => (value: number | string) => [
			`R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
			"Receita",
		],
		[],
	);

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Receita dos Últimos 7 Dias</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64 bg-muted animate-pulse rounded" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Receita dos Últimos 7 Dias</CardTitle>
				<CardDescription>Atualizações em tempo real</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="w-full bg-white dark:bg-gray-800 rounded-lg">
					<SafeResponsiveContainer width="100%" height={300}>
						<LineChart data={data}>
							<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
							<XAxis dataKey="date" />
							<YAxis />
							<Tooltip formatter={tooltipFormatter} />
							<Line
								type="monotone"
								dataKey="revenue"
								stroke="hsl(var(--primary))"
								strokeWidth={2}
								dot={{ r: 4 }}
							/>
						</LineChart>
					</SafeResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	);
}
