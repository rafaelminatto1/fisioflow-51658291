import { functions } from '@/integrations/firebase/app';
import { httpsCallable } from 'firebase/functions';

export const aiService = {
  /**
   * Envia uma pergunta sobre um artefato específico para a IA (RAG)
   */
  async askArtifact(artifactId: string, query: string): Promise<{ answer: string; contextUsed?: string }> {
    try {
      const queryFn = httpsCallable<{ artifactId: string; query: string }, { answer: string; contextUsed?: string }>(
        functions, 
        'queryArtifact'
      );
      
      const result = await queryFn({ artifactId, query });
      return result.data;
    } catch (error) {
      console.error("Erro ao consultar IA:", error);
      throw new Error("Falha ao processar sua pergunta. Tente novamente.");
    }
  },

  /**
   * Processa um PDF recém-uploadado (Gera chunks e embeddings)
   * Nota: Em produção, isso seria automático via Trigger do Storage.
   */
  async processArtifact(artifactId: string, textContent?: string): Promise<{ success: boolean }> {
    try {
      const processFn = httpsCallable<{ artifactId: string; textContent?: string }, { success: boolean }>(
        functions, 
        'processArtifact'
      );
      
      const result = await processFn({ artifactId, textContent });
      return result.data;
    } catch (error) {
      console.error("Erro ao processar artefato:", error);
      throw new Error("Falha ao indexar documento.");
    }
  }
};
