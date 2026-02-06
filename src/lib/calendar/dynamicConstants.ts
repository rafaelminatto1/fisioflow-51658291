
/**
 * Base slot height in pixels (at scale 5 / multiplier 1.0)
 */

import { useMemo } from 'react';
import { useCardSize } from '@/hooks/useCardSize';

const BASE_SLOT_HEIGHT = 80;

/**
 * Hook that provides dynamic calendar slot height based on user preference
 * Returns the slot height in pixels for grid calculations
 */
export function useDynamicSlotHeight() {
  const { heightMultiplier } = useCardSize();

  const slotHeight = useMemo(() => {
    return Math.round(BASE_SLOT_HEIGHT * heightMultiplier);
  }, [heightMultiplier]);

  return slotHeight;
}

/**
 * Get slot height dynamically (for non-react contexts)
 * @param heightMultiplier - The height multiplier (0.5 to 2.0)
 * @returns Slot height in pixels
 */
export function getSlotHeight(heightMultiplier: number): number {
  return Math.round(BASE_SLOT_HEIGHT * heightMultiplier);
}

export { BASE_SLOT_HEIGHT };
