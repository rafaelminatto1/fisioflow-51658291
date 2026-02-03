import { getDataConnect, type DataConnect } from 'firebase/data-connect';
import { app } from '@/integrations/firebase/app';
import { connectorConfig } from '@/lib/dataconnect-sdk';

/**
 * Instância do Data Connect com inicialização preguiçosa (lazy)
 * Só inicializa quando realmente for necessário
 */
let _dc: DataConnect | null = null;

export const dc = (): DataConnect => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dataconnect.ts:dc',message:'dc() called',data:{hasDc:!!_dc},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (!_dc) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dataconnect.ts:getDataConnect',message:'calling getDataConnect',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      _dc = getDataConnect(app, connectorConfig);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dataconnect.ts:after getDataConnect',message:'getDataConnect succeeded',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/3f007de9-e51e-4db7-b86b-110485f7b6de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dataconnect.ts:catch',message:'getDataConnect threw',data:{errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('[DataConnect] Failed to initialize:', error);
      throw new Error('Data Connect service is not available. Please check your configuration.');
    }
  }
  return _dc;
};

// Exportar as referências para queries e mutations
export * from '@/lib/dataconnect-sdk';