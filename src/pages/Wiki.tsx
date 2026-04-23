/**
 * Wiki Page - Knowledge Base colaborativa estilo Notion
 * Refatorada para ser modular e simplificada com navegação aprimorada.
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, FileText, Star, History, Library } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { WikiTopNav } from "@/components/wiki/WikiTopNav";
import { WikiEditor, WikiPageViewer } from "@/components/wiki/WikiEditor";
import { useAuth } from "@/contexts/AuthContext";
import { wikiService } from "@/lib/services/wikiService";
import { instantiateTemplate } from "@/features/wiki/templates/templateTransform";
import {
	getTemplateById,
	listTemplateCatalog,
	type WikiTemplateBlueprint,
} from "@/features/wiki/templates/templateCatalog";
import { toast } from "sonner";

import type { WikiPage } from "@/types/wiki";
import type {
	KnowledgeArticle,
	KnowledgeCurationStatus,
} from "@/types/knowledge-base";

// Hooks Modulares
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { useWikiTriage } from "@/hooks/wiki/useWikiTriage";
import { useKnowledgeBase } from "@/hooks/wiki/useKnowledgeBase";

// Componentes Modulares
import { WikiTriageBoard } from "@/features/wiki/components/WikiTriageBoard";
import { KnowledgeHubView } from "@/features/wiki/components/KnowledgeHubView";
import { WikiPageCard } from "@/features/wiki/components/WikiPageCard";
import { KnowledgeArticleDialog } from "@/features/wiki/components/KnowledgeArticleDialog";
import { PhysioDictionaryView } from "@/features/wiki/components/PhysioDictionaryView";
import { AIHubView } from "@/features/wiki/components/AIHubView";
import { bilingualFilter } from "@/lib/utils/bilingualSearch";
import {
	getEvidenceTree,
	isEvidencePage,
} from "@/features/wiki/utils/evidenceTrails";

const TRIAGE_WIP_LIMITS = {
	backlog: 30,
	"in-progress": 10,
	done: 999,
};

export default function WikiPage() {
	const { slug } = useParams<{ slug?: string }>();
	const { user, profile, organizationId } = useAuth();
	const currentOrganizationId = organizationId ?? profile?.organization_id;
	const currentUserId = user?.uid ?? profile?.user_id ?? profile?.id;
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchParams] = useSearchParams();

	// Estados Locais
	const [activeView, setActiveView] = useState<
		"dashboard" | "knowledge-hub" | "dictionary" | "page" | "ai-hub"
	>((searchParams.get("view") as any) || "dashboard");
	const [searchQuery, setSearchQuery] = useState(
		searchParams.get("search") || "",
	);
	const [isEditing, setIsEditing] = useState(false);
	const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
	const [draftPage, setDraftPage] = useState<Partial<WikiPage> | null>(null);
	const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank");
	const [templateValues, setTemplateValues] = useState<Record<string, string>>(
		{},
	);

	// Estados de Curadoria (KB)
	const [activeArticle, setActiveArticle] = useState<KnowledgeArticle | null>(
		null,
	);
	const [annotationScope, setAnnotationScope] = useState<
		"organization" | "user"
	>("organization");
	const [annotationHighlights, setAnnotationHighlights] = useState("");
	const [annotationObservations, setAnnotationObservations] = useState("");
	const [annotationStatus, setAnnotationStatus] =
		useState<KnowledgeCurationStatus>("pending");
	const [annotationNotes, setAnnotationNotes] = useState("");
	const [auditArticle, setAuditArticle] = useState<KnowledgeArticle | null>(
		null,
	);
	const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
	const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(
		null,
	);

	// Hooks Customizados
	const { pages, categories, favorites, isLoading, savePage, deletePage } =
		useWikiPages(currentOrganizationId, currentUserId);

	const {
		triageBuckets,
		triageEvents,
		handleTriageDragEnd,
		handleQuickStatusChange,
		hasActiveTriageFilters,
	} = useWikiTriage(pages, currentOrganizationId, currentUserId);

	const {
		knowledgeStats,
		knowledgeGroupsFiltered,
		filteredKnowledge,
		auditItems,
		auditProfiles,
		semanticScoreMap,
		kbFilters,
		setKbFilters,
		syncing,
		indexing,
		handleSyncArticles,
		handleIndexArticles,
		handleCreateArticle,
		handleUpdateArticle,
		handleDeleteArticle,
		handleSaveAnnotation,
		curationMap,
		annotationMap,
	} = useKnowledgeBase(currentOrganizationId, currentUserId);

	const templates = useMemo(() => listTemplateCatalog(), []);
	const activeTemplate = useMemo(
		() =>
			selectedTemplateId === "blank"
				? null
				: getTemplateById(selectedTemplateId),
		[selectedTemplateId],
	);

	// Filtragem de páginas
	const filteredPages = useMemo(() => {
		// Se a query começar com #, filtramos especificamente por tag
		if (searchQuery.startsWith("#")) {
			const tagName = searchQuery.slice(1).toLowerCase();
			return pages.filter((page) =>
				(page.tags || []).some((t) => t && t.toLowerCase().includes(tagName)),
			);
		}

		if (!searchQuery) return pages;

		// Utilizando a busca bilíngue (Português/Inglês) + Sinônimos
		return bilingualFilter(pages, searchQuery, ["title", "content", "tags"]);
	}, [pages, searchQuery]);

	const evidenceTree = useMemo(() => getEvidenceTree(pages), [pages]);

	const displayedPages = useMemo(() => {
		if (searchQuery) return filteredPages;
		return filteredPages.filter((page) => !isEvidencePage(page));
	}, [filteredPages, searchQuery]);

	const handleTagSelect = (tag: string) => {
		setActiveView("dashboard");
		setSearchQuery(`#${tag}`);
		setSelectedPage(null);
		navigate("/wiki");
	};

	const articleTitleMap = useMemo(() => {
		const map = new Map<string, string>();
		filteredKnowledge.forEach((item) => map.set(item.id, item.title));
		return map;
	}, [filteredKnowledge]);

	// Efeitos
	useEffect(() => {
		const view = searchParams.get("view");
		const search = searchParams.get("search");
		if (view) setActiveView(view as any);
		if (search) setSearchQuery(search);
	}, [searchParams]);

	useEffect(() => {
		if (!slug) {
			if (activeView === "page") setActiveView("dashboard");
			setSelectedPage(null);
			return;
		}
		const page = pages.find((p) => p.slug === slug || p.id === slug) ?? null;
		if (page) {
			setSelectedPage(page);
			setActiveView("page");
		}
	}, [pages, slug]);

	useEffect(() => {
		if (!activeArticle) return;
		const currentAnnotation =
			annotationScope === "user"
				? annotationMap.user.get(activeArticle.id)
				: annotationMap.org.get(activeArticle.id);
		setAnnotationHighlights(
			(Array.isArray(currentAnnotation?.highlights) ? currentAnnotation.highlights : activeArticle.highlights || []).join("\n"),
		);
		setAnnotationObservations(
			(Array.isArray(currentAnnotation?.observations) ? currentAnnotation.observations : activeArticle.observations || []).join(
				"\n",
			),
		);
	}, [annotationScope, activeArticle, annotationMap]);

	// Handlers
	const handlePageSelect = (page: WikiPage) => {
		setSelectedPage(page);
		setActiveView("page");
		navigate(`/wiki/${page.slug}`);
	};

	const handleCreatePage = () => {
		setSelectedPage(null);
		setDraftPage(null);
		setSelectedTemplateId("blank");
		setTemplateValues({});
		setIsTemplateDialogOpen(true);
	};

	const startBlankPage = () => {
		setDraftPage(null);
		setSelectedPage(null);
		setIsTemplateDialogOpen(false);
		setIsEditing(true);
	};

	const startTemplatePage = (template: WikiTemplateBlueprint) => {
		try {
			const instantiated = instantiateTemplate({
				templateId: template.id,
				values: templateValues,
			});

			if (instantiated.missingRequired.length > 0) {
				toast.error(
					`Campos obrigatórios ausentes: ${instantiated.missingRequired.join(", ")}`,
				);
				return;
			}

			const lines = (instantiated.content || "").split("\n");
			const derivedTitle =
				lines[0]?.replace(/^#\s*/, "").trim() || template.name;
			const isTriageTemplate = [
				"incident-postmortem-v1",
				"meeting-notes-v1",
				"product-prd-v1",
			].includes(template.id);

			setDraftPage({
				title: derivedTitle,
				content: instantiated.content,
				category: isTriageTemplate ? "triage" : template.domain,
				tags: template.tags,
				is_published: true,
				template_id: template.id,
			});
			setSelectedPage(null);
			setIsTemplateDialogOpen(false);
			setIsEditing(true);
		} catch (error) {
			console.error("Erro ao instanciar template:", error);
			toast.error("Não foi possível aplicar o template.");
		}
	};

	const onSavePage = async (data: any) => {
		try {
			const savedId = await savePage(
				data,
				selectedPage?.id,
				selectedPage?.version,
			);
			setIsEditing(false);
			setDraftPage(null);
			// Busca a página salva para navegar
			const refreshed = await queryClient.fetchQuery({
				queryKey: ["wiki-pages", currentOrganizationId],
				queryFn: () => wikiService.listPages(currentOrganizationId!),
			});
			const page = refreshed.find((p) => p.id === savedId);
			if (page) {
				setSelectedPage(page);
				setActiveView("page");
				navigate(`/wiki/${page.slug}`);
			}
		} catch {
			// Toast já exibido no hook
		}
	};

	const onSaveAnnotation = async () => {
		if (!activeArticle) return;
		try {
			await handleSaveAnnotation({
				articleId: activeArticle.id,
				scope: annotationScope,
				highlights: (typeof annotationHighlights === "string" ? annotationHighlights : "").split("\n").filter(Boolean),
				observations: (typeof annotationObservations === "string" ? annotationObservations : "").split("\n").filter(Boolean),
				status: annotationStatus,
				notes: annotationNotes,
			});
			setActiveArticle(null);
		} catch {
			// Erro já tratado no hook
		}
	};

	const handleCreateArticleClick = () => {
		setEditingArticle(null);
		setIsArticleDialogOpen(true);
	};

	const handleEditArticleClick = (article: KnowledgeArticle) => {
		setEditingArticle(article);
		setIsArticleDialogOpen(true);
	};

	const handleDeleteArticleClick = async (article: KnowledgeArticle) => {
		if (
			window.confirm(
				`Tem certeza que deseja excluir o artigo "${article.title}"?`,
			)
		) {
			await handleDeleteArticle(article.id);
		}
	};

	const handleSaveArticle = async (data: Partial<KnowledgeArticle>) => {
		try {
			if (editingArticle) {
				await handleUpdateArticle(editingArticle.id, data);
			} else {
				await handleCreateArticle(data);
			}
			setIsArticleDialogOpen(false);
		} catch (error) {
			console.error("Failed to save article:", error);
		}
	};

	const handleDashboardSelect = () => {
		setActiveView("dashboard");
		setSelectedPage(null);
		navigate("/wiki");
	};

	const handleKnowledgeHubSelect = () => {
		setActiveView("knowledge-hub");
		setSelectedPage(null);
		navigate("/wiki");
	};

	// Renderização Condicional: Editor
	if (isEditing) {
		return (
			<MainLayout>
				<div className="h-screen flex flex-col">
					<WikiEditor
						page={selectedPage}
						draft={draftPage}
						onCancel={() => {
							setIsEditing(false);
							setDraftPage(null);
						}}
						onSave={onSavePage}
					/>
				</div>
			</MainLayout>
		);
	}

	// Renderização Principal
	return (
		<MainLayout>
			<div className="h-full flex flex-col overflow-hidden">
				<WikiTopNav
					pages={pages}
					categories={categories}
					selectedPageId={selectedPage?.id}
					onPageSelect={handlePageSelect}
					onCreatePage={handleCreatePage}
					onDashboardSelect={handleDashboardSelect}
					onKnowledgeHubSelect={handleKnowledgeHubSelect}
					onDictionarySelect={() => {
						setActiveView("dictionary");
						setSelectedPage(null);
					}}
					onAIHubSelect={() => {
						setActiveView("ai-hub");
						setSelectedPage(null);
					}}
					onTagSelect={handleTagSelect}
				/>

				<div className="flex-1 overflow-y-auto custom-scrollbar">
					{activeView === "page" && selectedPage ? (
						<div className="animate-in fade-in duration-300 h-full">
							<WikiPageViewer
								page={selectedPage}
								onEdit={() => setIsEditing(true)}
								onBack={handleDashboardSelect}
							/>
						</div>
					) : activeView === "knowledge-hub" ? (
						<div className="p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
							<KnowledgeHubView
								knowledgeStats={knowledgeStats}
								knowledgeGroupsFiltered={knowledgeGroupsFiltered}
								filteredKnowledge={filteredKnowledge}
								auditItems={auditItems}
								auditProfiles={auditProfiles}
								semanticScoreMap={semanticScoreMap}
								kbFilters={kbFilters}
								setKbFilters={setKbFilters}
								syncing={syncing}
								indexing={indexing}
								onSync={handleSyncArticles}
								onIndex={handleIndexArticles}
								onCreateArticle={handleCreateArticleClick}
								onEditArticle={handleEditArticleClick}
								onDeleteArticle={handleDeleteArticleClick}
								onAuditArticle={setAuditArticle}
								articleTitleMap={articleTitleMap}
								curationMap={curationMap}
							/>
						</div>
					) : activeView === "dictionary" ? (
						<PhysioDictionaryView />
					) : activeView === "ai-hub" ? (
						<div className="p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
							<AIHubView />
						</div>
					) : (
						<div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
							{/* Compact header */}
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-3 min-w-0">
									<div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
										<Library className="h-4 w-4 text-primary" />
									</div>
									<div className="min-w-0">
										<h1 className="text-base sm:text-lg font-semibold leading-tight">
											Wiki & Documentação
										</h1>
										<p className="text-xs text-muted-foreground mt-0.5">
											Central de conhecimento e triagem de documentação clínica.
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-[10px] font-medium text-muted-foreground">
										<div className={`h-1.5 w-1.5 rounded-full ${syncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
										{syncing ? 'Sincronizando...' : 'Wiki Offline Sync Ativo'}
									</div>
									<Button
										variant="outline"
										size="sm"
										className="gap-1.5 flex-shrink-0"
										disabled={syncing}
										onClick={async () => {
											if (!currentOrganizationId || !currentUserId) return;
											const promise = wikiService.syncClinicalTestsToWiki(currentOrganizationId, currentUserId);
											toast.promise(promise, {
												loading: 'Sincronizando inteligência clínica...',
												success: (data) => `Inteligência atualizada: ${data.created} criados, ${data.updated} atualizados.`,
												error: 'Erro ao sincronizar inteligência clínica.'
											});
										}}
									>
										<History className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> 
										Sincronizar Inteligência
									</Button>
									<Button
										onClick={handleCreatePage}
										size="sm"
										className="gap-1.5 flex-shrink-0"
									>
										<Plus className="h-4 w-4" /> Nova Página
									</Button>
								</div>
							</div>

							{evidenceTree.root && (
								<section className="space-y-6">
									<div className="flex items-center gap-2 border-b pb-2">
										<Badge variant="secondary" className="px-2 py-0.5">
											Evidencia
										</Badge>
										<h2 className="text-xl font-semibold">
											Trilhas Integradas
										</h2>
									</div>

									<Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 shadow-sm">
										<CardContent className="p-6 md:p-7">
											<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
												<div className="space-y-2">
													<div className="flex items-center gap-2">
														<Library className="h-5 w-5 text-emerald-700" />
														<p className="text-sm font-semibold text-emerald-900">
															Base estruturada por trilhas e protocolos
														</p>
													</div>
													<h3 className="text-2xl font-bold tracking-tight text-slate-900">
														{evidenceTree.root.title}
													</h3>
													<p className="max-w-3xl text-sm text-slate-600">
														Acesso rápido às páginas estratégicas de ortopedia,
														esportiva e pós-operatório, com desdobramento
														prático por protocolo.
													</p>
												</div>
												<Button
													onClick={() => handlePageSelect(evidenceTree.root!)}
													className="bg-emerald-700 hover:bg-emerald-800"
												>
													Abrir visão geral
												</Button>
											</div>
										</CardContent>
									</Card>

									<div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
										{evidenceTree.trails.map(({ trail, protocols }) => (
											<Card
												key={trail.id}
												className="border-slate-200 shadow-sm hover:shadow-md transition-shadow"
											>
												<CardContent className="p-5 space-y-4">
													<div className="flex items-start justify-between gap-4">
														<div className="space-y-2">
															<div className="flex items-center gap-2">
																<Badge
																	variant="outline"
																	className="border-emerald-200 text-emerald-800"
																>
																	Trilha
																</Badge>
																<Badge variant="secondary">
																	{protocols.length} protocolo
																	{protocols.length === 1 ? "" : "s"}
																</Badge>
															</div>
															<h3 className="text-lg font-semibold text-slate-900">
																{trail.title}
															</h3>
															<p className="text-sm text-muted-foreground line-clamp-3">
																{(trail.content || "")
																	.replace(/[#*`>-]/g, "")
																	.slice(0, 180)}
																...
															</p>
														</div>
														<Button
															variant="outline"
															onClick={() => handlePageSelect(trail)}
														>
															Abrir trilha
														</Button>
													</div>

													{protocols.length > 0 && (
														<div className="rounded-xl bg-slate-50 p-3 space-y-2">
															<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
																Protocolos vinculados
															</p>
															<div className="flex flex-wrap gap-2">
																{protocols.map((protocol) => (
																	<Button
																		key={protocol.id}
																		variant="secondary"
																		size="sm"
																		onClick={() => handlePageSelect(protocol)}
																		className="max-w-full justify-start"
																	>
																		<FileText className="mr-2 h-4 w-4" />
																		<span className="truncate">
																			{protocol.title}
																		</span>
																	</Button>
																))}
															</div>
														</div>
													)}
												</CardContent>
											</Card>
										))}
									</div>
								</section>
							)}

							{/* Triage Section */}
							<section className="space-y-6">
								<div className="flex items-center gap-2 border-b pb-2">
									<Badge variant="secondary" className="px-2 py-0.5">
										Workflow
									</Badge>
									<h2 className="text-xl font-semibold">
										Triagem de Documentação
									</h2>
								</div>

								<WikiTriageBoard
									triageBuckets={triageBuckets}
									onDragEnd={handleTriageDragEnd}
									onOpenPage={handlePageSelect}
									onMoveStatus={handleQuickStatusChange}
									dragEnabled={!hasActiveTriageFilters}
									wipLimits={TRIAGE_WIP_LIMITS}
								/>

								<div className="rounded-xl border bg-muted/5 p-4">
									<div className="flex items-center gap-2 mb-3">
										<History className="w-4 h-4 text-muted-foreground" />
										<span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
											Atividade Recente no Workflow
										</span>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
										{triageEvents.length === 0 && (
											<p className="text-muted-foreground italic col-span-full py-4 text-center">
												Nenhuma movimentação registrada.
											</p>
										)}
										{triageEvents.slice(0, 6).map((event) => (
											<div
												key={event.id}
												className="flex flex-col gap-1 rounded-lg border bg-background p-3 shadow-sm"
											>
												<span className="font-semibold text-foreground truncate">
													{event.page_title || "Página sem título"}
												</span>
												<div className="flex items-center gap-2 text-muted-foreground">
													<Badge
														variant="outline"
														className="text-[10px] h-4 px-1"
													>
														{event.from_status}
													</Badge>
													<span className="text-[10px]">→</span>
													<Badge
														variant="outline"
														className="text-[10px] h-4 px-1"
													>
														{event.to_status}
													</Badge>
												</div>
												<span className="text-[10px] mt-1 opacity-60">
													{(event.created_at as any)
														?.toDate?.()
														?.toLocaleString("pt-BR") || "-"}
												</span>
											</div>
										))}
									</div>
								</div>
							</section>

							{/* Explorer Section */}
							<section className="space-y-8 pt-4 border-t">
								<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
									<div className="flex items-center gap-2">
										<Badge variant="secondary" className="px-2 py-0.5">
											Explorar
										</Badge>
										<h2 className="text-xl font-semibold">
											Base de Conhecimento
										</h2>
									</div>

									<div className="relative w-full md:w-96 group">
										<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
										<Input
											placeholder="Buscar na base de conhecimento..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="pl-11 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
										/>
									</div>
								</div>

								{/* Grid Lists */}
								<div className="space-y-10">
									{/* Favorites */}
									{favorites.length > 0 && !searchQuery && (
										<div className="space-y-4">
											<h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
												<Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />{" "}
												Mais Visitadas
											</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
												{favorites.map((page) => (
													<WikiPageCard
														key={page.id}
														page={page}
														onClick={() => handlePageSelect(page)}
													/>
												))}
											</div>
										</div>
									)}

									{/* All / Filtered Pages */}
									<div className="space-y-4">
										<h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
											<FileText className="w-4 h-4" />
											{searchQuery
												? `Resultados para "${searchQuery}"`
												: "Todas as Páginas Gerais"}
											{displayedPages.length > 0 && (
												<Badge variant="secondary" className="ml-2 font-mono">
													{displayedPages.length}
												</Badge>
											)}
										</h3>

										{isLoading ? (
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
												{[1, 2, 3, 4].map((i) => (
													<div
														key={i}
														className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-50 dark:border-slate-800"
													/>
												))}
											</div>
										) : displayedPages.length > 0 ? (
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
												{displayedPages.map((page) => (
													<WikiPageCard
														key={page.id}
														page={page}
														onClick={() => handlePageSelect(page)}
														onDelete={() => deletePage(page.id)}
													/>
												))}
											</div>
										) : (
											<div className="rounded-2xl border border-dashed p-20 text-center space-y-4">
												<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
													<Search className="w-6 h-6 text-muted-foreground" />
												</div>
												<div className="space-y-1">
													<p className="font-medium">
														Nenhuma página encontrada
													</p>
													<p className="text-sm text-muted-foreground">
														Tente ajustar seus filtros ou termos de busca.
													</p>
												</div>
												<Button
													variant="outline"
													onClick={() => setSearchQuery("")}
												>
													Limpar busca
												</Button>
											</div>
										)}
									</div>
								</div>
							</section>
						</div>
					)}
				</div>
			</div>

			{/* Modals */}
			<Dialog
				open={isTemplateDialogOpen}
				onOpenChange={setIsTemplateDialogOpen}
			>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>Nova página da Wiki</DialogTitle>
						<DialogDescription>
							Crie em branco ou aplique um template.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Select
							value={selectedTemplateId}
							onValueChange={setSelectedTemplateId}
						>
							<SelectTrigger>
								<SelectValue placeholder="Selecione um template" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="blank">Página em branco</SelectItem>
								{templates.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{activeTemplate && (
							<div className="space-y-3 rounded-lg border p-3">
								{activeTemplate.variables.map((v) => (
									<div key={v.key} className="space-y-1">
										<label className="text-xs font-medium uppercase text-muted-foreground">
											{v.label}
										</label>
										<Input
											value={templateValues[v.key] ?? ""}
											onChange={(e) =>
												setTemplateValues((prev) => ({
													...prev,
													[v.key]: e.target.value,
												}))
											}
										/>
									</div>
								))}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsTemplateDialogOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							onClick={() =>
								activeTemplate
									? startTemplatePage(activeTemplate)
									: startBlankPage()
							}
						>
							Criar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(activeArticle)}
				onOpenChange={(open) => !open && setActiveArticle(null)}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Curadoria de conteudo</DialogTitle>
					</DialogHeader>
					{activeArticle && (
						<div className="space-y-4">
							<p className="font-semibold">{activeArticle.title}</p>
							<div className="flex gap-3">
								<ToggleGroup
									type="single"
									value={annotationScope}
									onValueChange={(v) => v && setAnnotationScope(v as any)}
								>
									<ToggleGroupItem value="organization">Equipe</ToggleGroupItem>
									<ToggleGroupItem value="user">Meu</ToggleGroupItem>
								</ToggleGroup>
								<Select
									value={annotationStatus}
									onValueChange={(v) => setAnnotationStatus(v as any)}
								>
									<SelectTrigger className="w-44">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pending">Pendente</SelectItem>
										<SelectItem value="review">Em revisao</SelectItem>
										<SelectItem value="verified">Verificado</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<Textarea
									value={annotationHighlights}
									onChange={(e) => setAnnotationHighlights(e.target.value)}
									placeholder="Destaques..."
									rows={6}
								/>
								<Textarea
									value={annotationObservations}
									onChange={(e) => setAnnotationObservations(e.target.value)}
									placeholder="Observacoes..."
									rows={6}
								/>
							</div>
							<Textarea
								value={annotationNotes}
								onChange={(e) => setAnnotationNotes(e.target.value)}
								placeholder="Notas internas..."
								rows={3}
							/>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setActiveArticle(null)}>
							Cancelar
						</Button>
						<Button onClick={onSaveAnnotation}>Salvar</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(auditArticle)}
				onOpenChange={(open) => !open && setAuditArticle(null)}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Auditoria do artigo</DialogTitle>
					</DialogHeader>
					<div className="max-h-[400px] overflow-y-auto space-y-3">
						{auditArticle &&
							auditItems
								.filter((e) => e.article_id === auditArticle.id)
								.map((e) => (
									<div key={e.id} className="rounded-lg border p-3 text-xs">
										<div className="flex justify-between font-medium">
											<span>{e.action}</span>
											<span>
												{(e.created_at as any)?.toDate?.()?.toLocaleString()}
											</span>
										</div>
										<div className="mt-1">Por: {e.actor_id}</div>
									</div>
								))}
					</div>
					<DialogFooter>
						<Button onClick={() => setAuditArticle(null)}>Fechar</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<KnowledgeArticleDialog
				open={isArticleDialogOpen}
				onOpenChange={setIsArticleDialogOpen}
				article={editingArticle}
				onSave={handleSaveArticle}
			/>
		</MainLayout>
	);
}
