import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface CustomNotificationProps {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  onClose?: () => void;
}

export const CustomNotification: React.FC<CustomNotificationProps> = ({
  message,
  type = 'info',
  onClose
}) => {
  return (
    <Alert className={`
      ${type === 'error' ? 'border-red-500 bg-red-50 text-red-900' : ''}
      ${type === 'warning' ? 'border-yellow-500 bg-yellow-50 text-yellow-900' : ''}
      ${type === 'success' ? 'border-green-500 bg-green-50 text-green-900' : ''}
      ${type === 'info' ? 'border-blue-500 bg-blue-50 text-blue-900' : ''}
    `}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto text-sm hover:underline"
        >
          Fechar
        </button>
      )}
    </Alert>
  );
};