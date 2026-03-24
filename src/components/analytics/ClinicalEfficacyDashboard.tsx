import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2/insights";
import { 
	LineChart, 
	Line, 
	XAxis, 
	YAxis, 
	CartesianGrid, 
	Tooltip, 
	ResponsiveContainer,
	AreaChart,
	Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClinicalEfficacyDashboard() {
	const { data: painData = [], isLoading: isLoadingPain } = useQuery({
		queryKey: ["analytics", "efficacy", "pain"],
		queryFn: async () => {
			const res = await (analyticsApi as any).efficacyPainEvolution();
			return res.data || [];
		}
	});

	const { data: stats } = useQuery({
		queryKey: ["analytics", "dashboard"],
		queryFn: async () => {
			const res = await analyticsApi.dashboard();
			return res.data;
		}
	});

	const chartData = useMemo(() => {
		return painData.map((d: any) => ({
			date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
			valor: Number(d.value)
		}));
	}, [painData]);

	if (isLoadingPain) {
		return <Skeleton className="h-[400px] w-full rounded-3xl" />;
	}

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="rounded-2xl border-border/40 shadow-premium-sm bg-blue-50/30 dark:bg-blue-950/10">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
							<TrendingDown className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Redução de Dor</p>
							<h3 className="text-xl font-black tracking-tighter text-blue-700">- 42%</h3>
						</div>
					</CardContent>
				</Card>
				
				<Card className="rounded-2xl border-border/40 shadow-premium-sm bg-green-50/30 dark:bg-green-950/10">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
							<CheckCircle2 className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Alta Clínica</p>
							<h3 className="text-xl font-black tracking-tighter text-green-700">85%</h3>
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-border/40 shadow-premium-sm bg-purple-50/30 dark:bg-purple-950/10">
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
							<Users className="h-5 w-5" />
						</div>
						<div>
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Engajamento</p>
							<h3 className="text-xl font-black tracking-tighter text-purple-700">{stats?.engagementScore || 0}%</h3>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="rounded-3xl border-border/40 shadow-premium-lg overflow-hidden">
				<CardHeader className="border-b bg-muted/5 flex flex-row items-center justify-between">
					<div>
						<CardTitle className="text-sm font-black uppercase tracking-widest">Evolução Média da Dor (VAS)</CardTitle>
						<p className="text-xs text-muted-foreground mt-1 font-medium">Média ponderada de todos os atendimentos da clínica</p>
					</div>
					<Badge variant="outline" className="rounded-lg bg-background font-black uppercase text-[10px] tracking-tighter">Últimos 30 dias</Badge>
				</CardHeader>
				<CardContent className="p-6">
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartData}>
								<defs>
									<linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
								<XAxis 
									dataKey="date" 
									axisLine={false} 
									tickLine={false} 
									tick={{fontSize: 10, fontWeight: 'bold'}}
									dy={10}
								/>
								<YAxis 
									axisLine={false} 
									tickLine={false} 
									tick={{fontSize: 10, fontWeight: 'bold'}}
									domain={[0, 10]}
								/>
								<Tooltip 
									contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
								/>
								<Area 
									type="monotone" 
									dataKey="valor" 
									stroke="#3b82f6" 
									strokeWidth={4}
									fillOpacity={1} 
									fill="url(#colorPain)" 
									animationDuration={1500}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
