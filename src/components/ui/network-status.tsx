import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { toast } = useToast();

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast({
                title: "Conexão restaurada",
                description: "Você está online novamente. Sincronizando dados...",
                variant: "default",
                duration: 3000,
            });
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast({
                title: "Sem conexão",
                description: "Você está offline. Algumas funções podem estar limitadas.",
                variant: "destructive",
                duration: null, // Persistente até voltar
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [toast]);

    if (isOnline) return null;

    return (
        <div className={cn(
            "fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300",
            "bg-destructive text-destructive-foreground animate-in slide-in-from-bottom-5"
        )}>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">Offline</span>
        </div>
    );
}
