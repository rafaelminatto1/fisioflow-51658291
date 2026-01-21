/**
 * Switch - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebSwitch = React.lazy(() =>
  import('@/components/web/ui/switch').then(m => ({ default: m.Switch }))
);

const NativeSwitch = React.lazy(() =>
  import('@/components/native/ui/switch').then(m => ({ default: m.Switch }))
);

export interface SharedSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch = React.forwardRef<any, SharedSwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className }, ref) => {
    const { isWeb } = usePlatform();

    const props = {
      checked,
      onCheckedChange,
      disabled,
      className,
      ref,
    };

    return (
      <React.Suspense fallback={<SwitchFallback {...props} />}>
        {isWeb ? <WebSwitch {...props} /> : <NativeSwitch {...props} />}
      </React.Suspense>
    );
  }
);

Switch.displayName = 'Switch';

const SwitchFallback: React.FC<SharedSwitchProps> = ({ checked, disabled }) => {
  return (
    <div
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? '#0ea5e9' : '#ccc',
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: 'white',
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          transition: 'left 0.2s',
        }}
      />
    </div>
  );
};

export default Switch;
