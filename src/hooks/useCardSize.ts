import { useState, useEffect } from 'react';
import type { CardSize } from '@/types/agenda';
import { DEFAULT_CARD_SIZE, CARD_SIZE_CONFIGS } from '@/lib/config/agenda';
import { toast } from '@/hooks/use-toast';

const CARD_SIZE_STORAGE_KEY = 'agenda_card_size';
const CARD_HEIGHT_KEY = 'agenda_card_height_multiplier';
const FONT_SIZES_KEY = 'agenda_custom_font_sizes';

const DEFAULT_HEIGHT_MULTIPLIER = 5; // 0-10 scale, 5 is default (1.0x)

// Default font sizes based on medium card size
const DEFAULT_FONT_SIZES = {
  timeFontSize: 10,
  nameFontSize: 11,
  typeFontSize: 9,
};

export interface CustomFontSizes {
  timeFontSize: number;
  nameFontSize: number;
  typeFontSize: number;
}

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

  const [customFontSizes, setCustomFontSizesState] = useState<CustomFontSizes>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(FONT_SIZES_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return {
              timeFontSize: parsed.timeFontSize ?? DEFAULT_FONT_SIZES.timeFontSize,
              nameFontSize: parsed.nameFontSize ?? DEFAULT_FONT_SIZES.nameFontSize,
              typeFontSize: parsed.typeFontSize ?? DEFAULT_FONT_SIZES.typeFontSize,
            };
          }
        } catch {
          return DEFAULT_FONT_SIZES;
        }
      }
    }
    return DEFAULT_FONT_SIZES;
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

  const setCustomFontSizes = (fontSizes: CustomFontSizes) => {
    setCustomFontSizesState(fontSizes);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FONT_SIZES_KEY, JSON.stringify(fontSizes));
    }
  };

  const resetToDefault = () => {
    setCardSize(DEFAULT_CARD_SIZE);
    setHeightScale(DEFAULT_HEIGHT_MULTIPLIER);
    setCustomFontSizes(DEFAULT_FONT_SIZES);
  };

  // Get effective font sizes - use custom sizes if set, otherwise use preset sizes
  const getEffectiveFontSizes = (): CustomFontSizes => {
    // Always use custom font sizes since they are user-configurable
    // The UI allows users to customize font sizes independently of card size presets
    return customFontSizes;
  };

  return {
    cardSize,
    setCardSize,
    heightScale,
    setHeightScale,
    heightMultiplier: scaleToMultiplier(heightScale),
    customFontSizes,
    setCustomFontSizes,
    getEffectiveFontSizes,
    resetToDefault,
  };
}
