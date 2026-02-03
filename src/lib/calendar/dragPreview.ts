import { Appointment } from '@/types/appointment';

/**
 * Utilitários para preview de drag and drop na agenda.
 * Fornece funções para calcular posicionamento e criar
 * previews visuais de cards redimensionados.
 *
 * @module dragPreview
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Gap percentual entre cards no mesmo slot
 */
export const CARD_GAP_PERCENT = 2;

/**
 * Largura mínima percentual para mostrar texto no card
 */
export const MIN_WIDTH_FOR_TEXT = 20;

/**
 * Quantidade máxima de cards antes de mostrar indicador numérico
 */
export const MAX_CARDS_WITHOUT_BADGE = 4;

/**
 * Dimensões padrão para preview de drag
 */
export const DEFAULT_PREVIEW_WIDTH = 240;
export const DEFAULT_PREVIEW_HEIGHT = 64;

/**
 * Cores de status para appointments - consistente com CalendarAppointmentCard
 */
export const APPOINTMENT_STATUS_COLORS = {
  confirmado: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500',
    hex: '#10b981'
  },
  agendado: {
    bg: 'bg-cyan-500/20',
    border: 'border-cyan-500',
    hex: '#06b6d4'
  },
  em_andamento: {
    bg: 'bg-amber-500/20',
    border: 'border-amber-500',
    hex: '#f59e0b'
  },
  cancelado: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    hex: '#ef4444'
  },
  falta: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    hex: '#ef4444'
  },
  concluido: {
    bg: 'bg-teal-500/20',
    border: 'border-teal-500',
    hex: '#14b8a6'
  },
  avaliacao: {
    bg: 'bg-violet-500/20',
    border: 'border-violet-500',
    hex: '#8b5cf6'
  },
  default: {
    bg: 'bg-slate-500/20',
    border: 'border-slate-500',
    hex: '#64748b'
  }
} as const;

/**
 * Tipo para cores de status
 */
export type StatusColors = typeof APPOINTMENT_STATUS_COLORS[keyof typeof APPOINTMENT_STATUS_COLORS];

// ============================================================================
// PUBLIC FUNCTIONS
// ============================================================================

/**
 * Retorna as classes CSS para um card baseado no status
 *
 * @param status - Status do appointment
 * @returns Objeto com classes bg e border
 */
export const getStatusCardClasses = (status: string): { bg: string; border: string } => {
  return APPOINTMENT_STATUS_COLORS[status as keyof typeof APPOINTMENT_STATUS_COLORS] || APPOINTMENT_STATUS_COLORS.default;
};

/**
 * Retorna a cor hexadecimal para uso em canvas
 *
 * @param status - Status do appointment
 * @returns Cor hexadecimal
 */
const getStatusHexColor = (status: string): string => {
  return APPOINTMENT_STATUS_COLORS[status as keyof typeof APPOINTMENT_STATUS_COLORS]?.hex || APPOINTMENT_STATUS_COLORS.default.hex;
};

/**
 * Calcula a largura percentual de cada card baseado
 * no número total de cards no mesmo slot.
 *
 * @param stackCount - Número total de cards no slot
 * @returns Largura percentual de cada card
 *
 * @example
 * calculateCardWidthPercent(1) // 100
 * calculateCardWidthPercent(2) // 48
 * calculateCardWidthPercent(3) // 31.33
 */
export const calculateCardWidthPercent = (stackCount: number): number => {
  if (stackCount <= 1) return 100;
  const totalGap = CARD_GAP_PERCENT * (stackCount + 1);
  return (100 - totalGap) / stackCount;
};

/**
 * Calcula o offset percentual (left) para um card
 * baseado na sua posição no stack.
 *
 * @param stackIndex - Índice do card no stack (0-based)
 * @param stackCount - Número total de cards no slot
 * @returns Offset percentual da esquerda
 *
 * @example
 * calculateCardOffsetPercent(0, 1) // 0
 * calculateCardOffsetPercent(0, 3) // 2
 * calculateCardOffsetPercent(1, 3) // 35.33
 */
export const calculateCardOffsetPercent = (
  stackIndex: number,
  stackCount: number
): number => {
  if (stackCount <= 1) return 0;
  return CARD_GAP_PERCENT + stackIndex * (calculateCardWidthPercent(stackCount) + CARD_GAP_PERCENT);
};

/**
 * Determina se deve mostrar texto baseado no espaço disponível
 *
 * @param cardWidthPercent - Largura do card em percentual
 * @param totalCards - Número total de cards
 * @returns true se deve mostrar texto
 */
export const shouldShowText = (cardWidthPercent: number, totalCards: number): boolean => {
  return cardWidthPercent > MIN_WIDTH_FOR_TEXT || totalCards <= MAX_CARDS_WITHOUT_BADGE;
};

/**
 * Cria uma preview de drag simples (apenas o card sendo arrastado)
 * para usar como drag image nativa.
 *
 * @param appointment - Appointment sendo arrastado
 * @param width - Largura do canvas em pixels
 * @param height - Altura do canvas em pixels
 * @returns Canvas element ou null se falhar
 */
export const createSimpleDragPreview = (
  appointment: Appointment,
  width: number = DEFAULT_PREVIEW_WIDTH,
  height: number = DEFAULT_PREVIEW_HEIGHT
): HTMLCanvasElement | null => {
  if (!appointment?.patientName) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const statusColor = getStatusHexColor(appointment.status || 'agendado');

  // Fundo com borda arredondada
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 2;

  roundRect(ctx, 0, 0, width, height, 8);
  ctx.fill();
  ctx.stroke();

  // Barra lateral colorida
  ctx.fillStyle = statusColor;
  roundRect(ctx, 4, 8, 4, height - 16, 2);
  ctx.fill();

  // Nome do paciente
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left' as CanvasTextAlign;
  ctx.textBaseline = 'top' as CanvasTextBaseline;

  const maxTextWidth = width - 40;
  const displayName = truncateText(ctx, appointment.patientName, maxTextWidth);
  ctx.fillText(displayName, 16, 14);

  // Horário
  ctx.fillStyle = '#64748b';
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(appointment.time || '--:--', 16, 34);

  // Status badge (círculo)
  ctx.fillStyle = statusColor;
  ctx.beginPath();
  ctx.arc(width - 16, 20, 5, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
};

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Helper para desenhar retângulos arredondados com fallback
 * para navegadores que não suportam roundRect nativo
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

/**
 * Trunca texto para caber em uma largura máxima
 */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (!text) return '';

  const width = ctx.measureText(text).width;
  if (width <= maxWidth) return text;

  const ellipsis = '...';
  const ellipsisWidth = ctx.measureText(ellipsis).width;

  let truncated = text;
  while (truncated.length > 0) {
    truncated = truncated.slice(0, -1);
    if (ctx.measureText(truncated).width + ellipsisWidth <= maxWidth) {
      return truncated + ellipsis;
    }
  }

  return ellipsis;
}
