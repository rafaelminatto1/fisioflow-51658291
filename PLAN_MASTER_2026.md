# 🚀 Master Plan: FisioFlow 2026 (Visionary Roadmap)

**Data:** 21 de Fevereiro de 2026  
**Status:** Planning Mode  
**Objetivo:** Transformar o FisioFlow na plataforma de fisioterapia mais avançada, performática e bonita do mercado.

---

## 1. Resumo Executivo

O projeto atual já possui uma base sólida com React, Vite, Firebase e IA (MediaPipe/Gemini). No entanto, para atingir o próximo nível de excelência ("State of the Art"), precisamos evoluir de uma "aplicação funcional" para uma "experiência fluida e inteligente".

Este plano foca em 5 pilares estratégicos:
1.  **Experiência (UX/UI):** De "utilitário" para "encantador".
2.  **Inteligência (AI):** De "analítica" para "gerativa e proativa".
3.  **Arquitetura:** De "monorepo implícito" para "monorepo robusto".
4.  **Performance:** De "rápido" para "instantâneo".
5.  **Funcionalidades:** Novos recursos de engajamento e retenção.

---

## 2. Brainstorming de Melhorias & Inovações

### 🎨 UX/UI & Design System (O Fator "Uau")

*   **Micro-interações Cinematográficas:**
    *   Utilizar `framer-motion` (já instalado) para criar um sistema de transições compartilhado.
    *   *Ideia:* Transições de página onde o card do paciente "expande" para virar a página de detalhes (Shared Element Transitions).
    *   *Mobile:* Feedback háptico (`expo-haptics`) em cada conclusão de exercício ou agendamento.
*   **Design "Glassmorphism" Refinado:**
    *   Adicionar profundidade com desfoque de fundo (`backdrop-filter`) em modais e sidebars, mantendo a legibilidade.
*   **Acessibilidade como Feature:**
    *   Criar um "Modo de Alto Contraste" e "Modo Fonte Disléxica" ativáveis pelo usuário.
    *   Dashboard de Acessibilidade visível para admins (usando os dados de `accessibility-tests`).
*   **Tema Dinâmico:**
    *   Permitir que clínicas personalizem a cor primária da interface (White-labeling leve).

### 🧠 Inteligência Artificial & Firebase (O Cérebro)

*   **Migração para Gemini 1.5 Pro / 2.0 (Video Native):**
    *   *Atual:* Processamento frame-a-frame no cliente com MediaPipe (lento/pesado).
    *   *Novo:* Upload do vídeo para Cloud Storage -> Trigger Cloud Function -> Gemini 1.5 Pro (Multimodal) analisa o vídeo inteiro de uma vez.
    *   *Vantagem:* Análise semântica ("O paciente parece sentir dor no segundo 10") além da geometria.
*   **Firebase Genkit Integration:**
    *   Implementar fluxos estruturados de IA com Genkit para garantir tipagem e segurança na geração de treinos.
    *   Criar "Agentes" especializados: *Agente de Agendamento*, *Agente Motivacional*, *Agente de Relatórios*.
*   **Busca Semântica (Vector Search):**
    *   Implementar Firestore Vector Search.
    *   *Uso:* "Encontrar pacientes com lesão similar ao João" ou "Sugerir exercícios baseados em casos de sucesso anteriores".
*   **Voice-to-Text Clinical Notes:**
    *   Fisioterapeuta dita a evolução do paciente no celular, IA transcreve, estrutura em formato SOAP e salva no Firestore.

### 🏗️ Arquitetura & Engenharia (A Fundação)

*   **Monorepo Real com Turborepo:**
    *   Separar explicitamente:
        *   `apps/web` (Painel Profissional)
        *   `apps/mobile-patient` (App Paciente)
        *   `apps/mobile-pro` (App Profissional)
        *   `packages/ui` (Componentes Shadcn/Tailwind compartilhados)
        *   `packages/core` (Lógica de negócios, Hooks, Zod Schemas)
    *   *Benefício:* Builds cacheados e código compartilhado de verdade entre Web e Mobile.
*   **Offline-First Robusto:**
    *   Melhorar o `offlineSync.ts` usando `RxDB` ou mantendo `TanStack Query` com persistência local agressiva (`persist-client`).
    *   Garantir que o profissional possa avaliar pacientes sem internet e sincronizar depois.

### ⚡ Performance & Infraestrutura (A Velocidade)

*   **Edge Caching:**
    *   Configurar regras de cache no Firebase Hosting para ativos estáticos e API responses públicas.
*   **Otimização de Imagens/Vídeo:**
    *   Pipeline automatizado: Vídeo enviado -> Cloud Function -> Transcode para HLS (streaming adaptativo) + Thumbnail AVIF.
*   **Virtualização Extrema:**
    *   Garantir que listas de exercícios/pacientes usem `react-window` (já presente, mas verificar uso generalizado).

---

## 3. Planejamento de Implementação (Roadmap)

### Fase 1: Fundação & Refatoração (Semana 1-2)
- [ ] **Setup Turborepo:** Reestruturar pastas para isolar pacotes compartilhados.
- [ ] **Linting/Formatting:** Padronizar com Biome ou ESLint estrito em todo o monorepo.
- [ ] **CI/CD:** Pipelines separados para Web e Mobile no GitHub Actions.

### Fase 2: Experiência do Usuário (Semana 3-4)
- [ ] **Motion System:** Criar `MotionCard`, `MotionList`, `MotionPage` no `packages/ui`.
- [ ] **Skeleton Screens:** Substituir todos os "Loading..." por esqueletos pulsantes que imitam o layout final.
- [ ] **Feedback Visual:** Implementar `sonner` (toasts) com designs customizados para sucesso/erro.

### Fase 3: Inteligência Híbrida (Semana 5-6)
- [ ] **Genkit Setup:** Inicializar Genkit no projeto Firebase Functions.
- [ ] **Gemini Video Analysis:** Criar Cloud Function para análise assíncrona de vídeos.
- [ ] **Chatbot Tira-Dúvidas:** Bot no app do paciente (RAG sobre os PDFs de exercícios).

### Fase 4: Novas Funcionalidades (Semana 7-8)
- [ ] **Gamificação:** Sistema de "Streaks" (dias seguidos) e medalhas para pacientes.
- [ ] **Módulo Financeiro:** Integração básica com Stripe/Asaas para clínicas receberem pagamentos.
- [ ] **Telemonitoramento:** WebRTC para chamadas de vídeo integradas (usando infra existente ou Twilio/Daily).

---

## 4. Próximos Passos Imediatos (Action Items)

1.  **Validar Arquitetura:** Criar um POC da estrutura Turborepo movendo apenas os `zod schemas` para um pacote compartilhado.
2.  **Design Review:** Selecionar 3 telas críticas (Login, Dashboard, Exercício) para aplicar o novo conceito visual.
3.  **Genkit Hello World:** Criar o primeiro fluxo Genkit para "Resumir Evolução do Paciente".

Este plano coloca o FisioFlow na vanguarda tecnológica, utilizando o que há de mais moderno em 2026 sem descartar o trabalho já realizado.
