/**
 * AccessibilitySection — Seção de acessibilidade extraída de ScheduleVisualTab
 *
 * Controles de alto contraste, movimento reduzido e tamanho de texto.
 * Usa useAccessibilitySettings internamente.
 */

import { cn } from "@/lib/utils";
import {
  Accessibility,
  EyeOff,
  Zap,
  RotateCcw,
} from "lucide-react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const FONT_SIZES = [
  { value: "small" as const, label: "Pequeno", display: "Aa", size: "text-xs" },
  { value: "medium" as const, label: "Normal", display: "Aa", size: "text-sm" },
  { value: "large" as const, label: "Grande", display: "Aa", size: "text-lg" },
];

export function AccessibilitySection() {
  const {
    highContrast,
    reducedMotion,
    fontSize,
    setHighContrast,
    setReducedMotion,
    setFontSize,
    reset,
  } = useAccessibilitySettings();

  return (
    <SettingsSectionCard
      icon={<Accessibility className="h-4 w-4" />}
      iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
      title="Acessibilidade"
      description="Contraste, animações e tamanho do texto"
    >
      <div className="space-y-2">
        <div
          className={cn(
            "flex items-center justify-between gap-4 p-4 rounded-xl border transition-all",
            "bg-muted/20 hover:bg-muted/30 border-border/40 hover:border-border/60",
            highContrast &&
              "bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border-fuchsia-200/60 dark:border-fuchsia-800/40",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                highContrast
                  ? "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <EyeOff className="h-4 w-4" />
            </div>
            <div>
              <Label
                htmlFor="high-contrast"
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  highContrast && "text-fuchsia-800 dark:text-fuchsia-300",
                )}
              >
                Alto Contraste
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aumenta o contraste das cores na interface da agenda
              </p>
            </div>
          </div>
          <Switch
            id="high-contrast"
            checked={highContrast}
            onCheckedChange={setHighContrast}
            className="shrink-0"
          />
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-4 p-4 rounded-xl border transition-all",
            "bg-muted/20 hover:bg-muted/30 border-border/40 hover:border-border/60",
            reducedMotion &&
              "bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border-fuchsia-200/60 dark:border-fuchsia-800/40",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                reducedMotion
                  ? "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <Label
                htmlFor="reduced-motion"
                className={cn(
                  "text-sm font-medium cursor-pointer",
                  reducedMotion && "text-fuchsia-800 dark:text-fuchsia-300",
                )}
              >
                Movimento Reduzido
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Minimiza animações e transições de elementos
              </p>
            </div>
          </div>
          <Switch
            id="reduced-motion"
            checked={reducedMotion}
            onCheckedChange={setReducedMotion}
            className="shrink-0"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <Label className="text-sm font-medium mb-3 block">Tamanho do Texto</Label>
        <div className="grid grid-cols-3 gap-3">
          {FONT_SIZES.map(({ value, label, display, size }) => {
            const isActive = fontSize === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFontSize(value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150",
                  "hover:shadow-sm hover:-translate-y-0.5",
                  isActive
                    ? "border-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/40 dark:border-fuchsia-600"
                    : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "font-bold transition-all",
                    size,
                    isActive ? "text-fuchsia-700 dark:text-fuchsia-300" : "text-foreground",
                  )}
                >
                  {display}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="rounded-xl gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar padrão
        </Button>
      </div>
    </SettingsSectionCard>
  );
}
