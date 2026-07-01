/**
 * Rótulos amigáveis (PT-BR) para tipos de mensagem sem texto renderizável.
 *
 * Evita mostrar placeholders crus como "[ephemeral]" no inbox (dados antigos do
 * Instagram/WhatsApp) e dá um rótulo legível para location/contacts/interactive
 * /reaction/sticker quando não há corpo de texto.
 */
const NON_TEXT_LABELS: Record<string, string> = {
  ephemeral: "📸 Foto de visualização única",
  story_mention: "📷 Menção em story",
  location: "📍 Localização",
  contacts: "👤 Contato compartilhado",
  interactive: "🔘 Resposta interativa",
  sticker: "🌟 Figurinha",
  reaction: "❤️ Reação",
  attachment: "📎 Anexo",
};

export function friendlyMessageLabel(type?: string | null): string {
  return (type && NON_TEXT_LABELS[type]) || "";
}

/** Detecta um placeholder cru gravado como texto (ex.: "[ephemeral]", "[location]"). */
export function isRawPlaceholder(text: string): boolean {
  return /^\[[a-z_]+\]$/i.test(text.trim());
}

/**
 * Texto a exibir na bolha: usa o texto real quando existe e não é um placeholder
 * cru; caso contrário cai no rótulo amigável do tipo; por fim, um fallback neutro.
 */
export function resolveMessageDisplayText(
  type: string | undefined | null,
  rawText: string | null | undefined,
): string {
  const t = (rawText ?? "").trim();
  if (t && !isRawPlaceholder(t)) return t;
  return friendlyMessageLabel(type) || "[mensagem sem texto]";
}
