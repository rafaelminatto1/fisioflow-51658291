/**
 * Utility for calculating content-based card heights
 * Cards adapt their height based on visible content elements
 * @module calendar/cardHeightCalculator
 */


/**
 * Calculate the minimum height required for a card based on its content
 * This ensures cards fit their content without excessive whitespace
 *
 * @param cardSize - The selected card size configuration
 * @param showAvatar - Whether avatar is shown (from sizeConfig)
 * @param showType - Whether type is shown (from sizeConfig)
 * @param isTiny - Whether this is a tiny card (< 30 min duration)
 * @param heightScale - Optional height scale multiplier (0-10) for additional adjustment
 * @returns Height in pixels
 */

import { CARD_SIZE_CONFIGS } from '@/lib/config/agenda';
import type { CardSize } from '@/types/agenda';

export function calculateContentBasedCardHeight(
  cardSize: CardSize,
  showAvatar: boolean,
  showType: boolean,
  isTiny: boolean,
  heightScale?: number
): number {
  const config = CARD_SIZE_CONFIGS[cardSize];

  // Tiny cards (< 30min) have minimal height
  if (isTiny) {
    let baseHeight = Math.max(20, Math.round(config.nameFontSize * 1.5));
    if (heightScale !== undefined) {
      const scaleMultiplier = 0.5 + (heightScale / 10) * 1.5; // 0.5x to 2.0x
      baseHeight = Math.round(baseHeight * scaleMultiplier);
    }
    return Math.max(baseHeight, 20);
  }

  // Base measurements (in pixels)
  const basePadding = 8; // padding outside
  const headerHeight = Math.max(config.timeFontSize + 8, 18); // time + status icon row
  const lineHeight = Math.max(config.nameFontSize * 1.4, 16); // line height for text
  const verticalGap = 2; // small gap between elements

  let totalHeight = basePadding * 2; // top and bottom padding
  totalHeight += headerHeight; // time and status icon row
  totalHeight += verticalGap;

  // Add avatar space if shown (avatar height or name line height, whichever is larger)
  if (showAvatar) {
    const avatarHeight = config.avatarSize;
    const nameLineHeight = lineHeight;
    totalHeight += Math.max(avatarHeight, nameLineHeight);
  } else {
    // Just the name line
    totalHeight += lineHeight;
  }

  // Add type line if shown
  if (showType) {
    totalHeight += verticalGap;
    totalHeight += Math.max(config.typeFontSize * 1.3, 14);
  }

  // Add some bottom padding for visual comfort
  totalHeight += 4;

  // Apply height scale multiplier if provided (0-10 scale)
  if (heightScale !== undefined) {
    const scaleMultiplier = 0.5 + (heightScale / 10) * 1.5; // 0.5x to 2.0x
    totalHeight = Math.round(totalHeight * scaleMultiplier);
  }

  return Math.max(totalHeight, 32); // Minimum 32px height
}

/**
 * Calculate the slot height based on card configuration
 * The grid slot height should accommodate the tallest card
 *
 * @param cardSize - The selected card size configuration
 * @param heightScale - Optional height scale multiplier (0-10) for additional adjustment
 * @returns Slot height in pixels
 */
export function calculateSlotHeightFromCardSize(
  cardSize: CardSize,
  heightScale?: number
): number {
  // Direct slot height calculation: 30px to 120px based on heightScale (0-10)
  const MIN_SLOT_HEIGHT = 30;
  const MAX_SLOT_HEIGHT = 120;

  const scale = heightScale ?? 3;
  return Math.round(MIN_SLOT_HEIGHT + (scale / 10) * (MAX_SLOT_HEIGHT - MIN_SLOT_HEIGHT));
}

/**
 * Calculate appointment card height for positioning
 * This is used by CalendarDayView, CalendarWeekView, and VirtualWeekGrid
 * to position cards absolutely within time slots
 *
 * @param cardSize - The selected card size configuration
 * @param duration - Appointment duration in minutes
 * @param heightScale - Optional height scale multiplier (0-10) for additional adjustment
 * @returns Height in pixels
 */
export function calculateAppointmentCardHeight(
  cardSize: CardSize,
  duration: number,
  heightScale?: number
): number {
  const config = CARD_SIZE_CONFIGS[cardSize];
  const isTiny = duration < 30;

  // For cards spanning multiple slots, we need to multiply by slot count
  // But the base height should still be content-based
  const slotHeight = calculateSlotHeightFromCardSize(cardSize, heightScale);
  const slotCount = Math.max(1, Math.ceil(duration / 30));

  // Use content height for single slot or tiny cards
  // For multi-slot, use slot height * slot count
  if (slotCount === 1 || isTiny) {
    return calculateContentBasedCardHeight(
      cardSize,
      config.showAvatar,
      config.showType,
      isTiny,
      heightScale
    );
  }

  return slotHeight * slotCount;
}
