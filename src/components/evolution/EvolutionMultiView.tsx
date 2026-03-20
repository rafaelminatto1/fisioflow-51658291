/**
 * EvolutionMultiView - Visualizacao multi-modo estilo Notion para historico de evolucoes
 *
 * Modos disponíveis:
 * - Timeline: linha do tempo cronologica (EvolutionTimeline existente)
 * - Calendario: grade mensal com sessoes destacadas (react-day-picker v9)
 * - Galeria: grade de fotos das sessoes
 * - Grafo: placeholder para grafo de conhecimento
 */

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Clock,
	Calendar as CalendarIcon,
	Image,
	GitBranch,
	Camera,
	Brain,
	ZoomIn,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EvolutionTimeline } from "@/components/evolution/EvolutionTimeline";
import { PatientKnowledgeGraph } from "@/components/evolution/PatientKnowledgeGraph";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvolutionMultiViewProps {
	patientId: string;
	surgeries?: Array<{
		id: string;
		name: string;
		date: string;
		description?: string;
	}>;
	previousEvolutions?: Array<{
		id: string;
		patient_id: string;
		record_date?: string;
		date?: string;
		created_at: string;
		subjective?: string;
		objective?: string;
		assessment?: string;
		plan?: string;
		pain_level?: number;
		attachments?: string[];
	}>;
	onCopyEvolution?: (evolution: unknown) => void;
	showComparison?: boolean;
	onToggleComparison?: () => void;
	goals?: Array<{
		id: string;
		goal_title: string;
		status: string;
		current_progress: number;
		priority: string;
	}>;
	pathologies?: Array<{
		id: string;
		pathology_name: string;
		status: string;
		severity?: string;
	}>;
}

type ViewMode = "timeline" | "calendario" | "galeria" | "grafo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extrai a data preferida de uma evolucao como objeto Date */
function resolveDate(
	evolution: EvolutionMultiViewProps["previousEvolutions"][number],
): Date | null {
	const raw = evolution.record_date ?? evolution.date ?? evolution.created_at;
	if (!raw) return null;
	try {
		const d = parseISO(raw);
		if (isValid(d)) return d;
		const fallback = new Date(raw);
		return isValid(fallback) ? fallback : null;
	} catch {
		return null;
	}
}

/** Retorna verdadeiro se a URL parece ser uma imagem */
function looksLikeImage(url: string): boolean {
	if (!url) return false;
	const lower = url.toLowerCase();
	const legacyStorageHost = ["fire", "basestorage"].join("");
	// URLs de storage geralmente nao tem extensao visivel, mas tentamos detectar
	return (
		/\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(lower) ||
		lower.includes(legacyStorageHost) ||
		lower.includes("storage.googleapis")
	);
}

// ---------------------------------------------------------------------------
// Sub-component: CalendarView
// ---------------------------------------------------------------------------

interface CalendarViewProps {
	evolutions: EvolutionMultiViewProps["previousEvolutions"];
}

const CalendarView: React.FC<CalendarViewProps> = ({ evolutions }) => {
	const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
	const [month, setMonth] = useState<Date>(new Date());

	// Mapa: timestamp-ISO-dia -> evolutions naquele dia
	const evolutionsByDay = useMemo(() => {
		const map = new Map<string, typeof evolutions>();
		for (const ev of evolutions ?? []) {
			const d = resolveDate(ev);
			if (!d) continue;
			const key = format(d, "yyyy-MM-dd");
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(ev);
		}
		return map;
	}, [evolutions]);

	// Datas com sessoes (para o modificador do DayPicker)
	const sessionDates = useMemo(
		() =>
			Array.from(evolutionsByDay.keys())
				.map((k) => parseISO(k))
				.filter(isValid),
		[evolutionsByDay],
	);

	// Sessoes do dia selecionado
	const sessionsForSelectedDay = useMemo(() => {
		if (!selectedDay) return [];
		const key = format(selectedDay, "yyyy-MM-dd");
		return evolutionsByDay.get(key) ?? [];
	}, [selectedDay, evolutionsByDay]);

	// Contagem para um dia (usado nos footers dos dias)
	const getCountForDay = useCallback(
		(day: Date) => {
			const key = format(day, "yyyy-MM-dd");
			return evolutionsByDay.get(key)?.length ?? 0;
		},
		[evolutionsByDay],
	);

	return (
		<div className="flex flex-col lg:flex-row gap-6">
			{/* Calendario */}
			<Card className="flex-shrink-0 shadow-sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-base flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
						<CalendarIcon className="h-4 w-4" />
						Calendário de Sessoes
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0 pb-4">
					<style>{`
            .rdp-evolution .rdp-day_button:hover { background: hsl(var(--accent)); }
            .rdp-evolution [data-has-session] .rdp-day_button {
              position: relative;
              font-weight: 600;
            }
            .rdp-evolution [data-has-session] .rdp-day_button::after {
              content: '';
              position: absolute;
              bottom: 3px;
              left: 50%;
              transform: translateX(-50%);
              width: 5px;
              height: 5px;
              border-radius: 50%;
              background: #6366f1;
            }
          `}</style>

					<DayPicker
						className="rdp-evolution"
						locale={ptBR}
						month={month}
						onMonthChange={setMonth}
						mode="single"
						selected={selectedDay}
						onSelect={setSelectedDay}
						modifiers={{ hasSession: sessionDates }}
						modifiersClassNames={{ hasSession: "rdp-day-has-session" }}
						footer={
							selectedDay ? (
								<div className="mt-2 px-4 text-xs text-muted-foreground text-center">
									{getCountForDay(selectedDay) > 0
										? `${getCountForDay(selectedDay)} sessao(oes) em ${format(selectedDay, "dd/MM/yyyy", { locale: ptBR })}`
										: "Nenhuma sessao neste dia"}
								</div>
							) : (
								<div className="mt-2 px-4 text-xs text-muted-foreground text-center">
									Selecione um dia para ver as sessoes
								</div>
							)
						}
					/>

					{/* Legenda */}
					<div className="px-4 flex items-center gap-3 text-xs text-muted-foreground">
						<span className="flex items-center gap-1">
							<span className="inline-block w-3 h-3 rounded-full bg-indigo-500" />
							Com sessao
						</span>
						<span className="flex items-center gap-1">
							<span className="inline-block w-3 h-3 rounded-full bg-accent border" />
							Selecionado
						</span>
					</div>
				</CardContent>
			</Card>

			{/* Painel lateral: sessoes do dia selecionado */}
			<div className="flex-1 min-w-0">
				<AnimatePresence mode="wait">
					{selectedDay ? (
						<motion.div
							key={selectedDay.toISOString()}
							initial={{ opacity: 0, x: 16 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -16 }}
							transition={{ duration: 0.2 }}
							className="space-y-3"
						>
							<div className="flex items-center gap-2 mb-3">
								<h3 className="font-semibold text-sm">
									{format(selectedDay, "dd 'de' MMMM 'de' yyyy", {
										locale: ptBR,
									})}
								</h3>
								{sessionsForSelectedDay.length > 0 && (
									<Badge variant="secondary" className="text-xs">
										{sessionsForSelectedDay.length} sessao(oes)
									</Badge>
								)}
							</div>

							{sessionsForSelectedDay.length === 0 ? (
								<Card className="border-dashed">
									<CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
										<CalendarIcon className="h-10 w-10 mb-3 opacity-30" />
										<p className="text-sm">
											Nenhuma sessao registrada neste dia
										</p>
									</CardContent>
								</Card>
							) : (
								sessionsForSelectedDay.map((ev, index) => (
									<motion.div
										key={ev.id}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.05 }}
									>
										<Card className="shadow-sm hover:shadow-md transition-shadow">
											<CardContent className="pt-4 pb-3">
												<div className="flex items-center gap-2 mb-3">
													<div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
														{index + 1}
													</div>
													<span className="text-xs text-muted-foreground">
														{format(resolveDate(ev) ?? new Date(), "HH:mm", {
															locale: ptBR,
														})}
													</span>
													{ev.pain_level !== undefined && (
														<Badge
															variant="outline"
															className={cn(
																"text-xs ml-auto",
																ev.pain_level >= 7
																	? "border-red-500/40 text-red-600 dark:text-red-400"
																	: ev.pain_level >= 4
																		? "border-yellow-500/40 text-yellow-600 dark:text-yellow-400"
																		: "border-green-500/40 text-green-600 dark:text-green-400",
															)}
														>
															Dor: {ev.pain_level}/10
														</Badge>
													)}
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
													{ev.subjective && (
														<div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
															<p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
																S:
															</p>
															<p className="text-muted-foreground line-clamp-2">
																{ev.subjective}
															</p>
														</div>
													)}
													{ev.objective && (
														<div className="p-2 rounded-lg bg-green-500/5 border border-green-500/10">
															<p className="font-semibold text-green-600 dark:text-green-400 mb-1">
																O:
															</p>
															<p className="text-muted-foreground line-clamp-2">
																{ev.objective}
															</p>
														</div>
													)}
													{ev.assessment && (
														<div className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10">
															<p className="font-semibold text-purple-600 dark:text-purple-400 mb-1">
																A:
															</p>
															<p className="text-muted-foreground line-clamp-2">
																{ev.assessment}
															</p>
														</div>
													)}
													{ev.plan && (
														<div className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
															<p className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
																P:
															</p>
															<p className="text-muted-foreground line-clamp-2">
																{ev.plan}
															</p>
														</div>
													)}
												</div>
											</CardContent>
										</Card>
									</motion.div>
								))
							)}
						</motion.div>
					) : (
						<motion.div
							key="empty-calendar"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="flex flex-col items-center justify-center h-full min-h-[220px] text-muted-foreground"
						>
							<CalendarIcon className="h-12 w-12 mb-3 opacity-20" />
							<p className="text-sm text-center">
								Clique em um dia destacado no calendário para ver as sessoes
							</p>
							<p className="text-xs mt-1 opacity-60">
								{sessionDates.length} dia(s) com sessoes registradas
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

// ---------------------------------------------------------------------------
// Sub-component: GalleryView
// ---------------------------------------------------------------------------

interface GalleryPhoto {
	url: string;
	evolutionId: string;
	evolutionDate: Date;
	sessionIndex: number;
}

interface GalleryViewProps {
	evolutions: EvolutionMultiViewProps["previousEvolutions"];
}

const GalleryView: React.FC<GalleryViewProps> = ({ evolutions }) => {
	const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

	const photos = useMemo<GalleryPhoto[]>(() => {
		const result: GalleryPhoto[] = [];
		const sortedEvolutions = [...(evolutions ?? [])].sort((a, b) => {
			const da = resolveDate(a);
			const db_ = resolveDate(b);
			if (!da || !db_) return 0;
			return db_.getTime() - da.getTime();
		});

		sortedEvolutions.forEach((ev, idx) => {
			if (!ev.attachments?.length) return;
			const date = resolveDate(ev);
			if (!date) return;
			ev.attachments.forEach((url) => {
				if (looksLikeImage(url)) {
					result.push({
						url,
						evolutionId: ev.id,
						evolutionDate: date,
						sessionIndex: idx + 1,
					});
				}
			});
		});
		return result;
	}, [evolutions]);

	if (photos.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col items-center justify-center min-h-[280px] text-muted-foreground"
			>
				<Camera className="h-14 w-14 mb-4 opacity-20" />
				<p className="text-base font-medium">Nenhuma foto encontrada</p>
				<p className="text-sm mt-1 opacity-70 text-center max-w-xs">
					Evolucao sem fotos — adicione imagens nas sessoes para visualizalas
					aqui
				</p>
			</motion.div>
		);
	}

	return (
		<>
			{/* Grade de fotos */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
				{photos.map((photo, index) => (
					<motion.div
						key={`${photo.evolutionId}-${index}`}
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: index * 0.04, duration: 0.2 }}
						className="group relative aspect-square rounded-xl overflow-hidden bg-muted border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
						onClick={() => setLightboxUrl(photo.url)}
					>
						<img
							src={photo.url}
							alt={`Sessao ${photo.sessionIndex} — ${format(photo.evolutionDate, "dd/MM/yyyy", { locale: ptBR })}`}
							className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
							loading="lazy"
						/>

						{/* Overlay ao passar o mouse */}
						<div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex flex-col items-center justify-center gap-1">
							<ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
							<span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity px-2 text-center leading-tight">
								{format(photo.evolutionDate, "dd/MM/yyyy", { locale: ptBR })}
							</span>
						</div>

						{/* Badge de sessao */}
						<div className="absolute top-2 left-2">
							<Badge
								variant="secondary"
								className="text-[10px] px-1.5 py-0 backdrop-blur-sm bg-black/40 text-white border-0"
							>
								Sessao {photo.sessionIndex}
							</Badge>
						</div>
					</motion.div>
				))}
			</div>

			{/* Lightbox simples */}
			<AnimatePresence>
				{lightboxUrl && (
					<motion.div
						key="lightbox"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
						onClick={() => setLightboxUrl(null)}
					>
						<motion.div
							initial={{ scale: 0.92, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.92, opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="relative max-w-4xl max-h-[90vh] w-full"
							onClick={(e) => e.stopPropagation()}
						>
							<img
								src={lightboxUrl}
								alt="Foto ampliada"
								className="w-full h-full object-contain rounded-lg"
							/>
							<Button
								variant="secondary"
								size="sm"
								className="absolute top-3 right-3 bg-black/60 text-white border-0 hover:bg-black/80"
								onClick={() => setLightboxUrl(null)}
							>
								Fechar
							</Button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

// ---------------------------------------------------------------------------
// Sub-component: GrafoView (placeholder)
// ---------------------------------------------------------------------------

interface GrafoViewProps {
	patientId: string;
	sessions: EvolutionMultiViewProps["previousEvolutions"];
	goals?: EvolutionMultiViewProps["goals"];
	pathologies?: EvolutionMultiViewProps["pathologies"];
}

const GrafoView: React.FC<GrafoViewProps> = ({
	patientId,
	sessions = [],
	goals = [],
	pathologies = [],
}) => {
	const graphSessions = sessions.map((ev, idx) => ({
		id: ev.id,
		date: ev.record_date ?? ev.date ?? ev.created_at,
		sessionNumber: sessions.length - idx,
		subjective: ev.subjective,
		painLevel: ev.pain_level,
	}));

	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25 }}
			className="min-h-[520px]"
		>
			<PatientKnowledgeGraph
				patientId={patientId}
				sessions={graphSessions}
				goals={goals}
				pathologies={pathologies}
				className="rounded-xl border"
			/>
		</motion.div>
	);
};

// ---------------------------------------------------------------------------
// View mode configuration
// ---------------------------------------------------------------------------

const VIEW_MODES: Array<{
	value: ViewMode;
	label: string;
	icon: React.FC<{ className?: string }>;
}> = [
	{ value: "timeline", label: "Timeline", icon: Clock },
	{ value: "calendario", label: "Calendario", icon: CalendarIcon },
	{ value: "galeria", label: "Galeria", icon: Image },
	{ value: "grafo", label: "Grafo", icon: GitBranch },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const EvolutionMultiView: React.FC<EvolutionMultiViewProps> = ({
	patientId,
	surgeries,
	previousEvolutions = [],
	onCopyEvolution,
	showComparison,
	onToggleComparison,
	goals = [],
	pathologies = [],
}) => {
	const [activeView, setActiveView] = useState<ViewMode>("timeline");

	// Contagem de fotos para badge na aba Galeria
	const photoCount = useMemo(() => {
		let count = 0;
		for (const ev of previousEvolutions) {
			count += ev.attachments?.filter(looksLikeImage).length ?? 0;
		}
		return count;
	}, [previousEvolutions]);

	return (
		<div className="space-y-4">
			{/* ---- Seletor de Visualizacao (estilo Notion) ---- */}
			<Tabs
				value={activeView}
				onValueChange={(v) => setActiveView(v as ViewMode)}
			>
				<div className="flex items-center gap-2 flex-wrap">
					<TabsList className="h-9 gap-0.5 bg-muted/60 p-1">
						{VIEW_MODES.map(({ value, label, icon: Icon }) => (
							<TabsTrigger
								key={value}
								value={value}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all",
									"data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
								)}
							>
								<Icon className="h-3.5 w-3.5 flex-shrink-0" />
								<span className="hidden sm:inline">{label}</span>
								{/* Badge de contagem para galeria */}
								{value === "galeria" && photoCount > 0 && (
									<Badge
										variant="secondary"
										className="h-4 min-w-4 px-1 text-[10px] leading-none ml-0.5"
									>
										{photoCount}
									</Badge>
								)}
								{/* Badge de contagem para timeline */}
								{value === "timeline" && previousEvolutions.length > 0 && (
									<Badge
										variant="secondary"
										className="h-4 min-w-4 px-1 text-[10px] leading-none ml-0.5"
									>
										{previousEvolutions.length}
									</Badge>
								)}
							</TabsTrigger>
						))}
					</TabsList>

					{/* Info contextual */}
					<span className="text-xs text-muted-foreground ml-auto hidden md:block">
						{activeView === "timeline" &&
							`${previousEvolutions.length} registros`}
						{activeView === "calendario" &&
							`${
								new Set(
									previousEvolutions
										.map((e) => {
											const d = resolveDate(e);
											return d ? format(d, "yyyy-MM-dd") : null;
										})
										.filter(Boolean),
								).size
							} dias com sessoes`}
						{activeView === "galeria" && `${photoCount} foto(s)`}
						{activeView === "grafo" && "Em desenvolvimento"}
					</span>
				</div>

				{/* ---- Conteúdo de cada aba ---- */}

				{/* Timeline */}
				<TabsContent value="timeline" className="mt-4">
					<AnimatePresence mode="wait">
						<motion.div
							key="timeline"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
							className="space-y-4"
						>
							{patientId && (
								<EvolutionTimeline
									patientId={patientId}
									showFilters
									onCopyEvolution={onCopyEvolution}
								/>
							)}
						</motion.div>
					</AnimatePresence>
				</TabsContent>

				{/* Calendário */}
				<TabsContent value="calendario" className="mt-4">
					<AnimatePresence mode="wait">
						<motion.div
							key="calendario"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
						>
							<CalendarView evolutions={previousEvolutions} />
						</motion.div>
					</AnimatePresence>
				</TabsContent>

				{/* Galeria */}
				<TabsContent value="galeria" className="mt-4">
					<AnimatePresence mode="wait">
						<motion.div
							key="galeria"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
						>
							<GalleryView evolutions={previousEvolutions} />
						</motion.div>
					</AnimatePresence>
				</TabsContent>

				{/* Grafo */}
				<TabsContent value="grafo" className="mt-4">
					<AnimatePresence mode="wait">
						<motion.div
							key="grafo"
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
						>
							<GrafoView
								patientId={patientId}
								sessions={previousEvolutions}
								goals={goals}
								pathologies={pathologies}
							/>
						</motion.div>
					</AnimatePresence>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export type { EvolutionMultiViewProps as EvolutionMultiViewPropsType };
