import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
	Trophy,
	Medal,
	Crown,
	User,
	Loader2,
	Search,
	TrendingUp,
	Flame,
	Star,
	Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import type { LeaderboardEntry } from "@/types/gamification";
import { gamificationApi } from "@/api/v2";

type LeaderboardPeriod = "week" | "month" | "all";
type LeaderboardCategory = "level" | "xp" | "streak" | "achievements";
type LeaderboardSort =
	| "level"
	| "total_xp"
	| "current_streak"
	| "achievements_count";
interface EnhancedLeaderboardProps {
	currentPatientId: string;
	locale?: "pt" | "en";
}

export function EnhancedLeaderboard({
	currentPatientId,
	locale = "pt",
}: EnhancedLeaderboardProps) {
	const [period, setPeriod] = useState<LeaderboardPeriod>("all");
	const [category, setCategory] = useState<LeaderboardCategory>("xp");
	const [searchQuery, setSearchQuery] = useState("");

	const { data: leaderboard = [], isLoading } = useQuery({
		queryKey: ["enhanced-leaderboard", period, category],
		queryFn: async () => {
			const res = await gamificationApi.getLeaderboard({
				period:
					period === "week" ? "weekly" : period === "month" ? "monthly" : "all",
				limit: 100,
			});
			let entries: LeaderboardEntry[] = (res.data ?? []).map((row) => ({
				patient_id: row.patient_id,
				display_name: row.patient_name || "Paciente",
				level: row.current_level || 1,
				total_xp: row.total_xp || 0,
				current_streak: row.current_streak || 0,
				achievements_count: 0,
				rank: row.rank,
			}));
			const sortField: LeaderboardSort =
				category === "level"
					? "level"
					: category === "xp"
						? "total_xp"
						: category === "streak"
							? "current_streak"
							: "achievements_count";
			entries = entries
				.sort((a, b) => b[sortField] - a[sortField])
				.map((entry, index) => ({ ...entry, rank: index + 1 }));
			return entries;
		},
		staleTime: 1000 * 60 * 15,
	});

	const filteredLeaderboard = useMemo(
		() =>
			!searchQuery
				? leaderboard
				: leaderboard.filter((entry) =>
						entry.display_name
							.toLowerCase()
							.includes(searchQuery.toLowerCase()),
					),
		[leaderboard, searchQuery],
	);
	const currentUserEntry = useMemo(
		() => leaderboard.find((e) => e.patient_id === currentPatientId),
		[leaderboard, currentPatientId],
	);
	const isTop3 = currentUserEntry && currentUserEntry.rank <= 3;

	const t = {
		title: locale === "pt" ? "Ranking Global" : "Global Ranking",
		subtitle:
			locale === "pt"
				? "Veja como você está se saindo em comparação com outros pacientes"
				: "See how you compare to other patients",
		yourPosition: locale === "pt" ? "Sua Posição" : "Your Position",
		searchPlaceholder:
			locale === "pt" ? "Buscar paciente..." : "Search patient...",
		tabs: {
			all: locale === "pt" ? "Todos" : "All",
			week: locale === "pt" ? "Semana" : "Week",
			month: locale === "pt" ? "Mês" : "Month",
		},
		categories: {
			xp: locale === "pt" ? "Por XP" : "By XP",
			level: locale === "pt" ? "Por Nível" : "By Level",
			streak: locale === "pt" ? "Por Streak" : "By Streak",
			achievements: locale === "pt" ? "Por Conquistas" : "By Achievements",
		},
		stats: {
			level: locale === "pt" ? "Nível" : "Level",
			points: locale === "pt" ? "Pontos" : "Points",
			streak: locale === "pt" ? "Dias" : "Days",
			achievements: locale === "pt" ? "Conquistas" : "Badges",
		},
		rank: locale === "pt" ? "Você" : "You",
		noRanking:
			locale === "pt"
				? "Ranking ainda não disponível. Ganhe pontos para participar!"
				: "Ranking not yet available. Earn points to participate!",
	};

	const getRankIcon = (rank: number) =>
		rank === 1 ? (
			<Crown className="h-6 w-6 text-yellow-500 fill-yellow-500" />
		) : rank === 2 ? (
			<Medal className="h-6 w-6 text-gray-500 fill-gray-400" />
		) : rank === 3 ? (
			<Medal className="h-6 w-6 text-amber-700 fill-amber-700" />
		) : (
			<span className="text-muted-foreground font-bold w-6 text-center">
				{rank}
			</span>
		);
	const getRowStyle = (rank: number, isCurrentUser: boolean) =>
		isCurrentUser
			? "bg-primary/10 border-primary/30 shadow-sm ring-1 ring-primary/20"
			: rank === 1
				? "bg-yellow-500/5 border-yellow-500/20"
				: rank === 2
					? "bg-gray-400/5 border-gray-400/20"
					: rank === 3
						? "bg-amber-700/5 border-amber-700/20"
						: "hover:bg-muted/50";
	const getCategoryIcon = (cat: LeaderboardCategory) =>
		cat === "xp" ? (
			<Star className="h-4 w-4" />
		) : cat === "level" ? (
			<TrendingUp className="h-4 w-4" />
		) : cat === "streak" ? (
			<Flame className="h-4 w-4" />
		) : (
			<Trophy className="h-4 w-4" />
		);
	const getPeriodIcon = (per: LeaderboardPeriod) =>
		per === "all" ? (
			<Trophy className="h-4 w-4" />
		) : (
			<Calendar className="h-4 w-4" />
		);
	const getDisplayValue = (
		entry: LeaderboardEntry,
		cat: LeaderboardCategory,
	) =>
		cat === "xp"
			? entry.total_xp.toLocaleString()
			: cat === "level"
				? entry.level
				: cat === "streak"
					? entry.current_streak
					: entry.achievements_count || 0;

	if (isLoading)
		return (
			<div className="flex justify-center p-12">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);

	return (
		<Card className="border-none shadow-none bg-transparent animate-fade-in">
			<CardHeader className="px-0 pt-0">
				<div className="flex items-center justify-between flex-wrap gap-4">
					<div>
						<CardTitle className="flex items-center gap-2 text-lg">
							<Trophy className="h-5 w-5 text-primary" />
							{t.title}
						</CardTitle>
						<p className="text-sm text-muted-foreground">{t.subtitle}</p>
					</div>
					{currentUserEntry && (
						<div className="text-right bg-primary/5 p-3 rounded-lg border border-primary/10 min-w-[120px]">
							<p className="text-[10px] uppercase font-bold text-primary/70">
								{t.yourPosition}
							</p>
							<p className="text-2xl font-black text-primary">
								#{currentUserEntry.rank}
							</p>
						</div>
					)}
				</div>
				<div className="relative mt-4">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder={t.searchPlaceholder}
						className="pl-9"
					/>
				</div>
				<div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<Tabs
						value={period}
						onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}
					>
						<TabsList>
							{(["all", "week", "month"] as LeaderboardPeriod[]).map((item) => (
								<TabsTrigger key={item} value={item} className="gap-2">
									{getPeriodIcon(item)}
									{t.tabs[item]}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					<div className="flex flex-wrap gap-2">
						{(
							["xp", "level", "streak", "achievements"] as LeaderboardCategory[]
						).map((item) => (
							<Button
								key={item}
								variant={category === item ? "default" : "outline"}
								size="sm"
								className="gap-2"
								onClick={() => setCategory(item)}
							>
								{getCategoryIcon(item)}
								{t.categories[item]}
							</Button>
						))}
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-0 pb-0">
				{filteredLeaderboard.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground">
						{t.noRanking}
					</div>
				) : (
					<div className="space-y-3">
						{filteredLeaderboard.map((entry) => {
							const isCurrentUser = entry.patient_id === currentPatientId;
							return (
								<div
									key={entry.patient_id}
									className={cn(
										"flex items-center gap-4 rounded-xl border p-4 transition-colors",
										getRowStyle(entry.rank, isCurrentUser),
									)}
								>
									<div className="w-8 flex justify-center">
										{getRankIcon(entry.rank)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<p className="font-semibold truncate">
												{entry.display_name}
											</p>
											{isCurrentUser && <Badge>{t.rank}</Badge>}
											{isCurrentUser && isTop3 && (
												<Badge variant="secondary">Top 3</Badge>
											)}
										</div>
										<p className="text-sm text-muted-foreground">
											{t.categories[category]}
										</p>
									</div>
									<div className="text-right">
										<p className="text-lg font-bold">
											{getDisplayValue(entry, category)}
										</p>
										<p className="text-xs text-muted-foreground">
											{category === "xp"
												? t.stats.points
												: category === "level"
													? t.stats.level
													: category === "streak"
														? t.stats.streak
														: t.stats.achievements}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
