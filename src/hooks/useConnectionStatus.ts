/**
 * useConnectionStatus - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - Connectivity check now uses Firestore instead of Supabase
 * - Lightweight query to organizations collection for health check
 *
 * Hook para monitorar status de conexão
 * Detecta online/offline com verificação real de conectividade (ping)
 *
 * Melhorias:
 * - Verificação real de conectividade (não apenas navigator.onLine)
 * - Ping ao Firestore para confirmar conexão
 * - Estados mais granulares (checking, online, offline, reconnecting)
 * - Debounce para evitar flickering
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, limit, query } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { db } from '@/integrations/firebase/app';



export type ConnectionState = 'online' | 'offline' | 'checking' | 'reconnecting';

export interface ConnectionStatus {
    state: ConnectionState;
    isOnline: boolean;
    isChecking: boolean;
    isReconnecting: boolean;
    lastOnlineAt: Date | null;
    lastCheckAt: Date | null;
    reconnectAttempts: number;
    error: string | null;
}

interface UseConnectionStatusOptions {
    onReconnect?: () => void;
    onDisconnect?: () => void;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    pingOnFocus?: boolean;
}

/**
 * Verifica conectividade real fazendo ping ao Firestore
 */
async function checkRealConnectivity(): Promise<boolean> {
    // Primeiro, verificar navigator.onLine
    if (!navigator.onLine) {
        return false;
    }

    // Fazer ping real ao Firestore
    try {
        // Usar health check simples com query leve ao Firestore
        const q = query(collection(db, 'organizations'), limit(1));
        await getDocs(q);

        // Se não há erro, está conectado
        return true;
    } catch (error) {
        // Erros de rede/timeout = offline
        if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('fetch') || error.message?.includes('network'))) {
            return false;
        }
        // Outros erros (ex: auth) podem significar que está online
        return navigator.onLine;
    }
}

export function useConnectionStatus(options: UseConnectionStatusOptions = {}) {
    const {
        onReconnect,
        onDisconnect,
        autoReconnect = true,
        reconnectInterval = 5000,
        maxReconnectAttempts = 10,
        pingOnFocus = true,
    } = options;

    const [status, setStatus] = useState<ConnectionStatus>({
        state: navigator.onLine ? 'online' : 'offline',
        isOnline: navigator.onLine,
        isChecking: false,
        isReconnecting: false,
        lastOnlineAt: navigator.onLine ? new Date() : null,
        lastCheckAt: null,
        reconnectAttempts: 0,
        error: null,
    });

    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onReconnectRef = useRef(onReconnect);
    const onDisconnectRef = useRef(onDisconnect);
    const isCheckingRef = useRef(false);

    onReconnectRef.current = onReconnect;
    onDisconnectRef.current = onDisconnect;

    // Limpar timers ao desmontar
    useEffect(() => {
        return () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
        };
    }, []);

    // Verificar conectividade real
    const checkConnection = useCallback(async (silent = false): Promise<boolean> => {
        if (isCheckingRef.current) return status.isOnline;

        isCheckingRef.current = true;

        if (!silent) {
            setStatus(prev => ({ ...prev, state: 'checking', isChecking: true }));
        }

        try {
            const isConnected = await checkRealConnectivity();
            const now = new Date();

            setStatus(prev => {
                const wasOffline = !prev.isOnline;

                // Se estava offline e agora está online, disparar callback
                if (wasOffline && isConnected) {
                    logger.info('Conexão restabelecida', {}, 'useConnectionStatus');
                    setTimeout(() => onReconnectRef.current?.(), 0);
                }

                // Se estava online e agora está offline, disparar callback
                if (prev.isOnline && !isConnected) {
                    logger.warn('Conexão perdida', {}, 'useConnectionStatus');
                    setTimeout(() => onDisconnectRef.current?.(), 0);
                }

                return {
                    ...prev,
                    state: isConnected ? 'online' : 'offline',
                    isOnline: isConnected,
                    isChecking: false,
                    isReconnecting: !isConnected && autoReconnect,
                    lastCheckAt: now,
                    lastOnlineAt: isConnected ? now : prev.lastOnlineAt,
                    reconnectAttempts: isConnected ? 0 : prev.reconnectAttempts,
                    error: null,
                };
            });

            return isConnected;
        } catch (error) {
            setStatus(prev => ({
                ...prev,
                state: 'offline',
                isOnline: false,
                isChecking: false,
                isReconnecting: autoReconnect,
                lastCheckAt: new Date(),
                error: error instanceof Error ? error.message : 'Erro desconhecido',
            }));
            return false;
        } finally {
            isCheckingRef.current = false;
        }
    }, [autoReconnect, status.isOnline]);

    // Handler para evento online do navegador
    const handleOnline = useCallback(() => {
        logger.debug('Navigator: online event', {}, 'useConnectionStatus');
        checkConnection();
    }, [checkConnection]);

    // Handler para evento offline do navegador
    const handleOffline = useCallback(() => {
        logger.debug('Navigator: offline event', {}, 'useConnectionStatus');
        setStatus(prev => ({
            ...prev,
            state: 'offline',
            isOnline: false,
            isReconnecting: autoReconnect,
            reconnectAttempts: 0,
        }));
        onDisconnectRef.current?.();
    }, [autoReconnect]);

    // Tentativa manual de reconexão
    const tryReconnect = useCallback(async () => {
        setStatus(prev => ({
            ...prev,
            state: 'reconnecting',
            isReconnecting: true,
            reconnectAttempts: prev.reconnectAttempts + 1,
        }));

        const isConnected = await checkConnection();

        if (!isConnected) {
            setStatus(prev => {
                if (prev.reconnectAttempts >= maxReconnectAttempts) {
                    logger.warn('Máximo de tentativas atingido', { attempts: prev.reconnectAttempts }, 'useConnectionStatus');
                    return { ...prev, isReconnecting: false, error: 'Máximo de tentativas atingido' };
                }
                return prev;
            });
        }

        return isConnected;
    }, [checkConnection, maxReconnectAttempts]);

    // Auto-reconexão com backoff
    useEffect(() => {
        if (status.state === 'offline' && status.isReconnecting && autoReconnect) {
            if (status.reconnectAttempts >= maxReconnectAttempts) {
                return;
            }

            // Backoff exponencial: 5s, 10s, 15s (max)
            const delay = reconnectInterval * Math.min(status.reconnectAttempts + 1, 3);

            reconnectTimerRef.current = setTimeout(() => {
                logger.debug('Auto-retry', { attempt: status.reconnectAttempts + 1, delay }, 'useConnectionStatus');
                tryReconnect();
            }, delay);

            return () => {
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                }
            };
        }
    }, [status.state, status.isReconnecting, status.reconnectAttempts, autoReconnect, maxReconnectAttempts, reconnectInterval, tryReconnect]);

    // Event listeners
    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Ping ao retornar foco na janela
        const handleFocus = () => {
            if (pingOnFocus) {
                checkConnection(true);
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('focus', handleFocus);
        };
    }, [handleOnline, handleOffline, pingOnFocus, checkConnection]);

    // Parar tentativas de reconexão
    const stopReconnecting = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        setStatus(prev => ({ ...prev, isReconnecting: false }));
    }, []);

    return {
        ...status,
        checkConnection,
        tryReconnect,
        stopReconnecting,
    };
}
