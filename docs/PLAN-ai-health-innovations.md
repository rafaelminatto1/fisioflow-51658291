# PLAN: FisioFlow AI Studio 2.0 & Next-Gen Clinical AI Ecosystem

> **Task Slug:** `ai-health-innovations`  
> **Status:** APPROVED & READY FOR IMPLEMENTATION  
> **Stack:** Cloudflare Paid Workers (Workers AI 70B/32B/72B/8B, Vectorize, Hyperdrive, D1, Workflows, Queues, Durable Objects, Containers), Neon PostgreSQL (sa-east-1 / GRU).

---

## 🎯 Executive Summary & Context

Baseado na pesquisa de estado da arte (Exa 2025/2026, CPGs PubMed) e no alinhamento estratégico via `/grill-me`, o **FisioFlow AI Studio 2.0** centralizará 3 grandes pilares de Inteligência Artificial para clínicas de Fisioterapia em São Paulo:

1. **Inteligência Biomecânica Multimodal (Visão + Kinematics):**
   - Análise de marcha, salto e postura via vídeos/câmeras.
   - Detecção de compensações posturais em tempo real.
   - Geração automática de rascunhos de relatórios estruturados com supervisão do fisioterapeuta (*Clinician-in-the-loop*).

2. **Engajamento & Telereabilitação Guiada:**
   - Biofeedback visual/auditivo para o paciente durante a execução de exercícios em casa.
   - Monitoramento contínuo de adesão e cálculo de risco de desistência ou re-lesão.

3. **Copiloto Clínico Avançado & RAG Multimotor:**
   - Integração fluida entre dados do paciente (Neon DB), protocolos da clínica e evidência internacional PubMed (CPGs).
   - Seletor de motor LLM da Cloudflare (Llama 3.3 70B, DeepSeek R1 32B, Qwen 2.5 72B, Llama 3.1 8B).

---

## 🏛️ Arquitetura de Infraestrutura (100% Cloudflare Paid + Neon DB)

```mermaid
graph TD
    Client[App Web & Widget Pro] -->|HTTPS / Smart Placement| Edge[Cloudflare Edge Worker]
    Edge -->|Multi-LLM| WAI[Cloudflare Workers AI]
    Edge -->|RAG Embedding & Vector Search| Vectorize[Cloudflare Vectorize / AI Search]
    Edge -->|Connection Pool (sa-east-1)| Hyperdrive[Cloudflare Hyperdrive]
    Hyperdrive --> Neon[Neon PostgreSQL DB]
    Edge -->|Stateful Real-time Live Session| DO[Durable Objects]
    Edge -->|Background Kinematic Processing| Container[BiomechanicsPoseContainer (Python/OpenCV)]
    Edge -->|Resilient Multi-step State Machines| Workflows[Cloudflare Workflows]
```

---

## 📑 Plano de Ação por Fases (Task Breakdown)

### Fase 1: Consolidar o Hub Unificado "FisioFlow AI Studio 2.0"
- **Objetivo:** Criar o cockpit central na UI unindo Análise Biomecânica, RAG Clínico e Monitoramento do Gêmeo Digital.
- **Componentes UI:**
  - `src/pages/ai/AIStudioHubPage.tsx`: Dashboard integrada com abas rápidas (Visão & Postura, RAG PubMed & CPGs, Gêmeo Digital do Paciente).
  - Manter o `<GlobalAIChatWidget />` e o `<GlobalAISpotlight />` omnipresentes em todas as telas.

### Fase 2: Motor Biomecânico de Rascunho de Avaliação (Clinician-in-the-loop)
- **Objetivo:** Implementar o padrão OGA-AID que recebe gravação de movimento do paciente e notas preliminares do fisioterapeuta, gerando um laudo biomecânico estruturado.
- **Backend / Edge:**
  - Endpoint `/api/biomechanics/draft-report` na API do Worker.
  - Integração com `WORKFLOW_BIOMECHANICS_ANALYSIS` para processamento sem travamentos na UI.

### Fase 3: RAG Multimotor & Busca Semântica em Prontuários (Neon + Vectorize)
- **Objetivo:** Permitir busca por linguagem natural cruzando sintomas, testes clínicos e artigos PubMed.
- **Endpoints API:**
  - `/api/copilot/search-clinical-history`
  - `/api/copilot/pubmed-cpg-lookup`

### Fase 4: Painel Interno de Aprovação de Alertas & Relatórios
- **Objetivo:** Garantir que 100% dos relatórios e alertas passem por revisão no painel web antes de qualquer comunicação externa.
- **UI Component:** `src/components/ai/ClinicalReportApprovalModal.tsx`.

---

## ✅ Plano de Verificação & Testes (QA Checklist)

| Teste | Tipo | Ferramenta / Comando | Resultado Esperado |
| :--- | :---: | :--- | :--- |
| **Build Web** | Compilação | `pnpm --filter fisioflow-web build` | 0 erros de TypeScript e sintaxe |
| **Build API** | Compilação | `pnpm --filter @fisioflow/api build` | Worker bundle válido |
| **Deploy Assets** | Nuvem | `npx wrangler deploy --env production` | Upload concluído em `moocafisio.com.br` |
| **Deploy Backend** | Nuvem | `pnpm --filter @fisioflow/api run deploy` | Worker publicado em `api-pro.moocafisio.com.br` |
