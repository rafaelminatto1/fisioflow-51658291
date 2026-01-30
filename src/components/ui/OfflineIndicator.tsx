/**
 * OfflineIndicator Component
 * 
 * Componente reutilizável para indicar status de conexão offline/cache
 * com suporte a diferentes estados visuais e ações do usuário.
 * 
 * @example
 * ```tsx
 * <OfflineIndicator 
 *   isFromCache={isFromCache}
 *   isOnline={isOnline}
 *   isReconnecting={isReconnecting}
 *   cacheTimestamp={cacheTimestamp}
 *   itemCount={appointments.length}
 *   itemLabel="agendamentos"
 *   onRefresh={handleRefresh}
 * />
 * ```
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw, AlertCircle, CloudOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mapeamento de fontes de dados para labels amigáveis
const sourceLabels: Record<string, string> = {
    supabase: 'Servidor',
    indexeddb: 'Cache Local',
    localstorage: 'Backup de Emergência',
    memory: 'Memória',
};

export interface OfflineIndicatorProps {
    /** Se os dados exibidos são do cache */
    isFromCache: boolean;
    /** Se está online */
    isOnline: boolean;
    /** Se os dados podem estar desatualizados */
    isStale?: boolean;
    /** Origem dos dados */
    dataSource?: 'supabase' | 'indexeddb' | 'localstorage' | 'memory';
    /** Se está verificando conexão */
    isChecking?: boolean;
    /** Se está tentando reconectar */
    isReconnecting?: boolean;
    /** Timestamp ISO do cache */
    cacheTimestamp: string | null;
    /** Quantidade de itens em cache */
    itemCount?: number;
    /** Label para os itens (ex: "agendamentos") */
    itemLabel?: string;
    /** Callback para atualizar/reconectar */
    onRefresh?: () => void;
    /** Mensagem de erro opcional */
    errorMessage?: string | null;
    /** Classes CSS adicionais */
    className?: string;
    /** Tamanho do componente */
    size?: 'sm' | 'md' | 'lg';
    /** Mostrar como toast minimalista */
    minimal?: boolean;
}

const variantStyles: Record<OfflineIndicatorVariant, { bg: string; border: string; text: string; icon: string }> = {
    offline: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-700',
        icon: 'text-red-600',
    },
    cache: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-700',
        icon: 'text-amber-600',
    },
    checking: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-700',
        icon: 'text-blue-600',
    },
    reconnecting: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-700',
        icon: 'text-blue-600',
    },
    error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-700',
        icon: 'text-red-600',
    },
};

function getVariant(props: OfflineIndicatorProps): OfflineIndicatorVariant {
    if (props.errorMessage) return 'error';
    if (!props.isOnline) return 'offline';
    if (props.isChecking) return 'checking';
    if (props.isReconnecting) return 'reconnecting';
    if (props.isFromCache || props.isStale) return 'cache';
    return 'cache'; // Default fallback
}

function getIcon(variant: OfflineIndicatorVariant, isAnimating: boolean) {
    const iconClass = cn('h-4 w-4', isAnimating && 'animate-spin');

    switch (variant) {
        case 'offline':
            return <CloudOff className="h-4 w-4" />;
        case 'checking':
        case 'reconnecting':
            return <RefreshCw className={iconClass} />;
        case 'error':
            return <AlertCircle className="h-4 w-4" />;
        default:
            return <WifiOff className="h-4 w-4" />;
    }
}

function getTitle(variant: OfflineIndicatorVariant, isStale?: boolean, dataSource?: string): string {
    switch (variant) {
        case 'offline':
            return 'Modo Offline';
        case 'checking':
            return 'Verificando conexão...';
        case 'reconnecting':
            return 'Reconectando...';
        case 'error':
            return 'Erro de conexão';
        case 'cache':
            if (dataSource === 'localstorage') return 'Backup de Emergência';
            if (isStale) return 'Dados Antigos';
            return 'Modo Offline (Cache)';
        default:
            return 'Dados do cache';
    }
}

export function OfflineIndicator({
    isFromCache,
    isOnline,
    isStale = false,
    dataSource,
    isChecking = false,
    isReconnecting = false,
    cacheTimestamp,
    itemCount,
    itemLabel = 'itens',
    onRefresh,
    errorMessage,
    className,
    size = 'md',
    minimal = false,
}: OfflineIndicatorProps) {
    // Não mostrar se está online, com dados frescos e sem erros
    if (isOnline && !isFromCache && !isStale && !isChecking && !isReconnecting && !errorMessage) {
        return null;
    }

    const variant = getVariant({ isFromCache, isOnline, isStale, isChecking, isReconnecting, cacheTimestamp, errorMessage });
    const styles = variantStyles[variant];
    const isLoading = isChecking || isReconnecting;

    const sizeStyles = {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-3 text-sm',
        lg: 'px-5 py-4 text-base',
    };

    const formatTimestamp = () => {
        if (!cacheTimestamp) return null;
        try {
            return formatDistanceToNow(new Date(cacheTimestamp), { addSuffix: true, locale: ptBR });
        } catch {
            return null;
        }
    };

    const timestamp = formatTimestamp();

    if (minimal) {
        return (
            <div className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                styles.bg,
                styles.text,
                className
            )}>
                <div className={styles.icon}>
                    {getIcon(variant, isLoading)}
                </div>
                <span>{getTitle(variant, isStale, dataSource)}</span>
            </div>
        );
    }

    return (
        <div className={cn(
            'rounded-lg flex items-center justify-between gap-3 animate-fade-in shrink-0 transition-colors border',
            styles.bg,
            styles.border,
            sizeStyles[size],
            className
        )}>
            <div className="flex items-center gap-3">
                <div className={cn('p-1.5 rounded-full', styles.bg)}>
                    <span className={styles.icon}>
                        {getIcon(variant, isLoading)}
                    </span>
                </div>
                <div>
                    <p className={cn('font-medium', styles.text)}>
                        {getTitle(variant, isStale, dataSource)}
                    </p>
                    <p className={cn('text-xs opacity-80', styles.text)}>
                        {errorMessage ? (
                            errorMessage
                        ) : (
                            <>
                                {dataSource && <span className="font-semibold">{sourceLabels[dataSource] || dataSource}</span>}
                                {dataSource && ' • '}
                                {itemCount !== undefined && `${itemCount} ${itemLabel}`}
                                {itemCount !== undefined && timestamp && ' • '}
                                {timestamp && `Atualizado ${timestamp}`}
                                {!itemCount && !timestamp && 'Mostrando últimos dados salvos'}
                            </>
                        )}
                    </p>
                </div>
            </div>

            {onRefresh && (
                <Button
                    onClick={onRefresh}
                    size="sm"
                    variant="outline"
                    className={cn(
                        'gap-2',
                        variant === 'offline' || variant === 'error'
                            ? 'border-red-500/50 text-red-700 hover:bg-red-500/10'
                            : variant === 'checking' || variant === 'reconnecting'
                                ? 'border-blue-500/50 text-blue-700 hover:bg-blue-500/10'
                                : 'border-amber-500/50 text-amber-700 hover:bg-amber-500/10'
                    )}
                    disabled={isLoading}
                >
                    <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                    {isLoading ? 'Verificando...' : 'Atualizar'}
                </Button>
            )}
        </div>
    );
}

export default OfflineIndicator;
