import {
	Activity,
	ArrowDown,
	ArrowUpRight,
	BarChart3,
	Link2,
	Mail,
	MessageSquare,
	Sparkles,
	Star,
	Target,
	TrendingUp,
	Video,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	crmApi,
	type GoogleBusinessReviewRecord,
	integrationsApi,
	marketingApi,
} from "@/api/v2";
import { MainLayout } from "@/components/layout/MainLayout";
import { LocalSEOTracker } from "@/components/marketing/LocalSEOTracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ReviewsContent } from "./Reviews";
import { ROICalculatorContent } from "./ROI";

type GoogleReview = GoogleBusinessReviewRecord;

interface MarketingMetrics {
	totalReviews: number;
	averageRating: number;
	rating5: number;
	rating4: number;
	rating3: number;
	rating2: number;
	rating1: number;
	recentReviews: GoogleReview[];
	totalExports: number;
	totalCampaigns: number;
	totalLeads: number;
}

export default function MarketingDashboard() {
	const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
	const [loading, setLoading] = useState(true);
	const [, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchMetrics = async () => {
			try {
				setLoading(true);
				setError(null);

				// Fetch Google Reviews
				let reviews: GoogleReview[] = [];
				let totalReviews = 0;
				let averageRating = 0;
				let rating5 = 0;
				let rating4 = 0;
				let rating3 = 0;
				let rating2 = 0;
				let rating1 = 0;

				const [reviewsResult, campaignsResult, leadsResult, exportsResult] =
					await Promise.allSettled([
						integrationsApi.google.business.reviews(),
						crmApi.campanhas.list(),
						crmApi.leads.list(),
						marketingApi.exports.list(),
					]);

				if (reviewsResult.status === "fulfilled") {
					reviews = reviewsResult.value.data ?? [];
					totalReviews = reviews.length;
					if (totalReviews > 0) {
						averageRating =
							reviews.reduce(
								(sum: number, r: GoogleReview) => sum + r.rating,
								0,
							) / totalReviews;
						rating5 = reviews.filter(
							(r: GoogleReview) => r.rating === 5,
						).length;
						rating4 = reviews.filter(
							(r: GoogleReview) => r.rating === 4,
						).length;
						rating3 = reviews.filter(
							(r: GoogleReview) => r.rating === 3,
						).length;
						rating2 = reviews.filter(
							(r: GoogleReview) => r.rating === 2,
						).length;
						rating1 = reviews.filter(
							(r: GoogleReview) => r.rating === 1,
						).length;
					}
				}

				const totalExports =
					exportsResult.status === "fulfilled"
						? (exportsResult.value.data ?? []).length
						: 0;
				const totalCampaigns =
					campaignsResult.status === "fulfilled"
						? (campaignsResult.value.data ?? []).length
						: 0;
				const totalLeads =
					leadsResult.status === "fulfilled"
						? (leadsResult.value.data ?? []).length
						: 0;

				setMetrics({
					totalReviews,
					averageRating,
					rating5,
					rating4,
					rating3,
					rating2,
					rating1,
					recentReviews: reviews.slice(0, 5),
					totalExports,
					totalCampaigns,
					totalLeads,
				});
			} catch (err) {
				console.error("Error fetching metrics:", err);
				setError("Erro ao carregar métricas de marketing");
			} finally {
				setLoading(false);
			}
		};

		fetchMetrics();
	}, []);

	const StatCard = ({
		title,
		value,
		icon: Icon,
		trend,
		href,
		color = "blue",
	}: {
		title: string;
		value: string | number;
		icon: React.ComponentType<{ className?: string }>;
		trend?: { value: number; isPositive: boolean };
		href?: string;
		color?: "blue" | "green" | "purple" | "amber" | "emerald";
	}) => {
		const gradientClasses = {
			blue: "gradient-brand-light",
			green: "gradient-success-light",
			purple: "gradient-accent-teal-light",
			amber: "gradient-warm-light",
			emerald: "gradient-success-light",
		};

		const colorClasses = {
			blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
			green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
			purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
			amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
			emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		};

		const cardContent = (
			<Card
				className={cn(
					"card-premium-hover border border-border/40 shadow-premium-sm",
					href && "cursor-pointer group",
					gradientClasses[color],
				)}
			>
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground font-display">
						{title}
					</CardTitle>
					<div className={cn("p-2 rounded-lg", colorClasses[color])}>
						<Icon className="h-4 w-4" />
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-baseline justify-between">
						<div className="text-2xl font-black font-display tracking-tighter">
							{value}
						</div>
						{trend && (
							<div
								className={cn(
									"flex items-center text-xs font-medium",
									trend.isPositive ? "text-emerald-600" : "text-red-600",
								)}
							>
								{trend.isPositive ? (
									<ArrowUpRight className="h-3 w-3 mr-1" />
								) : (
									<ArrowDown className="h-3 w-3 mr-1" />
								)}
								{trend.value}%
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		);

		return cardContent;
	};

	if (loading) {
		return (
			<MainLayout>
				<div className="p-6 max-w-7xl mx-auto">
					<div className="flex items-center justify-center h-64">
						<div className="flex flex-col items-center gap-4">
							<Activity className="h-8 w-8 animate-pulse text-primary" />
							<p className="text-muted-foreground">
								Carregando hub de marketing...
							</p>
						</div>
					</div>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto space-y-6">
				<div className="gradient-brand-light rounded-3xl p-8 border border-primary/20 card-premium-hover">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<h1 className="font-display text-4xl font-black tracking-tighter mb-2 text-primary">
								Marketing Hub
							</h1>
							<p className="text-muted-foreground mt-1 font-medium text-lg">
								Gestão centralizada de crescimento, autoridade e ROI
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className="magnetic-button glow-on-hover font-display"
								asChild
							>
								<Link to="/marketing/fisolink">
									<Link2 className="h-4 w-4 mr-2" />
									Meu FisioLink
								</Link>
							</Button>
							<Button
								size="sm"
								className="magnetic-button glow-on-hover font-display"
								asChild
							>
								<Link to="/marketing/content-generator">
									<Sparkles className="h-4 w-4 mr-2" />
									Gerar Conteúdo
								</Link>
							</Button>
						</div>
					</div>
				</div>

				<Tabs defaultValue="overview" className="w-full">
					<TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/50 rounded-xl">
						<TabsTrigger
							value="overview"
							className="magnetic-button rounded-lg py-2.5 font-display"
						>
							Visão Geral
						</TabsTrigger>
						<TabsTrigger
							value="reviews"
							className="magnetic-button rounded-lg py-2.5 text-amber-600"
						>
							Avaliações
						</TabsTrigger>
						<TabsTrigger
							value="seo"
							className="magnetic-button rounded-lg py-2.5 text-emerald-600"
						>
							SEO Local
						</TabsTrigger>
						<TabsTrigger
							value="roi"
							className="magnetic-button rounded-lg py-2.5 text-blue-600"
						>
							Calculadora ROI
						</TabsTrigger>
						<TabsTrigger
							value="strategy"
							className="magnetic-button rounded-lg py-2.5 text-purple-600"
						>
							Estratégia
						</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-6 mt-6">
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							<StatCard
								title="Avaliações Google"
								value={metrics?.totalReviews || 0}
								icon={Star}
								color="amber"
							/>
							<StatCard
								title="Média"
								value={metrics?.averageRating.toFixed(1) || "-"}
								icon={TrendingUp}
								color="emerald"
							/>
							<StatCard
								title="Exportações"
								value={metrics?.totalExports || 0}
								icon={Video}
								color="purple"
							/>
							<StatCard
								title="Leads CRM"
								value={metrics?.totalLeads || 0}
								icon={Mail}
								color="blue"
							/>
						</div>

						<div className="grid gap-6 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="text-sm flex items-center gap-2">
										<BarChart3 className="h-4 w-4" /> Distribuição de Notas
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{[5, 4, 3, 2, 1].map((star) => {
										const count =
											(metrics?.[
												`rating${star}` as keyof MarketingMetrics
											] as number) || 0;
										const percentage = metrics?.totalReviews
											? (count / metrics.totalReviews) * 100
											: 0;
										return (
											<div key={star} className="flex items-center gap-3">
												<span className="text-xs font-medium w-4">{star}</span>
												<div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
													<div
														className={cn(
															"h-full",
															star >= 4 ? "bg-emerald-500" : "bg-amber-500",
														)}
														style={{ width: `${percentage}%` }}
													/>
												</div>
												<span className="text-xs text-muted-foreground w-8">
													{count}
												</span>
											</div>
										);
									})}
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle className="text-sm flex items-center gap-2">
										<MessageSquare className="h-4 w-4" /> Últimas Avaliações
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{metrics?.recentReviews.map((r, i) => (
										<div key={i} className="flex gap-3 text-sm">
											<div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
												{r.author[0]}
											</div>
											<div className="flex-1">
												<p className="font-semibold">{r.author}</p>
												<p className="text-muted-foreground line-clamp-1">
													{r.comment}
												</p>
											</div>
										</div>
									))}
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="reviews" className="mt-6">
						<ReviewsContent />
					</TabsContent>

					<TabsContent value="seo" className="mt-6">
						<LocalSEOTracker />
					</TabsContent>

					<TabsContent value="roi" className="mt-6">
						<ROICalculatorContent />
					</TabsContent>

					<TabsContent value="strategy" className="mt-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Target className="h-5 w-5" />
									Estratégia de Crescimento IA
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="p-4 rounded-lg bg-purple-50 border border-purple-100 dark:bg-purple-950/20 dark:border-purple-900">
									<p className="text-sm text-purple-800 dark:text-purple-300">
										Seu perfil local tem <strong>12% mais visualizações</strong>{" "}
										que a média da região. Recomendamos focar em{" "}
										<strong>Google Reviews</strong> este mês para subir para o
										Top 3 no termo "Fisioterapia em [Cidade]".
									</p>
								</div>
								<div className="grid gap-4 md:grid-cols-2">
									<Button
										variant="outline"
										className="justify-start h-auto p-4 flex-col items-start gap-1"
									>
										<span className="font-bold">Scripts de WhatsApp</span>
										<span className="text-xs text-muted-foreground text-left">
											Modelos prontos para solicitar reviews e indicações
										</span>
									</Button>
									<Button
										variant="outline"
										className="justify-start h-auto p-4 flex-col items-start gap-1"
									>
										<span className="font-bold">Calendário Editorial</span>
										<span className="text-xs text-muted-foreground text-left">
											O que postar para atrair novos pacientes esta semana
										</span>
									</Button>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
}
