/** Preload functions for evolution editor chunks — call during idle or on hover */
export const preloadEditorChunks = {
	"v1-soap": () => import("@/components/evolution/EvolutionDraggableGrid"),
	"v2-texto": () => import("@/components/evolution/v2/NotionEvolutionPanel"),
	"v3-notion": () => import("@/components/evolution/v3-notion/NotionEvolutionPanel"),
	"v4-tiptap": () => import("@/components/evolution/NotionEvolutionEditor"),
} as const;

export type EditorVersionKey = keyof typeof preloadEditorChunks;

export const preloadEditorVersion = (version: EditorVersionKey) =>
	preloadEditorChunks[version]?.();
