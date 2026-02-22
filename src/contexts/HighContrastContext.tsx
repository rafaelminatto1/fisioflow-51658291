/**
 * HighContrastContext - Context for high contrast mode toggle
 *
 * Features:
 * - Toggle high contrast mode
 * - Increased font size options (100%, 125%, 150%)
 * - Remove background gradients in high contrast mode
 * - Increased border thickness
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type FontSize = '100%' | '125%' | '150%';

interface HighContrastContextValue {
  highContrast: boolean;
  fontSize: FontSize;
  toggleHighContrast: () => void;
  setFontSize: (size: FontSize) => void;
  toggleFontSize: () => void;
}

interface HighContrastProviderProps {
  children: React.ReactNode;
  defaultHighContrast?: boolean;
  defaultFontSize?: FontSize;
}

const HighContrastContext = createContext<HighContrastContextValue | undefined>(undefined);

const FONT_SIZES: FontSize[] = ['100%', '125%', '150%'];

// Save preference to localStorage
const HIGH_CONTRAST_KEY = 'fisioflow-high-contrast';
const FONT_SIZE_KEY = 'fisioflow-font-size';

const getInitialHighContrast = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
  } catch {
    return false;
  }
};

const getInitialFontSize = (): FontSize => {
  if (typeof window === 'undefined') return '100%';
  try {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved && FONT_SIZES.includes(saved as FontSize)) {
      return saved as FontSize;
    }
    return '100%';
  } catch {
    return '100%';
  }
};

export const HighContrastProvider: React.FC<HighContrastProviderProps> = ({
  children,
  defaultHighContrast = false,
  defaultFontSize = '100%',
}) => {
  const [highContrast, setHighContrastState] = useState(defaultHighContrast);
  const [fontSize, setFontSizeState] = useState(defaultFontSize);

  // Save preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HIGH_CONTRAST_KEY, highContrast.toString());
    } catch (error) {
      console.error('Failed to save high contrast preference:', error);
    }
  }, [highContrast]);

  useEffect(() => {
    try {
      localStorage.setItem(FONT_SIZE_KEY, fontSize);
    } catch (error) {
      console.error('Failed to save font size preference:', error);
    }
  }, [fontSize]);

  // Apply high contrast class to body
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Apply font size to body
  useEffect(() => {
    document.body.style.fontSize = fontSize;
  }, [fontSize]);

  const toggleHighContrast = useCallback(() => {
    setHighContrastState((prev) => !prev);
  }, []);

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
  }, []);

  const toggleFontSize = useCallback(() => {
    const currentIndex = FONT_SIZES.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % FONT_SIZES.length;
    setFontSizeState(FONT_SIZES[nextIndex]);
  }, [fontSize]);

  const value = {
    highContrast,
    fontSize,
    toggleHighContrast,
    setFontSize,
    toggleFontSize,
  };

  return (
    <HighContrastContext.Provider value={value}>
      {children}
    </HighContrastContext.Provider>
  );
};

export const useHighContrast = (): HighContrastContextValue => {
  const context = useContext(HighContrastContext);
  if (context === undefined) {
    throw new Error('useHighContrast must be used within HighContrastProvider');
  }
  return context;
};

// Helper component for high contrast toggle button
export const HighContrastToggle: React.FC = () => {
  const { highContrast, toggleHighContrast, fontSize, toggleFontSize } = useHighContrast();

  return (
    <div className="flex items-center gap-2">
      {/* High contrast toggle */}
      <button
        onClick={toggleHighContrast}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
        aria-label={highContrast ? 'Desativar alto contraste' : 'Ativar alto contraste'}
        title={highContrast ? 'Desativar alto contraste' : 'Ativar alto contraste'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={cn(
            'transition-colors',
            highContrast ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.2" />
          <circle cx="8" cy="8" r="3" fill="currentColor" />
        </svg>
        <span className="text-sm font-medium">
          {highContrast ? 'Alto Contraste' : 'Normal'}
        </span>
      </button>

      {/* Font size toggle */}
      <button
        onClick={toggleFontSize}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
        aria-label={`Tamanho da fonte: ${fontSize}`}
        title={`Tamanho da fonte: ${fontSize}`}
      >
        <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">
          A{fontSize.replace('%', '')}
        </span>
      </button>
    </div>
  );
};
