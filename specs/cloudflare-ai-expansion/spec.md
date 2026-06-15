# Spec: Expansão Cloudflare AI — Wiki RAG, AI Search e Agentes

**Slug**: `cloudflare-ai-expansion` | **Data**: 2026-06-12 | **Status**: Draft

## Contexto

A infra Cloudflare do FisioFlow já é madura (Workers, Workflows, DOs, AI Search binding `fisioflow-rag`, AI Gateway, pgvector no Neon). Esta spec consolida o brainstorm de 2026-06-12 em entregas incrementais que aproveitam as novidades da plataforma:

- AI Search pós-abril/2026: built-in storage, `items.uploadAndPoll()`, cross-instance search, path filtering, reindex de arquivo individual — **grátis durante open beta**.
- Agent Memory: código pronto (`lib/agentMemory.ts`, rota `/api/agent-memory`), conta ainda **não liberada no private beta** (erro 10018) — fallback interno via pgvector até liberar.
- Agents SDK 0.15 já instalado; faltam as pontas (React hooks, human-in-the-loop, e-mail).

Escala: 10 profissionais, ~700 agendamentos/mês, 100 pacientes no app. Custo projetado de tudo: US$ 5–10/mês (ver plan.md).

## User Stories

### P1 — Wiki pesquisável e com respostas (núcleo RAG)

**US1 — Indexação imediata no publish**
Como editor da wiki, quando publico/atualizo uma página, quero que ela fique pesquisável no AI Search em segundos.

- AC1: ao publicar página, `items.uploadAndPoll()` indexa o documento na instância `fisioflow-rag` (substitui o disparo do WikiSyncWorkflow no evento publish).
- AC2: cron diário do WikiSyncWorkflow permanece como reconciliação.
- AC3: despublicar/excluir página remove o item do índice.
- AC4: diff pendente do `wrangler.toml` (reativação do binding AI_SEARCH) commitado e deployado.

**US2 — "Pergunte à Wiki" na UI (Cmd+K)**
Como profissional da clínica, quero perguntar em linguagem natural e receber resposta com citações clicáveis para as páginas-fonte.

- AC1: paleta de busca global (Cmd+K) no dashboard com modo "perguntar".
- AC2: resposta gerada exibe `sources` (título + score) linkando para `/wiki/:slug`.
- AC3: estados de loading/erro/sem-resultado em PT-BR; sem resposta inventada quando score < threshold.
- AC4: acesso restrito a roles internos (admin/fisio/estagiário).

**US3 — Indexar protocolos, exercícios e PDFs clínicos**
Como fisioterapeuta, quero que a busca cubra protocolos (119), exercícios (248) e documentos PDF do `CLINICAL_DOCS_BUCKET`.

- AC1: protocolos e exercícios serializados em markdown e indexados com metadata `{type, org_id}`.
- AC2: PDFs clínicos indexados (AI Search parseia PDF nativamente) com path filtering excluindo rascunhos.
- AC3: filtros de busca por tipo de conteúdo na UI.

### P2 — RAG do paciente e inteligência editorial

**US4 — Assistente do app do paciente (instância isolada)**
Como paciente, quero tirar dúvidas (orientações pós-sessão, cuidados, FAQ) e receber apenas conteúdo aprovado para pacientes.

- AC1: instância AI Search separada (`fisioflow-rag-paciente`) contendo somente conteúdo marcado como público-paciente.
- AC2: guardrails do AI Gateway ativos (moderação de entrada/saída) nas chamadas do assistente.
- AC3: respostas nunca citam conteúdo interno da equipe (garantido pelo isolamento de instância, não por prompt).
- AC4: disclaimer fixo "não substitui orientação do seu fisioterapeuta".

**US5 — Painel de lacunas da wiki**
Como admin, quero ver perguntas que a busca não conseguiu responder para pautar novos artigos.

- AC1: queries com score máximo < threshold ou zero resultados logadas no Analytics Engine (`fisioflow_events`).
- AC2: card no dashboard admin listando top perguntas sem resposta (últimos 30 dias).

**US6 — Sugestões contextuais na evolução**
Como fisioterapeuta escrevendo evolução, quero ver artigos da wiki relacionados ao texto da sessão.

- AC1: busca híbrida debounced (≥ 800ms idle) com o texto atual; painel lateral discreto.
- AC2: zero impacto na digitação (busca em background, cancelável).

### P3 — Agentes e memória

**US7 — Agent Memory com fallback pgvector**
Como sistema, quero memória persistente por paciente/fisio (preferências, restrições, estilo de escrita) funcionando hoje via pgvector e trocável para o Agent Memory nativo quando o beta liberar.

- AC1: tabela `agent_memories` (org/patient/therapist scoped, embedding bge-m3) atrás da interface existente de `lib/agentMemory.ts`.
- AC2: implementação selecionada por feature flag/binding: se `AGENT_MEMORY` existir, usa nativo; senão pgvector.
- AC3: escopo obrigatório por `organization_id` + respeito a `lgpd_consents` para memórias derivadas de conversas de paciente.
- AC4: lembrete automatizado verifica liberação do beta (rotina agendada externa — fora do escopo de código).

**US8 — Human-in-the-loop no WhatsApp**
Como admin, quero aprovar respostas sugeridas pelo agente antes do envio em casos sensíveis.

- AC1: respostas do bot classificadas (auto-send vs needs-approval); fila de aprovação no dashboard.
- AC2: aprovação/edição/rejeição com auditoria (quem, quando).

**US9 — Chat em tempo real com ClinicAgent (useAgent)**
Como profissional, quero um chat com o agente da clínica no dashboard via WebSocket com estado sincronizado.

- AC1: hook `useAgent` do Agents SDK conectado ao `ClinicAgent` existente.
- AC2: streaming de resposta + tool use visível (consulta agenda, wiki).

## Fora de escopo

- Voice agents por telefone (WhatsApp cobre o caso e custa menos).
- Migração dos embeddings clínicos de pgvector para Vectorize (sem ganho na escala atual).
- MCP server público da clínica (avaliar em spec própria se houver demanda).

## Riscos

- AI Search sair do beta com preço (aviso de 30 dias) — monitorar changelog.
- Agent Memory: beta privado sem ETA; mitigado pelo fallback pgvector (US7).
- LGPD: conteúdo indexado no AI Search do paciente precisa de curadoria explícita (flag por página), nunca indexação por padrão.
