/**
 * AI Cache System - Economiza chamadas à API
 * 
 * Estratégias:
 * 1. Cache de respostas por hash da pergunta
 * 2. Similaridade semântica para reutilizar respostas
 * 3. TTL configurável
 */

export interface CachedResponse {
  id: string;
  query_hash: string;
  query_text: string;
  response: any;
  model_used: string;
  created_at: string;
  expires_at: string;
  hit_count: number;
}

export interface CacheStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  estimatedSavings: number; // in USD
}

// Simple hash function for queries
function hashQuery(query: string, context: any): string {
  const str = JSON.stringify({ query, conditions: context.conditions, painLevel: context.painLevel });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `cache-${Math.abs(hash).toString(16)}`;
}

// Check if cached response is still valid
function isCacheValid(cached: CachedResponse): boolean {
  if (!cached.expires_at) return false;
  return new Date(cached.expires_at) > new Date();
}

// Calculate cache TTL based on query type
function getCacheTTL(query: string): number {
  // Exercise suggestions: 7 days (exercises don't change often)
  if (query.includes('exercício') || query.includes('exercise')) {
    return 7 * 24 * 60 * 60 * 1000; // 7 days
  }
  // Patient insights: 1 day
  if (query.includes('paciente') || query.includes('patient')) {
    return 24 * 60 * 60 * 1000; // 1 day
  }
  // General queries: 3 days
  return 3 * 24 * 60 * 60 * 1000;
}

export async function getCachedResponse(
  query: string,
  context: any,
  queryNeon: (sql: string, params: any[], url: string) => Promise<any[]>,
  databaseUrl: string
): Promise<{ found: boolean; response?: any; cached?: CachedResponse }> {
  try {
    const queryHash = hashQuery(query, context);
    
    const sql = `
      SELECT * FROM ai_cache 
      WHERE query_hash = $1 
      LIMIT 1
    `;
    
    const results = await queryNeon(sql, [queryHash], databaseUrl);
    
    if (results.length > 0) {
      const cached = results[0] as CachedResponse;
      
      if (isCacheValid(cached)) {
        // Update hit count
        await queryNeon(
          'UPDATE ai_cache SET hit_count = hit_count + 1 WHERE id = $1',
          [cached.id],
          databaseUrl
        );
        
        return { found: true, response: cached.response, cached };
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error('Cache lookup error:', error);
    return { found: false };
  }
}

export async function setCachedResponse(
  query: string,
  context: any,
  response: any,
  modelUsed: string,
  queryNeon: (sql: string, params: any[], url: string) => Promise<any[]>,
  databaseUrl: string
): Promise<void> {
  try {
    const queryHash = hashQuery(query, context);
    const ttl = getCacheTTL(query);
    const expiresAt = new Date(Date.now() + ttl).toISOString();
    
    const sql = `
      INSERT INTO ai_cache (query_hash, query_text, response, model_used, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (query_hash) 
      DO UPDATE SET 
        response = EXCLUDED.response,
        model_used = EXCLUDED.model_used,
        expires_at = EXCLUDED.expires_at,
        hit_count = 0,
        created_at = NOW()
    `;
    
    await queryNeon(sql, [
      queryHash,
      query.substring(0, 500),
      JSON.stringify(response),
      modelUsed,
      expiresAt
    ], databaseUrl);
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

export async function getCacheStats(
  queryNeon: (sql: string, params: any[], url: string) => Promise<any[]>,
  databaseUrl: string
): Promise<CacheStats> {
  try {
    const statsSql = `
      SELECT 
        COUNT(*) as total_queries,
        SUM(hit_count) as cache_hits,
        COUNT(CASE WHEN hit_count > 0 THEN 1 END) as cached_entries
      FROM ai_cache
    `;
    
    const result = await queryNeon(statsSql, [], databaseUrl);
    const stats = result[0];
    
    // Estimate savings (assume $0.0001 per cached response reused)
    const estimatedSavings = (parseInt(stats.cache_hits) || 0) * 0.0001;
    
    return {
      totalQueries: parseInt(stats.total_queries) || 0,
      cacheHits: parseInt(stats.cache_hits) || 0,
      cacheMisses: (parseInt(stats.total_queries) || 0) - (parseInt(stats.cached_entries) || 0),
      estimatedSavings
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return { totalQueries: 0, cacheHits: 0, cacheMisses: 0, estimatedSavings: 0 };
  }
}

// Clean expired cache entries
export async function cleanExpiredCache(
  queryNeon: (sql: string, params: any[], url: string) => Promise<any[]>,
  databaseUrl: string
): Promise<number> {
  try {
    const sql = `DELETE FROM ai_cache WHERE expires_at < NOW()`;
    await queryNeon(sql, [], databaseUrl);
    return 0;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
}