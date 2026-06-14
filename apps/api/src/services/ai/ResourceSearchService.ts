import { or } from "drizzle-orm";
import { createDb, runWithOrg } from "../../lib/db";
import { searchFilter } from "../../lib/db-utils";
import { 
  exercises, 
  clinicalTestTemplates, 
  exerciseProtocols, 
  wikiPages,
  clinicalResourceSuggestions
} from "@fisioflow/db";
import type { Env } from "../../types/env";
import { runAi } from "../../lib/ai-native";
import { searchAiSearch } from "../../lib/cloudflareAiSearch";
import { WORKERS_AI_MODELS } from "../../lib/workersAi";

export interface Resource {
  id: string;
  type: "test" | "exercise" | "protocol" | "wiki" | "external_suggestion";
  title: string;
  description: string;
  thumbnailUrl?: string;
  score: number;
  source: "system" | "ai_search" | "youtube" | "wiki";
  action: {
    kind: "open_modal" | "open_url" | "create_suggestion";
    target: string;
  };
  metadata?: Record<string, any>;
}

export interface SearchContext {
    patientCondition?: string;
    painLevel?: number;
    goal?: string;
}

export class ResourceSearchService {
  constructor(private env: Env) {}

  /**
   * Busca unificada de recursos clínicos (IA + Banco Interno + Sugestões Externas)
   */
  public async searchResources(
    query: string, 
    organizationId: string,
    context?: SearchContext,
    types: string[] = ["test", "exercise", "protocol", "wiki"]
  ): Promise<Resource[]> {
    const allResults: Resource[] = [];
    const seenIds = new Set<string>();

    // Extração básica de região do corpo para booster de relevância
    const bodyRegions = ["joelho", "ombro", "coluna", "quadril", "tornozelo", "cervical", "lombar", "punho", "mão", "pé"];
    const detectedRegion = bodyRegions.find(r => query.toLowerCase().includes(r));

    // 1. Busca Semântica via Cloudflare AI Search (RAG)
    if (this.env.AI_SEARCH) {
      try {
        const aiResults = await searchAiSearch(this.env, {
          messages: [
            {
                role: "system",
                content: `Você é o assistente de busca clínica do FisioFlow.
                Sua tarefa é encontrar os melhores recursos (testes, exercícios, protocolos) para a necessidade do fisioterapeuta.
                Seja técnico e preciso. Priorize evidência científica.
                Contexto do paciente: Condição=${context?.patientCondition || 'N/A'}, Dor=${context?.painLevel || 'N/A'}`
            },
            { role: "user", content: query }
          ],
          maxNumResults: 10,
        });

        for (const source of aiResults.sources || []) {
          const resType = (source.metadata?.source as string) || "wiki";
          if (types.includes(resType) || types.includes("wiki")) {
             // Booster se o conteúdo menciona a região detectada
             const booster = detectedRegion && source.content?.toLowerCase().includes(detectedRegion) ? 0.1 : 0;
             allResults.push({
               id: source.id,
               type: resType as any,
               title: (source.metadata?.title as string) || source.filename || "Recurso Clínico",
               description: source.content?.slice(0, 200) || "",
               score: (source.score || 0.7) + booster,
               source: "ai_search",
               action: { kind: "open_modal", target: source.id },
               metadata: source.metadata
             });
             seenIds.add(source.id);
          }
        }
      } catch (err) {
        console.error("[ResourceSearch] AI Search failed:", err);
      }
    }

    // 2. Busca no Banco Interno (Neon) via Drizzle
    // Complementa o RAG com metadados ricos e itens recentes não indexados.
    const db = createDb(this.env);
    
    try {
        await runWithOrg(organizationId, async () => {
            // Exercícios
            if (types.includes("exercise")) {
                const internalEx = await db.select().from(exercises)
                    .where(or(searchFilter(exercises.name, query), searchFilter(exercises.description, query)))
                    .limit(4);
                
                for (const ex of internalEx) {
                    if (seenIds.has(ex.id)) continue;
                    allResults.push({
                        id: ex.id,
                        type: "exercise",
                        title: ex.name,
                        description: ex.description || "",
                        thumbnailUrl: ex.thumbnailUrl || undefined,
                        score: 0.9,
                        source: "system",
                        action: { kind: "open_modal", target: ex.id }
                    });
                }
            }

            // Testes Padronizados
            if (types.includes("test")) {
                const internalTests = await db.select().from(clinicalTestTemplates)
                    .where(or(searchFilter(clinicalTestTemplates.name, query), searchFilter(clinicalTestTemplates.targetJoint, query)))
                    .limit(3);

                for (const test of internalTests) {
                    if (seenIds.has(test.id)) continue;
                    allResults.push({
                        id: test.id,
                        type: "test",
                        title: test.name,
                        description: test.purpose || "",
                        thumbnailUrl: test.imageUrl || undefined,
                        score: 0.85,
                        source: "system",
                        action: { kind: "open_modal", target: test.id }
                    });
                }
            }
        });
    } catch (dbErr) {
        console.error("[ResourceSearch] DB query failed:", dbErr);
    }

    // 3. Fallback Externo (YouTube) se resultados forem escassos
    if (allResults.length < 3 && types.includes("exercise")) {
        const suggestion = await this.generateExternalSuggestion(query);
        if (suggestion) allResults.push(suggestion);
    }

    return allResults.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  private async generateExternalSuggestion(query: string): Promise<Resource | null> {
      const prompt = `Você é um especialista em biomecânica e fisioterapia esportiva.
      O usuário buscou por "${query}" e não há resultados no banco interno.

      Sugira UM exercício terapêutico baseado em evidências (ex: protocolo de eccêntricos, exercícios de controle motor).

      Responda APENAS um JSON válido (sem markdown, sem explicações extras):
      {
        "title": "Título Curto do Exercício",
        "description": "Explicação clínica concisa (max 150 caracteres) focada no objetivo biomecânico."
      }`;
      
      try {
          const res = await runAi(this.env, WORKERS_AI_MODELS.llama_3_1_8b, {
              messages: [{ role: "user", content: prompt }] 
          }, { cache: true, cacheTtl: 86400 });
          
          const content = (res as any).response || (res as any).text || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return null;
          
          const data = JSON.parse(jsonMatch[0]);
          
          return {
              id: `ext-${Date.now()}`,
              type: "external_suggestion",
              title: data.title,
              description: data.description,
              score: 0.65,
              source: "youtube",
              action: { 
                  kind: "create_suggestion", 
                  target: `https://www.youtube.com/results?search_query=fisioterapia+${encodeURIComponent(data.title)}+tutorial+reabilitação`
              }
          };
      } catch (err) {
          console.warn("[ResourceSearch] External suggestion failed:", err);
          return null;
      }
  }

  /**
   * Salva uma sugestão de recurso para curadoria futura
   */
  public async saveSuggestion(
      orgId: string, 
      userId: string | null, 
      resource: Resource, 
      query: string
  ) {
      const db = createDb(this.env);
      return await runWithOrg(orgId, async () => {
          return await db.insert(clinicalResourceSuggestions).values({
              organizationId: orgId,
              userId: userId,
              query: query,
              suggestedType: (resource.type === "external_suggestion" ? "exercise" : resource.type) as any,
              suggestedTitle: resource.title,
              externalSource: resource.action.target,
              status: "pending",
              metadata: resource.metadata || {}
          });
      });
  }
}
