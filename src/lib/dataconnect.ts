import { getDataConnect } from 'firebase/data-connect';
import { app } from '@/integrations/firebase/app';
import { connectorConfig } from '@/lib/dataconnect-sdk';

/**
 * Instância principal do Data Connect inicializada com o SDK gerado
 */
export const dc = getDataConnect(app, connectorConfig);

// Exportar as referências para queries e mutations
export * from '@/lib/dataconnect-sdk';