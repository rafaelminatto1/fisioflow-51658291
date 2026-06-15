# Plan: Expansão Cloudflare AI

**Spec**: [spec.md](./spec.md) | **Data**: 2026-06-12

## Technical Context

| Área          | Estado atual                                                                                                                                                                                                                      | Mudança                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| AI Search     | Binding `AI_SEARCH` → instância `fisioflow-rag` (diff pendente no wrangler.toml reativa). Sync via `WikiSyncWorkflow` (cron diário + publish hook). Lib `apps/api/src/lib/cloudflareAiSearch.ts` (hybrid, rerank, rewrite, cache) | Publish → `items.uploadAndPoll()`; nova instância `fisioflow-rag-paciente`; indexers p/ protocolos/exercícios/PDFs |
| Embeddings    | pgvector no Neon (`clinical_embeddings`, bge-m3 via `env.AI`)                                                                                                                                                                     | Reusar padrão p/ `agent_memories` (US7)                                                                            |
| Agent Memory  | `lib/agentMemory.ts` + rota `/api/agent-memory` prontos; beta não liberado (10018); bindings comentados                                                                                                                           | Implementação dual: nativo quando binding existir, senão pgvector                                                  |
| Agents        | `agents@0.15`; DOs `ClinicAgent`, `PatientAgent`, `VoiceScribeAgent`                                                                                                                                                              | `useAgent` no front; fila de aprovação WhatsApp                                                                    |
| AI Gateway    | `fisioflow-gateway` ativo (roteamento)                                                                                                                                                                                            | Ativar guardrails + cache p/ assistente paciente                                                                   |
| Observability | Analytics Engine `fisioflow_events`                                                                                                                                                                                               | Novo evento `wiki_search_miss`                                                                                     |

## Decisões de arquitetura

1. **pgvector continua canônico para dados clínicos** (RLS, joins, transações). Vectorize não entra nesta spec.
2. **Isolamento do RAG paciente por instância**, não por filtro de metadata — falha de filtro não pode vazar conteúdo interno (Privacy First / LGPD).
3. **Indexação de conteúdo estruturado** (protocolos/exercícios): serializar para markdown determinístico (`protocolo-<id>.md`) e fazer upload via Items API; re-upload no update (mesmo filename = replace). Sync inicial via workflow manual; incremental via hooks nas rotas de mutation.
4. **Interface única de memória**: `lib/agentMemory.ts` ganha driver `pgvector` | `native`; seleção em runtime por presença do binding `AGENT_MEMory`/flag. Troca futura sem mudança nas rotas.
5. **Threshold de resposta**: respostas geradas só quando `score >= match_threshold` configurado; abaixo disso, UI mostra "não encontrei na wiki" + loga miss no Analytics Engine.

## Constitution Check

- **I. Spec-Driven**: spec/plan/tasks neste diretório. ✅
- **II. Multi-plataforma**: assistente paciente entra via API compartilhada (`apps/api`); UI web em `src/`, app paciente consome a mesma rota. ✅
- **III. Privacy & Compliance**: instância isolada p/ paciente; flag explícita `patient_visible` por página (default false); memórias respeitam `lgpd_consents`; PDFs clínicos indexados apenas do bucket interno com acesso autenticado nas rotas de busca. ✅
- **IV. Test-First**: cada task de backend tem teste Vitest antes da implementação (helpers de serialização, threshold, drivers de memória); E2E Playwright p/ Cmd+K. ✅
- **V. Observability**: eventos `wiki_search`, `wiki_search_miss`, `patient_assistant_query` no Analytics Engine; logs nos workflows. ✅

## Custos (escala atual: 10 fisios, 700 agend./mês, 100 pacientes)

- AI Search: US$ 0 (open beta; volumes muito abaixo dos limites free).
- Workers AI incremental (embeddings + respostas RAG): ~US$ 1–3/mês, parcialmente coberto pelos 10k neurons/dia grátis.
- Total incremental esperado: **< US$ 5/mês**. Risco: fim do beta do AI Search (aviso 30 dias).

## Sequenciamento

1. **Fase 1 (P1)**: US1 → US2 → US3. Dependência: commit do wrangler.toml primeiro (US1/AC4).
2. **Fase 2 (P2)**: US5 (barato, independente) em paralelo com US4; US6 por último (depende de UX validada do US2).
3. **Fase 3 (P3)**: US7 (fallback pgvector) independente; US8 e US9 dependem de definição de UX de aprovação.

Branch sugerido: `feat/cloudflare-ai-expansion` (fases podem virar PRs separados: `-p1-wiki-rag`, `-p2-patient-rag`, `-p3-agents`).
