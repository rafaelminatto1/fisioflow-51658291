# RAG Clínico Híbrido: Neon Postgres + Cloudflare AI

## Objetivo
Implementar a funcionalidade de RAG (Retrieval-Augmented Generation) para recuperar histórico longitudinal e sumários evolutivos, utilizando pesquisa semântica restrita, **sem vazar PII para bancos vetoriais gerenciados (ex: Cloudflare Vectorize)**. Todo dado clínico reside estritamente no Neon Postgres, utilizando a extensão `pgvector` junto com o Drizzle ORM.

## Arquitetura e Fluxo

### 1. Ingestão e Geração de Embeddings (`clinicalEmbeddingService.ts`)
Quando uma Sessão/Evolução é concluída:
- Uma *Queue* (Cloudflare Queues) processa a tarefa em background.
- É gerado um `contentSummary` através da IA (passando pela sanitização LGPD).
- Um embedding vetorial de 1536 dimensões é gerado via Workers AI (ex: `@cf/baai/bge-large-en-v1.5`).
- O dado é persistido em `clinical_embeddings` no Neon.

### 2. Semantic Retrieval Isolado (`ragClinicalContext.ts`)
- A busca semântica **exige** `organizationId` e `patientId`. 
- É expressamente proibido fazer RAG sem o `patientId` quando lidando com dados clínicos (evita vazamento de dados de Paciente A para Paciente B).
- A query é convertida em vetor usando a mesma API do Cloudflare, e a comparação é feita diretamente via ORM (`<=>` Cosseno) no Neon.

### 3. Prompt Builder Anti-Alucinação (`clinicalContextBuilder.ts`)
- Restringe os resultados concatenados a um teto rígido de Tokens (`maxTokens`).
- Possui uma diretiva central inquebrável: **"NUNCA invente exames, datas, sintomas ou melhoras que não estejam no contexto."**
- Se o array de contextos for vazio (score de similaridade baixo ou sem evoluções prévias), injeta a resposta padronizada e bloqueia o RAG.

### 4. Integração com a Camada de Segurança (AI Router)
- O prompt montado pelo `clinicalContextBuilder` é enviado ao `AIRouter`.
- O `AIRouter` registra a chamada no budget diário, sanitiza resíduos estruturais e despacha para o modelo de inferência configurado (ex: Llama-3 local).

## Regra de Negócio: requiresHumanReview
Toda requisição para o endpoint `/api/ai/rag/clinical` retorna uma flag booleana `requiresHumanReview`. 
Como o output da IA RAG baseia-se em sumários que podem carecer de nuances do exame físico visual, o Frontend **deve** exibir o resultado com um banner de "Sugestão" e exigir a confirmação do Fisioterapeuta antes de anexar a resposta a um laudo ou relatório.
