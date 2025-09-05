import { supabase } from '@/integrations/supabase/client';
import { SemanticCache } from './SemanticCache';
import { ProviderRotator } from './ProviderRotator';
import { KnowledgeBase } from './KnowledgeBase';

interface AIQueryContext {
  patientId?: string;
  userId?: string;
  sessionId?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface AIResponse {
  response: string;
  source: 'knowledge_base' | 'cache' | 'provider' | 'fallback';
  confidence: number;
  processingTime: number;
  provider?: string;
}

export class AIOrchestrator {
  private cache: SemanticCache;
  private providerRotator: ProviderRotator;
  private knowledgeBase: KnowledgeBase;

  constructor() {
    this.cache = new SemanticCache();
    this.providerRotator = new ProviderRotator();
    this.knowledgeBase = new KnowledgeBase();
  }

  async query(
    question: string,
    context: AIQueryContext = {}
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Primeiro: Buscar na base de conhecimento interna
      const knowledgeResult = await this.knowledgeBase.search(question, context);
      if (knowledgeResult && knowledgeResult.confidence > 0.8) {
        await this.logQuery(question, knowledgeResult.response, 'knowledge_base', context, Date.now() - startTime);
        return {
          response: knowledgeResult.response,
          source: 'knowledge_base',
          confidence: knowledgeResult.confidence,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Segundo: Verificar cache semântico
      const cachedResult = await this.cache.get(question);
      if (cachedResult && cachedResult.confidence > 0.7) {
        await this.logQuery(question, cachedResult.response, 'cache', context, Date.now() - startTime);
        return {
          response: cachedResult.response,
          source: 'cache',
          confidence: cachedResult.confidence,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Terceiro: Usar contas premium com rotação inteligente
      const providerResult = await this.providerRotator.query(question, context);
      if (providerResult) {
        // Salvar no cache para uso futuro
        await this.cache.set(question, providerResult.response, providerResult.confidence);
        await this.logQuery(question, providerResult.response, 'provider', context, Date.now() - startTime, providerResult.provider);
        
        return {
          response: providerResult.response,
          source: 'provider',
          confidence: providerResult.confidence,
          processingTime: Date.now() - startTime,
          provider: providerResult.provider
        };
      }

      // 4. Fallback: Resposta padrão baseada na categoria
      const fallbackResponse = this.getFallbackResponse(question, context);
      await this.logQuery(question, fallbackResponse, 'fallback', context, Date.now() - startTime);
      
      return {
        response: fallbackResponse,
        source: 'fallback',
        confidence: 0.3,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('AIOrchestrator error:', error);
      const fallbackResponse = this.getFallbackResponse(question, context);
      
      return {
        response: fallbackResponse,
        source: 'fallback',
        confidence: 0.2,
        processingTime: Date.now() - startTime
      };
    }
  }

  private async logQuery(
    query: string, 
    response: string, 
    source: string, 
    context: AIQueryContext,
    processingTime: number,
    provider?: string
  ) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', context.userId)
        .single();

      await supabase.from('ai_queries').insert({
        user_id: profile?.id,
        patient_id: context.patientId,
        query_text: query,
        response_text: response,
        source: provider ? `${source}:${provider}` : source,
        processing_time_ms: processingTime,
        context_data: context as Record<string, unknown>
      });
    } catch (error) {
      console.error('Error logging query:', error);
    }
  }

  private getFallbackResponse(question: string, context: AIQueryContext): string {
    const category = context.category || 'geral';
    
    const fallbacks = {
      protocolo: `Para o desenvolvimento de um protocolo personalizado, recomendo:
        1. Avaliação completa do paciente
        2. Definição de objetivos específicos
        3. Seleção de técnicas baseadas em evidências
        4. Monitoramento constante da evolução
        
        Consulte a literatura científica atual e considere as particularidades do caso.`,
      
      diagnostico: `Para um diagnóstico diferencial adequado, considere:
        1. História clínica detalhada
        2. Exame físico sistemático
        3. Testes específicos quando indicados
        4. Correlação com achados de imagem
        
        Em caso de dúvidas ou sinais de alerta, encaminhe para avaliação médica.`,
      
      exercicio: `Para prescrição de exercícios terapêuticos:
        1. Considere o nível funcional atual
        2. Respeite limitações e contraindicações
        3. Progresse gradualmente
        4. Monitore tolerância e resposta
        
        Baseie-se sempre em evidências científicas atuais.`,
      
      geral: `Recomendo consultar:
        1. Diretrizes clínicas atualizadas
        2. Literatura científica relevante
        3. Protocolos institucionais
        4. Discussão com colegas experientes
        
        Para informações mais específicas, reformule sua pergunta com mais detalhes.`
    };

    return fallbacks[category as keyof typeof fallbacks] || fallbacks.geral;
  }

  async rateResponse(queryId: string, rating: number, feedback?: string): Promise<void> {
    try {
      await supabase
        .from('ai_queries')
        .update({ rating, feedback })
        .eq('id', queryId);
    } catch (error) {
      console.error('Error rating response:', error);
    }
  }

  async getUsageStats(): Promise<{
    totalQueries: number;
    averageResponseTime: number;
    sourceDistribution: Record<string, number>;
    averageRating: number;
    cacheHitRate: number;
  } | null> {
    try {
      const { data } = await supabase
        .from('ai_queries')
        .select('source, processing_time_ms, rating, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const stats = {
        totalQueries: data?.length || 0,
        averageResponseTime: 0,
        sourceDistribution: {} as Record<string, number>,
        averageRating: 0,
        cacheHitRate: 0
      };

      if (data && data.length > 0) {
        stats.averageResponseTime = data.reduce((sum, q) => sum + (q.processing_time_ms || 0), 0) / data.length;
        
        data.forEach(query => {
          const source = query.source || 'unknown';
          stats.sourceDistribution[source] = (stats.sourceDistribution[source] || 0) + 1;
        });

        const ratedQueries = data.filter(q => q.rating);
        if (ratedQueries.length > 0) {
          stats.averageRating = ratedQueries.reduce((sum, q) => sum + (q.rating || 0), 0) / ratedQueries.length;
        }

        const cacheQueries = data.filter(q => q.source?.includes('cache')).length;
        stats.cacheHitRate = (cacheQueries / data.length) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();