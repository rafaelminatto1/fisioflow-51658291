/**
 * Patient Evolution Page - Migrated to Neon/Cloudflare
 * Optimized with modular hooks and components for better maintainability.
 */

import {
	lazy,
	Suspense,
	useMemo,
	useEffect,
	useCallback,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { APP_ROUTES } from "@/lib/routing/appRoutes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useCommandPalette } from "@/hooks/ui/useCommandPalette";
import { PatientHelpers } from "@/types";
import {
	FileText,
	Activity,
	Layers,
	History,
	Bot,
	Settings as SettingsIcon,
	Camera,
} from "lucide-react";

// Hooks Modulares
import { usePatientEvolutionState } from "@/hooks/evolution/usePatientEvolutionState";
import { usePatientEvolutionHandlers } from "@/hooks/evolution/usePatientEvolutionHandlers";
import { useEvolutionShortcuts } from "@/hooks/evolution/useEvolutionShortcuts";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useAutoSaveSoapRecord } from "@/hooks/useSoapRecords";
import { useEvolutionDraft } from "@/hooks/useEvolutionDraft";
import {
	useOfflineSync,
	ACTION_TYPES,
	enqueueAction,
} from "@/services/offlineSync";
import { stripHtml } from "@/lib/utils/stripHtml";

// Componentes
import { EvolutionHeader } from "@/components/evolution/EvolutionHeader";
import { EvolutionHeaderV3 } from "@/components/evolution/EvolutionHeaderV3";
import { EvolutionTabsBar } from "@/components/evolution/EvolutionTabsBar";
import { EvolutionNoScrollPanel } from "@/components/evolution/v2-improved/EvolutionNoScrollPanel";
import { AIScribeModal } from "@/components/evolution/clinical-scribe/AIScribeModal";
import { FloatingActionBar } from "@/components/evolution/FloatingActionBar";
import { EvolutionKeyboardShortcuts } from "@/components/evolution/EvolutionKeyboardShortcuts";
import { EvolutionAlerts } from "@/components/evolution/EvolutionAlerts";
import { MandatoryTestAlert } from "@/components/session/MandatoryTestAlert";
import { MedicalReturnCard } from "@/components/evolution/MedicalReturnCard";
import { SurgeriesCard } from "@/components/evolution/SurgeriesCard";
import { EvolutionSummaryCard } from "@/components/evolution/EvolutionSummaryCard";
import { MetasCard } from "@/components/evolution/MetasCard";
import { ComponentErrorBoundary } from "@/components/error";
import { ApplyTemplateModal } from "@/components/evolution/modals/ApplyTemplateModal";
import {
	EvolutionConflictModal,
	type EvolutionConflictData,
} from "@/components/evolution/EvolutionConflictModal";

import type { EvolutionTab } from "@/hooks/evolution/useEvolutionDataOptimized";

// Lazy tabs
const LazyEvolucaoTab = lazy(() =>
	import("@/components/evolution/tabs/EvolucaoTab").then((m) => ({
		default: m.EvolucaoTab,
	})),
);
const LazyAvaliacaoTab = lazy(() =>
	import("@/components/evolution/tabs/AvaliacaoTab").then((m) => ({
		default: m.AvaliacaoTab,
	})),
);
const LazyTratamentoTab = lazy(() =>
	import("@/components/evolution/tabs/TratamentoTab").then((m) => ({
		default: m.TratamentoTab,
	})),
);
const LazyHistoricoTab = lazy(() =>
	import("@/components/evolution/tabs/HistoricoTab").then((m) => ({
		default: m.HistoricoTab,
	})),
);
const LazyAssistenteTab = lazy(() =>
	import("@/components/evolution/tabs/AssistenteTab").then((m) => ({
		default: m.AssistenteTab,
	})),
);
const LazyPROMsDashboard = lazy(() =>
	import("@/components/clinical/PROMs/PROMsDashboard").then((m) => ({
		default: m.PROMsDashboard,
	})),
);
const LazyEvolutionSettingsTab = lazy(() =>
	import("@/components/evolution/v3-notion/EvolutionSettingsTab").then((m) => ({
		default: m.EvolutionSettingsTab,
	})),
);
const LazyPatientMediaGallery = lazy(() =>
	import("@/components/patient/PatientMediaGallery").then((m) => ({
		default: m.PatientMediaGallery,
	})),
);

// Lazy editor (modo premium com cabeçalho)
const LazyNotionEvolutionPanel = lazy(() =>
	import("@/components/evolution/v2-improved/NotionEvolutionPanel").then(
		(m) => ({
			default: m.NotionEvolutionPanel,
		}),
	),
);

import { preloadEditorChunks } from "@/lib/evolution/preloadEditors";
import { stripPainDetail } from "@/lib/evolution/painDetail";
import type { EvolutionV2Data } from "@/components/evolution/v2-improved/types";

export interface PainScaleData {
	level: number;
	location?: string;
	character?: string;
}

const PatientEvolution = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { CommandPaletteComponent } = useCommandPalette();
	const state = usePatientEvolutionState();
	const handlers = usePatientEvolutionHandlers(state);
	// Scope serializa autosaves por evolução: evita races out-of-order entre
	// mutations concorrentes (debounce + unmount + maxDelay forçado).
	const autoSaveScopeId = state.appointmentId
		? `autosave-evolution-${state.appointmentId}`
		: undefined;
	const autoSaveMutation = useAutoSaveSoapRecord(autoSaveScopeId);

	// Conflict state — disparado quando server retorna 409 (outra aba/dispositivo
	// editou a mesma evolução em paralelo). Ref: spec US2.
	const [conflict, setConflict] = useState<EvolutionConflictData | null>(null);
	// Quando o usuário escolhe "manter minha versão", o próximo save deve ir
	// sem `version` (force overwrite). Reset após o save bem-sucedido.
	const forceOverwriteRef = useRef(false);

	// Status offline (queue de ações pendentes + navigator.onLine)
	const offline = useOfflineSync();

	// Persistência local do rascunho (sobrevive a reload/fechar aba)
	const draft = useEvolutionDraft<EvolutionV2Data>({
		evolutionId: state.currentSoapRecordId,
		patientId: state.patientId,
		appointmentId: state.appointmentId,
		sessionDate: state.evolutionV2Data?.sessionDate,
	});

	const handleEvolutionV2Change = useCallback(
		(next: EvolutionV2Data) => {
			// P2.3: setEvolutionV2Data agora traduz V2→canonical internamente
			// (fonte única da verdade). Apenas chamamos e seguimos.
			state.setEvolutionV2Data(next);
			// Persiste o rascunho local somente quando há conteúdo real — evita que
			// renders iniciais com state vazio (antes da hidratação do servidor)
			// sobrescrevam o draft local válido.
			const nextHasContent =
				!!(next.unifiedItems?.length ?? 0) ||
				!!(next.procedures?.length ?? 0) ||
				!!(next.exercises?.length ?? 0) ||
				!!(next.measurements?.length ?? 0) ||
				!!(next.painLevel != null) ||
				(next.evolutionText || next.observations || "").trim().length > 0;
			if (nextHasContent) {
				draft.writeDraft(next);
			}
		},
		[state, draft],
	);

	// Hidratação do draft local — roda quando:
	//  - mudou a sessão (key combina patientId+appointmentId+evolutionId)
	//  - o servidor terminou de carregar (state.isLoadingTabData = false)
	// Re-hidrata ao navegar entre evoluções diferentes.
	const hydratedKeyRef = useRef<string | null>(null);
	useEffect(() => {
		if (state.isLoadingTabData) return;
		if (!state.patientId) return;
		const key = `${state.patientId}:${state.appointmentId ?? ""}:${state.currentSoapRecordId ?? ""}`;
		if (hydratedKeyRef.current === key) return;
		hydratedKeyRef.current = key;

		const saved = draft.readDraft();
		if (!saved) return;

		// Se o rascunho é diferente do que veio do servidor, restauramos.
		// O rascunho é a "verdade do cliente" até que o servidor confirme.
		const current = state.evolutionV2Data;
		const isDifferent =
			(saved.evolutionText || saved.observations || "").trim() !==
				(current.evolutionText || current.observations || "").trim() ||
			(saved.painLevel ?? null) !== (current.painLevel ?? null) ||
			(saved.unifiedItems?.length ?? 0) !== (current.unifiedItems?.length ?? 0);

		if (isDifferent) {
			handleEvolutionV2Change(saved);
			toast.message("Rascunho restaurado", {
				description: "Restauramos suas alterações locais não sincronizadas.",
			});
		}
	}, [
		state.patientId,
		state.appointmentId,
		state.currentSoapRecordId,
		state.isLoadingTabData,
		state.evolutionV2Data,
		draft,
		handleEvolutionV2Change,
	]);

	// Preload all editor chunks during idle time so tab switching is instant
	useEffect(() => {
		const load = () => {
			Object.values(preloadEditorChunks).forEach((fn) => fn());
		};
		if ("requestIdleCallback" in window) {
			const id = (window as any).requestIdleCallback(load, { timeout: 3000 });
			return () => (window as any).cancelIdleCallback(id);
		}
		const t = setTimeout(load, 1500);
		return () => clearTimeout(t);
	}, []);

	// ========== AUTO-SAVE ==========
	const autoSaveData = useMemo(
		() => ({
			observacao: state.evolutionData.observacao,
			pain_scale: state.evolutionData.painScale,
			procedures: state.evolutionData.procedures,
			exercises: state.evolutionData.exercises,
			measurements: state.evolutionData.measurements,
			home_exercises: state.evolutionData.homeExercises,
			...(state.selectedTherapistId
				? { therapist_id: state.selectedTherapistId }
				: {}),
		}),
		[state.evolutionData, state.selectedTherapistId],
	);

	const {
		lastSavedAt,
		lastError: autoSaveError,
		retry: autoSaveRetry,
	} = useAutoSave({
		data: autoSaveData,
		onSave: async (data) => {
			if (!state.patientId || !state.appointmentId) return;

			const obsText = stripHtml(data.observacao || "");
			const hasContent =
				obsText.length > 0 ||
				(data.procedures && data.procedures.length > 0) ||
				(data.exercises && data.exercises.length > 0) ||
				(data.measurements && data.measurements.length > 0);
			const hasPain = data.pain_scale != null;

			if (!hasContent && !hasPain) return;

			// Guard anti-corrupção: se o servidor já tem observacao com conteúdo
			// e o local está vazio, NÃO sobrescrever — é race de hidratação
			// (canonical foi populado parcialmente antes do sync completo).
			if (state.currentSoapRecordId) {
				const cachedDraft = queryClient.getQueryData<any>([
					"evolution-records",
					"drafts",
					state.patientId,
					"byAppointment",
					state.appointmentId,
				]);
				const serverObs = cachedDraft?.observacao?.trim?.() ?? "";
				const localObs = stripHtml(data.observacao || "").trim();
				if (serverObs.length > 0 && localObs.length === 0) {
					// Server tem texto, local vazio → não enviar (evita zerar)
					return;
				}
			}

			// Idempotency key por tentativa: protege contra retries da fila offline
			// e refresh durante mutation in-flight. Server (KV TTL 60s) dedupe.
			const idempotencyKey =
				typeof crypto !== "undefined" && crypto.randomUUID
					? crypto.randomUUID()
					: `${Date.now()}-${Math.random().toString(36).slice(2)}`;

			// Version do registro atual: se mismatch no server → 409.
			// forceOverwriteRef bypassa o check quando user escolheu "manter minha versão".
			let version: number | undefined;
			if (state.currentSoapRecordId && !forceOverwriteRef.current) {
				const cachedDraft = queryClient.getQueryData<any>([
					"evolution-records",
					"drafts",
					state.patientId,
					"byAppointment",
					state.appointmentId,
				]);
				version = cachedDraft?.version;
			}

			try {
				const record = await autoSaveMutation.mutateAsync({
					patient_id: state.patientId,
					appointment_id: state.appointmentId,
					recordId: state.currentSoapRecordId,
					idempotencyKey,
					...(version !== undefined ? { version } : {}),
					...data,
				} as any);

				if (record?.id) {
					state.setCurrentSoapRecordId(record.id);
					// Sucesso no servidor -> Atualiza o cache e limpa rascunho local
					queryClient.setQueryData(
						[
							"evolution-records",
							"drafts",
							state.patientId,
							"byAppointment",
							state.appointmentId,
						],
						record,
					);
					draft.clearDraft();
				}
				// Save bem-sucedido — reseta force overwrite
				forceOverwriteRef.current = false;
			} catch (err: any) {
				if (err?.status === 409 && err?.payload?.error === "conflict") {
					const serverCurrent = err.payload.current;

					const localObs = stripHtml(data.observacao || "").trim();
					const serverObs = stripHtml(serverCurrent?.observacao || "").trim();

					const isLocalEmpty =
						localObs.length === 0 &&
						data.pain_scale == null &&
						!data.procedures?.length &&
						!data.exercises?.length &&
						!data.measurements?.length;

					const isTextEqual = localObs === serverObs;

					// Se não há dados locais significativos ou se é igual ao do servidor, funde silenciosamente
					if (isLocalEmpty || isTextEqual) {
						state.setCurrentSoapRecordId(serverCurrent.id);
						queryClient.setQueryData(
							[
								"evolution-records",
								"drafts",
								state.patientId,
								"byAppointment",
								state.appointmentId,
							],
							serverCurrent,
						);
						return;
					}

					setConflict({
						message:
							err.payload.message ??
							"Esta evolução foi editada em outro dispositivo.",
						current: serverCurrent,
					});
					// Não relança — modal trata a decisão do usuário
					return;
				}

				// Verifica se é erro de rede/offline
				const isOffline =
					(typeof navigator !== "undefined" && navigator.onLine === false) ||
					(err instanceof TypeError && /fetch|network/i.test(err.message));

				if (isOffline) {
					// Fase 3: Background Sync. Salva no IndexedDB para envio futuro.
					const payload = {
						patient_id: state.patientId,
						appointment_id: state.appointmentId,
						recordId: state.currentSoapRecordId,
						idempotencyKey,
						...(version !== undefined ? { version } : {}),
						...data,
					};

					await enqueueAction(ACTION_TYPES.AUTOSAVE_EVOLUTION, payload, {
						url: "/api/sessions/autosave",
						method: "POST",
					});
					// Omitimos o throw para que o hook entenda que foi "salvo" (no IndexedDB)
					return;
				}

				throw err;
			}
		},
		// Debounce curto (800ms) — feedback imediato similar a Notion/Google Docs.
		// Combinado com mutation scope (P1), idempotency key (P2.1) e version
		// check (P2.2), saves rápidos não causam race conditions nem duplicação.
		delay: 800,
		enabled: state.autoSaveEnabled && !state.dataLoading,
	});

	// Shortcurs (atalhos focam blocos do novo layout único)
	useEvolutionShortcuts(
		handlers.handleSave,
		handlers.handleCompleteSession,
		(section) => {
			if (section === "measurements") state.setActiveTab("avaliacao");
			else if (section === "history") state.setActiveTab("historico");
			else if (section === "ai") state.setActiveTab("assistente");
			else state.setActiveTab("evolucao");
		},
		() => state.setShowKeyboardHelp(true),
		() => state.setShowApplyTemplate(true),
		async () => {
			await handlers.handleSave();
			state.setActiveTab("assistente");
		},
		() => state.setShowAIScribe(true),
	);

	// Memoized Content
	const alertsSectionContent = useMemo(
		() => (
			<>
				{state.requiredMeasurements.length > 0 && (
					<MandatoryTestAlert
						tests={state.requiredMeasurements.map((req: any) => ({
							id: req.id || req.measurement_name,
							name: req.measurement_name,
							critical: req.alert_level === "high",
							completed: state.measurements.some(
								(m: any) =>
									m.measurement_name === req.measurement_name &&
									new Date(m.measured_at).toDateString() ===
										new Date().toDateString(),
							),
						}))}
						onResolve={() => state.setActiveTab("avaliacao")}
					/>
				)}
				<EvolutionAlerts
					overdueGoals={state.goals
						.filter(
							(g: any) =>
								g.status !== "concluido" &&
								g.target_date &&
								new Date(g.target_date) < new Date(),
						)
						.map((g: any) => ({ ...g, title: g.goal_title }))}
					painScale={state.painScale}
					upcomingGoals={state.goals
						.filter(
							(g: any) =>
								g.status !== "concluido" &&
								g.target_date &&
								new Date(g.target_date) >= new Date() &&
								new Date(g.target_date) <= new Date(Date.now() + 3 * 86400000),
						)
						.map((g: any) => ({ ...g, title: g.goal_title }))}
					daysSinceLastEvolution={
						state.previousEvolutions.length > 0
							? Math.floor(
									(Date.now() -
										new Date(
											state.previousEvolutions[0].created_at,
										).getTime()) /
										86400000,
								)
							: null
					}
					sessionDurationMinutes={Math.floor(
						(Date.now() - new Date().getTime()) / 60000,
					)}
					sessionLongAlertShown={false}
					painTrend={null}
					activePathologies={state.activePathologies.map((p: any) => ({
						id: p.id,
						name: p.pathology_name,
					}))}
					previousEvolutionsCount={state.previousEvolutions.length}
					onTabChange={(v) => state.setActiveTab(v as EvolutionTab)}
				/>
			</>
		),
		[state],
	);

	const evolutionStats = useMemo(
		() => ({
			totalEvolutions: state.previousEvolutions.length,
			totalGoals: state.goals.length,
			completedGoals: state.goals.filter((g: any) => g.status === "concluido")
				.length,
			activePathologiesCount: state.activePathologies.length,
			totalMeasurements: state.measurements.length,
			avgGoalProgress:
				state.goals.length > 0
					? Math.round(
							(state.goals.filter((g: any) => g.status === "concluido").length /
								state.goals.length) *
								100,
						)
					: 0,
			completionRate: state.previousEvolutions.length > 0 ? 100 : 0, // Placeholder logic
		}),
		[
			state.previousEvolutions.length,
			state.goals,
			state.activePathologies.length,
			state.measurements.length,
		],
	);

	const sessionNumber = useMemo(() => {
		if (!state.appointment || !state.allAppointments?.length) {
			return state.previousEvolutions.length + 1;
		}

		const sortedApts = [...state.allAppointments].sort((a, b) => {
			const dateA = new Date(a.appointment_date || a.date || 0).getTime();
			const dateB = new Date(b.appointment_date || b.date || 0).getTime();
			if (dateA !== dateB) return dateA - dateB;

			const timeA = a.appointment_time || a.start_time || a.startTime || "";
			const timeB = b.appointment_time || b.start_time || b.startTime || "";
			return timeA.localeCompare(timeB);
		});

		const index = sortedApts.findIndex(
			(a: any) => a.id === state.appointmentId,
		);
		return index !== -1 ? index + 1 : state.previousEvolutions.length + 1;
	}, [
		state.appointment,
		state.allAppointments,
		state.appointmentId,
		state.previousEvolutions.length,
	]);

	const treatmentDuration = useMemo(() => {
		if (sessionNumber === 1) return "Primeira sessão";
		return `${sessionNumber}ª sessão`;
	}, [sessionNumber]);

	const topSectionContent = useMemo(
		() => (
			<div className="flex flex-col gap-3 w-full">
				{/* Cards de Contexto */}
				<div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
					<MedicalReturnCard
						patient={state.patient}
						patientId={state.patientId}
						onPatientUpdated={() => state.invalidateData("all")}
						defaultCollapsed={state.medicalReturns.length === 0}
					/>
					<SurgeriesCard
						patientId={state.patientId}
						defaultCollapsed={state.surgeries.length === 0}
					/>
					<MetasCard
						patientId={state.patientId}
						defaultCollapsed={state.goals.length === 0}
					/>
				</div>

				{/* Barra de Resumo horizontal */}
				<EvolutionSummaryCard stats={evolutionStats} />
			</div>
		),
		[
			state.patient,
			state.patientId,
			state.invalidateData,
			state.medicalReturns.length,
			state.surgeries.length,
			state.goals.length,
			evolutionStats,
		],
	);

	const mainGridContent = useMemo(() => {
		return (
			<Suspense fallback={<LoadingSkeleton type="card" />}>
				<LazyNotionEvolutionPanel
					data={state.evolutionV2Data}
					onChange={handleEvolutionV2Change}
					patientId={state.patientId}
					evolutionId={state.currentSoapRecordId}
					collaborationId={undefined}
					userName={state.user?.full_name || state.user?.name || "Profissional"}
					userColor="#10b981"
					lastSaved={lastSavedAt}
					onNavigateToHistorico={() => state.setActiveTab("historico")}
				/>
			</Suspense>
		);
	}, [state, autoSaveMutation.isPending, lastSavedAt]);

	if (state.dataLoading)
		return (
			<PageLayout compactHeader fullWidth>
				<PageContainer maxWidth="full" noPadding className="px-3 md:px-5 pt-0">
					<div className="space-y-5 animate-fade-in pb-8">
						{/* Skeleton Header */}
						<div className="sticky top-0 z-30 rounded-xl border border-primary/10 bg-card shadow-sm p-4">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-start gap-3 min-w-0 flex-1">
									<div className="h-10 w-10 shrink-0 rounded-md bg-muted animate-pulse" />
									<div className="flex items-center gap-3 min-w-0 flex-1">
										<div className="h-12 w-12 shrink-0 rounded-full bg-muted animate-pulse" />
										<div className="min-w-0 flex-1 space-y-2">
											<div className="h-6 w-48 bg-muted animate-pulse rounded" />
											<div className="h-4 w-32 bg-muted animate-pulse rounded" />
										</div>
									</div>
								</div>
								<div className="flex items-center gap-3 shrink-0">
									<div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
									<div className="h-10 w-28 bg-muted animate-pulse rounded-2xl" />
								</div>
							</div>
							<div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 overflow-hidden">
								<div className="flex gap-2 w-full">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-md shrink-0" />
									))}
								</div>
							</div>
						</div>

						{/* Skeleton Top Section */}
						<div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
							<div className="h-24 bg-muted animate-pulse rounded-xl border border-primary/5" />
							<div className="h-24 bg-muted animate-pulse rounded-xl border border-primary/5" />
							<div className="h-24 bg-muted animate-pulse rounded-xl border border-primary/5" />
						</div>

						{/* Skeleton Summary Bar */}
						<div className="h-16 w-full bg-muted animate-pulse rounded-xl border border-primary/5" />

						{/* Skeleton Main Grid */}
						<div className="h-[500px] w-full bg-muted animate-pulse rounded-xl border border-primary/5" />
					</div>
				</PageContainer>
			</PageLayout>
		);
	if (!state.appointment || !state.patient)
		return (
			<PageLayout>
				<div className="text-center p-10">
					<AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
					<p>Dados não encontrados.</p>
					<Button onClick={() => navigate(APP_ROUTES.AGENDA)} className="mt-4">
						Voltar
					</Button>
				</div>
			</PageLayout>
		);

	const pendingRequiredMeasurements =
		state.requiredMeasurements?.filter(
			(rm: any) =>
				!state.measurements?.some(
					(m: any) => m.measurement_name === rm.measurement_name,
				),
		) || [];

	const measurementsByType = stripPainDetail(state.measurements || []).reduce(
		(acc: any, current: any) => {
			const type = current.measurement_type || "outros";
			if (!acc[type]) acc[type] = [];
			acc[type].push(current);
			return acc;
		},
		{},
	);

	return (
		<PageLayout compactHeader fullWidth noPadding className="h-screen overflow-hidden">
			<ComponentErrorBoundary componentName="PatientEvolution">
				<div className="flex flex-col h-full w-full bg-background overflow-hidden animate-fade-in">
					<EvolutionHeaderV3
						patient={state.patient as any}
						appointment={state.appointment as any}
						evolutionStats={evolutionStats}
						treatmentDuration={treatmentDuration}
						sessionNumber={sessionNumber}
						onComplete={handlers.handleCompleteSession}
						isSaving={handlers.isSaving}
						isCompleting={handlers.isCompleting}
						autoSaveEnabled={state.autoSaveEnabled}
						toggleAutoSave={() => state.setAutoSaveEnabled(!state.autoSaveEnabled)}
						lastSavedAt={lastSavedAt}
						saveError={autoSaveError}
						onRetrySave={autoSaveRetry}
						offlineStatus={{
							isOnline: offline.isOnline,
							pendingActions: offline.stats.pendingActions,
						}}
						onShowTemplateModal={() => state.setShowApplyTemplate(true)}
						onShowKeyboardHelp={() => state.setShowKeyboardHelp(true)}
						onShowAIScribe={() => state.setShowAIScribe(true)}
					/>

					<EvolutionTabsBar
						activeTab={state.activeTab}
						onTabChange={(v) => state.setActiveTab(v as EvolutionTab)}
					/>

					<div className="flex-1 overflow-y-auto relative bg-background">
						<Tabs
							value={state.activeTab}
							onValueChange={(v) => state.setActiveTab(v as EvolutionTab)}
							className="flex flex-col min-h-full"
						>
							<TabsContent value="evolucao" className="m-0 h-full data-[state=active]:flex flex-col">
								<Suspense fallback={<LoadingSkeleton />}>
									<EvolutionNoScrollPanel
										data={state.evolutionV2Data}
										onChange={state.setEvolutionV2Data}
										patientId={state.patientId!}
										evolutionId={state.currentSoapRecordId!}
										patient={state.patient}
										pathologies={state.pathologies}
									/>
								</Suspense>
							</TabsContent>
							<TabsContent value="avaliacao">
								<Suspense fallback={<LoadingSkeleton />}>
									<LazyAvaliacaoTab
										patientId={state.patientId!}
										appointmentId={state.appointmentId!}
										todayMeasurements={state.measurements}
										requiredMeasurements={state.requiredMeasurements}
										pendingRequiredMeasurements={pendingRequiredMeasurements}
										measurementsByType={measurementsByType}
									/>
								</Suspense>
							</TabsContent>
							<TabsContent value="tratamento">
								<Suspense fallback={<LoadingSkeleton />}>
									<LazyTratamentoTab
										sessionExercises={state.sessionExercises}
										onExercisesChange={state.setSessionExercises}
										patientId={state.patientId!}
										goals={state.goals}
										pathologies={state.pathologies}
									/>
								</Suspense>
							</TabsContent>
							<TabsContent value="historico">
								<Suspense fallback={<LoadingSkeleton />}>
									<LazyHistoricoTab
										patientId={state.patientId!}
										previousEvolutions={state.previousEvolutions}
										onCopyEvolution={handlers.handleCopyPreviousEvolution}
										surgeries={state.surgeries.map((s: any) => ({
											...s,
											name: s.surgery_name,
											date: s.surgery_date,
										}))}
										showComparison={state.showComparison}
										onToggleComparison={() =>
											state.setShowComparison(!state.showComparison)
										}
									/>
								</Suspense>
							</TabsContent>
							<TabsContent value="assistente">
								<Suspense fallback={<LoadingSkeleton />}>
									<LazyAssistenteTab
										patientId={state.patientId!}
										patientName={PatientHelpers.getName(state.patient)}
										onApplyToSoap={(_f, content) => {
											state.setEvolutionData((prev) => ({
												...prev,
												observacao: (prev.observacao || "") + (content || ""),
											}));
											state.setActiveTab("evolucao");
										}}
									/>
								</Suspense>
							</TabsContent>
							<TabsContent value="escalas">
								<Suspense fallback={<LoadingSkeleton />}>
									{state.patientId && (
										<div className="p-4">
											<LazyPROMsDashboard
												patientId={state.patientId}
												sessionId={state.appointmentId ?? undefined}
											/>
										</div>
									)}
								</Suspense>
							</TabsContent>
							<TabsContent value="midia">
								<Suspense fallback={<LoadingSkeleton />}>
									{state.patientId && (
										<LazyPatientMediaGallery patientId={state.patientId} />
									)}
								</Suspense>
							</TabsContent>
							<TabsContent value="configuracoes" className="mt-0 p-4">
								<Suspense fallback={<LoadingSkeleton />}>
									<LazyEvolutionSettingsTab />
								</Suspense>
							</TabsContent>
						</Tabs>
					</div>

					<ApplyTemplateModal
						open={state.showApplyTemplate}
						onOpenChange={state.setShowApplyTemplate}
						onApply={(content) => {
							state.setEvolutionData((prev) => ({
								...prev,
								observacao: (prev.observacao || "") + content,
							}));
						}}
					/>
					<EvolutionKeyboardShortcuts
						open={state.showKeyboardHelp}
						onOpenChange={state.setShowKeyboardHelp}
					/>
					<EvolutionConflictModal
						open={conflict !== null}
						conflict={conflict}
						localData={{
							observacao: state.evolutionData.observacao,
							painScale: state.evolutionData.painScale,
						}}
						onReload={async () => {
							const current = conflict?.current;
							setConflict(null);
							forceOverwriteRef.current = false;
							// Atualiza state local diretamente com a versão do servidor (do payload 409)
							// — não esperar refetch, evita flicker e garante UI consistente.
							if (current) {
								// P2.3: state V2 deriva do canonical, basta atualizar canonical.
								state.setEvolutionData((prev) => ({
									...prev,
									observacao: current.observacao ?? "",
									painScale: current.pain_scale ?? null,
								}));
							}
							// Invalida cache para que próximos saves leiam version atualizado
							await queryClient.invalidateQueries({
								queryKey: [
									"evolution-records",
									"drafts",
									state.patientId,
									"byAppointment",
									state.appointmentId,
								],
							});
							toast.success("Dados atualizados", {
								description: "Versão mais recente carregada do servidor.",
							});
						}}
						onKeepLocal={() => {
							setConflict(null);
							// Próximo save não enviará `version` → server aceita (force overwrite)
							forceOverwriteRef.current = true;
							toast.info("Suas alterações serão salvas", {
								description:
									"Sobrescrevendo a versão do servidor no próximo autosave.",
							});
						}}
						onClose={() => setConflict(null)}
					/>
					<CommandPaletteComponent />
					<AIScribeModal
						open={state.showAIScribe}
						onOpenChange={state.setShowAIScribe}
						patientId={state.patientId}
						onApply={(soap) => {
							state.setSoapData((prev: any) => ({
								...prev,
								subjective: prev.subjective + "\n" + soap.subjective,
								objective: prev.objective + "\n" + soap.objective,
								assessment: prev.assessment + "\n" + soap.assessment,
								plan: prev.plan + "\n" + soap.plan,
							}));
						}}
					/>
				</div>
			</ComponentErrorBoundary>
		</PageLayout>
	);
};

export default PatientEvolution;
