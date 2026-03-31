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

## 📅 Fases de Implementação Segura

### FASE 0: Consolidação do PoC (Pré-requisito)
**Objetivo:** Consolidar o `apps/vinext-poc` existente.
1. Criar `app/layout.tsx` e `app/page.tsx` base no poc.
2. Verificar que `transacoes` (schema `@fisioflow/db`) tem todos os campos necessários.
3. Corrigir a lógica de tipo: usar `'receita'`/`'despesa'` (não `'entrada'`).
4. Auth Bridge: `apps/api` emitir cookie `f-auth-token` HttpOnly no login.

### FASE 1: Auth Bridge (Cookie + localStorage Dual Mode)
**Objetivo:** Permitir que o servidor Vinext leia a sessão durante SSR.
1. **`apps/api`:** Adicionar endpoint `POST /api/auth/set-cookie` no Hono — recebe JWT e responde com `Set-Cookie: f-auth-token=...; HttpOnly; Secure; SameSite=Lax`.
2. **`src/lib/auth/neon-token.ts` (SPA):** Após `authClient.token()`, chamar `/api/auth/set-cookie` para sincronizar.
3. **`apps/vinext-poc/lib/auth.ts`:** Já correto — lê `f-auth-token` via `cookies()` do vinext/server.

### FASE 2: Fundação do Novo App (Vinext)
**Objetivo:** Criar `apps/vinext-web` — o app de produção (separado do poc de testes).
1. Criar o workspace `apps/vinext-web` com Vinext e dependências básicas.
2. Configurar `wrangler.toml` com `name = "fisioflow-vinext"`.
3. Criar `app/layout.tsx` (Providers mínimos) e `app/page.tsx`.
4. Importar componentes do `@fisioflow/ui` validando compatibilidade RSC.

### FASE 3: Roteamento Cloudflare (O Segredo do Strangler Pattern)
**Objetivo:** Fazer os dois aplicativos responderem no mesmo domínio.
1. Usar **Cloudflare Worker Routes** no Dashboard.
2. `fisioflow.pages.dev/*` → Pages SPA atual (fallback global).
3. `fisioflow.pages.dev/financeiro/*` → Worker `fisioflow-vinext`.
4. `fisioflow.pages.dev/relatorios/*` → Worker `fisioflow-vinext`.
5. Validação: navegação entre SPA e SSR via `<a href>` (reload de página).

### FASE 4: Migração Incremental de Rotas (Vertical Slices)
**Candidato 1: Fluxo de Caixa (`/financeiro/fluxo-caixa`)**
- *Já implementado no poc.* RSC conecta direto ao Neon, zero flash de loading.

**Candidato 2: Relatórios Clínicos (`/relatorios`)**
- Geração pesada no servidor, HTML pronto chega ao cliente.

**Candidato 3: Listagem de Pacientes (`/pacientes`)**
- Paginação server-side, filtros processados no Worker.

**Candidato 4: Evoluções Históricas (`/evolucoes`)**
- Leitura de muitos registros SOAP — SSR elimina skeleton infinito.

**Candidato 5: Agenda (`/agenda`)**
- Conflitos timezone processados no servidor (São Paulo).

### FASE 5: Server Actions + Consolidação Final
**Objetivo:** Substituir chamadas à API Hono por Server Actions diretas.
```typescript
// apps/vinext-web/app/pacientes/actions.ts
'use server';
export async function createPatient(formData: FormData) {
  const session = await getAuthSession();
  // mutação direta no Neon
}
```
1. Migrar todas as rotas restantes de `apps/web`.
2. Quando 100% migradas: atualizar roteamento Cloudflare para `/` → vinext-web.
3. Remover `apps/web` do monorepo.

---

## ⚠️ Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Vinext ainda experimental | Manter SPA ativa em paralelo; rollback = remover rota no Cloudflare |
| DICOM/WASM limites de memória no Worker | Manter DICOM Viewer no SPA, não migrar |
| Auth cookie SameSite cross-domain | Usar domínio customizado (`pro.fisioflow.com`) para ambas as apps |
| `transacoes` tipo values divergentes | Schema usa `'receita'`/`'despesa'` — PoC já corrigido |

---

## 🚦 Critérios para Iniciar (Checklist)
- [ ] Auth Bridge funcionando — cookie `f-auth-token` setado após login
- [ ] `pnpm -F @fisioflow/vinext-poc build` sem erros
- [ ] Bundle size < 1MB (limite Workers)
- [ ] Lighthouse FCP < 1s na rota migrada
- [ ] `pnpm test` na raiz — 0 falhas

**Conclusão:** Este plano não quebra a produção atual. Cria uma "pista paralela" performática que engole a SPA tela por tela, na velocidade em que houver confiança na estabilidade do Vinext.
