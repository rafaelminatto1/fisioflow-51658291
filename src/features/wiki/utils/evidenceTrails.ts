import type { WikiPage } from "@/types/wiki";

export const EVIDENCE_ROOT_SLUG = "trilhas-evidencia-fisioterapia";

export const EVIDENCE_TRAIL_ORDER = [
	"trilha-lca-retorno-esporte",
	"trilha-artroplastia-joelho-quadril",
	"trilha-ombro-ortopedico-pos-operatorio",
	"trilha-tornozelo-aquiles-instabilidade",
] as const;

export const EVIDENCE_PROTOCOL_ORDER = [
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

export function isEvidencePage(page: Pick<WikiPage, "slug">): boolean {
	return EVIDENCE_PAGE_ORDER.includes(
		page.slug as (typeof EVIDENCE_PAGE_ORDER)[number],
	);
}

function getOrderIndex(slug: string): number {
	const index = EVIDENCE_PAGE_ORDER.indexOf(
		slug as (typeof EVIDENCE_PAGE_ORDER)[number],
	);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function sortEvidencePages<T extends Pick<WikiPage, "slug">>(
	pages: T[],
): T[] {
	return [...pages].sort((left, right) => {
		return getOrderIndex(left.slug) - getOrderIndex(right.slug);
	});
}

export type EvidenceTrailNode = {
	trail: WikiPage;
	protocols: WikiPage[];
};

export function getEvidenceTree(pages: WikiPage[]): {
	root: WikiPage | null;
	trails: EvidenceTrailNode[];
} {
	const bySlug = new Map(pages.map((page) => [page.slug, page]));
	const root = bySlug.get(EVIDENCE_ROOT_SLUG) ?? null;
	const trailPages = sortEvidencePages(
		pages.filter((page) =>
			EVIDENCE_TRAIL_ORDER.includes(
				page.slug as (typeof EVIDENCE_TRAIL_ORDER)[number],
			),
		),
	);

	const trails = trailPages.map((trail) => ({
		trail,
		protocols: sortEvidencePages(
			pages.filter(
				(page) => page.parent_id === trail.id && isEvidencePage(page),
			),
		),
	}));

	return { root, trails };
}
