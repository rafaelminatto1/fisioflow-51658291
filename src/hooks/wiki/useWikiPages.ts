import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { wikiService } from "@/lib/services/wikiService";
import { toast } from "sonner";
import type { WikiPage } from "@/types/wiki";

function isE2ERuntime(): boolean {
	return (
		typeof window !== "undefined" &&
		(window.location.search.includes("e2e=true") ||
			(typeof navigator !== "undefined" && navigator.webdriver === true))
	);
}

function getE2ERecentPagesStorageKey(organizationId: string): string {
	return `e2e_recent_wiki_pages_${organizationId}`;
}

function samePageIds(a: WikiPage[], b: WikiPage[]): boolean {
	if (a.length !== b.length) return false;
	const aIds = a.map((page) => page.id).sort();
	const bIds = b.map((page) => page.id).sort();
	return aIds.every((id, index) => id === bIds[index]);
}

const getTimestampMillis = (value: unknown): number => {
	if (!value) return 0;
	if (typeof value === "number") return value;
	if (value instanceof Date) return value.getTime();
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	}
	const maybeTimestamp = value as { toDate?: () => Date };
	if (typeof maybeTimestamp.toDate === "function")
		return maybeTimestamp.toDate().getTime();
	return 0;
};

export function useWikiPages(
	currentOrganizationId?: string | null,
	currentUserId?: string | null,
) {
	const queryClient = useQueryClient();
	
	const isE2E = isE2ERuntime();

	// Query for wiki pages
	const { data: rawPages = [], isLoading } = useQuery({
		queryKey: ["wiki-pages", currentOrganizationId],
		queryFn: () =>
			currentOrganizationId
				? wikiService.listPages(currentOrganizationId)
				: Promise.resolve([]),
		enabled: !!currentOrganizationId,
	});

	const [recoveredPages, setRecoveredPages] = useState<WikiPage[]>([]);
	const rawPagesSignature = useMemo(
		() =>
			rawPages
				.map((page) => page.id)
				.sort()
				.join("|"),
		[rawPages],
	);

	// Hydrate recent pages for E2E or persistence
	useEffect(() => {
		if (!currentOrganizationId) {
			setRecoveredPages((previous) => (previous.length === 0 ? previous : []));
			return;
		}

		let cancelled = false;

		const hydrateRecentPages = async () => {
			if (typeof window === "undefined") return;
			const key = getE2ERecentPagesStorageKey(currentOrganizationId);
			const raw = window.sessionStorage.getItem(key);
			if (!raw) {
				if (!cancelled) {
					setRecoveredPages((previous) =>
						previous.length === 0 ? previous : [],
					);
				}
				return;
			}

			let ids: string[] = [];
			try {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed))
					ids = parsed.filter((id): id is string => typeof id === "string");
			} catch {
				ids = [];
			}

			if (ids.length === 0) {
				if (!cancelled) {
					setRecoveredPages((previous) =>
						previous.length === 0 ? previous : [],
					);
				}
				return;
			}

			const existingIds = new Set(rawPages.map((page) => page.id));
			const missingIds = ids.filter((id) => !existingIds.has(id));
			if (missingIds.length === 0) {
				if (!cancelled) {
					setRecoveredPages((previous) =>
						previous.length === 0 ? previous : [],
					);
				}
				return;
			}

			const recovered = (
				await Promise.all(
					missingIds
						.slice(0, 20)
						.map((id) => wikiService.getPageById(currentOrganizationId, id)),
				)
			).filter((page): page is WikiPage => Boolean(page));

			if (!cancelled) {
				setRecoveredPages((previous) =>
					samePageIds(previous, recovered) ? previous : recovered,
				);
			}
		};

		hydrateRecentPages();
		return () => {
			cancelled = true;
		};
	}, [currentOrganizationId, rawPagesSignature]);

	// Merge raw and recovered pages
	const pages = useMemo(() => {
		const map = new Map<string, WikiPage>();
		rawPages.forEach((page) => map.set(page.id, page));
		recoveredPages.forEach((page) => map.set(page.id, page));

		const merged = Array.from(map.values());
		merged.sort(
			(a, b) =>
				getTimestampMillis(b.updated_at) - getTimestampMillis(a.updated_at),
		);
		return merged;
	}, [rawPages, recoveredPages]);

	// Query for categories
	const { data: categories = [] } = useQuery({
		queryKey: ["wiki-categories", currentOrganizationId],
		queryFn: () =>
			currentOrganizationId
				? wikiService.listCategories(currentOrganizationId)
				: Promise.resolve([]),
		enabled: !!currentOrganizationId,
	});

	// Favorites and Recents
	const favorites = useMemo(
		() => pages.filter((p) => p.view_count > 10).slice(0, 5),
		[pages],
	);
	const recentPages = useMemo(
		() =>
			[...pages]
				.sort(
					(a, b) =>
						getTimestampMillis(b.updated_at) - getTimestampMillis(a.updated_at),
				)
				.slice(0, 5),
		[pages],
	);

	const savePage = async (
		data: Omit<WikiPage, "id" | "created_at" | "updated_at" | "version">,
		selectedPageId?: string,
		selectedPageVersion?: number,
	) => {
		if (!currentUserId || !currentOrganizationId) return;
		const saveTraceId = `wiki-save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		try {
			if (isE2E) {
				console.info(
					"[E2E][Wiki][handleSave:start]",
					JSON.stringify({ traceId: saveTraceId, title: data.title }),
				);
			}

			const savedPageId = await wikiService.savePage(
				currentOrganizationId,
				currentUserId,
				data,
				selectedPageId
					? { id: selectedPageId, version: selectedPageVersion }
					: undefined,
			);

			// Persistence logic
			if (typeof window !== "undefined") {
				const key = getE2ERecentPagesStorageKey(currentOrganizationId);
				const currentRaw = window.sessionStorage.getItem(key);
				let ids: string[] = [];
				try {
					const parsed = currentRaw ? JSON.parse(currentRaw) : [];
					if (Array.isArray(parsed))
						ids = parsed.filter((id): id is string => typeof id === "string");
				} catch {
					ids = [];
				}
				const next = [
					savedPageId,
					...ids.filter((id) => id !== savedPageId),
				].slice(0, 30);
				window.sessionStorage.setItem(key, JSON.stringify(next));
			}

			await queryClient.invalidateQueries({
				queryKey: ["wiki-pages", currentOrganizationId],
			});
			toast.success("Página salva com sucesso.");
			return savedPageId;
		} catch (err) {
			console.error("Erro ao salvar página wiki:", err);
			toast.error("Não foi possível salvar a página.");
			throw err;
		}
	};

	const deletePage = async (pageId: string) => {
		if (!currentOrganizationId) return;
		try {
			await wikiService.deletePage(currentOrganizationId, pageId);
			await queryClient.invalidateQueries({
				queryKey: ["wiki-pages", currentOrganizationId],
			});
			toast.success("Página excluída.");
		} catch (err) {
			console.error("Erro ao excluir página:", err);
			toast.error("Não foi possível excluir a página.");
		}
	};

	return {
		pages,
		rawPages,
		categories,
		favorites,
		recentPages,
		isLoading,
		savePage,
		deletePage,
	};
}
