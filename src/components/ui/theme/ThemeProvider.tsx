/**
 * ThemeProvider - Sistema de temas completo
 *
 * Features:
 * - Light/Dark mode toggle
 * - High contrast mode
 * - Custom color schemes
 * - Animation preferences
 * - Font size controls
 * - System preference detection
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

// ============================================================================
// DEFINIÇÃO DE TIPOS
// ============================================================================

export type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'rose';

export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

export type AnimationSpeed = 'off' | 'reduced' | 'normal' | 'fast';

export interface ThemePreferences {
  mode: 'light' | 'dark' | 'system';
  colorScheme: ColorScheme;
  fontSize: FontSize;
  animationSpeed: AnimationSpeed;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface ThemeContextValue {
  theme: ThemePreferences;
  setTheme: (updates: Partial<ThemePreferences>) => void;
  toggleMode: () => void;
  setFontSize: (size: FontSize) => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  toggleHighContrast: () => void;
  resetTheme: () => void;
}

// ============================================================================
// CONFIGURAÇÕES DE COR POR SCHEME
// ============================================================================

const COLOR_SCHEMES: Record<ColorScheme, { primary: string; secondary: string }> = {
  default: {
    primary: '#6366f1',
    secondary: '#64748b',
  },
  blue: {
    primary: '#2563eb',
    secondary: '#3b82f6',
  },
  green: {
    primary: '#059669',
    secondary: '#10b981',
  },
  purple: {
    primary: '#7c3aed',
    secondary: '#8b5cf6',
  },
  orange: {
    primary: '#ea580c',
    secondary: '#f97316',
  },
  rose: {
    primary: '#e11d48',
    secondary: '#f43f5e',
  },
};

// ============================================================================
// TAMANHOS DE FONTE
// ============================================================================

const FONT_SIZES: Record<FontSize, { root: string; heading: string; body: string }> = {
  sm: { root: '14px', heading: '18px', body: '14px' },
  md: { root: '16px', heading: '20px', body: '16px' },
  lg: { root: '18px', heading: '22px', body: '18px' },
  xl: { root: '20px', heading: '24px', body: '20px' },
};

// ============================================================================
// DURAÇÃO DE ANIMAÇÃO
// ============================================================================

const ANIMATION_DURATIONS: Record<AnimationSpeed, { fast: string; normal: string; slow: string }> = {
  off: { fast: '0ms', normal: '0ms', slow: '0ms' },
  reduced: { fast: '150ms', normal: '200ms', slow: '300ms' },
  normal: { fast: '100ms', normal: '200ms', slow: '400ms' },
  fast: { fast: '50ms', normal: '100ms', slow: '200ms' },
};

// ============================================================================
// PREFERÊNCIAS PADRÃO
// ============================================================================

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'system',
  colorScheme: 'default',
  fontSize: 'md',
  animationSpeed: 'normal',
  highContrast: false,
  reduceMotion: false,
};

// ============================================================================
// STORAGE KEY
// ============================================================================

const THEME_STORAGE_KEY = 'fisioflow_theme_preferences';

// ============================================================================
// THEME CONTEXT
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================================================
// THEME PROVIDER COMPONENT
// ============================================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultPreferences?: Partial<ThemePreferences>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultPreferences,
}) => {
  // Carregar preferências salvas
  const loadPreferences = useCallback((): ThemePreferences => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored), ...defaultPreferences };
      }
    } catch (error) {
      console.error('Failed to load theme preferences:', error);
    }
    return { ...DEFAULT_PREFERENCES, ...defaultPreferences };
  }, [defaultPreferences]);

  const [preferences, setPreferences] = useState<ThemePreferences>(loadPreferences);

  // Determinar modo atual (light/dark)
  const resolvedMode = useMemo(() => {
    if (preferences.mode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return preferences.mode;
  }, [preferences.mode]);

  // Salvar preferências quando mudam
  const savePreferences = useCallback((newPreferences: ThemePreferences) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save theme preferences:', error);
    }
  }, []);

  // Atualizar tema
  const setTheme = useCallback((updates: Partial<ThemePreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Toggle light/dark mode
  const toggleMode = useCallback(() => {
    setTheme({
      mode: resolvedMode === 'light' ? 'dark' : 'light',
    });
  }, [resolvedMode, setTheme]);

  // Set font size
  const setFontSize = useCallback((size: FontSize) => {
    setTheme({ fontSize: size });
  }, [setTheme]);

  // Set animation speed
  const setAnimationSpeed = useCallback((speed: AnimationSpeed) => {
    setTheme({ animationSpeed: speed });
  }, [setTheme]);

  // Toggle high contrast
  const toggleHighContrast = useCallback(() => {
    setTheme({ highContrast: !preferences.highContrast });
  }, [preferences.highContrast, setTheme]);

  // Reset to defaults
  const resetTheme = useCallback(() => {
    const defaults = { ...DEFAULT_PREFERENCES, ...defaultPreferences };
    setPreferences(defaults);
    savePreferences(defaults);
  }, [defaultPreferences, savePreferences]);

  // Aplicar classes ao document
  useEffect(() => {
    const root = document.documentElement;

    // Remove todas as classes de tema
    root.classList.remove('light', 'dark', 'high-contrast', 'reduce-motion');
    root.classList.remove('font-sm', 'font-md', 'font-lg', 'font-xl');
    root.classList.remove('anim-off', 'anim-reduced', 'anim-normal', 'anim-fast');
    root.classList.remove('scheme-default', 'scheme-blue', 'scheme-green', 'scheme-purple', 'scheme-orange', 'scheme-rose');

    // Aplicar modo
    root.classList.add(resolvedMode);

    // Aplicar alto contraste
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    }

    // Aplicar redução de movimento
    if (preferences.reduceMotion || preferences.animationSpeed === 'off') {
      root.classList.add('reduce-motion');
    }

    // Aplicar tamanho de fonte
    root.classList.add(`font-${preferences.fontSize}`);

    // Aplicar velocidade de animação
    root.classList.add(`anim-${preferences.animationSpeed}`);

    // Aplicar esquema de cor
    root.classList.add(`scheme-${preferences.colorScheme}`);

    // Aplicar variáveis CSS
    const colors = COLOR_SCHEMES[preferences.colorScheme];
    const fonts = FONT_SIZES[preferences.fontSize];
    const animations = ANIMATION_DURATIONS[preferences.animationSpeed];

    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--font-root', fonts.root);
    root.style.setProperty('--font-heading', fonts.heading);
    root.style.setProperty('--font-body', fonts.body);
    root.style.setProperty('--anim-fast', animations.fast);
    root.style.setProperty('--anim-normal', animations.normal);
    root.style.setProperty('--anim-slow', animations.slow);

  }, [preferences, resolvedMode]);

  // Ouvir mudanças de preferência do sistema
  useEffect(() => {
    if (preferences.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force re-render
      setTheme({});
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.mode, setTheme]);

  const value: ThemeContextValue = {
    theme: preferences,
    setTheme,
    toggleMode,
    setFontSize,
    setAnimationSpeed,
    toggleHighContrast,
    resetTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <style suppressHydrationWarning>{`
        body {
          transition: ${preferences.animationSpeed === 'off' ? 'none' : 'background-color 0.2s, color 0.2s'};
        }
      `}</style>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================================
// COMPONENTE DE CONTROLE DE TEMA
// ============================================================================

import { Settings, Sun, Moon, Contrast, Type, Zap } from 'lucide-react';

export const ThemeControls: React.FC = () => {
  const { theme, toggleMode, setFontSize, setAnimationSpeed, toggleHighContrast } = useTheme();

  const resolvedMode = theme.mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme.mode;

  return (
    <div className="flex items-center gap-2">
      {/* Toggle Dark/Light */}
      <button
        onClick={toggleMode}
        className="p-2 rounded-lg hover:bg-muted transition-colors"
        title={resolvedMode === 'light' ? 'Modo escuro' : 'Modo claro'}
      >
        {resolvedMode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Toggle High Contrast */}
      <button
        onClick={toggleHighContrast}
        className={`p-2 rounded-lg hover:bg-muted transition-colors ${theme.highContrast ? 'bg-primary text-primary-foreground' : ''
          }`}
        title="Alto contraste"
      >
        <Contrast className="w-5 h-5" />
      </button>

      {/* Font Size Selector */}
      <select
        value={theme.fontSize}
        onChange={(e) => setFontSize(e.target.value as FontSize)}
        className="px-3 py-2 rounded-lg border bg-background text-sm"
        title="Tamanho da fonte"
      >
        <option value="sm">Pequeno</option>
        <option value="md">Médio</option>
        <option value="lg">Grande</option>
        <option value="xl">Extra grande</option>
      </select>

      {/* Animation Speed Selector */}
      <select
        value={theme.animationSpeed}
        onChange={(e) => setAnimationSpeed(e.target.value as AnimationSpeed)}
        className="px-3 py-2 rounded-lg border bg-background text-sm"
        title="Velocidade das animações"
      >
        <option value="off">Sem animações</option>
        <option value="reduced">Reduzida</option>
        <option value="normal">Normal</option>
        <option value="fast">Rápida</option>
      </select>
    </div>
  );
};

// ============================================================================
// COMPONENTE DE CONFIGURAÇÃO DE TEMA (FULL)
// ============================================================================

import { Label } from '../label';
import { Switch } from '../switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

export const ThemeSettings: React.FC = () => {
  const { theme, setTheme, resetTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Configurações de Aparência
      </h3>

      {/* Mode Selection */}
      <div className="space-y-2">
        <Label>Modo de cores</Label>
        <Select
          value={theme.mode}
          onValueChange={(value) => setTheme({ mode: value as 'light' | 'dark' | 'system' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="dark">Escuro</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color Scheme */}
      <div className="space-y-2">
        <Label>Esquema de cores</Label>
        <div className="grid grid-cols-6 gap-2">
          {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              onClick={() => setTheme({ colorScheme: scheme })}
              className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${theme.colorScheme === scheme ? 'border-primary ring-2 ring-primary' : 'border-border'
                }`}
              style={{ backgroundColor: COLOR_SCHEMES[scheme].primary }}
              title={scheme}
            />
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Type className="w-4 h-4" />
          Tamanho da fonte
        </Label>
        <Select
          value={theme.fontSize}
          onValueChange={(value) => setTheme({ fontSize: value as FontSize })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Pequeno (14px)</SelectItem>
            <SelectItem value="md">Médio (16px)</SelectItem>
            <SelectItem value="lg">Grande (18px)</SelectItem>
            <SelectItem value="xl">Extra grande (20px)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Animation Speed */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Velocidade das animações
        </Label>
        <Select
          value={theme.animationSpeed}
          onValueChange={(value) => setTheme({ animationSpeed: value as AnimationSpeed })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Sem animações</SelectItem>
            <SelectItem value="reduced">Reduzida</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="fast">Rápida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* High Contrast */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 cursor-pointer" onClick={() => setTheme({ highContrast: !theme.highContrast })}>
          <Contrast className="w-4 h-4" />
          Alto contraste
        </Label>
        <Switch
          checked={theme.highContrast}
          onCheckedChange={(checked) => setTheme({ highContrast: checked })}
        />
      </div>

      {/* Reduce Motion */}
      <div className="flex items-center justify-between">
        <Label>Reduzir movimento</Label>
        <Switch
          checked={theme.reduceMotion}
          onCheckedChange={(checked) => setTheme({ reduceMotion: checked })}
        />
      </div>

      {/* Reset Button */}
      <button
        onClick={resetTheme}
        className="w-full px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
      >
        Restaurar padrões
      </button>
    </div>
  );
};
