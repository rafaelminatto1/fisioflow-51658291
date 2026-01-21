import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

export function NetworkStatus() {
    const { isOnline, isReconnecting, tryReconnect } = useConnectionStatus({
        autoReconnect: true,
        pingOnFocus: true
    });

    if (isOnline) return null;

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg transition-all duration-300",
            "bg-destructive text-destructive-foreground animate-in slide-in-from-bottom-5"
        )}>
            {isReconnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
                <WifiOff className="h-4 w-4" />
            )}

            <div className="flex flex-col">
                <span className="text-sm font-medium">
                    {isReconnecting ? 'Reconectando...' : 'Sem conexão'}
                </span>
                {!isReconnecting && (
                    <button
                        onClick={() => tryReconnect()}
                        className="text-xs underline hover:text-white/90 text-left"
                    >
                        Tentar reconectar
                    </button>
                )}
            </div>
        </div>
    );
}
