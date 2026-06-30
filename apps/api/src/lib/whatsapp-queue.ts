/**
 * WhatsApp Queue Message Types
 *
 * Defines the message envelopes sent to the fisioflow-whatsapp-inbound Cloudflare Queue.
 * The webhook handler enqueues messages for reliable, retryable processing decoupled
 * from the request-response cycle.
 */

/** Inbound message from WhatsApp user */
export interface WhatsAppInboundMessage {
  /** Type discriminator for the queue consumer */
  type: "inbound_message";
  /** Meta's unique message ID (wamid) — used for idempotency */
  metaMessageId: string;
  /** WhatsApp contact ID (wa_id) */
  waId: string;
  /** Sender phone number in E.164 format */
  from: string;
  /** Message text body (ou legenda da mídia) */
  text?: string;
  /** Message type from Meta (text, image, audio, video, document, etc.) */
  messageType: string;
  /** ID da mídia na Graph API — resolvido e espelhado no R2 pelo consumidor. */
  mediaId?: string;
  /** MIME informado pela Meta no webhook (quando disponível). */
  mediaMimeType?: string;
  /** Raw webhook payload for the entry */
  rawPayload: Record<string, unknown>;
  /** Organization ID resolved from phone number mapping */
  organizationId: string | null;
  /** Phone number ID of the WhatsApp Business account */
  phoneNumberId: string;
  /** Timestamp the message was sent (ISO 8601) */
  timestamp: string;
}

/** Outbound message to send via WhatsApp */
export interface WhatsAppOutboundMessage {
  type: "send_message";
  /** Destination phone number in E.164 format */
  to: string;
  /** Plain text body */
  text?: string;
  /** Optional template to send instead of plain text */
  template?: {
    name: string;
    language: string;
    components: unknown[];
  };
  /** Organization context for credential lookup */
  organizationId: string;
}

/** Template message send request */
export interface WhatsAppTemplateSend {
  type: "send_template";
  to: string;
  template: string;
  variables: Record<string, string>;
  organizationId: string;
}

/** Status update (delivery/read receipt from Meta) */
export interface WhatsAppStatusUpdate {
  type: "status_update";
  metaMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  errorMessage?: string;
}

/** Union of all message types sent through the WhatsApp queue */
export type WhatsAppQueueMessage =
  | WhatsAppInboundMessage
  | WhatsAppOutboundMessage
  | WhatsAppTemplateSend
  | WhatsAppStatusUpdate;

/** Queue send options for batch processing */
export interface WhatsAppQueueOptions {
  /** Delay delivery by N seconds (0 = immediate) */
  delaySeconds?: number;
  /** Content type for the message envelope */
  contentType?: "json";
}
