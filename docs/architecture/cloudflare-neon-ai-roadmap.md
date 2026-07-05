# Roadmap de IA, RAG e Escalabilidade: Cloudflare-First + Neon Postgres

## 1. Visão Geral e Princípios Arquiteturais
Este documento mapeia a infraestrutura atual do FisioFlow e define o roadmap de evolução tecnológica em IA e armazenamento, respeitando rigidamente os constraints do projeto.

**Premissas Obrigatórias e Decisões:**
- **Usar:** Infraestrutura 100% Cloudflare (Workers, Assets, Hyperdrive, D1, KV, Queues, Workflows, Durable Objects).
- **Usar:** Banco de Dados relacional via Neon Postgres Serverless + pgvector.
- **Usar:** Hono como framework web no Workers.
- **Não Usar:** Railway, VPS, EC2, Vercel ou instâncias próprias.
- **Não Usar:** Modelo GLM 5.2 em produção.
- **Segurança (LGPD):** Separação estrita onde IA atua sobre dados clínicos e conhecimento público.
- **Custos:** Orçamento limitado (~R$ 500/mês).

## 2. Auditoria da Infraestrutura Atual

### 2.1 Bindings Cloudflare (`wrangler.toml`)
- **Hyperdrive:** `HYPERDRIVE` (Conexão em pool para o Neon).
- **R2 (Arquivos/Anexos):** `MEDIA_BUCKET`, `EXAMS_BUCKET`, `CLINICAL_DOCS_BUCKET`.
- **KV:** `FISIOFLOW_CONFIG`.
- **D1 (Cache/Edge):** `DB`, `EDGE_CACHE`.
- **Workers AI & Gateway:** `AI`, Gateway em `FISIOFLOW_AI_GATEWAY_URL`.
- **AI Search (AutoRAG):** `AI_SEARCH` (rag interno), `AI_SEARCH_PATIENT` (assistente do paciente).
- **Queues (Filas):** `BACKGROUND_QUEUE`, `WHATSAPP_QUEUE`, `WHATSAPP_DLQ`.
- **Workflows (Processos de Longa Duração):** `appointment-reminder`, `patient-onboarding`, `nfse-emission`, `hep-compliance`, `patient-discharge`, `patient-reengagement`, `patient-digital-twin`, `wiki-sync`, `knowledge-sync`, `session-summary`, `biomechanics-analysis`, `automation-executor`.
- **Durable Objects (Estado Distribuído):** `OrganizationState`, `PatientAgentSql`, `AssessmentLiveSession`, `ClinicAgentSql`, `VoiceScribeAgent`, `EvolutionCollaboration`.

### 2.2 Tabelas Neon/Drizzle Mapeadas (`src/schema/*`)
- **Pacientes:** `patients.ts` (dados do paciente, status de IA).
- **Sessões e Agenda:** `sessions.ts`, `appointments.ts`.
- **Evoluções (Prontuário):** `clinical.ts`.
- **Embeddings & Inteligência:** `clinical_intelligence.ts` (contém `clinical_embeddings` com tipo `vector(1536)` e o `patient_longitudinal_summary`).
- **Auditoria e Logs:** `audit.ts`.
- **Conhecimento (Wiki/Protocolos):** `wiki.ts`, `protocols.ts` (com capacidade de `vector(768)`).
- **Exercícios:** `exercises.ts`.
- **Mensagens:** `whatsapp-inbox.ts`, `messaging.ts`.
- **Mídia:** `media.ts`, `patient-media.ts` (referências ao R2).

### 2.3 Separação Arquitetural de Dados e IA
- **Neon Postgres + pgvector:** **EXCLUSIVO para dados clínicos sensíveis.** (Prontuários, evoluções, resumo longitudinal).
- **AI Search / AutoRAG:** **EXCLUSIVO para conhecimento NÃO sensível.** (Wiki da clínica, protocolos de reabilitação). Não deve indexar prontuários.
- **Vectorize:** Para buscas vetoriais customizadas de catálogo aberto (ex: biblioteca de exercícios).
- **R2:** Armazenamento isolado de arquivos (Exames = acesso restrito, Mídia = imagens de exercícios).
- **D1 / KV:** Cache de borda e configurações globais.

---

## 3. Roadmap de Implementação (Fases)

### Fase 1: AI Router, AI Gateway e Controle de Custo
- **Status:** Planejado
- **Prioridade:** Alta (Bloqueante para as demais)
- **Ações:**
  - Criar um módulo `AIRouter` (design pattern de Gateway interno) para centralizar chamadas a LLMs.
  - Todas as chamadas devem usar o Cloudflare AI Gateway para caching, retries e rate limiting.
  - **Logs obrigatórios:** Custo (em USD ou BRL), modelo utilizado, provedor (OpenAI, Anthropic, Workers AI), `taskType`, `userId`, `organizationId`.
  - **Riscos:** Latência adicionada pelo roteador. Usar cache ativamente.

### Fase 2: RAG Clínico Seguro (Neon pgvector)
- **Status:** Planejado
- **Prioridade:** Alta
- **Ações:**
  - Aproveitar a tabela `clinical_embeddings` e `patient_longitudinal_summary` no Neon.
  - Criar rotina para atualizar o Digital Twin do paciente de forma assíncrona (via Queue/Workflow) ao fim de cada sessão.
  - **Riscos:** Vazamento de dados cross-tenant (clínicas). Solução: RLS rigoroso no Postgres filtrando por `organizationId` na query vetorial.

### Fase 3: AI Search & AutoRAG (Wiki e Protocolos)
- **Status:** Planejado
- **Prioridade:** Média
- **Ações:**
  - Alimentar os bindings `AI_SEARCH` apenas com dados das tabelas `wiki` e `protocols`.
  - Ativar os workflows `wiki-sync` e `knowledge-sync` para manter o índice do AI Search atualizado.
  - **Riscos:** Timeout no Crawler. Solução: Inserção direta via API do AI Search no Worker.

### Fase 4: Vectorize para Biblioteca Não Sensível
- **Status:** Planejado
- **Prioridade:** Baixa/Média
- **Ações:**
  - Migrar a busca da tabela de exercícios (que atualmente tem `vector(768)`) e conteúdos globais para o Cloudflare Vectorize.
  - Objetivo: Diminuir o IO do Neon DB para buscas comuns de catálogo, economizando custos.

### Fase 5: ML Leve (Previsão de Faltas, Abandono e Aderência)
- **Status:** Futuro
- **Prioridade:** Baixa
- **Ações:**
  - Analisar histórico de sessões (`sessions` e `appointments`) via modelo leve (ex: Random Forest rodando em Workers AI ou script python empacotado no Cloudflare via WASM).
  - Integrar com o `automation-executor` Workflow para disparar mensagens preventivas.

### Fase 6: Evaluation Harness (Avaliação de IA)
- **Status:** Contínuo
- **Prioridade:** Média
- **Ações:**
  - Implementar pipeline "Human-in-the-loop". Todo raciocínio clínico gerado pela IA (`clinical_reasoning_logs` e evoluções) deve ser sinalizado como *Rascunho/Sugestão* na UI, exigindo aceite do fisioterapeuta.
  - Criar testes automatizados de aderência para prompts de IA.

### Fase 7: LGPD, Auditoria e Observabilidade
- **Status:** Contínuo
- **Prioridade:** Crítica
- **Ações:**
  - Garantir que deleção de paciente no Neon engatilhe um evento (Queue) que delete recursivamente: fotos no R2, resumos e embeddings associados ("Direito ao Esquecimento").
  - Gravar logs de acesso estruturados na tabela `audit` integrados com o Axiom (já configurado no `wrangler.toml`).

---

## 4. Checklist para Produção
- [ ] 1. Verificar se `DATABASE_URL` no Hyperdrive está usando pooler e senha forte.
- [ ] 2. Revisar e aplicar branch testing no Neon antes de deploy de Drizzle migrations (Workflow GitHub Actions).
- [ ] 3. Impedir qualquer indexação do bucket `EXAMS_BUCKET` pelo Crawler do AI Search.
- [ ] 4. Validação estrita de que NENHUMA requisição a LLMs passe fora do AI Router.
- [ ] 5. Testar failovers (ex: se AI Gateway falhar, lidar com o erro de forma graciosa na UI).
- [ ] 6. Nenhuma chave de API exposta diretamente no front-end.
