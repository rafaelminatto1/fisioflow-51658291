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
  attachment: "📎 Anexo do Instagram",
  share: "📸 Publicação do Instagram",
  ig_reel: "🎬 Reel do Instagram",
  ig_collab: "🤝 Proposta de Colaboração",
  story_share: "📲 Story compartilhado",
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

import type React from "react";
import { MessageCircle } from "lucide-react";

/**
 * Remove sintaxe de link markdown [Rótulo](https://...) deixando apenas o rótulo legível
 * para previews de mensagens (listas de conversa, notificações).
 */
export function cleanMarkdownLinks(text: string): string {
  if (!text) return "";
  return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1").trim();
}

/**
 * Renderiza textos de mensagens no chat convertendo links markdown [Rótulo](URL) em
 * botões/links interativos (estilo WhatsApp) e URLs puras em <a> clicáveis.
 */
export function renderFormattedMessageText(content: string): React.ReactNode {
  if (!content) return null;

  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const hasMarkdownLinks = markdownLinkRegex.test(content);
  markdownLinkRegex.lastIndex = 0;

  if (!hasMarkdownLinks) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    if (parts.length === 1) return content;

    return parts.map((part, idx) => {
      if (/^https?:\/\//i.test(part)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const [fullMatch, label, url] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      nodes.push(content.substring(lastIndex, matchIndex));
    }

    const isWhatsApp = url.includes("wa.me") || url.includes("whatsapp.com");
    const displayLabel = label.trim().startsWith("💬") ? label.trim() : `💬 ${label.trim()}`;

    nodes.push(
      isWhatsApp ? (
        <a
          key={`md-link-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="my-2.5 flex w-full max-w-[300px] items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#20bd5a] transition-all no-underline"
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          {displayLabel}
        </a>
      ) : (
        <a
          key={`md-link-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 break-all"
        >
          {label}
        </a>
      )
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < content.length) {
    nodes.push(content.substring(lastIndex));
  }

  return nodes;
}

export interface InstagramAttachmentData {
  kind: "collab" | "share" | "reel" | "story" | "attachment";
  title: string;
  subtitle: string;
  description?: string;
  mediaUrl?: string;
  postUrl?: string;
  authorUsername?: string;
  status: "pendente" | "aceito" | "recusado";
  isCollabCandidate: boolean;
}

export function parseInstagramAttachment(
  message: {
    type?: string;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    metadata?: Record<string, unknown>;
  },
  channel?: string,
  contactName?: string,
): InstagramAttachmentData | null {
  const type = message.type || "";
  const text = (message.content || "").trim();
  const meta = message.metadata || {};
  const attType = (meta.attachmentType as string) || type;

  // Checa se é canal Instagram ou se tem marcadores de anexo do IG
  const isIgChannel = channel === "instagram";
  const isIgType =
    ["share", "ig_reel", "ig_collab", "story_share", "story_mention", "ephemeral", "attachment"].includes(type) ||
    ["share", "ig_reel", "ig_collab", "story_share", "story_mention"].includes(attType);
  const isIgTextMarker =
    text.includes("instagram.com") ||
    text.includes("Anexo") ||
    text.toLowerCase().includes("collab") ||
    text.toLowerCase().includes("colabora") ||
    text.includes("Compartilhou uma publicação");

  if (!isIgChannel && !isIgType && !isIgTextMarker) {
    return null;
  }

  // Determina tipo/kind
  let kind: InstagramAttachmentData["kind"] = "attachment";
  if (attType === "ig_collab" || type === "ig_collab" || text.toLowerCase().includes("collab")) {
    kind = "collab";
  } else if (attType === "ig_reel" || type === "ig_reel") {
    kind = "reel";
  } else if (attType === "story_share" || attType === "story_mention" || type === "story_mention") {
    kind = "story";
  } else if (attType === "share" || type === "share") {
    kind = "share";
  }

  // Collab candidate se menciona collab, coautor, parceria ou se é share/collab no IG
  const isCollabCandidate =
    kind === "collab" ||
    text.toLowerCase().includes("collab") ||
    text.toLowerCase().includes("parceria") ||
    text.toLowerCase().includes("coautor") ||
    text.toLowerCase().includes("postposta") ||
    text.toLowerCase().includes("proposta") ||
    (isIgChannel && (kind === "share" || kind === "reel"));

  const authorUsername =
    (meta.authorUsername as string) ||
    (meta.username as string) ||
    (contactName?.startsWith("@") ? contactName.substring(1) : contactName) ||
    "instagram_user";

  const mediaUrl =
    message.mediaUrl ||
    (meta.mediaUrl as string) ||
    (meta.url as string) ||
    (meta.poster_url as string) ||
    undefined;

  const postUrl =
    (meta.postUrl as string) ||
    (meta.permalink as string) ||
    (meta.url as string) ||
    (authorUsername ? `https://instagram.com/${authorUsername.replace(/^@/, "")}` : "https://instagram.com");

  const title =
    (meta.title as string) ||
    (kind === "collab" || isCollabCandidate
      ? "Proposta de Colaboração / Coautoria"
      : kind === "reel"
        ? "Reel do Instagram"
        : kind === "story"
          ? "Story do Instagram"
          : "Publicação do Instagram");

  const subtitle = `@${authorUsername.replace(/^@/, "")}`;

  const description =
    text && !isRawPlaceholder(text) && !text.startsWith("📎 Anexo")
      ? text
      : (meta.caption as string) || "Gostaria de convidar para coautoria nesta publicação no Instagram.";

  const status = (meta.collabStatus as "pendente" | "aceito" | "recusado") || "pendente";

  return {
    kind,
    title,
    subtitle,
    description,
    mediaUrl,
    postUrl,
    authorUsername,
    status,
    isCollabCandidate,
  };
}

