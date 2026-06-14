/**
 * richTextSync — decisão pura de quando sincronizar o valor externo (`value`)
 * para dentro do editor TipTap.
 *
 * O editor é "semi-controlado": ele é dono do seu documento enquanto o usuário
 * digita. O `value` externo só sobrescreve o conteúdo em duas situações:
 *   1. Substituição explícita do conteúdo (ex.: "Replicar sessão",
 *      "Restaurar versão") — sinalizada por um bump de `externalValueRevision`.
 *   2. Mudança externa genuína enquanto o campo está ocioso (sem foco) e que
 *      NÃO seja um eco do que o próprio editor acabou de emitir.
 *
 * Isso elimina a classe de bug do TipTap controlado (ref: tiptap#4828 e o
 * anti-padrão de "controlled component"): nunca arrancamos o texto debaixo do
 * cursor do usuário, e ecos do autosave não causam reset/perda de digitação —
 * que era a causa de "o autosave para de funcionar quando edito o texto".
 */
export interface RichTextSyncDecisionParams {
  /** Valor externo normalizado ("" representa documento vazio). */
  incoming: string;
  /** HTML atual normalizado do editor ("" representa documento vazio). */
  current: string;
  /** Último valor que o editor emitiu para cima (para detectar eco). */
  lastSent: string;
  /** Editor está focado (usuário digitando)? */
  isFocused: boolean;
  /** Houve bump de `externalValueRevision` (substituição explícita)? */
  hasExplicitRevision: boolean;
}

export function shouldApplyExternalValue({
  incoming,
  current,
  lastSent,
  isFocused,
  hasExplicitRevision,
}: RichTextSyncDecisionParams): boolean {
  // Nada a fazer se o editor já está com o conteúdo desejado.
  if (incoming === current) return false;
  // Substituição explícita sempre vence (mesmo focado).
  if (hasExplicitRevision) return true;
  // Nunca sobrescrever debaixo do cursor do usuário.
  if (isFocused) return false;
  // Eco do que nós mesmos emitimos — não re-aplicar.
  if (incoming === lastSent) return false;
  // Mudança externa genuína com o campo ocioso.
  return true;
}

/** Normaliza o HTML do TipTap: documento vazio (`<p></p>`) vira string vazia. */
export function normalizeEditorHtml(html: string): string {
  return html === "<p></p>" ? "" : html;
}
