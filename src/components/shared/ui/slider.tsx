/**
 * Slider - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebSlider = React.lazy(() =>
  import('@/components/web/ui/slider').then(m => ({ default: m.Slider }))
);

const NativeSlider = React.lazy(() =>
  import('@/components/native/ui/slider').then(m => ({ default: m.Slider }))
);

export interface SharedSliderProps {
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

export const Slider = React.forwardRef<any, SharedSliderProps>(
  ({ value = [0], min = 0, max = 100, step = 1, disabled, onValueChange, className, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = {
      value, min, max, step, disabled, className, ref,
      ...props,
    };

    return (
      <React.Suspense fallback={<SliderFallback {...platformProps} />}>
        {isWeb ? <WebSlider {...platformProps} /> : <NativeSlider {...platformProps} />}
      </React.Suspense>
    );
  }
);

Slider.displayName = 'Slider';

const SliderFallback: React.FC<SharedSliderProps> = ({ value = [0], min = 0, max = 100, disabled }) => {
  const percentage = Math.max(0, Math.min(100, ((value[0] || 0) / max) * 100));

  return (
    <input
      type="range"
      value={value[0]}
      min={min}
      max={max}
      step={1}
      disabled={disabled}
      style={{
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: disabled ? '#ccc' : '#e2e8f0',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
};

export default Slider;
