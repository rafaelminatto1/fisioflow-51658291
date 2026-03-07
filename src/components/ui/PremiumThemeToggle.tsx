import React from 'react';
import { useTheme } from './theme/ThemeProvider';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PremiumThemeToggle: React.FC = () => {
  const { theme, toggleMode } = useTheme();
  
  const resolvedMode = theme.mode === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme.mode;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        id="premium-theme-toggle"
        onClick={toggleMode}
        className={cn(
          "relative group flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500",
          "glass-card hover:scale-110 active:scale-95",
          "before:absolute before:inset-0 before:rounded-2xl before:transition-opacity before:duration-500",
          resolvedMode === 'dark' 
            ? "before:bg-[radial-gradient(circle_at_center,rgba(19,236,200,0.15),transparent_70%)] before:opacity-100 shadow-[var(--glow-teal)]" 
            : "before:opacity-0 shadow-xl"
        )}
        title={resolvedMode === 'light' ? 'Ativar Modo Premium' : 'Ativar Modo Light'}
      >
        {/* Glow Effect Layer */}
        <div className={cn(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-accent/20",
          resolvedMode === 'dark' && "bg-[#13ecc8]/20"
        )} />

        <div className="relative flex items-center justify-center w-full h-full">
          {resolvedMode === 'light' ? (
            <Sun className="w-6 h-6 text-orange-500 transition-all duration-500 group-hover:rotate-45" />
          ) : (
            <div className="relative text-[#13ecc8]">
              <Moon className="w-6 h-6 transition-all duration-500 group-hover:-rotate-12" />
              <Sparkles className="absolute -top-2 -right-2 w-3 h-3 animate-pulse" />
            </div>
          )}
        </div>

        {/* Tooltip / Label on hover */}
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none backdrop-blur-md border border-white/10 uppercase tracking-widest font-bold">
          {resolvedMode === 'light' ? 'Switch to Dark' : 'Switch to Light'}
        </div>
      </button>
    </div>
  );
};
