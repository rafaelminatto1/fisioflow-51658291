/**
 * Componente para gerenciar conexão com Google Calendar
 * @module components/schedule/GoogleCalendarButton
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Loader2, CheckCircle2, XCircle, LogOut, Settings, RefreshCw } from 'lucide-react';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { cn } from '@/lib/utils';
import { fisioLogger as logger } from '@/lib/errors/logger';

// =====================================================================
// TYPES
// =====================================================================

interface GoogleCalendarButtonProps {
  /** Ação personalizada quando conectado */
  onConnected?: () => void;
  /** Ação personalizada quando desconectado */
  onDisconnected?: () => void;
  /** Classe CSS adicional */
  className?: string;
  /** Variante do botão */
  variant?: 'default' | 'ghost' | 'outline';
  /** Tamanho do botão */
  size?: 'default' | 'sm' | 'icon';
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export function GoogleCalendarButton({
  onConnected,
  onDisconnected,
  className,
  variant = 'outline',
  size = 'default',
}: GoogleCalendarButtonProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const {
    isConnected,
    email,
    isLoading,
    connect,
    disconnect,
  } = useGoogleCalendarSync();

  const handleConnect = async () => {
    try {
      await connect();
      onConnected?.();
    } catch (error) {
      logger.error('Erro ao conectar Google Calendar', error, 'GoogleCalendarButton');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowDisconnectDialog(false);
      onDisconnected?.();
    } catch (error) {
      logger.error('Erro ao desconectar Google Calendar', error, 'GoogleCalendarButton');
    }
  };

  const Icon = isConnected ? CheckCircle2 : Calendar;
  const iconColor = isConnected ? 'text-green-600' : 'text-slate-500';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn('gap-2', className)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon className={cn('w-4 h-4', iconColor)} />
            )}
            {size !== 'icon' && (
              <span className="hidden sm:inline">
                {isConnected ? 'Google Calendar' : 'Conectar Google'}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {isConnected ? (
            <>
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium text-slate-900 dark:text-slate-100">Conectado</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</p>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => window.open('https://calendar.google.com', '_blank')}>
                <Calendar className="w-4 h-4 mr-2" />
                Abrir Google Calendar
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>

              <DropdownMenuItem>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar agora
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setShowDisconnectDialog(true)}
                className="text-red-600 focus:text-red-600 dark:text-red-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Desconectar
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={handleConnect}>
                <Calendar className="w-4 h-4 mr-2" />
                Conectar Google Calendar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                <p>Sincronize seus agendamentos automaticamente</p>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Google Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso interromperá a sincronização automática com o Google Calendar.
              Você pode reconectar sua conta a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =====================================================================
// COMPACT VERSION (for header/sidebar)
// =====================================================================

interface GoogleCalendarStatusProps {
  className?: string;
}

export function GoogleCalendarStatus({ className }: GoogleCalendarStatusProps) {
  const { isConnected, isLoading } = useGoogleCalendarSync();

  if (!isConnected && !isLoading) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
      ) : (
        <>
          <CheckCircle2 className="w-3 h-3 text-green-600" />
          <span className="text-slate-600 dark:text-slate-400">Google Calendar</span>
        </>
      )}
    </div>
  );
}

// =====================================================================
// CONNECTION BADGE
// =====================================================================

interface GoogleCalendarBadgeProps {
  className?: string;
}

export function GoogleCalendarBadge({ className }: GoogleCalendarBadgeProps) {
  const { isConnected, email, isLoading } = useGoogleCalendarSync();

  if (!isConnected) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-md', className)}>
      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
      <span className="text-xs font-medium text-green-700 dark:text-green-300">
        {email}
      </span>
    </div>
  );
}

export default GoogleCalendarButton;
