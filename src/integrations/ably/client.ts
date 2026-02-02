/**
 * Ably Realtime Integration
 * Cliente para WebSocket e eventos em tempo real
 */

import * as Ably from 'ably';
import { fisioLogger as logger } from '@/lib/errors/logger';

const ABLY_KEY = import.meta.env.VITE_ABLY_API_KEY;
const DISABLE_ABLY =
  import.meta.env.VITE_DISABLE_ABLY === '1' ||
  import.meta.env.VITE_E2E === '1' ||
  (typeof window !== 'undefined' && !!(window as { __E2E__?: boolean }).__E2E__);

// Track if Ably is available (desabilitado em E2E para evitar 410 Gone)
let isAblyAvailable = !DISABLE_ABLY && !!ABLY_KEY && ABLY_KEY !== 'your_ably_api_key_here';
let ablyClient: Ably.Realtime | null = null;

/**
 * Check if Ably is configured and available
 */
export function isAblyConfigured(): boolean {
    return isAblyAvailable;
}

export function resetAblyClient() {
    if (ablyClient) {
        try {
            ablyClient.close();
        } catch (e) {
            console.error('Error closing Ably client:', e);
        }
        ablyClient = null;
    }
}

/**
 * Obtém a instância do cliente Ably Realtime
 * Returns a mock client if Ably is not configured
 */
export function getAblyClient(): Ably.Realtime {
    if (!ablyClient) {
        if (!isAblyAvailable) {
            if (DISABLE_ABLY) {
                logger.info('[Ably] Desativado para E2E/testes (VITE_DISABLE_ABLY ou VITE_E2E).', undefined, 'ably-client');
            } else {
                logger.warn('[Ably] VITE_ABLY_API_KEY não configurada. Realtime desativado (usando mock).', undefined, 'ably-client');
            }
            // Create a mock client that doesn't connect but provides the same interface
            ablyClient = new Ably.Realtime({
                key: 'mock:mock',
                autoConnect: false,
                // Suppress all connection errors
                logLevel: 0, // NONE
            });

            // Prevent connection attempts
            if (ablyClient.connection) {
                ablyClient.connection.off = () => { };
                ablyClient.connection.on = () => { };
            }

            return ablyClient;
        }

        ablyClient = new Ably.Realtime(ABLY_KEY, {
            logLevel: import.meta.env.DEV ? 4 : 2, // VERBOSE in dev, INFO in prod
            disconnectedTimeout: 30000,
            suspendedTimeout: 60000,
        });

        // Monitor connection handling for 410 Gone or Token errors
        ablyClient.connection.on('failed', (stateChange) => {
            const reason = stateChange.reason;
            // 40140-40149: Token expired
            // 40400: Resource not found (sometimes used for deleted apps)
            // 41010: Transport refused
            // 80000-80009: Connection errors
            if (reason && (reason.code === 41010 || (reason.code >= 40140 && reason.code <= 40149))) {
                logger.error(`[Ably] Connection failed with recoverable error ${reason.code}. Resetting client.`, reason, 'ably-client');
                resetAblyClient();
                // Attempt to reconnect with new client?
                // The consumer (Context) will need to loop/retry, or we can try to recover here?
                // But getAblyClient returns the *instance*. If we null it, next call gets new one.
            }
        });
    }
    return ablyClient;
}

/**
 * Canais padronizados do FisioFlow
 */
export const ABLY_CHANNELS = {
    appointments: (orgId: string) => `appointments:${orgId}`,
    patients: (orgId: string) => `patients:${orgId}`,
    user: (userId: string) => `user:${userId}`,
    presence: (orgId: string) => `presence:${orgId}`,
};

/**
 * Eventos padronizados
 */
export const ABLY_EVENTS = {
    update: 'update',
    notification: 'notification',
    presence: 'presence',
};
