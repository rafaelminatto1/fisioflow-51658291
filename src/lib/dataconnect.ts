import { getDataConnect, type DataConnect } from 'firebase/data-connect';
import { app } from '@/integrations/firebase/app';
import { connectorConfig } from '@/lib/dataconnect-sdk';
import { fisioLogger } from '@/lib/errors/logger';

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
      fisioLogger.error('DataConnect failed to initialize', error, 'DataConnect');
      throw new Error('Data Connect service is not available. Please check your configuration.');
    }
  }
  return _dc;
};

// Exportar as referências para queries e mutations
export * from '@/lib/dataconnect-sdk';