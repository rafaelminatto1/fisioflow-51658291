import { getDataConnect, type DataConnect } from 'firebase/data-connect';
import { app } from '@/integrations/firebase/app';
import { connectorConfig } from '@/lib/dataconnect-sdk';

/**
 * Instância do Data Connect com inicialização preguiçosa (lazy)
 * Só inicializa quando realmente for necessário
 */
let _dc: DataConnect | null = null;

export const dc = (): DataConnect => {
  if (!_dc) {
    try {
      _dc = getDataConnect(app, connectorConfig);
    } catch (error) {
      console.error('[DataConnect] Failed to initialize:', error);
      throw new Error('Data Connect service is not available. Please check your configuration.');
    }
  }
  return _dc;
};

// Exportar as referências para queries e mutations
export * from '@/lib/dataconnect-sdk';