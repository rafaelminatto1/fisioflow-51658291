 
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { type YBalanceKey, type YBalanceValues } from '@/lib/evolution/yBalance';

interface MeasurementDiagramYBalanceProps {
  values: YBalanceValues;
  unit?: string;
  onChange: (key: YBalanceKey, value: string) => void;
  className?: string;
  /** Valor composto exibido (média das direções) */
  compositeLabel?: string;
  compositeValue?: number | null;
}

/** Esquema em Y do Y Balance Test (Lower Quarter): anterior, posteromedial, posterolateral. */
export function MeasurementDiagramYBalance({
  values,
  unit = 'cm',
  onChange,
  className,
  compositeLabel = 'Composto',
  compositeValue,
}: MeasurementDiagramYBalanceProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* SVG: Y com três direções */}
        <div className="relative flex-shrink-0 w-full max-w-[220px] aspect-square">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full text-teal-600"
            aria-hidden
          >
            {/* Centro (pé de apoio) */}
            <circle cx="100" cy="100" r="14" fill="currentColor" opacity={0.2} />
            <circle cx="100" cy="100" r="8" fill="currentColor" />
            {/* Anterior (cima) */}
            <line x1="100" y1="100" x2="100" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="28" r="6" fill="currentColor" />
            {/* Posteromedial (esquerda-baixo) */}
            <line x1="100" y1="100" x2="45" y2="155" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="43" cy="157" r="6" fill="currentColor" />
            {/* Posterolateral (direita-baixo) */}
            <line x1="100" y1="100" x2="155" y2="155" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <circle cx="157" cy="157" r="6" fill="currentColor" />
          </svg>
        </div>

        {/* Inputs ao lado de cada direção */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
          <div className="space-y-2 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
            <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Anterior
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                value={values.anterior}
                onChange={(e) => onChange('anterior', e.target.value)}
                placeholder="0"
                className="h-11 bg-white border-teal-200 font-bold text-slate-700 focus:border-teal-400 focus:ring-teal-100"
                aria-label="Anterior (cm)"
              />
              <span className="text-xs font-medium text-slate-500 shrink-0">{unit}</span>
            </div>
          </div>
          <div className="space-y-2 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
            <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Posteromedial
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                value={values.posteromedial}
                onChange={(e) => onChange('posteromedial', e.target.value)}
                placeholder="0"
                className="h-11 bg-white border-teal-200 font-bold text-slate-700 focus:border-teal-400 focus:ring-teal-100"
                aria-label="Posteromedial (cm)"
              />
              <span className="text-xs font-medium text-slate-500 shrink-0">{unit}</span>
            </div>
          </div>
          <div className="space-y-2 p-3 rounded-xl bg-teal-50/50 border border-teal-100">
            <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Posterolateral
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                value={values.posterolateral}
                onChange={(e) => onChange('posterolateral', e.target.value)}
                placeholder="0"
                className="h-11 bg-white border-teal-200 font-bold text-slate-700 focus:border-teal-400 focus:ring-teal-100"
                aria-label="Posterolateral (cm)"
              />
              <span className="text-xs font-medium text-slate-500 shrink-0">{unit}</span>
            </div>
          </div>
        </div>
      </div>
      {compositeValue != null && !Number.isNaN(compositeValue) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{compositeLabel}</span>
          <span className="font-bold text-slate-800">{compositeValue.toFixed(1)} {unit}</span>
        </div>
      )}
    </div>
  );
}
