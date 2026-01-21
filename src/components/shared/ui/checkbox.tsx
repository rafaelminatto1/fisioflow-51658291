/**
 * Checkbox - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebCheckbox = React.lazy(() =>
  import('@/components/web/ui/checkbox').then(m => ({ default: m.Checkbox }))
);

const NativeCheckbox = React.lazy(() =>
  import('@/components/native/ui/checkbox').then(m => ({ default: m.Checkbox }))
);

export interface SharedCheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const Checkbox = React.forwardRef<any, SharedCheckboxProps>(
  ({ checked, onCheckedChange, disabled, className, label }, ref) => {
    const { isWeb } = usePlatform();

    const props = {
      checked,
      onCheckedChange,
      disabled,
      className,
      label,
      ref,
    };

    return (
      <React.Suspense fallback={<CheckboxFallback {...props} />}>
        {isWeb ? <WebCheckbox {...props} /> : <NativeCheckbox {...props} />}
      </React.Suspense>
    );
  }
);

Checkbox.displayName = 'Checkbox';

const CheckboxFallback: React.FC<SharedCheckboxProps> = ({ checked, disabled }) => {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        border: '1px solid #ccc',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: checked ? '#0ea5e9' : 'white',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {checked && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
    </div>
  );
};

export default Checkbox;
