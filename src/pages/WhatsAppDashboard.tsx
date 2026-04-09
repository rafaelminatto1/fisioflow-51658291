import { useState, useEffect } from "react";
import {
	MessageSquare,
	Clock,
	CheckCircle2,
	AlertTriangle,
	Users,
	TrendingUp,
	Loader2,
	BarChart3,
	Timer,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { fetchMetrics, type Metrics } from "@/services/whatsapp-api";

function MetricCard({
	title,
	value,
	subtitle,
	icon: Icon,
	iconColor,
	trend,
}: {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ElementType;
	iconColor: string;
	trend?: string;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<Icon className={`h-4 w-4 ${iconColor}`} />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				{subtitle && (
					<p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
				)}
				{trend && (
					<div className="flex items-center gap-1 mt-1">
						<TrendingUp className="h-3 w-3 text-green-500" />
						<span className="text-xs text-green-600">{trend}</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${Math.round(minutes)}min`;
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export default function WhatsAppDashboardPage() {
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchMetrics()
			.then(setMetrics)
			.catch((err) =>
				setError(
					err instanceof Error ? err.message : "Erro ao carregar métricas",
				),
			)
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<MainLayout>
				<div className="flex items-center justify-center h-96">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</MainLayout>
		);
	}

	if (error) {
		return (
			<MainLayout>
				<div className="flex items-center justify-center h-96 text-destructive">
					<p>{error}</p>
				</div>
			</MainLayout>
		);
	}

	if (!metrics) return null;

	return (
		<MainLayout>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							WhatsApp Dashboard
						</h1>
						<p className="text-muted-foreground">
							Métricas e desempenho do inbox compartilhado
						</p>
					</div>
					<Badge variant="outline" className="text-sm">
						<BarChart3 className="h-4 w-4 mr-1" />
						Atualizado agora
					</Badge>
				</div>

				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
					<MetricCard
						title="Total de conversas"
						value={metrics.totalConversations}
						icon={MessageSquare}
						iconColor="text-blue-500"
					/>
					<MetricCard
						title="Abertas"
						value={metrics.openConversations}
						icon={MessageSquare}
						iconColor="text-green-500"
					/>
					<MetricCard
						title="Pendentes"
						value={metrics.pendingConversations}
						icon={Clock}
						iconColor="text-yellow-500"
					/>
					<MetricCard
						title="Resolvidas"
						value={metrics.resolvedConversations}
						icon={CheckCircle2}
						iconColor="text-blue-500"
					/>
					<MetricCard
						title="Tempo médio FRT"
						value={formatMinutes(metrics.avgFirstResponseTime)}
						subtitle="Primeira resposta"
						icon={Timer}
						iconColor="text-purple-500"
					/>
					<MetricCard
						title="Tempo médio ART"
						value={formatMinutes(metrics.avgResolutionTime)}
						subtitle="Resolução"
						icon={Timer}
						iconColor="text-orange-500"
					/>
				</div>

				{metrics.slaBreached > 0 && (
					<Card className="border-red-200 bg-red-50">
						<CardHeader className="pb-2">
							<div className="flex items-center gap-2">
								<AlertTriangle className="h-5 w-5 text-red-500" />
								<CardTitle className="text-red-700">Alertas de SLA</CardTitle>
							</div>
							<CardDescription className="text-red-600">
								Conversas que ultrapassaram o tempo limite de resposta
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-3">
								<span className="text-3xl font-bold text-red-700">
									{metrics.slaBreached}
								</span>
								<span className="text-sm text-red-600">
									conversa{metrics.slaBreached !== 1 ? "s" : ""} com SLA vencido
								</span>
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							Carga de trabalho por agente
						</CardTitle>
						<CardDescription>
							Distribuição de conversas ativas por membro da equipe
						</CardDescription>
					</CardHeader>
					<CardContent>
						{metrics.agentWorkload.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
								<p className="text-sm">Nenhum dado de agente disponível</p>
							</div>
						) : (
							<div className="space-y-3">
								{metrics.agentWorkload.map((agent) => (
									<div key={agent.agentId} className="flex items-center gap-4">
										<Avatar className="h-9 w-9">
											<AvatarFallback className="text-xs">
												{agent.agentName.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between">
												<span className="text-sm font-medium">
													{agent.agentName}
												</span>
												<div className="flex items-center gap-3 text-xs text-muted-foreground">
													<span>{agent.activeConversations} ativas</span>
													<span>{agent.resolvedToday} resolvidas hoje</span>
												</div>
											</div>
											<div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
												<div
													className="h-full rounded-full bg-primary transition-all"
													style={{
														width: `${Math.min((agent.activeConversations / Math.max(metrics.openConversations, 1)) * 100, 100)}%`,
													}}
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</MainLayout>
	);
}
