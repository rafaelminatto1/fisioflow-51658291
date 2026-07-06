# Plano — Perf da /agenda: reduzir o render-delay de bootstrap

**Status:** proposto (jul/2026) · **Autor:** perf epic /agenda · **Pré-requisito:** já concluído nesta epic → eager JS 4024→1675KB (−58%), fontes WOFF2, cache imutável, Sentry/framer lazy, render-blocking 0ms.

## Contexto / diagnóstico atual (medido em prod)

- LCP ~1,6s · CLS 0 · TTFB ~57ms · render-blocking 0ms · cache ótimo.
- **O gargalo restante é o "render delay" (~1,5–1,6s = ~95% do LCP): tempo de EXECUÇÃO na main thread durante o bootstrap, NÃO download.**
- Composição provável (a confirmar com profile): mount do React + cadeia de providers do `AppRuntime` (QueryClient, **PersistQueryClient reidratando do IndexedDB via idb-keyval**, AuthContext, Theme, FeatureFlags, Tooltip, Toaster) → resolução do router → chunk lazy `Schedule` → **montagem do FullCalendar** (layout do grid semanal) → 1º fetch de appointments → paint.
- `vendor-zod` (300KB) ainda eager (não é o gargalo de execução, mas pesa em download em mobile).

> Regra da epic: cada mudança é isolada, buildada, boot validado localmente, deploy (push=auto-deploy prod) e validada em prod. LCP lab é ruidoso (1,5–3,5s) — usar **CPU throttle 4x (simular mobile)** e medir mediana de 5 runs, não run único.

---

## Fase 0 — Ganhos "de graça" no dashboard Cloudflare (sem código) · risco: nenhum

Não tenho escopo de zona no token de deploy — **requer você no dashboard** (Speed → Optimization), zona `moocafisio.com.br` (id `a5467f4c307c538e13154c97802788e4`):

1. **Early Hints (103):** ON. A CF varre as tags `<link rel="modulepreload">`/`preload` do HTML e as envia como 103 antes do corpo → browser começa a baixar entry JS + fontes mais cedo. Ganho direto de LCP, zero código (já temos os preloads).
2. **Speed Brain:** ON. Prefetch especulativo da próxima navegação provável.
3. Confirmar **Brotli** (temos zstd; Brotli complementa) e **HTTP/3** (já on) ligados.

**Validação:** `curl -sI` não mostra 103 facilmente; usar WebPageTest ou o painel "Early Hints" da CF; comparar waterfall.

---

## Fase 1 — Profile preciso do render-delay · risco: nenhum (só medição)

Antes de mexer, saber ONDE estão os ms. Sem isso, otimização é chute.

1. Trace do Chrome DevTools com **CPU 4x throttle** + **Fast 4G**, `reload=true`, na /agenda logada.
2. Extrair o bottom-up / call tree do intervalo do render-delay. Classificar self-time por: React reconciliation, cada Provider, hidratação do PersistQuery (deserialização do IndexedDB), init do FullCalendar, `ForcedReflow`.
3. Meta: tabela "componente → ms" para priorizar as fases seguintes por ROI real.

**Entregável:** nota com a repartição dos ~1,5s. Decide quais fases abaixo valem a pena.

---

## Fase 2 — Pintar o shell antes de trabalho não-crítico · risco: médio

O objetivo é o LCP pintar o **esqueleto da agenda** cedo e adiar o resto.

1. **PersistQueryClient / reidratação IndexedDB:** hoje o `PersistQueryClientProvider` pode segurar/competir no boot. Opções:
   - Garantir que a UI pinta um skeleton ANTES da reidratação terminar (não bloquear o 1º paint no `onSuccess`).
   - Ou inicializar o persister/`createAsyncStoragePersister` após o 1º paint (idle), aceitando que a 1ª pintura não tem cache offline (aceitável — dados chegam via fetch).
2. **FeatureFlagProvider / Theme:** se fizerem trabalho síncrono no mount, mover leitura para depois do paint (valor default no 1º render).
3. Usar **`startTransition`/Suspense** para marcar a montagem do conteúdo pesado como não-urgente, deixando o shell (sidebar + toolbar) pintar primeiro.

**Risco:** flash de estado (skeleton→conteúdo) ou piscar de tema. Mitigar com skeleton estável e tema via classe no `<html>` no HTML inicial.
**Validação:** trace 4x antes/depois; conferir que não há regressão de CLS (hoje 0) nem flash de tema.

---

## Fase 3 — Custo de montagem do FullCalendar · risco: médio

FullCalendar (grid semanal) é provavelmente a maior fatia única do render-delay.

1. Confirmar no profile o custo de init do FullCalendar.
2. **Adiar a montagem do calendário para depois do 1º paint:** renderizar um skeleton do grid (mesmas dimensões → CLS 0) e montar o FullCalendar em `requestIdleCallback`/`startTransition`. O LCP passa a ser o skeleton (pinta muito antes).
3. Auditar **plugins do FullCalendar** no bundle — remover plugins não usados (timeGrid/dayGrid/interaction só o necessário).
4. Avaliar `dayMaxEvents`/lazy rendering de eventos fora da viewport.

**Risco:** interação (drag-drop) indisponível durante a janela idle — comunicar visualmente. Regressão de layout se o skeleton não casar dimensões.
**Validação:** trace 4x; testar drag-drop/resize (memória: flicker já foi problema — não reintroduzir); CLS 0.

---

## Fase 4 — `vendor-zod` (300KB) fora do eager · risco: médio-alto

Ganho de download (mobile), não de execução. Fazer só se a Fase 1 mostrar download relevante em 4G.

1. Descobrir qual módulo eager importa zod (mesma técnica da epic: `stats.html` ANALYZE + BFS de import estático a partir do entry).
2. Opções, em ordem de segurança:
   - Isolar schemas usados só em features lazy para chunks lazy (não tocar nos usados no boot).
   - Avaliar `zod/mini` ou imports parciais (Zod 4 tem melhor tree-shaking) se o uso permitir.
   - **Não** tornar dinâmicos schemas usados de forma síncrona no caminho crítico (auth/validação de boot) — quebraria.
3. Se o eager de zod vier de 1–2 módulos do boot, extrair só esses.

**Risco:** validação síncrona quebrar. Cobrir com testes (Vitest) dos fluxos de auth/forms antes de mexer.

---

## Fase 5 — Higiene final · risco: baixo

- Corrigir o bug latente do `asset-worker.ts` `isImmutableAsset` (`length>20` falha p/ hash curto) — hoje irrelevante (estáticos não passam pelo worker), mas limpar p/ evitar pegadinha futura.
- Reavaliar `vendor-neon-auth` (125KB eager) — necessário no boot (auth), provavelmente fica.
- Documentar no `_headers`/wrangler que estáticos não passam pelo worker (feito parcialmente).

---

## Ordem recomendada & ganho esperado

| Fase | Esforço | Risco | Ganho esperado | Depende de |
|---|---|---|---|---|
| 0 Early Hints/Speed Brain | trivial (dashboard) | nenhum | LCP −100~300ms (rede) | você |
| 1 Profile | baixo | nenhum | direciona o resto | — |
| 2 Shell-first / defer providers | médio | médio | render-delay −200~500ms | Fase 1 |
| 3 FullCalendar idle-mount | médio | médio | render-delay −300~700ms (maior alavanca) | Fase 1 |
| 4 zod lazy | médio | médio-alto | −300KB download (mobile) | Fase 1 |
| 5 higiene | baixo | baixo | manutenção | — |

**Meta realista:** render-delay ~1,5s → ~0,7–0,9s ⇒ LCP mobile bem abaixo de 2,5s de forma consistente. Maior alavanca provável = Fase 3 (FullCalendar) + Fase 2 (providers).

## Princípios (aprendidos na epic)

- Medir com CPU throttle 4x, mediana de N runs — LCP lab desktop é ruidoso.
- Cada fase = commit isolado + build + boot local (0 erro console) + deploy + validação prod. Push na main = auto-deploy: nunca empilhar mudança arriscada sem validar a anterior.
- Diagnóstico com dados (stats.html/profile), não intuição — foi o que destravou o −58% de eager.
