import { AgendaVisualConfiguration } from "@/components/schedule/settings/AgendaVisualConfiguration";
import { StatusColorManager } from "@/components/schedule/settings/StatusColorManager";
import { useCardSize } from "@/hooks/useCardSize";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Zap,
  Monitor,
  SunMedium,
  Layers,
  Palette,
  Sliders,
  EyeOff,
  Accessibility,
  RotateCcw,
  Layout,
  MousePointer2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { CardSize } from "@/types/agenda";
import { SettingsSectionCard } from "@/components/schedule/settings/shared/SettingsSectionCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ViewPreset {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  color: string;
  iconBg: string;
  activeBg: string;
  config: { cardSize: CardSize; heightScale: number; opacity: number };
}

const PRESETS: ViewPreset[] = [
  {
    id: "productive",
    name: "Ultra-Fino",
    description: "Máximo slots",
    icon: Zap,
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    activeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-400",
    config: { cardSize: "extra_small", heightScale: 0, opacity: 100 },
  },
  {
    id: "balanced",
    name: "Sem Scroll",
    description: "07h às 21h",
    icon: Monitor,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    activeBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-400",
    config: { cardSize: "medium", heightScale: 2, opacity: 100 },
  },
  {
    id: "comfortable",
    name: "Conforto",
    description: "Leitura fácil",
    icon: SunMedium,
    color: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
    activeBg: "bg-teal-50 dark:bg-teal-950/40 border-teal-400",
    config: { cardSize: "large", heightScale: 5, opacity: 100 },
  },
  {
    id: "layered",
    name: "Glass",
    description: "Estilo vítreo",
    icon: Layers,
    color: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    activeBg: "bg-sky-50 dark:bg-sky-950/40 border-sky-400",
    config: { cardSize: "medium", heightScale: 3, opacity: 60 },
  },
];

const FONT_SIZES = [
  { value: "small" as const, label: "Pequeno", display: "Aa", size: "text-xs" },
  { value: "medium" as const, label: "Normal", display: "Aa", size: "text-sm" },
  { value: "large" as const, label: "Grande", display: "Aa", size: "text-lg" },
];

function PresetsGrid() {
  const { cardSize, setCardSize, heightScale, setHeightScale, setOpacity } = useCardSize();
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  const applyPreset = (preset: ViewPreset) => {
    setCardSize(preset.config.cardSize);
    setHeightScale(preset.config.heightScale);
    setOpacity(preset.config.opacity);
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 2000);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-1">
      {PRESETS.map((preset) => {
        const Icon = preset.icon;
        const isActive =
          cardSize === preset.config.cardSize && heightScale === preset.config.heightScale;
        const wasApplied = appliedPreset === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset)}
            className={cn(
              "relative flex flex-col items-center gap-3 p-5 rounded-[1.5rem] border-2 text-center transition-all duration-300",
              "hover:shadow-xl hover:-translate-y-1 group",
              isActive
                ? preset.activeBg + " shadow-md"
                : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 shadow-sm group-hover:scale-110",
                isActive
                  ? `${preset.iconBg} ${preset.color}`
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600",
              )}
            >
              {wasApplied ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <p className={cn("text-xs font-black tracking-tight", isActive ? preset.color : "text-slate-700 dark:text-slate-300")}>
                {preset.name}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{preset.description}</p>
            </div>

            {isActive && (
              <motion.div 
                layoutId="active-glow"
                className="absolute inset-0 rounded-[1.5rem] bg-current opacity-[0.03] pointer-events-none"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function AccessibilitySection() {
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
      description="Contraste e legibilidade universal"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={cn(
            "flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300",
            "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800",
            highContrast &&
              "bg-fuchsia-50 dark:bg-fuchsia-950/20 border-fuchsia-200 dark:border-fuchsia-900/50",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                highContrast
                  ? "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
                  : "bg-white dark:bg-slate-800 text-slate-400",
              )}
            >
              <EyeOff className="h-4 w-4" />
            </div>
            <div>
              <Label
                htmlFor="high-contrast"
                className={cn(
                  "text-xs font-black uppercase tracking-tight cursor-pointer",
                  highContrast ? "text-fuchsia-800 dark:text-fuchsia-300" : "text-slate-600 dark:text-slate-400",
                )}
              >
                Alto Contraste
              </Label>
              <p className="text-[10px] font-bold text-slate-400 leading-none mt-1">
                Cores vibrantes
              </p>
            </div>
          </div>
          <Switch
            id="high-contrast"
            checked={highContrast}
            onCheckedChange={setHighContrast}
          />
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300",
            "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800",
            reducedMotion &&
              "bg-fuchsia-50 dark:bg-fuchsia-950/20 border-fuchsia-200 dark:border-fuchsia-900/50",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                reducedMotion
                  ? "bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-400"
                  : "bg-white dark:bg-slate-800 text-slate-400",
              )}
            >
              <Zap className="h-4 w-4 shrink-0" />
            </div>
            <div>
              <Label
                htmlFor="reduced-motion"
                className={cn(
                  "text-xs font-black uppercase tracking-tight cursor-pointer",
                  reducedMotion ? "text-fuchsia-800 dark:text-fuchsia-300" : "text-slate-600 dark:text-slate-400",
                )}
              >
                Reduzir Movimento
              </Label>
              <p className="text-[10px] font-bold text-slate-400 leading-none mt-1">
                Animações suaves
              </p>
            </div>
          </div>
          <Switch
            id="reduced-motion"
            checked={reducedMotion}
            onCheckedChange={setReducedMotion}
          />
        </div>
      </div>

      <div className="mt-6 p-4 rounded-3xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4 px-1">
          <MousePointer2 className="w-3.5 h-3.5 text-slate-400" />
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tamanho do Texto Global</Label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {FONT_SIZES.map(({ value, label, display, size }) => {
            const isActive = fontSize === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFontSize(value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                  isActive
                    ? "border-fuchsia-400 bg-white dark:bg-slate-800 shadow-sm"
                    : "border-transparent bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700",
                )}
              >
                <span
                  className={cn(
                    "font-black transition-all",
                    size,
                    isActive ? "text-fuchsia-700 dark:text-fuchsia-300" : "text-slate-300 dark:text-slate-700",
                  )}
                >
                  {display}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-tight",
                    isActive ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-slate-400",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })} 
        </div>
      </div>

      <div className="mt-4 flex justify-end px-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="rounded-xl gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-fuchsia-600 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar Padrão
        </Button>
      </div>
    </SettingsSectionCard>
  );
}

export function ScheduleVisualTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 flex flex-col gap-6">
        <SettingsSectionCard
          icon={<Layout className="h-4 w-4" />}
          iconBg="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          title="Layouts Rápidos"
          description="Configurações pré-definidas para cada perfil"
        >
          <PresetsGrid />
        </SettingsSectionCard>

        <SettingsSectionCard
          icon={<Sliders className="h-4 w-4" />}
          iconBg="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
          title="Personalização Fina"
          description="Ajustes milimétricos da sua agenda"
          variant="highlight"
        >
          <AgendaVisualConfiguration />
        </SettingsSectionCard>

        <AccessibilitySection />
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="lg:sticky lg:top-24 space-y-6">
          <SettingsSectionCard
            icon={<Palette className="h-4 w-4" />}
            iconBg="bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400"
            title="Cores de Status"
            description="Sinalização visual de atendimentos"
          >
            <StatusColorManager />
          </SettingsSectionCard>
          
          <div className="p-6 rounded-[2rem] bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-xl shadow-teal-500/10 overflow-hidden relative">
            <div className="relative z-10 space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest">Dica Pro</h4>
              <p className="text-xs font-medium leading-relaxed opacity-90">
                Ajuste a <b>densidade</b> para ver mais pacientes na mesma tela ou aumente a <b>legibilidade</b> para telas menores.
              </p>
            </div>
            <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 rotate-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
