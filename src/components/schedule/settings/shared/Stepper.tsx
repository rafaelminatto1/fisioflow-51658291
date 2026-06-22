import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

export function Stepper({ value, min = 1, max = 20, onChange, disabled }: StepperProps) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-none"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="h-8 w-12 rounded-none border-y-0 border-x border-slate-200 text-center text-sm font-semibold focus-visible:ring-0 dark:border-slate-700"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-none"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
