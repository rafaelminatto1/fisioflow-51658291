import { supabase } from '@/integrations/supabase/client';
// Simple hash function for browser compatibility
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

interface CacheEntry {
  response: string;
  confidence: number;
  similarity?: number;
}

export class SemanticCache {
  private readonly SIMILARITY_THRESHOLD = 0.75;
  private readonly DEFAULT_TTL_HOURS = 24;

  async get(query: string): Promise<CacheEntry | null> {
    try {
      const queryHash = this.hashQuery(query);
      
      // Primeiro, busca exata por hash
      const { data: exactMatch } = await supabase
        .from('ai_cache')
        .select('*')
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (exactMatch) {
        await this.updateUsageCount(exactMatch.id);
        return {
          response: exactMatch.response,
          confidence: exactMatch.confidence_score,
          similarity: 1.0
        };
      }

      // Busca semântica para consultas similares
      const semanticMatch = await this.findSemanticMatch(query);
      if (semanticMatch) {
        await this.updateUsageCount(semanticMatch.id);
        return {
          response: semanticMatch.response,
          confidence: semanticMatch.confidence_score * semanticMatch.similarity,
          similarity: semanticMatch.similarity
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  async set(
    query: string, 
    response: string, 
    confidence: number = 0.8,
    ttlHours: number = this.DEFAULT_TTL_HOURS
  ): Promise<void> {
    try {
      const queryHash = this.hashQuery(query);
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      await supabase.from('ai_cache').upsert({
        query_hash: queryHash,
        query_text: query,
        response,
        source: 'provider',
        confidence_score: confidence,
        expires_at: expiresAt.toISOString(),
        usage_count: 1
      });
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  private hashQuery(query: string): string {
    // Normaliza a query antes de fazer hash
    const normalized = query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
    
    return simpleHash(normalized);
  }

  private async findSemanticMatch(query: string): Promise<any> {
    try {
      // Busca por palavras-chave em comum
      const keywords = this.extractKeywords(query);
      
      if (keywords.length === 0) return null;

      const { data: candidates } = await supabase
        .from('ai_cache')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .limit(50);

      if (!candidates || candidates.length === 0) return null;

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const candidate of candidates) {
        const similarity = this.calculateSimilarity(query, candidate.query_text);
        
        if (similarity > this.SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
          bestMatch = { ...candidate, similarity };
          bestSimilarity = similarity;
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Error finding semantic match:', error);
      return null;
    }
  }

  private extractKeywords(text: string): string[] {
    // Lista de palavras importantes para fisioterapia
    const medicalTerms = [
      'dor', 'lombar', 'cervical', 'ombro', 'joelho', 'quadril', 'punho',
      'fisioterapia', 'exercicio', 'protocolo', 'mobilizacao', 'fortalecimento',
      'alongamento', 'reabilitacao', 'lesao', 'trauma', 'cirurgia', 'pos',
      'operatorio', 'ortopedico', 'neurologico', 'respiratorio', 'cardio'
    ];

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Prioriza termos médicos
    const importantWords = words.filter(word => 
      medicalTerms.some(term => word.includes(term) || term.includes(word))
    );

    // Se não há termos médicos, usa palavras mais frequentes
    if (importantWords.length === 0) {
      return words.slice(0, 5);
    }

    return [...new Set(importantWords)].slice(0, 8);
  }

  private calculateSimilarity(query1: string, query2: string): number {
    const keywords1 = new Set(this.extractKeywords(query1));
    const keywords2 = new Set(this.extractKeywords(query2));

    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);

    if (union.size === 0) return 0;

    // Jaccard similarity com peso extra para termos médicos
    return intersection.size / union.size;
  }

  private async updateUsageCount(cacheId: string): Promise<void> {
    try {
      // Get current usage count
      const { data: currentEntry } = await supabase
        .from('ai_cache')
        .select('usage_count')
        .eq('id', cacheId)
        .single();

      if (currentEntry) {
        await supabase
          .from('ai_cache')
          .update({ usage_count: currentEntry.usage_count + 1 })
          .eq('id', cacheId);
      }
    } catch (error) {
      console.error('Error updating usage count:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Remove entradas expiradas
      await supabase
        .from('ai_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Remove entradas menos usadas se o cache está muito grande
      const { count } = await supabase
        .from('ai_cache')
        .select('*', { count: 'exact', head: true });

      if (count && count > 10000) {
        const { data: leastUsed } = await supabase
          .from('ai_cache')
          .select('id')
          .order('usage_count', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(1000);

        if (leastUsed) {
          const idsToDelete = leastUsed.map(item => item.id);
          await supabase
            .from('ai_cache')
            .delete()
            .in('id', idsToDelete);
        }
      }
    } catch (error) {
      console.error('Error cleaning up cache:', error);
    }
  }
}