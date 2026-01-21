/**
 * Select - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebSelect = React.lazy(() =>
  import('@/components/web/ui/select').then(m => ({ default: m.Select }))
);

const NativeSelect = React.lazy(() =>
  import('@/components/native/ui/select').then(m => ({ default: m.Select }))
);

export interface SharedSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  className?: string;
}

export const Select = React.forwardRef<any, SharedSelectProps>(
  ({ value, onValueChange, placeholder, disabled, options, className, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = {
      value, placeholder, disabled, options, className, ref,
      ...props,
    };

    return (
      <React.Suspense fallback={<SelectFallback {...platformProps} />}>
        {isWeb ? <WebSelect {...platformProps} /> : <NativeSelect {...platformProps} />}
      </React.Suspense>
    );
  }
);

Select.displayName = 'Select';

const SelectFallback: React.FC<SharedSelectProps> = ({ value, placeholder, disabled, options = [] }) => {
  return (
    <select
      value={value}
      disabled={disabled}
      style={{
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        background: disabled ? '#f1f5f9' : 'white',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
