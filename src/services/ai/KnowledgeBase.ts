import { supabase } from '@/integrations/supabase/client';

interface KnowledgeResult {
  response: string;
  confidence: number;
  source: 'knowledge_base';
  metadata?: {
    title: string;
    type: string;
    author?: string;
  };
}

interface AIQueryContext {
  patientId?: string;
  userId?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

export class KnowledgeBase {
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  async search(query: string, context: AIQueryContext = {}): Promise<KnowledgeResult | null> {
    try {
      // Extrai palavras-chave da consulta
      const keywords = this.extractKeywords(query);
      
      if (keywords.length === 0) {
        return null;
      }

      // Busca por tipo específico se identificado no contexto
      const typeFilter = this.identifyQueryType(query, context);
      
      // Busca na base de conhecimento
      let knowledgeQuery = supabase
        .from('knowledge_base')
        .select(`
          id,
          type,
          title,
          content,
          tags,
          confidence_score,
          usage_count,
          author_profile:profiles!knowledge_base_author_id_fkey (full_name)
        `)
        .overlaps('tags', keywords)
        .gte('confidence_score', this.CONFIDENCE_THRESHOLD)
        .order('confidence_score', { ascending: false })
        .order('usage_count', { ascending: false });

      if (typeFilter) {
        knowledgeQuery = knowledgeQuery.eq('type', typeFilter);
      }

      const { data: results } = await knowledgeQuery.limit(5);

      if (!results || results.length === 0) {
        return await this.searchByContent(query);
      }

      const bestMatch = results[0];
      
      // Incrementa contador de uso
      await this.incrementUsage(bestMatch.id);

      return {
        response: this.formatResponse(bestMatch, query),
        confidence: bestMatch.confidence_score,
        source: 'knowledge_base',
        metadata: {
          title: bestMatch.title,
          type: bestMatch.type,
          author: bestMatch.author_profile?.full_name
        }
      };

    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return null;
    }
  }

  private async searchByContent(query: string): Promise<KnowledgeResult | null> {
    try {
      // Busca por palavras no conteúdo usando full-text search
      const { data: contentResults } = await supabase
        .from('knowledge_base')
        .select(`
          id,
          type,
          title,
          content,
          confidence_score,
          author_profile:profiles!knowledge_base_author_id_fkey (full_name)
        `)
        .ilike('content', `%${query}%`)
        .gte('confidence_score', 0.6)
        .limit(3);

      if (!contentResults || contentResults.length === 0) {
        return null;
      }

      const bestMatch = contentResults[0];
      await this.incrementUsage(bestMatch.id);

      return {
        response: this.formatResponse(bestMatch, query),
        confidence: bestMatch.confidence_score * 0.8, // Reduz confiança para busca por conteúdo
        source: 'knowledge_base',
        metadata: {
          title: bestMatch.title,
          type: bestMatch.type,
          author: bestMatch.author_profile?.full_name
        }
      };

    } catch (error) {
      console.error('Error searching by content:', error);
      return null;
    }
  }

  private extractKeywords(query: string): string[] {
    // Termos específicos de fisioterapia
    const physioTerms = {
      // Regiões anatômicas
      'lombar': ['lombar', 'coluna_lombar', 'dor_lombar'],
      'cervical': ['cervical', 'coluna_cervical', 'pescoco'],
      'ombro': ['ombro', 'glenoumeral', 'escapular'],
      'joelho': ['joelho', 'patela', 'menisco'],
      'quadril': ['quadril', 'coxofemoral', 'iliaco'],
      'punho': ['punho', 'radiocarpal', 'maos'],
      
      // Técnicas
      'mobilizacao': ['mobilizacao', 'mobilizacao_neural', 'mobilizacao_articular'],
      'fortalecimento': ['fortalecimento', 'exercicio_resistido', 'musculacao'],
      'alongamento': ['alongamento', 'flexibilidade', 'estiramento'],
      'cinesioterapia': ['cinesioterapia', 'exercicio_terapeutico'],
      
      // Condições
      'dor': ['dor', 'algia', 'doloroso'],
      'lesao': ['lesao', 'trauma', 'injuria'],
      'pos_cirurgico': ['pos_operatorio', 'cirurgia', 'cirurgico'],
      'artrose': ['artrose', 'osteoartrite', 'degenerativo'],
      'artrite': ['artrite', 'inflamatorio', 'sinovite']
    };

    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const keywords = new Set<string>();

    // Mapeia palavras para termos específicos
    words.forEach(word => {
      Object.entries(physioTerms).forEach(([key, terms]) => {
        if (terms.some(term => word.includes(term) || term.includes(word))) {
          keywords.add(key);
          terms.forEach(t => keywords.add(t));
        }
      });
      
      // Adiciona a palavra original se for relevante
      if (word.length > 4) {
        keywords.add(word);
      }
    });

    return Array.from(keywords).slice(0, 10);
  }

  private identifyQueryType(query: string, context: AIQueryContext): string | null {
    const queryLower = query.toLowerCase();
    
    if (context.category) {
      return context.category;
    }

    // Identifica tipo baseado em palavras-chave
    if (queryLower.includes('protocolo') || queryLower.includes('tratamento')) {
      return 'protocolo';
    }
    
    if (queryLower.includes('exercicio') || queryLower.includes('exercitar')) {
      return 'exercicio';
    }
    
    if (queryLower.includes('diagnostico') || queryLower.includes('avaliar')) {
      return 'diagnostico';
    }
    
    if (queryLower.includes('tecnica') || queryLower.includes('como fazer')) {
      return 'tecnica';
    }
    
    if (queryLower.includes('caso') || queryLower.includes('paciente')) {
      return 'caso_clinico';
    }

    return null;
  }

  private formatResponse(entry: any, originalQuery: string): string {
    const header = `**${entry.title}** (${entry.type})\n\n`;
    const content = entry.content;
    const footer = entry.author_profile?.full_name 
      ? `\n\n*Fonte: ${entry.author_profile.full_name}*`
      : '\n\n*Fonte: Base de Conhecimento FisioFlow*';

    return header + content + footer;
  }

  private async incrementUsage(entryId: string): Promise<void> {
    try {
      // Get current usage count
      const { data: currentEntry } = await supabase
        .from('knowledge_base')
        .select('usage_count')
        .eq('id', entryId)
        .single();

      if (currentEntry) {
        await supabase
          .from('knowledge_base')
          .update({ usage_count: currentEntry.usage_count + 1 })
          .eq('id', entryId);
      }
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }

  async contribute(
    type: string,
    title: string,
    content: string,
    tags: string[],
    authorId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          type,
          title,
          content,
          tags,
          author_id: authorId,
          confidence_score: 0.7 // Inicia com confiança média
        });

      return !error;
    } catch (error) {
      console.error('Error contributing to knowledge base:', error);
      return false;
    }
  }

  async validate(entryId: string, validatorId: string, newConfidence: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .update({
          validated_by: validatorId,
          validated_at: new Date().toISOString(),
          confidence_score: newConfidence
        })
        .eq('id', entryId);

      return !error;
    } catch (error) {
      console.error('Error validating knowledge entry:', error);
      return false;
    }
  }

  async getPopularEntries(limit: number = 10): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('knowledge_base')
        .select(`
          id,
          type,
          title,
          usage_count,
          confidence_score,
          author_profile:profiles!knowledge_base_author_id_fkey (full_name)
        `)
        .order('usage_count', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error getting popular entries:', error);
      return [];
    }
  }
}