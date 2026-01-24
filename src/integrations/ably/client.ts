/**
 * Ably Realtime Integration
 * Cliente para WebSocket e eventos em tempo real
 */

import * as Ably from 'ably';

const ABLY_KEY = import.meta.env.VITE_ABLY_API_KEY;

let ablyClient: Ably.Realtime | null = null;

/**
 * Obtém a instância do cliente Ably Realtime
 */
export function getAblyClient(): Ably.Realtime {
    if (!ablyClient) {
        if (!ABLY_KEY) {
            console.warn('VITE_ABLY_API_KEY não configurada. Realtime desativado.');
            // Stub para evitar crashes se não houver chave
            ablyClient = new Ably.Realtime({ key: 'none:none', autoConnect: false });
        } else {
            ablyClient = new Ably.Realtime(ABLY_KEY);
        }
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
