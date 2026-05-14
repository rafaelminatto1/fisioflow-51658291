/**
 * Preload functions for evolution editor chunks — call during idle or on hover.
 *
 * Após a migração para o modelo único de evolução (texto livre), o único
 * editor em uso é o `LiveTextEvolution`. As entradas antigas (v1-soap,
 * v2-texto, v3-notion, v4-tiptap) foram removidas para evitar carregar
 * código morto.
 */
export const preloadEditorChunks = {
  "live-text": () => import("@/components/evolution/live-text/LiveTextEvolution"),
} as const;

export type EditorVersionKey = keyof typeof preloadEditorChunks;

export const preloadEditorVersion = (version: EditorVersionKey) =>
  preloadEditorChunks[version]?.();
