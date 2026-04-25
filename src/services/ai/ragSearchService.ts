/**
 * RAG Search Service via Cloudflare Workers AI + Neon pgvector
 *
 * Arquitetura de fallback Multi-tier:
 * 1. Protocolos Clínicos (alta prioridade)
 * 2. Base de Conhecimento Wiki (Artigos locais)
 * 3. Fallback para LLM caso o nível de similaridade seja baixo ou se o usuário pedir.
 */

// Assume que existe uma inicialização de db usando drizzle
// import { db } from "@/server/db";
// import { exerciseProtocols, wikiPages } from "@/server/db/schema";

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: "protocol" | "wiki";
  similarity: number;
}

export class RagSearchService {
  // Chamada direta para o Cloudflare Workers AI para gerar Embedding
  // (Isso roda de graça na borda / Edge)
  static async generateEmbedding(text: string): Promise<number[]> {
    const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
    const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

    // Utiliza o modelo free BGE-base-en-v1.5 que gera vetores de 768 dimensões
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-base-en-v1.5`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error("Failed to generate embedding");
      }

      // Retorna o vetor numérico (array de 768 itens)
      return data.result.data[0];
    } catch (error) {
      console.error("Embedding Error", error);
      throw error;
    }
  }

  // Consulta no banco de dados Neon com PgVector
  static async semanticSearch(
    query: string,
    options: { limit?: number; minSimilarity?: number } = {},
  ): Promise<SearchResult[]> {
    const limit = options.limit || 5;
    // 1 - Cosine Distance: 1 é exatamente oposto, 0 é idêntico.
    // Então Similaridade = 1 - Distância
    // Passo 1: Transforma a pergunta do Fisioterapeuta em Vetor
    await this.generateEmbedding(query);

    const results: SearchResult[] = [];

    // Atenção: A implementação abaixo ilustra a montagem da SQL.
    // No uso real com o DB do Drizzle, injetamos a variável de forma segura.

    /*
    // Passo 2: Buscar Protocolos (Alta Prioridade)
    const protocolResults = await db.execute(sql`
      SELECT id, name as title, description as content,
             1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM exercise_protocols
      WHERE 1 - (embedding <=> ${vectorString}::vector) > ${options.minSimilarity || 0.6}
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `);

    // Passo 3: Buscar na Wiki (Artigos)
    const wikiResults = await db.execute(sql`
      SELECT id, title, content,
             1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM wiki_pages
      WHERE is_published = true
        AND 1 - (embedding <=> ${vectorString}::vector) > ${options.minSimilarity || 0.6}
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `);
    */

    // Ordenar consolidado de ambas as fontes (Exemplo)
    // results.push(...protocolResults.map(p => ({...p, source: "protocol"})));
    // results.push(...wikiResults.map(w => ({...w, source: "wiki"})));
    // results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  // Fluxo principal para responder ao Fisioterapeuta
  static async askAssistant(question: string) {
    // 1. Busca semântica nos Protocolos e Artigos locais
    const contextDocs = await this.semanticSearch(question, {
      limit: 3,
      minSimilarity: 0.65, // Retorna apenas docs muito relevantes
    });

    let contextPrompt = "";

    if (contextDocs.length > 0) {
      contextPrompt = `
      Utilize as seguintes fontes internas para basear a sua resposta.

      Fontes Locais Encontradas:
      ${contextDocs.map((doc) => `[${doc.source.toUpperCase()}] ${doc.title}: ${doc.content}`).join("\n\n")}
      `;
    } else {
      contextPrompt = `
      Nenhum protocolo ou artigo local exato foi encontrado para esta pergunta.
      Responda com base no seu conhecimento clínico geral informando ao fisioterapeuta que a resposta não vem de protocolos internos mapeados.
      `;
    }

    const systemPrompt = `
      Você é o FisioFlow AI, um assistente especializado em Fisioterapia.
      ${contextPrompt}

      Responda à pergunta do profissional com precisão, estruturando em tópicos quando aplicável.
    `;

    // 2. Chama a geração LLM (gemini ou Llama 3 via cloudflare worker) com o contexto "engolido"
    // return await NeonAIService.generate(question, { systemPrompt });
    return { contextDocs, systemPrompt };
  }
}
