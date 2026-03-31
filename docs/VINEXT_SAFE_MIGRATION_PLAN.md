# Plano Estratégico Seguro de Migração: FisioFlow SPA para Vinext

Este documento descreve a estratégia segura para migrar a arquitetura atual do FisioFlow (SPA Vite `react-router-dom`) para a nova stack **Vinext** (App Router/SSR no Cloudflare Workers) na branch `main`.

Como o Vinext ainda é experimental, adotaremos o padrão **Strangler Fig Pattern** (Padrão Estrangulador). Isso significa que **não vamos apagar a SPA atual**. Em vez disso, criaremos um novo app rodando lado a lado e migraremos as rotas de forma incremental.

---

## 🎯 Objetivo da Migração
Trazer **Server-Side Rendering (SSR)** e **React Server Components (RSC)** nativos para o FisioFlow, conectando diretamente ao Neon PostgreSQL e reduzindo o JS enviado ao cliente, tudo rodando na Cloudflare (sem Vercel).

## 🏗 Arquitetura do Monorepo Pós-Migração
O monorepo ficará com dois projetos Web principais durante a transição:

- `apps/web`: O aplicativo atual (SPA Vite legada). **Intacto.**
- `apps/vinext-web`: O novo aplicativo Web (App Router SSR).
- `apps/api`: Workers Hono (Continua intacto).

---

## 📅 Fases de Implementação Segura (na branch `main`)

### FASE 1: Fundação do Novo App (Vinext)
**Objetivo:** Estabelecer o ambiente base do Vinext no monorepo e garantir compartilhamento de componentes.
1. Criar o workspace `apps/vinext-web` com Vinext e dependências básicas (`@neondatabase/serverless`).
2. Configurar o Tailwind CSS v4 para compartilhar as configurações do `@fisioflow/ui`.
3. Criar a estrutura base: `app/layout.tsx` (Providers mínimos) e `app/page.tsx`.
4. Importar componentes isolados do `@fisioflow/ui` (ex: botões, inputs) para validar se o RSC aceita os componentes do monorepo sem quebrar o build. Se houver hooks do React neles, adicionar `"use client"` no topo desses componentes.

### FASE 2: Roteamento Cloudflare (O Segredo do Padrão Estrangulador)
**Objetivo:** Fazer os dois aplicativos responderem no mesmo domínio em produção (`fisioflow.pages.dev` / `pro.fisioflow.com`).
1. Utilizar o **Cloudflare Workers Routes** ou **Cloudflare Pages _routes.json** para dividir o tráfego.
2. A SPA atual continua respondendo por `/*` (Fallback global).
3. O novo Vinext responde por rotas específicas novas ou migradas, ex: `/relatorios/*` ou `/paciente/portal/*`.
4. *Validação:* Garantir que a navegação entre a SPA e o App SSR funciona (neste estágio inicial, exigirá recarregamento de página, ou seja, navegação via `<a>` e não `<Link>` do SPA).

### FASE 3: Autenticação Universal (Neon Auth)
**Objetivo:** Compartilhar a sessão entre a SPA (Client-side JWT) e o Vinext (Server-side Cookies).
1. Como o Vinext renderiza no servidor, ele não tem acesso ao `localStorage` onde o JWT atual pode estar.
2. Atualizar o fluxo de login no `apps/web` (SPA) para, além de salvar no storage, setar um **HttpOnly Cookie** (usando a API Hono atual) com o Access Token do Neon Auth.
3. No Vinext (`apps/vinext-web/app/layout.tsx`), ler os `cookies()` nativos da Request.
4. Validar o JWT no servidor do Vinext antes de renderizar qualquer página protegida (usando `jose` ou o cliente do Neon Auth).

### FASE 4: Migração Incremental de Rotas (Vertical Slices)
**Objetivo:** Migrar páginas pesadas de leitura primeiro (onde SSR brilha).

**Candidato 1: Relatórios e Dashboards (`/dashboard` ou `/relatorios`)**
- *Como é:* SPA carrega skeleton -> Faz `fetch` pra API Hono -> API Hono bate no Neon -> Retorna JSON -> React renderiza gráficos.
- *Como será (Vinext):* `app/dashboard/page.tsx` (RSC) conecta **direto** no Neon com `@neondatabase/serverless` -> Faz a query SQL (ex: `$1`, `$2`) -> Renderiza o HTML final com os gráficos já populados -> Envia para o cliente. Latência quase zero.

**Candidato 2: Páginas Públicas ou Wiki (`/wiki` ou `/protocolos`)**
- Páginas que precisam de SEO ou carregamento instantâneo. O Vinext pode servir como HTML estático ou SSR puramente rápido via Cloudflare.

### FASE 5: Depreciação do Roteador Antigo
**Objetivo:** Substituir gradativamente todas as rotas de `apps/web`.
1. Migrar as telas de CRUD pesadas (Pacientes, Agendamentos). Aqui, começamos a introduzir **Server Actions** do React 19/Next.js (funções `use server`) para gerenciar mutações no banco Neon, eliminando a necessidade de bater na API Hono intermediária (se desejado).
2. Quando 100% das rotas estiverem no `apps/vinext-web`, atualizamos o roteamento global da Cloudflare para apontar `/` para o Worker do Vinext.
3. Removemos a pasta `apps/web` (SPA Antiga).

---

## 🚦 Critérios para Iniciar a Mudança (Checklist)
Antes de fazermos o merge da infra Vinext para produção, valide:
- [ ] O banco Neon PostgreSQL de produção permite conexões diretas via `@neondatabase/serverless` (Pooler).
- [ ] Os pacotes base do UI (ex: `lucide-react`, `framer-motion`) rodam sem quebrar o bundler do Vinext.
- [ ] O `better-auth` ou `Neon Auth` suportam fluxos orientados a cookies que o Vinext possa ler nativamente via Server Components.

**Conclusão:** Este plano não quebra a produção atual. Ele cria uma "pista paralela" super moderna e performática que pode ir engolindo a SPA antiga tela por tela, na velocidade em que você e sua equipe tiverem confiança na estabilidade do Vinext.
