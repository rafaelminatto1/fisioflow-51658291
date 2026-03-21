# Guia de Vanguarda Cloudflare 2026 (FisioFlow)

Este documento consolida as melhores práticas e especificações técnicas das APIs da Cloudflare conforme documentação oficial de 2026. Deve ser usado como referência para todas as novas implementações no sistema FisioFlow.

## 1. AI Gateway & Cost Optimization
### Configuração Ideal
- **Endpoint Unificado:** `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat/chat/completions`
- **Prefix Caching:** Sempre que enviar prompts longos, o Gateway faz cache dos tensores.
- **Headers de Controle (2026):**
  - `x-session-affinity`: Use um ID de paciente para manter o cache quente para aquele contexto.
  - `cf-aig-cache-ttl`: Define o tempo de cache (substitui o antigo `cf-cache-ttl`).
  - `cf-aig-cache-key`: Para criar chaves de cache personalizadas por procedimento clínico.

## 2. Vectorize v2 (Busca Semântica Avançada)
### Indexação e Filtragem
- **Prerequisito:** Criar o índice de metadados via CLI antes de enviar os vetores.
  - `npx wrangler vectorize create-metadata-index {index} --property=difficulty --type=string`
- **Query com Filtro Pré-Vetorial:**
  ```typescript
  const results = await env.VECTOR_INDEX.query(vector, {
    topK: 20,
    filter: { 
      body_part: "joelho",
      difficulty: { $in: ["Fácil", "Médio"] } 
    }
  });
  ```
- **Nota:** O filtro é aplicado *antes* da busca por similaridade, garantindo que os resultados sejam clinicamente relevantes.

## 3. Agents SDK (Automação de Retenção)
### Arquitetura de Robôs
- **Stateful Agents:** Cada robô deve estender a classe `Agent` rodando sobre um `Durable Object`.
- **Persistent Memory:** Utilizar o SQLite interno do Durable Object para que o Agente "lembre" das últimas interações sem precisar consultar o banco principal Neon o tempo todo.
- **Self-Scheduling:** O Agente pode agendar seu próprio próximo check-up usando a API de alarmes do Durable Object.

## 4. Pipelines & Data Lake (R2 Iceberg)
### Ingestão de Telemetria
- **Sink Type:** `r2-data-catalog` (Apache Iceberg).
- **Vantagem:** Permite ACID transactions e "Time Travel" nas consultas.
- **R2 SQL:** Os dados salvos no R2 via Pipeline podem ser consultados via SQL nativo: `npx wrangler r2 sql query {db_name} "SELECT count(*) FROM telemetry WHERE event='exercise_completed'"`

## 5. Workers KV (Borda de Alta Performance)
### Padrões de Acesso
- **August 2025 Redesign:** KV agora é 3x mais rápido para chaves "quentes".
- **Metadata Optimization:** Guardar pequenos metadados (como status ou timestamps) diretamente no campo de metadata da chave KV para recuperá-los durante o `list()` sem custo extra de `get()`.
- **Binding:** Proibido uso de fetch/REST API. Sempre usar `env.KV_NAMESPACE`.

---
*Atualizado em: 20 de Março de 2026*
