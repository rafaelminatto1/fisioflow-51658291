# Política de IA, Modelos e Providers (FisioFlow)

Esta política descreve as regras de governança, custo e segurança no uso de Inteligência Artificial dentro da plataforma FisioFlow. Todo código que consuma LLMs, AI Search ou Vectorize deve respeitar estas diretrizes sob risco de bloqueio da pipeline CI/CD.

## 1. Princípios Básicos

1. **Uso Obrigatório do AI Router:** Nenhuma requisição de IA (Gemini, Llama, OpenAI, etc.) pode ser feita diretamente por `fetch` ou SDKs isolados. Todo tráfego deve passar por `apps/api/src/lib/ai/aiRouter.ts`.
2. **Custo Controlado:** Toda chamada obrigatoriamente loga métricas de custo via AI Gateway (Cloudflare) na tabela `ai_usage_events`.
3. **Cheap-by-Default:** O sistema deve priorizar o modelo mais barato que resolva o problema (ex: `Llama-3-8b` ou `Gemini Flash`) antes de escalar para modelos Premium.
4. **Revisão Humana:** Tarefas preditivas (ML) ou sugestões de conduta clínica são restritas: a IA pode sumarizar ou explicar, mas **toda sugestão de conduta exige "Human-in-the-Loop" (revisão por um fisioterapeuta)**.
5. **Aterramento (Groundedness):** Toda resposta RAG deve referenciar as fontes usadas. Caso falte contexto, a IA é proibida de alucinar ou chutar, devendo responder: *"Não há informação suficiente no prontuário/biblioteca."*

## 2. Categorias de Modelos

| Categoria | Descrição | Exemplos Aceitos | Uso Permitido (TaskTypes) |
| --- | --- | --- | --- |
| **`cheap`** | Modelos rápidos e de baixo custo. | `@cf/meta/llama-3-8b-instruct`, `gemini-1.5-flash` | Correção gramatical, extração de JSON simples, explicações de risco. |
| **`medium`** | Modelos mais inteligentes para raciocínio clínico. | `gemini-1.5-pro` | Evolução SOAP complexa, resumos longitudinais, planos de tratamento. |
| **`embeddings`** | Geração de vetores numéricos. | `@cf/baai/bge-base-en-v1.5`, `text-embedding-004` | RAG Clínico (Neon), AutoRAG (Vectorize). |
| **`reranker`** | Ordenação semântica final. | `@cf/baai/bge-reranker-v2-m3` | RAG, IA Search. |
| **`forbidden`** | **BLOQUEADOS EM PRODUÇÃO.** | `GLM 5.2`, `gpt-4` (se não houver BAA assinado) | Nenhum. O sistema deve emitir erro 403. |

## 3. Segurança e Privacidade (LGPD)

- As camadas de minimização (Prompt 3) garantem que PIIs como CPF, RG e endereços são obliteradas ANTES do payload atingir o provedor.
- Não enviar prontuário completo, utilizar **RAG Clínico** para buscar estritamente o necessário (Prompt 4).

## 4. Testes e Avaliação (Harness)
Mudanças nos prompts e modelos requerem aprovação automática do Eval Harness (`apps/api/src/lib/ai/evaluation`) garantindo utilidade clínica e baixa alucinação (Prompt 8).
