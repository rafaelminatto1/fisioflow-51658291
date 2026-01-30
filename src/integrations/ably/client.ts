/**
 * Ably Realtime Integration
 * Cliente para WebSocket e eventos em tempo real
 */

import * as Ably from 'ably';

const ABLY_KEY = import.meta.env.VITE_ABLY_API_KEY;

// Track if Ably is available
let isAblyAvailable = !!ABLY_KEY && ABLY_KEY !== 'your_ably_api_key_here';
let ablyClient: Ably.Realtime | null = null;

/**
 * Check if Ably is configured and available
 */
export function isAblyConfigured(): boolean {
    return isAblyAvailable;
}

/**
 * Obtém a instância do cliente Ably Realtime
 * Returns a mock client if Ably is not configured
 */
export function getAblyClient(): Ably.Realtime {
    if (!ablyClient) {
        if (!isAblyAvailable) {
            console.warn('[Ably] VITE_ABLY_API_KEY não configurada. Realtime desativado (usando mock).');
            // Create a mock client that doesn't connect but provides the same interface
            ablyClient = new Ably.Realtime({
                key: 'mock:mock',
                autoConnect: false,
                // Suppress all connection errors
                logLevel: 0, // NONE
            });

            // Prevent connection attempts
            if (ablyClient.connection) {
                ablyClient.connection.off = () => {};
                ablyClient.connection.on = () => {};
            }

            return ablyClient;
        }
        ablyClient = new Ably.Realtime(ABLY_KEY, {
            logLevel: import.meta.env.DEV ? 4 : 2, // VERBOSE in dev, INFO in prod
            disconnectedTimeout: 30000,
            suspendedTimeout: 60000,
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
