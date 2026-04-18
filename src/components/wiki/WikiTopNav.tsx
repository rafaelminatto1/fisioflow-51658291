/**
 * WikiTopNav - Navegação horizontal superior para a Wiki
 * Substitui a sidebar vertical para melhor aproveitamento de tela.
 */

import React, { useMemo } from "react";
import {
	ChevronDown,
	Folder,
	File,
	Star,
	Clock,
	Library,
	Search,
	Plus,
	Pin,
	LayoutDashboard,
	FileText,
	Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuSub,
	DropdownMenuSubTrigger,
	DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { normalizeText } from "@/lib/utils/string";
import type { WikiPage, WikiCategory } from "@/types/wiki";
import { getEvidenceTree } from "@/features/wiki/utils/evidenceTrails";

const EVIDENCE_ROOT_SLUG = "trilhas-evidencia-fisioterapia";

const EVIDENCE_TRAIL_ORDER = [
	"trilha-lca-retorno-esporte",
	"trilha-artroplastia-joelho-quadril",
	"trilha-ombro-ortopedico-pos-operatorio",
	"trilha-tornozelo-aquiles-instabilidade",
] as const;

const EVIDENCE_PROTOCOL_ORDER = [
	"protocolo-lca-retorno-esporte",
	"protocolo-artroplastia-joelho-quadril",
	"protocolo-ombro-ortopedico-pos-operatorio",
	"protocolo-tornozelo-aquiles-instabilidade",
] as const;

const EVIDENCE_PAGE_ORDER = [
	EVIDENCE_ROOT_SLUG,
	...EVIDENCE_TRAIL_ORDER,
	...EVIDENCE_PROTOCOL_ORDER,
];

function isEvidencePage(page: Pick<WikiPage, "slug">): boolean {
	return EVIDENCE_PAGE_ORDER.includes(
		page.slug as (typeof EVIDENCE_PAGE_ORDER)[number],
	);
}

const Sparkles = ({ className }: { className?: string }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
		<path d="M5 3v4" />
		<path d="M19 17v4" />
		<path d="M3 5h4" />
		<path d="M17 19h4" />
	</svg>
);

interface WikiTopNavProps {
	pages: WikiPage[];
	categories: WikiCategory[];
	selectedPageId?: string;
	onPageSelect: (page: WikiPage) => void;
	onCreatePage: () => void;
	onKnowledgeHubSelect?: () => void;
	onDashboardSelect?: () => void;
	onDictionarySelect?: () => void;
	onAIHubSelect?: () => void;
	onTagSelect?: (tag: string) => void;
}

export function WikiTopNav({
	pages,
	categories,
	selectedPageId,
	onPageSelect,
	onCreatePage,
	onKnowledgeHubSelect,
	onDashboardSelect,
	onDictionarySelect,
	onAIHubSelect,
	onTagSelect,
}: WikiTopNavProps) {
	const [searchQuery, setSearchQuery] = React.useState("");

	const normalizedSearchQuery = useMemo(
		() => normalizeText(searchQuery),
		[searchQuery],
	);

	const searchResults = useMemo(() => {
		if (!normalizedSearchQuery) return [];
		return pages.filter(
			(p) =>
				normalizeText(p.title).includes(normalizedSearchQuery) ||
				(p.content &&
					normalizeText(p.content).includes(normalizedSearchQuery)) ||
				p.tags?.some((t) => normalizeText(t).includes(normalizedSearchQuery)),
		);
	}, [pages, normalizedSearchQuery]);

	const evidenceTree = useMemo(() => getEvidenceTree(pages), [pages]);
	const generalPages = useMemo(
		() => pages.filter((page) => !isEvidencePage(page)),
		[pages],
	);

	// Pinned Pages
	const pinned = useMemo(
		() => generalPages.filter((p) => p.is_pinned).slice(0, 5),
		[generalPages],
	);

	// Favorites
	const favorites = useMemo(
		() =>
			generalPages.filter((p) => p.view_count > 10 && !p.is_pinned).slice(0, 5),
		[generalPages],
	);

	// Recents
	const recents = useMemo(
		() =>
			[...generalPages]
				.sort((a, b) => {
					const dateA =
						(a.updated_at as any)?.toDate?.() || new Date(a.updated_at as any);
					const dateB =
						(b.updated_at as any)?.toDate?.() || new Date(b.updated_at as any);
					return dateB.getTime() - dateA.getTime();
				})
				.slice(0, 5),
		[generalPages],
	);

	// Tags
	const allTags = useMemo(() => {
		const counts: Record<string, number> = {};
		generalPages.forEach((p) =>
			p.tags?.forEach((t) => (counts[t] = (counts[t] || 0) + 1)),
		);
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);
	}, [generalPages]);

	// Build tree structure
	const pageTree = useMemo(() => {
		const byCategory: Record<string, WikiPage[]> = {};
		generalPages.forEach((page) => {
			const cat = page.category || "uncategorized";
			if (!byCategory[cat]) byCategory[cat] = [];
			byCategory[cat].push(page);
		});
		return byCategory;
	}, [generalPages]);

	return (
		<div className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
			<div className="flex h-14 items-center gap-4 px-4">
				{/* Main Nav Items */}
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"gap-2 font-bold font-display rounded-xl transition-all duration-300",
							!selectedPageId
								? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
								: "hover:bg-slate-100 dark:hover:bg-slate-800",
						)}
						onClick={onDashboardSelect}
					>
						<LayoutDashboard
							className={cn(
								"h-4 w-4",
								!selectedPageId ? "text-blue-600" : "text-slate-400",
							)}
						/>
						<span className="hidden sm:inline">Dashboard</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 font-bold font-display group relative overflow-hidden rounded-xl transition-all duration-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
						onClick={onKnowledgeHubSelect}
					>
						<div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
						<Sparkles className="h-4 w-4 text-amber-500 group-hover:animate-pulse" />
						<span className="hidden sm:inline text-slate-700 dark:text-slate-300 group-hover:text-amber-600 transition-colors">
							Knowledge Hub
						</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 font-bold font-display group relative overflow-hidden rounded-xl transition-all duration-300 hover:bg-primary/5 dark:hover:bg-primary/10"
						onClick={onAIHubSelect}
					>
						<div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
						<Brain className="h-4 w-4 text-primary group-hover:animate-pulse" />
						<span className="hidden sm:inline text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
							AI Hub
						</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 font-bold font-display rounded-xl transition-all duration-300 hover:bg-sky-50 dark:hover:bg-sky-900/20"
						onClick={onDictionarySelect}
					>
						<Languages className="h-4 w-4 text-sky-500" />
						<span className="hidden sm:inline text-slate-700 dark:text-slate-300 group-hover:text-sky-600 transition-colors">
							Dicionário
						</span>
					</Button>
				</div>

				<div className="h-6 w-px bg-border mx-1" />

				{/* Trilhas Dropdown */}
				{evidenceTree.root && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="gap-2">
								<Library className="h-4 w-4 text-emerald-600" />
								<span>Trilhas</span>
								<ChevronDown className="h-3 w-3 opacity-50" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64">
							<DropdownMenuLabel>Trilhas de Evidência</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => onPageSelect(evidenceTree.root!)}
							>
								<Library className="mr-2 h-4 w-4 text-emerald-600" />
								{evidenceTree.root.title}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{evidenceTree.trails.map(({ trail, protocols }) => (
								<DropdownMenuSub key={trail.id}>
									<DropdownMenuSubTrigger>
										<File className="mr-2 h-4 w-4" />
										<span className="truncate">{trail.title}</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-64">
										<DropdownMenuItem onClick={() => onPageSelect(trail)}>
											Ver Trilha Completa
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										{protocols.map((protocol) => (
											<DropdownMenuItem
												key={protocol.id}
												onClick={() => onPageSelect(protocol)}
											>
												<FileText className="mr-2 h-4 w-4" />
												<span className="truncate">{protocol.title}</span>
											</DropdownMenuItem>
										))}
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{/* Explorar Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-2">
							<Folder className="h-4 w-4 text-blue-500/70" />
							<span>Explorar</span>
							<ChevronDown className="h-3 w-3 opacity-50" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-64">
						<DropdownMenuLabel>Categorias</DropdownMenuLabel>
						{categories.map((category) => {
							const categoryPages = pageTree[category.id] || [];
							if (categoryPages.length === 0) return null;
							return (
								<DropdownMenuSub key={category.id}>
									<DropdownMenuSubTrigger>
										<Folder className="mr-2 h-4 w-4 text-blue-500/70" />
										{category.name}
									</DropdownMenuSubTrigger>
									<DropdownMenuSubContent className="w-64">
										{categoryPages.map((page) => (
											<DropdownMenuItem
												key={page.id}
												onClick={() => onPageSelect(page)}
											>
												<File className="mr-2 h-4 w-4 opacity-70" />
												<span className="truncate">{page.title}</span>
											</DropdownMenuItem>
										))}
									</DropdownMenuSubContent>
								</DropdownMenuSub>
							);
						})}

						{pageTree.uncategorized && pageTree.uncategorized.length > 0 && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuLabel>Sem Categoria</DropdownMenuLabel>
								{pageTree.uncategorized.map((page) => (
									<DropdownMenuItem
										key={page.id}
										onClick={() => onPageSelect(page)}
									>
										<File className="mr-2 h-4 w-4 opacity-70" />
										<span className="truncate">{page.title}</span>
									</DropdownMenuItem>
								))}
							</>
						)}

						<DropdownMenuSeparator />
						<DropdownMenuLabel>Tags Populares</DropdownMenuLabel>
						<div className="p-2 flex flex-wrap gap-1">
							{allTags.map(([tag]) => (
								<Badge
									key={tag}
									variant="outline"
									className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted"
									onClick={() => onTagSelect?.(tag)}
								>
									#{tag}
								</Badge>
							))}
						</div>
					</DropdownMenuContent>
				</DropdownMenu>

				{/* History/Quick Access */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-2">
							<Clock className="h-4 w-4" />
							<span className="hidden md:inline">Acesso Rápido</span>
							<ChevronDown className="h-3 w-3 opacity-50" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-64">
						{pinned.length > 0 && (
							<>
								<DropdownMenuLabel className="flex items-center gap-2">
									<Pin className="h-3 w-3 text-orange-500" /> Fixados
								</DropdownMenuLabel>
								{pinned.map((page) => (
									<DropdownMenuItem
										key={page.id}
										onClick={() => onPageSelect(page)}
									>
										<span className="truncate">{page.title}</span>
									</DropdownMenuItem>
								))}
								<DropdownMenuSeparator />
							</>
						)}
						{favorites.length > 0 && (
							<>
								<DropdownMenuLabel className="flex items-center gap-2">
									<Star className="h-3 w-3 text-yellow-500" /> Populares
								</DropdownMenuLabel>
								{favorites.map((page) => (
									<DropdownMenuItem
										key={page.id}
										onClick={() => onPageSelect(page)}
									>
										<span className="truncate">{page.title}</span>
									</DropdownMenuItem>
								))}
								<DropdownMenuSeparator />
							</>
						)}
						<DropdownMenuLabel className="flex items-center gap-2">
							<Clock className="h-3 w-3" /> Recentes
						</DropdownMenuLabel>
						{recents.map((page) => (
							<DropdownMenuItem
								key={page.id}
								onClick={() => onPageSelect(page)}
							>
								<span className="truncate">{page.title}</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{/* Search bar expanded */}
				<div className="flex-1 max-w-sm ml-auto relative group">
					<DropdownMenu open={searchQuery.length > 0}>
						<DropdownMenuTrigger asChild>
							<div className="relative w-full">
								<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
								<Input
									placeholder="Buscar na wiki..."
									className="pl-9 h-9 bg-muted/40 border-none focus-visible:ring-1 focus-visible:bg-background transition-all"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-80 max-h-[400px] overflow-y-auto"
							onCloseAutoFocus={(e) => e.preventDefault()}
						>
							<DropdownMenuLabel className="flex items-center justify-between">
								Resultados da busca
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-[10px]"
									onClick={() => setSearchQuery("")}
								>
									Fechar
								</Button>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{searchResults.length === 0 ? (
								<div className="p-4 text-center text-xs text-muted-foreground">
									Nenhuma página encontrada para "{searchQuery}"
								</div>
							) : (
								searchResults.map((page) => (
									<DropdownMenuItem
										key={page.id}
										onClick={() => {
											onPageSelect(page);
											setSearchQuery("");
										}}
									>
										<div className="flex flex-col gap-0.5">
											<span className="font-medium">{page.title}</span>
											{page.category && (
												<span className="text-[10px] text-muted-foreground uppercase">
													{categories.find((c) => c.id === page.category)
														?.name || page.category}
												</span>
											)}
										</div>
									</DropdownMenuItem>
								))
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<Button
					onClick={onCreatePage}
					size="sm"
					className="hidden sm:flex shadow-sm gap-2"
				>
					<Plus className="h-4 w-4" />
					<span className="hidden lg:inline">Nova Página</span>
				</Button>
			</div>
		</div>
	);
}
