import { Mic, Paperclip } from "lucide-react";
import type { Message } from "@/services/whatsapp-api";

interface WhatsAppMessageProps {
  message: Message;
}

export function WhatsAppMessage({ message }: WhatsAppMessageProps) {
  let parsed: any = null;
  if (typeof message.content === "string") {
    try {
      parsed = JSON.parse(message.content);
    } catch {
      parsed = null;
    }
  } else {
    parsed = message.content;
  }

  const type = message.type;

  if (type === "image" || parsed?.type === "image") {
    const url =
      parsed?.url ||
      parsed?.link ||
      (typeof message.content === "string" && message.content.startsWith("http")
        ? message.content
        : null);
    if (url) {
      return (
        <div className="mt-1">
          <img
            src={url}
            alt="Imagem"
            className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
            onClick={() => window.open(url, "_blank")}
          />
          {parsed?.caption && <p className="text-sm mt-1">{parsed.caption}</p>}
        </div>
      );
    }
  }

  if (type === "audio" || (type as string) === "voice") {
    const url = parsed?.url || parsed?.link;
    if (url) {
      return <audio controls src={url} className="mt-1 max-w-full h-10" />;
    }
    return (
      <div className="flex items-center gap-2 mt-1 text-xs opacity-75">
        <Mic className="h-4 w-4" /> Mensagem de voz
      </div>
    );
  }

  if (type === "document") {
    const url = parsed?.url || parsed?.link;
    const filename = parsed?.filename || parsed?.name || "Documento";
    return (
      <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-black/10 dark:bg-white/10">
        <Paperclip className="h-4 w-4 shrink-0" />
        <span className="text-sm truncate flex-1">{filename}</span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline shrink-0"
          >
            Baixar
          </a>
        )}
      </div>
    );
  }

  if (type === "location") {
    const lat = parsed?.latitude;
    const lng = parsed?.longitude;
    const name = parsed?.name || "Localização";
    if (lat && lng) {
      return (
        <a
          href={`https://maps.google.com/?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
        >
          <span className="text-sm truncate font-medium">{name}</span>
          <span className="text-xs opacity-70">Ver no mapa</span>
        </a>
      );
    }
  }

  return (
    <p className="text-sm whitespace-pre-wrap break-words">
      {message.text || (typeof message.content === "string" ? message.text : "")}
    </p>
  );
}
