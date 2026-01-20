import { useState, useEffect } from 'react';
import type { CardSize } from '@/types/agenda';
import { DEFAULT_CARD_SIZE } from '@/lib/config/agenda';
import { toast } from '@/hooks/use-toast';

const CARD_SIZE_STORAGE_KEY = 'agenda_card_size';
const CARD_HEIGHT_KEY = 'agenda_card_height_multiplier';

const DEFAULT_HEIGHT_MULTIPLIER = 5; // 0-10 scale, 5 is default (1.0x)

/**
 * Convert 0-10 scale to height multiplier (0.5 to 2.0)
 */
export function scaleToMultiplier(scale: number): number {
  return 0.5 + (scale / 10) * 1.5; // 0 -> 0.5, 5 -> 1.0, 10 -> 2.0
}

/**
 * Convert height multiplier to 0-10 scale
 */
export function multiplierToScale(multiplier: number): number {
  return Math.round(((multiplier - 0.5) / 1.5) * 10);
}

/**
 * Hook for managing agenda card size preferences
 * Persists to localStorage
 */
export function useCardSize() {
  const [cardSize, setCardSizeState] = useState<CardSize>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CARD_SIZE_STORAGE_KEY);
      if (saved && (saved === 'extra_small' || saved === 'small' || saved === 'medium' || saved === 'large')) {
        return saved as CardSize;
      }
    }
    return DEFAULT_CARD_SIZE;
  });

  const [heightScale, setHeightScaleState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CARD_HEIGHT_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
          return parsed;
        }
      }
    }
    return DEFAULT_HEIGHT_MULTIPLIER;
  });

  const setCardSize = (size: CardSize) => {
    setCardSizeState(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CARD_SIZE_STORAGE_KEY, size);
    }
  };

  const setHeightScale = (scale: number) => {
    if (scale < 0 || scale > 10) {
      toast({
        title: 'Valor inválido',
        description: 'A altura deve estar entre 0 e 10',
        variant: 'destructive',
      });
      return;
    }
    setHeightScaleState(scale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CARD_HEIGHT_KEY, scale.toString());
    }
  };

  const resetToDefault = () => {
    setCardSize(DEFAULT_CARD_SIZE);
    setHeightScale(DEFAULT_HEIGHT_MULTIPLIER);
  };

  return {
    cardSize,
    setCardSize,
    heightScale,
    setHeightScale,
    heightMultiplier: scaleToMultiplier(heightScale),
    resetToDefault,
  };
}
