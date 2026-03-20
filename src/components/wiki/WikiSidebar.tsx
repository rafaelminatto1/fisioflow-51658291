/**
 * WikiSidebar - Sidebar de navegação da Wiki
 * Mostra árvore de páginas organizadas por categoria, favoritos, recentes e tags.
 */

import React, { useMemo } from "react";
import {
	ChevronRight,
	Folder,
	File,
	Star,
	Clock,
	Library,
	Search,
	Plus,
	Tag,
	Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { WikiPage, WikiCategory } from "@/types/wiki";

interface WikiSidebarProps {
	pages: WikiPage[];
	categories: WikiCategory[];
	selectedPageId?: string;
	onPageSelect: (page: WikiPage) => void;
	onCreatePage: () => void;
	onKnowledgeHubSelect?: () => void;
	onDashboardSelect?: () => void;
	onTagSelect?: (tag: string) => void;
}

export function WikiSidebar({
	pages,
	categories,
	selectedPageId,
	onPageSelect,
	onCreatePage,
	onKnowledgeHubSelect,
	onDashboardSelect,
	onTagSelect,
}: WikiSidebarProps) {
	const [searchQuery, setSearchQuery] = React.useState("");
	const [expandedCategories, setExpandedCategories] = React.useState<
		Set<string>
	>(new Set(categories.map((c) => c.id)));

	// Pinned Pages
	const pinned = useMemo(
		() => pages.filter((p) => p.is_pinned).slice(0, 5),
		[pages],
	);

	// Favorites (based on view_count)
	const favorites = useMemo(
		() => pages.filter((p) => p.view_count > 10 && !p.is_pinned).slice(0, 5),
		[pages],
	);

	// Recents
	const recents = useMemo(
		() =>
			[...pages]
				.sort((a, b) => {
					const dateA =
						(a.updated_at as any)?.toDate?.() || new Date(a.updated_at as any);
					const dateB =
						(b.updated_at as any)?.toDate?.() || new Date(b.updated_at as any);
					return dateB.getTime() - dateA.getTime();
				})
				.slice(0, 5),
		[pages],
	);

	// Tags mais usadas
	const allTags = useMemo(() => {
		const counts: Record<string, number> = {};
		pages.forEach((p) =>
			p.tags?.forEach((t) => (counts[t] = (counts[t] || 0) + 1)),
		);
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);
	}, [pages]);

	// Build tree structure
	const pageTree = useMemo(() => {
		// Group by category
		const byCategory: Record<string, WikiPage[]> = {};
		pages.forEach((page) => {
			const cat = page.category || "uncategorized";
			if (!byCategory[cat]) {
				byCategory[cat] = [];
			}
			byCategory[cat].push(page);
		});

		// Filter by search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			Object.keys(byCategory).forEach((cat) => {
				byCategory[cat] = byCategory[cat].filter(
					(p) =>
						p.title.toLowerCase().includes(query) ||
						p.content.toLowerCase().includes(query),
				);
			});
		}

		return byCategory;
	}, [pages, searchQuery]);

	const toggleCategory = (categoryId: string) => {
		setExpandedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(categoryId)) {
				next.delete(categoryId);
			} else {
				next.add(categoryId);
			}
			return next;
		});
	};

	return (
		<div className="w-64 border-r bg-muted/10 flex flex-col h-full">
			{/* Search & Dashboard */}
			<div className="p-4 space-y-4">
				<div className="relative">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Buscar..."
						className="pl-9 h-9"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className="space-y-1">
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start font-normal"
						onClick={onDashboardSelect}
					>
						<Library className="mr-2 h-4 w-4 text-blue-500" />
						Dashboard
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-start font-normal"
						onClick={onKnowledgeHubSelect}
					>
						<Sparkles className="mr-2 h-4 w-4 text-amber-500" />
						Knowledge Hub
					</Button>
				</div>
			</div>

			<Separator />

			{/* Pages */}
			<ScrollArea className="flex-1">
				<div className="p-2 space-y-6">
					{/* Pinned */}
					{pinned.length > 0 && (
						<div>
							<div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-bold mb-1 flex items-center gap-1">
								<Pin className="w-3 h-3 text-orange-500 fill-orange-500" />{" "}
								Fixados
							</div>
							{pinned.map((page) => (
								<PageItem
									key={`pin-${page.id}`}
									page={page}
									isSelected={selectedPageId === page.id}
									onClick={() => onPageSelect(page)}
								/>
							))}
						</div>
					)}

					{/* Favorites */}
					{favorites.length > 0 && (
						<div>
							<div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-bold mb-1 flex items-center gap-1">
								<Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{" "}
								Populares
							</div>
							{favorites.map((page) => (
								<PageItem
									key={`fav-${page.id}`}
									page={page}
									isSelected={selectedPageId === page.id}
									onClick={() => onPageSelect(page)}
								/>
							))}
						</div>
					)}

					{/* Recents */}
					{recents.length > 0 && (
						<div>
							<div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-bold mb-1 flex items-center gap-1">
								<Clock className="w-3 h-3" /> Recentes
							</div>
							{recents.map((page) => (
								<PageItem
									key={`recent-${page.id}`}
									page={page}
									isSelected={selectedPageId === page.id}
									onClick={() => onPageSelect(page)}
								/>
							))}
						</div>
					)}

					{/* Categories */}
					<div>
						<div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-bold mb-1">
							Explorar
						</div>

						{/* Uncategorized */}
						{pageTree.uncategorized && pageTree.uncategorized.length > 0 && (
							<div className="mb-2">
								{pageTree.uncategorized.map((page) => (
									<PageItem
										key={page.id}
										page={page}
										isSelected={selectedPageId === page.id}
										onClick={() => onPageSelect(page)}
									/>
								))}
							</div>
						)}

						{categories.map((category) => {
							const categoryPages = pageTree[category.id] || [];
							const isExpanded = expandedCategories.has(category.id);

							return (
								<div key={category.id} className="mb-1">
									<button
										onClick={() => toggleCategory(category.id)}
										className="w-full flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-md transition-colors group"
									>
										<ChevronRight
											className={cn(
												"w-3.5 h-3.5 transition-transform text-muted-foreground",
												isExpanded && "rotate-90",
											)}
										/>
										<Folder className="w-3.5 h-3.5 text-blue-500/70" />
										<span className="text-sm font-medium truncate flex-1">
											{category.name}
										</span>
										{categoryPages.length > 0 && (
											<span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
												{categoryPages.length}
											</span>
										)}
									</button>

									{isExpanded && categoryPages.length > 0 && (
										<div className="ml-3 border-l pl-2 mt-1 space-y-0.5">
											{categoryPages.map((page) => (
												<PageItem
													key={page.id}
													page={page}
													isSelected={selectedPageId === page.id}
													onClick={() => onPageSelect(page)}
												/>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>

					{/* Tags */}
					{allTags.length > 0 && (
						<div>
							<div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-bold mb-1 flex items-center gap-1">
								<Tag className="w-3 h-3" /> Tags Populares
							</div>
							<div className="flex flex-wrap gap-1 px-2 mt-2">
								{allTags.map(([tag, count]) => (
									<Badge
										key={tag}
										variant="outline"
										className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-muted transition-colors"
										onClick={() => onTagSelect?.(tag)}
									>
										#{tag}
									</Badge>
								))}
							</div>
						</div>
					)}
				</div>
			</ScrollArea>

			{/* Create Button */}
			<div className="p-4 border-t bg-background/50">
				<Button onClick={onCreatePage} className="w-full shadow-sm" size="sm">
					<Plus className="mr-2 h-4 w-4" /> Nova Página
				</Button>
			</div>
		</div>
	);
}

interface PageItemProps {
	page: WikiPage;
	isSelected: boolean;
	onClick: () => void;
}

function PageItem({ page, isSelected, onClick }: PageItemProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all text-left group",
				isSelected
					? "bg-primary/10 text-primary font-medium border border-primary/20"
					: "hover:bg-muted text-muted-foreground hover:text-foreground",
			)}
		>
			{page.icon ? (
				<span className="text-sm shrink-0">{page.icon}</span>
			) : (
				<File className="w-3.5 h-3.5 shrink-0 opacity-70" />
			)}
			<span className="truncate flex-1">{page.title}</span>
		</button>
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
