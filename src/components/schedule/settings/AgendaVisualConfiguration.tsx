import React, { memo } from "react";
import { useCardSize } from "@/hooks/useCardSize";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Type, Layers, RotateCcw, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * AgendaVisualConfiguration - Pro Max Component
 * Provides a high-end interface for controlling schedule appearance with glassmorphism preview.
 */
export function AgendaVisualConfiguration() {
  const {
    heightScale,
    setHeightScale,
    fontScale,
    setFontScale,
    opacity,
    setOpacity,
    resetToDefault,
    fontPercentage,
    heightMultiplier,
  } = useCardSize();

  const hasChanges = heightScale !== 1 || fontScale !== 5 || opacity !== 100;

  return (
    <div className="space-y-10 py-2">
      {/* Control Section Header */}
      <div className="flex items-center justify-between bg-teal-50/50 dark:bg-teal-900/10 p-4 rounded-2xl border border-teal-100/50 dark:border-teal-900/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              Aparência Sob Medida
            </h3>
            <p className="text-[11px] text-slate-500 font-medium italic">
              Refine a densidade e o conforto visual da sua clínica
            </p>
          </div>
        </div>
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                className="h-9 text-[11px] font-bold border-teal-200 text-teal-600 hover:bg-teal-50 hover:text-teal-700 dark:border-teal-900 dark:text-teal-400 gap-2 rounded-xl shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Ajustes
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Configuration Controls */}
      <div className="grid gap-8 px-1 sm:grid-cols-1 md:grid-cols-3">
        <ControlSection
          label="Densidade"
          subLabel="Altura dos horários"
          icon={<Clock className="w-4 h-4" />}
          value={heightScale}
          max={10}
          onChange={(val) => setHeightScale(val[0])}
          renderValue={`${Math.round(24 * (0.16 + (heightScale / 10) * 2.34))}px`}
          accent="teal"
        />

        <ControlSection
          label="Legibilidade"
          subLabel="Tamanho dos textos"
          icon={<Type className="w-4 h-4" />}
          value={fontScale}
          max={10}
          onChange={(val) => setFontScale(val[0])}
          renderValue={`${Math.round(fontPercentage)}%`}
          accent="indigo"
        />

        <ControlSection
          label="Opacidade"
          subLabel="Nível de transparência"
          icon={<Layers className="w-4 h-4" />}
          value={opacity}
          max={100}
          step={5}
          onChange={(val) => setOpacity(val[0])}
          renderValue={`${opacity}%`}
          accent="sky"
        />
      </div>

      {/* Live Preview Display Card */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Simulador de Agenda em Tempo Real
          </Label>
        </div>

        <div
          className="relative rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-950 p-8 overflow-hidden min-h-[220px] flex flex-col justify-center shadow-2xl transition-all duration-500"
        >
          {/* Background Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
            style={{
              backgroundSize: "30px 30px",
              backgroundImage: "radial-gradient(circle, #000 1.5px, transparent 0)",
            }}
          />

          <div className="space-y-4 relative z-10">
            <PreviewCard
              time="08:00"
              title="Mariana Albuquerque"
              subtitle="Fisioterapia Traumato-Ortopédica"
              accentColor="#0d9488"
              bgColor="rgba(13, 148, 136, 0.08)"
              textColor="#134e4a"
              fontScale={fontPercentage / 100}
              heightScale={heightMultiplier}
              opacity={opacity / 100}
              delay={0}
            />
            <PreviewCard
              time="09:15"
              title="João Pedro Silva"
              subtitle="Reabilitação Funcional"
              accentColor="#6366f1"
              bgColor="rgba(99, 102, 241, 0.08)"
              textColor="#312e81"
              fontScale={fontPercentage / 100}
              heightScale={heightMultiplier}
              opacity={opacity / 100}
              delay={0.1}
            />
          </div>

          {/* Decorative Calendar Grid Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.08] dark:opacity-[0.15] mt-8 px-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="w-full border-b border-dashed border-slate-400"
                style={{ height: `${24 * heightMultiplier}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ControlSectionProps {
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  value: number;
  max: number;
  step?: number;
  onChange: (val: number[]) => void;
  renderValue: string;
  accent: "teal" | "indigo" | "sky";
}

const ControlSection = memo(
  ({ 
    label, 
    subLabel, 
    icon, 
    value, 
    max, 
    step = 1, 
    onChange, 
    renderValue, 
    accent 
  }: ControlSectionProps) => {
    const accents = {
      teal: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 border-teal-100 dark:border-teal-900/50",
      indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50",
      sky: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 border-sky-100 dark:border-sky-900/50",
    };

    return (
      <div className="group space-y-5 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all hover:shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl border transition-all duration-300 group-hover:scale-110", accents[accent])}>
              {icon}
            </div>
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</Label>
              <p className="text-[10px] text-slate-400 font-medium">{subLabel}</p>
            </div>
          </div>
          <div className={cn("px-3 py-1 rounded-full border text-[11px] font-black font-mono shadow-inner", accents[accent])}>
            {renderValue}
          </div>
        </div>

        <div className="px-1">
          <Slider
            value={[value]}
            max={max}
            step={step}
            onValueChange={onChange}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          />
        </div>
      </div>
    );
  }
);

interface PreviewCardProps {
  time: string;
  title: string;
  subtitle: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  fontScale: number;
  heightScale: number;
  opacity: number;
  delay: number;
}

const PreviewCard = memo(
  ({ 
    time, 
    title, 
    subtitle, 
    accentColor, 
    bgColor, 
    textColor, 
    fontScale, 
    heightScale, 
    opacity, 
    delay 
  }: PreviewCardProps) => (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4"
      style={{ height: `${24 * heightScale}px` }}
    >
      <div className="w-12 text-right">
        <span className="text-[11px] font-black text-slate-300 dark:text-slate-700 font-mono tracking-tighter">
          {time}
        </span>
      </div>
      <div
        className="flex-1 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-col justify-center px-6 overflow-hidden relative group transition-all duration-500"
        style={{
          backgroundColor: bgColor,
          borderLeft: `6px solid ${accentColor}`,
          opacity: opacity,
          boxShadow: `0 10px 15px -3px rgba(0, 0, 0, 0.03), 0 4px 6px -4px rgba(0, 0, 0, 0.03)`,
        }}
      >
        <div className="flex items-baseline gap-3 relative z-10">
          <span
            className="font-black tracking-tight whitespace-nowrap overflow-hidden text-ellipsis transition-all"
            style={{
              fontSize: `${13 * fontScale}px`,
              color: textColor,
              lineHeight: 1,
            }}
          >
            {title}
          </span>
          <span
            className="opacity-40 font-medium whitespace-nowrap overflow-hidden text-ellipsis hidden lg:inline"
            style={{ fontSize: `${10 * fontScale}px`, color: textColor }}
          >
            {subtitle}
          </span>
        </div>
        
        {heightScale > 1.3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="leading-none mt-2 font-bold flex items-center gap-1.5"
            style={{ fontSize: `${9 * fontScale}px`, color: textColor }}
          >
            <div className="h-1 w-1 rounded-full bg-current" />
            Especialista: Dr. Rafael Minatto
          </motion.div>
        )}

        {/* Glossy overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        
        {/* Inner glow on hover */}
        <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-[0.02] transition-opacity pointer-events-none" />
      </div>
    </motion.div>
  ),
);
