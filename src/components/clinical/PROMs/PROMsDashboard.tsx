/**
 * PROMsDashboard — Visão geral de todas as escalas de um paciente
 *
 * Mostra: último resultado de cada escala + botão "Aplicar" + histórico (timeline)
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plus,
	TrendingUp,
	TrendingDown,
	Minus,
	Activity,
	Target,
	Hand,
	Brain,
	Footprints,
	PersonStanding,
	Bone,
	ClipboardList,
} from "lucide-react";
import { PROMSelector } from "./PROMSelector";
import { PROMTimeline } from "./PROMTimeline";

interface StandardizedTestResult {
	id: string;
	scale_name: string;
	score: number;
	interpretation?: string;
	applied_at: string;
}

const ALL_SCALES = [
	{
		key: "VAS",
		label: "EVA/VAS",
		icon: Activity,
		max: 10,
		unit: "pts",
		inverted: true,
		description: "Dor",
	},
	{
		key: "PSFS",
		label: "PSFS",
		icon: Target,
		max: 10,
		unit: "pts",
		inverted: false,
		description: "Funcional específica",
	},
	{
		key: "DASH",
		label: "DASH",
		icon: Hand,
		max: 100,
		unit: "%",
		inverted: true,
		description: "Membro superior",
	},
	{
		key: "OSWESTRY",
		label: "Oswestry",
		icon: Bone,
		max: 100,
		unit: "%",
		inverted: true,
		description: "Coluna lombar",
	},
	{
		key: "NDI",
		label: "NDI",
		icon: Brain,
		max: 100,
		unit: "%",
		inverted: true,
		description: "Coluna cervical",
	},
	{
		key: "LEFS",
		label: "LEFS",
		icon: Footprints,
		max: 80,
		unit: "pts",
		inverted: false,
		description: "Membro inferior",
	},
	{
		key: "BERG",
		label: "Berg",
		icon: PersonStanding,
		max: 56,
		unit: "pts",
		inverted: false,
		description: "Equilíbrio",
	},
] as const;

type ScaleKey = (typeof ALL_SCALES)[number]["key"];

const MCID: Record<ScaleKey, number | null> = {
	VAS: 1.5,
	PSFS: 2,
	DASH: 10.2,
	OSWESTRY: 10,
	NDI: 7.5,
	LEFS: 9,
	BERG: 4,
};

function scoreColor(scale: (typeof ALL_SCALES)[number], score: number): string {
	const pct = score / scale.max;
	if (scale.inverted) {
		if (pct <= 0.2) return "text-green-600";
		if (pct <= 0.5) return "text-yellow-600";
		return "text-red-600";
	} else {
		if (pct >= 0.75) return "text-green-600";
		if (pct >= 0.5) return "text-yellow-600";
		return "text-red-600";
	}
}

function TrendIcon({
	delta,
	inverted,
	mcid,
}: {
	delta: number | null;
	inverted: boolean;
	mcid: number | null;
}) {
	if (delta === null || mcid === null)
		return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
	const improved = inverted ? delta <= -mcid : delta >= mcid;
	const worsened = inverted ? delta >= mcid : delta <= -mcid;
	if (improved) return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
	if (worsened) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
	return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

interface ScaleCardProps {
	scale: (typeof ALL_SCALES)[number];
	results: StandardizedTestResult[];
	onApply: (scaleKey: ScaleKey) => void;
	onViewTimeline: (scaleKey: ScaleKey) => void;
}

function ScaleCard({
	scale,
	results,
	onApply,
	onViewTimeline,
}: ScaleCardProps) {
	const Icon = scale.icon;
	const last = results[0];
	const prev = results[1];
	const delta = last && prev ? Number(last.score) - Number(prev.score) : null;
	const mcid = MCID[scale.key];

	return (
		<Card
			className="hover:shadow-md transition-shadow cursor-pointer"
			onClick={() => last && onViewTimeline(scale.key)}
		>
			<CardContent className="p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<div className="p-1.5 rounded-md bg-primary/10">
							<Icon className="h-4 w-4 text-primary" />
						</div>
						<div className="min-w-0">
							<p className="font-medium text-sm leading-tight">{scale.label}</p>
							<p className="text-[11px] text-muted-foreground truncate">
								{scale.description}
							</p>
						</div>
					</div>
					{last ? (
						<div className="text-right shrink-0">
							<p
								className={`text-xl font-bold leading-tight ${scoreColor(scale, last.score)}`}
							>
								{Number(last.score).toFixed(1)}
								<span className="text-xs font-normal text-muted-foreground ml-0.5">
									{scale.unit}
								</span>
							</p>
							<div className="flex items-center justify-end gap-1 mt-0.5">
								<TrendIcon
									delta={delta}
									inverted={scale.inverted}
									mcid={mcid}
								/>
								{results.length > 0 && (
									<span className="text-[10px] text-muted-foreground">
										{results.length}x
									</span>
								)}
							</div>
						</div>
					) : (
						<Button
							size="sm"
							variant="outline"
							className="text-xs h-7 shrink-0"
							onClick={(e) => {
								e.stopPropagation();
								onApply(scale.key);
							}}
						>
							<Plus className="h-3 w-3 mr-1" />
							Aplicar
						</Button>
					)}
				</div>

				{last && (
					<div className="mt-3 pt-2 border-t flex items-center justify-between">
						<p className="text-[11px] text-muted-foreground">
							{last.interpretation ??
								new Date(last.applied_at).toLocaleDateString("pt-BR")}
						</p>
						<div className="flex gap-1">
							<Button
								size="sm"
								variant="ghost"
								className="text-xs h-6 px-2"
								onClick={(e) => {
									e.stopPropagation();
									onViewTimeline(scale.key);
								}}
							>
								Histórico
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="text-xs h-6 px-2"
								onClick={(e) => {
									e.stopPropagation();
									onApply(scale.key);
								}}
							>
								<Plus className="h-2.5 w-2.5 mr-1" />
								Nova
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface PROMsDashboardProps {
	patientId: string;
	sessionId?: string;
}

export function PROMsDashboard({ patientId, sessionId }: PROMsDashboardProps) {
	const [selectorOpen, setSelectorOpen] = useState(false);
	const [defaultScale, setDefaultScale] = useState<ScaleKey | undefined>();
	const [activeTimeline, setActiveTimeline] = useState<ScaleKey | null>(null);

	const { data, isLoading } = useQuery<StandardizedTestResult[]>({
		queryKey: ["standardized-tests", patientId, "all"],
		queryFn: async () => {
			const res = await request<{ data: StandardizedTestResult[] }>(
				`/api/standardized-tests?patientId=${patientId}&limit=200`,
			);
			return res?.data ?? [];
		},
		enabled: Boolean(patientId),
		staleTime: 5 * 60 * 1000,
	});

	const byScale = (data ?? []).reduce<Record<string, StandardizedTestResult[]>>(
		(acc, r) => {
			const key = r.scale_name.toUpperCase();
			if (!acc[key]) acc[key] = [];
			acc[key].push(r);
			return acc;
		},
		{},
	);

	// Sort each scale by date desc
	for (const k of Object.keys(byScale)) {
		byScale[k].sort(
			(a, b) =>
				new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime(),
		);
	}

	const totalAssessments = (data ?? []).length;
	const scalesUsed = Object.keys(byScale).length;

	const handleApply = (scaleKey: ScaleKey) => {
		setDefaultScale(scaleKey);
		setSelectorOpen(true);
	};

	if (activeTimeline) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setActiveTimeline(null)}
						className="gap-1"
					>
						← Voltar
					</Button>
					<span className="text-sm font-medium">
						{ALL_SCALES.find((s) => s.key === activeTimeline)?.label} — Evolução
					</span>
				</div>
				<PROMTimeline patientId={patientId} scaleName={activeTimeline} />
				<Button
					variant="outline"
					size="sm"
					className="gap-1"
					onClick={() => handleApply(activeTimeline)}
				>
					<Plus className="h-3.5 w-3.5" />
					Nova avaliação
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<ClipboardList className="h-5 w-5 text-primary" />
					<h3 className="font-semibold">Desfechos Clínicos (PROMs)</h3>
				</div>
				<Button
					size="sm"
					onClick={() => {
						setDefaultScale(undefined);
						setSelectorOpen(true);
					}}
					className="gap-1"
				>
					<Plus className="h-4 w-4" />
					Aplicar Escala
				</Button>
			</div>

			{/* Summary */}
			{!isLoading && totalAssessments > 0 && (
				<div className="flex gap-3 text-sm text-muted-foreground">
					<span>{totalAssessments} avaliações registradas</span>
					<span>·</span>
					<span>
						{scalesUsed} escala{scalesUsed !== 1 ? "s" : ""} utilizada
						{scalesUsed !== 1 ? "s" : ""}
					</span>
				</div>
			)}

			{/* Scale cards grid */}
			{isLoading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{[1, 2, 3, 4, 5, 6, 7].map((i) => (
						<Skeleton key={i} className="h-28 w-full" />
					))}
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{ALL_SCALES.map((scale) => (
						<ScaleCard
							key={scale.key}
							scale={scale}
							results={byScale[scale.key] ?? []}
							onApply={handleApply}
							onViewTimeline={setActiveTimeline}
						/>
					))}
				</div>
			)}

			{!isLoading && totalAssessments === 0 && (
				<div className="py-8 text-center text-muted-foreground">
					<ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
					<p className="font-medium">Nenhuma escala aplicada</p>
					<p className="text-sm mt-1">
						Aplique uma escala para acompanhar a evolução do paciente com
						desfechos validados.
					</p>
					<Button className="mt-4 gap-1" onClick={() => setSelectorOpen(true)}>
						<Plus className="h-4 w-4" />
						Aplicar primeira escala
					</Button>
				</div>
			)}

			<PROMSelector
				patientId={patientId}
				sessionId={sessionId}
				open={selectorOpen}
				onOpenChange={setSelectorOpen}
				defaultScale={defaultScale}
			/>
		</div>
	);
}
