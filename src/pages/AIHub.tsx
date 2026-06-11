import React, { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { getWorkersApiUrl } from "@/lib/api/config";
import {
	BrainCircuit,
	LineChart as LineChartIcon,
	PieChart as PieChartIcon,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
	Legend,
} from "recharts";

function asArray<T = unknown>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

export default function AIHub() {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const retentionData = asArray(data?.retention);
	const noShowData = asArray(data?.noShow);
	const revenueForecastData = asArray(data?.revenueForecast);

	useEffect(() => {
		fetch(`${getWorkersApiUrl()}/api/ai-insights/analytics`, {
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
			},
		})
			.then((res) => res.json())
			.then((json) => {
				setData(json);
				setLoading(false);
			})
			.catch((err) => {
				console.error("Error fetching AI analytics", err);
				setLoading(false);
			});
	}, []);

	return (
		<PageLayout>
			<PageContainer maxWidth="full">
				<PageHeader
					title="AI Analytics Hub"
					subtitle="Análises profundas geradas por IA a partir dos dados da sua clínica"
					icon={BrainCircuit}
				/>

				{loading ? (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
						<Card className="premium-glass rounded-[2rem]">
							<CardHeader>
								<Skeleton className="h-6 w-1/3" />
								<Skeleton className="h-4 w-2/3" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-[300px] w-full rounded-xl" />
							</CardContent>
						</Card>
						<Card className="premium-glass rounded-[2rem]">
							<CardHeader>
								<Skeleton className="h-6 w-1/3" />
								<Skeleton className="h-4 w-2/3" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-[300px] w-full rounded-xl" />
							</CardContent>
						</Card>
						<Card className="premium-glass rounded-[2rem] lg:col-span-2">
							<CardHeader>
								<Skeleton className="h-6 w-1/4" />
								<Skeleton className="h-4 w-1/2" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-[350px] w-full rounded-xl" />
							</CardContent>
						</Card>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
						{/* Retention Chart */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
						>
							<Card className="premium-glass rounded-[2rem]">
								<CardHeader>
									<div className="flex items-center gap-2">
										<div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
											<LineChartIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
										</div>
										<CardTitle className="font-display font-black text-lg">
											Taxa de Retenção
										</CardTitle>
									</div>
									<CardDescription className="font-medium ml-11">
										Percentual de pacientes que retornaram no mês seguinte.
									</CardDescription>
								</CardHeader>
								<CardContent className="h-[300px]">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart
											data={retentionData}
											margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#f0f0f0"
												vertical={false}
											/>
											<XAxis
												dataKey="month"
												stroke="#888888"
												fontSize={12}
												tickLine={false}
												axisLine={false}
											/>
											<YAxis
												stroke="#888888"
												fontSize={12}
												tickLine={false}
												axisLine={false}
												tickFormatter={(value) => `${value}%`}
											/>
											<Tooltip
												contentStyle={{
													borderRadius: "1rem",
													border: "none",
													boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
												}}
											/>
											<Line
												type="monotone"
												dataKey="rate"
												stroke="#6366f1"
												strokeWidth={4}
												dot={{
													r: 4,
													fill: "#6366f1",
													strokeWidth: 2,
													stroke: "#fff",
												}}
												activeDot={{ r: 6 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</motion.div>

						{/* No Show Chart */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
						>
							<Card className="premium-glass rounded-[2rem]">
								<CardHeader>
									<div className="flex items-center gap-2">
										<div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
											<PieChartIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
										</div>
										<CardTitle className="font-display font-black text-lg">
											Evolução de No-shows
										</CardTitle>
									</div>
									<CardDescription className="font-medium ml-11">
										Taxa histórica de faltas (pacientes que não compareceram).
									</CardDescription>
								</CardHeader>
								<CardContent className="h-[300px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={noShowData}
											margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#f0f0f0"
												vertical={false}
											/>
											<XAxis
												dataKey="month"
												stroke="#888888"
												fontSize={12}
												tickLine={false}
												axisLine={false}
											/>
											<YAxis
												stroke="#888888"
												fontSize={12}
												tickLine={false}
												axisLine={false}
												tickFormatter={(value) => `${value}%`}
											/>
											<Tooltip
												cursor={{ fill: "transparent" }}
												contentStyle={{
													borderRadius: "1rem",
													border: "none",
													boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
												}}
											/>
											<Bar
												dataKey="rate"
												fill="#f97316"
												radius={[6, 6, 0, 0]}
												barSize={40}
											/>
										</BarChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</motion.div>

						{/* Revenue Forecast */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="lg:col-span-2"
						>
							<Card className="premium-glass rounded-[2rem]">
								<CardHeader>
									<div className="flex items-center gap-2">
										<div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
											<BrainCircuit className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
										</div>
										<CardTitle className="font-display font-black text-lg">
											Previsão de Receita (IA)
										</CardTitle>
									</div>
									<CardDescription className="font-medium ml-11">
										Projeção financeira baseada no histórico de pagamentos e
										agendamentos futuros.
									</CardDescription>
								</CardHeader>
								<CardContent className="h-[350px]">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart
											data={revenueForecastData}
											margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#f0f0f0"
												vertical={false}
											/>
											<XAxis
												dataKey="month"
												stroke="#888888"
												fontSize={12}
												tickLine={false}
												axisLine={false}
											/>
											<YAxis
												stroke="#888888"
												fontSize={12}
												tickLine={false}
												axisLine={false}
												tickFormatter={(value) => `R$ ${value / 1000}k`}
											/>
											<Tooltip
												formatter={(value: number) => [
													`R$ ${value.toLocaleString("pt-BR")}`,
													"",
												]}
												contentStyle={{
													borderRadius: "1rem",
													border: "none",
													boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
												}}
											/>
											<Legend
												iconType="circle"
												wrapperStyle={{ paddingTop: "20px" }}
											/>
											<Line
												type="monotone"
												name="Realizado"
												dataKey="actual"
												stroke="#10b981"
												strokeWidth={4}
												dot={{
													r: 4,
													fill: "#10b981",
													strokeWidth: 2,
													stroke: "#fff",
												}}
											/>
											<Line
												type="monotone"
												name="Previsto (IA)"
												dataKey="forecast"
												stroke="#94a3b8"
												strokeWidth={4}
												strokeDasharray="6 6"
												dot={false}
											/>
										</LineChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</motion.div>
					</div>
				)}
			</PageContainer>
		</PageLayout>
	);
}
