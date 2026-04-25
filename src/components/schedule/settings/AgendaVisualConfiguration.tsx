import React, { memo } from "react";
import { useCardSize } from "@/hooks/useCardSize";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Type, Layers, RotateCcw, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * AgendaVisualConfiguration - Pro Max Component
 * Provides a high-end interface for controlling schedule appearance.
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

  const hasChanges = heightScale !== 6 || fontScale !== 5 || opacity !== 100;

  return (
    <div className="space-y-8 py-4">
      {/* Header with Reset */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Aparência da Agenda
          </h3>
          <p className="text-[11px] text-slate-500">Ajuste o layout para seu conforto visual</p>
        </div>
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="h-8 text-[11px] text-slate-500 hover:text-primary hover:bg-primary/5 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrão
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Configuration Controls */}
      <div className="space-y-10 px-1">
        {/* Height / Density Control */}
        <ControlSection
          label="Densidade / Altura"
          description="Espaço vertical entre os horários"
          icon={<Clock className="w-4 h-4" />}
          value={heightScale}
          max={10}
          onChange={(val) => setHeightScale(val[0])}
          renderValue={`${Math.round(24 * heightMultiplier)}px`}
          minLabel="Compacto"
          maxLabel="Espaçoso"
        />

        {/* Font Scale Control */}
        <ControlSection
          label="Legibilidade / Fonte"
          description="Tamanho do texto nos cards"
          icon={<Type className="w-4 h-4" />}
          value={fontScale}
          max={10}
          onChange={(val) => setFontScale(val[0])}
          renderValue={`${Math.round(fontPercentage)}%`}
          minLabel="Pequeno"
          maxLabel="Grande"
        />

        {/* Opacity Control */}
        <ControlSection
          label="Transparência"
          description="Efeito vítreo nos cards"
          icon={<Layers className="w-4 h-4" />}
          value={opacity}
          max={100}
          step={5}
          onChange={(val) => setOpacity(val[0])}
          renderValue={`${opacity}%`}
          minLabel="Invisível"
          maxLabel="Sólido"
        />
      </div>

      {/* Live Preview Display Card */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <Label className="text-[11px] font-medium text-slate-400 mb-4 block uppercase tracking-wider">
          Pré-visualização ao vivo
        </Label>

        <div
          className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-4 overflow-hidden min-h-[160px] flex flex-col justify-center"
          style={{
            backgroundSize: "20px 20px",
            backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
          }}
        >
          <div className="space-y-3 relative z-10">
            <PreviewCard
              time="08:00"
              title="Maria Santos"
              subtitle="Drenagem Linfática"
              accentColor="#3b82f6"
              bgColor="#eff6ff"
              textColor="#1e3a8a"
              fontScale={fontPercentage / 100}
              heightScale={heightMultiplier}
              opacity={opacity / 100}
            />
            <PreviewCard
              time="09:15"
              title="Clinica Geral"
              subtitle="Avaliação Inicial"
              accentColor="#10b981"
              bgColor="#ecfdf5"
              textColor="#064e3b"
              fontScale={fontPercentage / 100}
              heightScale={heightMultiplier}
              opacity={opacity / 100}
            />
          </div>

          {/* Decorative Calendar Grid Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-full border-b border-slate-300"
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
  description: string;
  icon: React.ReactNode;
  value: number;
  max: number;
  step?: number;
  onChange: (val: number[]) => void;
  renderValue: string;
  minLabel: string;
  maxLabel: string;
}

const ControlSection = memo(
  ({
    label,
    description,
    icon,
    value,
    max,
    step = 1,
    onChange,
    renderValue,
    minLabel,
    maxLabel,
  }: ControlSectionProps) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            {icon}
          </div>
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-slate-700">{label}</Label>
            <p className="text-[11px] text-slate-400 leading-tight">{description}</p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
          <span className="text-[10px] font-bold font-mono text-slate-600">{renderValue}</span>
        </div>
      </div>

      <div className="px-1">
        <Slider
          value={[value]}
          max={max}
          step={step}
          onValueChange={onChange}
          className="cursor-pointer"
        />
        <div className="flex justify-between mt-2 px-0.5">
          <span className="text-[10px] text-slate-400 font-medium">{minLabel}</span>
          <span className="text-[10px] text-slate-400 font-medium">{maxLabel}</span>
        </div>
      </div>
    </div>
  ),
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
  }: PreviewCardProps) => (
    <motion.div
      layout
      className="flex items-center gap-3"
      style={{ height: `${24 * heightScale}px` }}
    >
      <div className="w-10 text-right">
        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">
          {time}
        </span>
      </div>
      <div
        className="flex-1 rounded-xl border border-white/20 shadow-sm flex flex-col justify-center px-4 overflow-hidden relative transition-all duration-300 group"
        style={{
          backgroundColor: bgColor,
          borderLeft: `4px solid ${accentColor}`,
          opacity: opacity,
          boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`,
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            className="font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
            style={{
              fontSize: `${12 * fontScale}px`,
              color: textColor,
              lineHeight: 1.1,
            }}
          >
            {title}
          </span>
          <span
            className="opacity-60 whitespace-nowrap overflow-hidden text-ellipsis hidden md:inline"
            style={{ fontSize: `${9 * fontScale}px`, color: textColor }}
          >
            • {subtitle}
          </span>
        </div>
        {heightScale > 1.2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            className="leading-none mt-1"
            style={{ fontSize: `${9 * fontScale}px`, color: textColor }}
          >
            Fisioterapeuta: Rafael Minatto
          </motion.div>
        )}

        {/* Glossy inner reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/20 pointer-events-none" />
      </div>
    </motion.div>
  ),
);
