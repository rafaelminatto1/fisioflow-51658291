/**
 * Textarea - Componente Cross-Platform
 */

import * as React from 'react';
import { usePlatform } from '@/hooks/platform';

const WebTextarea = React.lazy(() =>
  import('@/components/web/ui/textarea').then(m => ({ default: m.Textarea }))
);

const NativeTextarea = React.lazy(() =>
  import('@/components/native/ui/textarea').then(m => ({ default: m.Textarea }))
);

export interface SharedTextareaProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChangeText?: (text: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  id?: string;
  testID?: string;
  autoFocus?: boolean;
  maxLength?: number;
  rows?: number;
}

export const Textarea = React.forwardRef<any, SharedTextareaProps>(
  ({ value, placeholder, disabled, readOnly, onChangeText, onChange, onFocus, onBlur, className, id, testID, autoFocus, maxLength, rows = 3, ...props }, ref) => {
    const { isWeb } = usePlatform();

    const platformProps = {
      value, placeholder, disabled, className, id, autoFocus, maxLength, rows, ref,
      ...(isWeb ? { onChange, onFocus, onBlur, readOnly } : { onChangeText, onFocus, onBlur, editable: !readOnly, testID }),
      ...props,
    };

    return (
      <React.Suspense fallback={<TextareaFallback {...platformProps} />}>
        {isWeb ? <WebTextarea {...platformProps} /> : <NativeTextarea {...platformProps} />}
      </React.Suspense>
    );
  }
);

Textarea.displayName = 'Textarea';

const TextareaFallback: React.FC<SharedTextareaProps> = ({ value, placeholder, disabled, className, rows = 3 }) => {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      rows={rows}
      style={{
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        background: disabled ? '#f1f5f9' : 'white',
        opacity: disabled ? 0.5 : 1,
        resize: 'vertical',
      }}
    />
  );
};

export default Textarea;
