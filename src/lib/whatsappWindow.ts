/**
 * Janela de atendimento de 24h do WhatsApp Cloud API.
 *
 * Mensagens de texto livre só são entregues dentro de 24h da última mensagem
 * recebida do cliente. Fora dessa janela, a Meta aceita o envio (HTTP 200) mas
 * NÃO entrega — apenas templates aprovados passam. Usamos isto para avisar o
 * atendente antes de enviar texto livre que não chegaria.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Template de reengajamento aprovado na Meta para reabrir conversa fora da
 * janela de 24h. SEM variáveis ({{n}}) para que o envio padrão do inbox
 * (components body com parameters vazios) funcione direto.
 * O nome DEVE bater com o registrado na Meta (ver endpoint de registro no
 * Worker: POST /api/whatsapp/inbox/templates/reengagement/register).
 */
export const REENGAGEMENT_TEMPLATE_NAME = "reengajamento";
export const REENGAGEMENT_TEMPLATE_LANGUAGE = "pt_BR";
export const REENGAGEMENT_TEMPLATE_TEXT =
  "Olá! 👋 Aqui é a Activity Fisioterapia. Notamos que nossa conversa ficou pausada. " +
  "Podemos continuar seu atendimento por aqui? É só responder esta mensagem que retomamos. 😊";

type WindowMessage = {
  direction: string;
  timestamp?: string | null;
};

/** Retorna true se houver mensagem recebida (inbound) nas últimas 24h. */
export function isWhatsAppWindowOpen(
  messages: WindowMessage[],
  now: number = Date.now(),
): boolean {
  let lastInbound = 0;
  for (const message of messages) {
    if (message.direction !== "inbound" || !message.timestamp) continue;
    const ts = new Date(message.timestamp).getTime();
    if (Number.isFinite(ts) && ts > lastInbound) {
      lastInbound = ts;
    }
  }
  if (lastInbound === 0) return false;
  return now - lastInbound < WINDOW_MS;
}
