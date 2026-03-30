export interface DiffLine {
	type: "same" | "added" | "removed";
	text: string;
}

export interface BlockTextSelection {
	text: string;
	start: number;
	end: number;
}

interface DatabaseColumnLike {
	id: string;
}

interface DatabaseRowLike {
	id: string;
	values: Record<string, string>;
}

interface DatabaseConfigLike {
	columns: DatabaseColumnLike[];
	rows: DatabaseRowLike[];
}

const IMAGE_EXTENSIONS_REGEX = /\.(avif|webp|png|jpe?g|gif|svg)$/i;
const VIDEO_EXTENSIONS_REGEX = /\.(mp4|webm|ogg|mov|m4v)$/i;

export function createId(): string {
	if (
		typeof globalThis !== "undefined" &&
		globalThis.crypto &&
		typeof globalThis.crypto.randomUUID === "function"
	) {
		return globalThis.crypto.randomUUID();
	}
	return `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildSlug(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function sanitizeFileName(fileName: string): string {
	const cleaned = fileName
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9._-]/g, "");

	return cleaned || `arquivo-${Date.now()}`;
}

export function normalizeUrl(rawUrl: string): string | null {
	const trimmed = rawUrl.trim();
	if (!trimmed) return null;

	const withProtocol = /^https?:\/\//i.test(trimmed)
		? trimmed
		: `https://${trimmed}`;

	try {
		const parsedUrl = new URL(withProtocol);
		if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
			return null;
		}
		return parsedUrl.toString();
	} catch {
		return null;
	}
}

export function getUrlPath(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

export function isImageUrl(url: string): boolean {
	return IMAGE_EXTENSIONS_REGEX.test(getUrlPath(url));
}

export function isVideoUrl(url: string): boolean {
	return VIDEO_EXTENSIONS_REGEX.test(getUrlPath(url));
}

export function getYouTubeEmbedUrl(url: string): string | null {
	const match = url.match(
		/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
	);
	return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function getVimeoEmbedUrl(url: string): string | null {
	const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
	return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

function getDateFromTimestamp(value: unknown): Date | null {
	if (
		value &&
		typeof value === "object" &&
		"toDate" in value &&
		typeof (value as { toDate?: () => Date }).toDate === "function"
	) {
		return (value as { toDate: () => Date }).toDate();
	}
	if (value instanceof Date) {
		return value;
	}
	return null;
}

export function formatTimestamp(value: unknown): string {
	const date = getDateFromTimestamp(value);
	if (!date) return "-";

	return date.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function getSelectionWithinElement(
	container: HTMLElement,
): BlockTextSelection | null {
	if (typeof window === "undefined") return null;

	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
		return null;
	}

	const range = selection.getRangeAt(0);
	if (!container.contains(range.commonAncestorContainer)) {
		return null;
	}

	const rawSelectedText = range.toString();
	const normalizedSelectedText = rawSelectedText.replace(/\s+/g, " ").trim();
	if (!normalizedSelectedText) {
		return null;
	}

	const prefixRange = range.cloneRange();
	prefixRange.selectNodeContents(container);
	prefixRange.setEnd(range.startContainer, range.startOffset);

	const start = prefixRange.toString().length;
	const end = start + rawSelectedText.length;

	if (end <= start) {
		return null;
	}

	return {
		text: normalizedSelectedText,
		start,
		end,
	};
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
	const oldLines = oldText.split("\n");
	const newLines = newText.split("\n");
	const oldLength = oldLines.length;
	const newLength = newLines.length;

	const dp: number[][] = Array.from({ length: oldLength + 1 }, () =>
		Array(newLength + 1).fill(0),
	);

	for (let i = oldLength - 1; i >= 0; i -= 1) {
		for (let j = newLength - 1; j >= 0; j -= 1) {
			if (oldLines[i] === newLines[j]) {
				dp[i][j] = dp[i + 1][j + 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
			}
		}
	}

	const result: DiffLine[] = [];
	let i = 0;
	let j = 0;

	while (i < oldLength && j < newLength) {
		if (oldLines[i] === newLines[j]) {
			result.push({ type: "same", text: oldLines[i] });
			i += 1;
			j += 1;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			result.push({ type: "removed", text: oldLines[i] });
			i += 1;
		} else {
			result.push({ type: "added", text: newLines[j] });
			j += 1;
		}
	}

	while (i < oldLength) {
		result.push({ type: "removed", text: oldLines[i] });
		i += 1;
	}

	while (j < newLength) {
		result.push({ type: "added", text: newLines[j] });
		j += 1;
	}

	return result;
}

export function getFilteredAndSortedRows<T extends DatabaseConfigLike>(
	database: T,
	search: string,
	sortColumnId: string,
	sortDirection: "asc" | "desc",
): T["rows"] {
	const loweredSearch = search.trim().toLowerCase();

	const filtered = loweredSearch
		? database.rows.filter((row) =>
				database.columns.some((column) =>
					String(row.values[column.id] ?? "")
						.toLowerCase()
						.includes(loweredSearch),
				),
			)
		: database.rows;

	const sorted = [...filtered].sort((a, b) => {
		const valueA = String(a.values[sortColumnId] ?? "");
		const valueB = String(b.values[sortColumnId] ?? "");

		const comparison = valueA.localeCompare(valueB, "pt-BR", {
			numeric: true,
			sensitivity: "base",
		});
		return sortDirection === "asc" ? comparison : -comparison;
	});

	return sorted as T["rows"];
}
