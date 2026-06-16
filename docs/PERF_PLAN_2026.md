# Plano de Performance FisioFlow — Jun/2026

> Continuação do pass de performance que reduziu o entry 551→411 KB e a agenda
> 363→43 KB (PR #103). Foco agora: **cold first-load** (primeira visita sem cache).

## 1. Metas (alvos mensuráveis)

| Métrica                         | Hoje (prod)              | Alvo                  |
| ------------------------------- | ------------------------ | --------------------- |
| Lighthouse **desktop** (cold)   | 70 / LCP 2.9s            | **≥ 85 / LCP < 2.0s** |
| Lighthouse **mobile 4G** (cold) | 56 / LCP 10.9s           | **≥ 75 / LCP < 4.0s** |
| Navegação quente (autenticada)  | LCP 491ms, CLS 0, TBT ~0 | **manter**            |
| entry `index`                   | 411 KB                   | **< 280 KB**          |
| Offline-first                   | funcional                | **funcional (gate)**  |

## 2. Gates obrigatórios (não negociáveis)

1. **Offline preservado** — testar "reload offline" (DevTools → Offline → F5) após cada fase. Critério: app shell + dados em cache abrem sem rede; mutações offline enfileiram e sincronizam ao voltar.
2. **Zero regressão clínica/UX** — type-check + build + smoke verdes antes de cada deploy.
3. **Medição antes/depois** — Lighthouse desktop+mobile a cada fase.

---

## 3. Fases

### Fase 1 — Reduzir o entry chunk (maior alavanca de cold-LCP)

- **T1 — `api/v2` + services fora do entry (~93 KB).**
  Hoje `offlineSync`/`SyncManager` (eager em `InfrastructureLayout`) puxa todo o
  `src/api/v2` para o entry. Ação: (a) split `api/v2`+services num chunk
  `vendor-data`; (b) inicializar `SyncManager`/`offlineSync` **após o first paint**
  (já há `setTimeout(100ms)` em `initializeOnClient` — mover o import para lá, via
  `requestIdleCallback`); (c) **adicionar o chunk `vendor-data` ao precache do SW**
  (`globPatterns` em `apps/web/vite.config.ts`).
  → Offline: **seguro** — fica precacheado como o shell (download em background no SW
  install, não bloqueia o paint).

- **T1 — STATUS (Jun/2026): PARCIAL.** Feito: `appointmentService` dinâmico no
  AuthContextProvider + `SyncManager` lazy → entry **411→368 KB**. Deployado e
  offline verificado (reload offline OK, 0 erros). **PORÉM `api/v2` (93 KB)
  continua no entry** — ver T2.

- **T2 — `api/v2` no entry: BLOQUEADO por arquitetura de barrel (ACHADO).**
  Investigação (Jun/2026) revelou a causa raiz:
  - O barrel `src/api/v2/index.ts` faz `export *` de **39 módulos**.
  - **335 arquivos** importam `from "@/api/v2"` — vários são hooks usados no shell
    eager (ex.: `useConnectionStatus`, `usePatientEvolution`), e `OfflineBanner`
    (eager) → `offlineSync` → barrel. Qualquer um arrasta os 39 módulos.
  - **`sideEffects` NÃO está configurado** em `package.json` (raiz nem apps/web).
    Sem isso o bundler assume side-effects em tudo e **não tree-shaka** o `export *`.
  - Trocar só `offlineSync` para imports diretos **NÃO move o entry** (testado) —
    outro importador eager do barrel domina.
  - **Fix real (esforço próprio, NÃO quick win):** ou (a) adicionar
    `"sideEffects"` como **array** enumerando arquivos com efeito colateral
    (CSS, `temporal-polyfill/global`, `src/main.tsx`, registro de SW, polyfills),
    deixando o resto tree-shakeable; ou (b) migrar os 335 sites para imports
    diretos. **(a) é arriscado** num app médico em prod (config errada dropa
    CSS/polyfill/SW silenciosamente) — exige teste de regressão de CSS + offline +
    polyfills + smoke completo. Fazer isolado, com staging primeiro.
  - Outros itens do entry: `src/components/ui` (65 KB, primitives — maioria
    necessária), `src/components/error` (38 KB, boundaries eager), lucide (30 KB,
    ícones do shell), `src/types/pose.ts` (12 KB — 18 exports de runtime, achar
    importador eager e deferir).

- **T3 — Route-groups eager (~52 KB).** `src/routes/*.tsx` entram no entry porque
  `router.tsx` (library-mode `createRoutesFromElements`) referencia os arrays JSX
  `<Route>` na criação. Tornar lazy exige migrar para a API de lazy routes do
  React Router (objetos com `lazy`) — refactor não-trivial do router. Avaliar.

### Fase 2 — Caminho crítico do first paint

- **T4 — Rota pública leve.** Garantir que `/welcome` e `/auth` não puxem o shell
  autenticado inteiro (sidebar, providers de realtime). Hoje o SPA baixa o entry
  todo antes do login — separar um "public shell" mínimo.
- **T5 — Deferir providers não-críticos** após first paint: `StatsigProvider`
  (FeatureFlags), `RealtimeProvider` (WebSocket), `NotificationManager`.

### Fase 3 — Render/INP (navegação quente)

- **T6 — framer-motion → `LazyMotion` + `m`** (96 arquivos, incremental). Reduz o
  bundle de motion e o custo de animação em telas densas.
- **T7 — content-visibility/virtualização** nas listas grandes restantes
  (ExerciseLibrary 248 itens, timelines). Padrão `cv-*` já criado.
- **T8 — Quebrar god components + memoizar**: `TaskDetailModal` (1632),
  `NewExerciseModal` (1511), `WikiEditor` (1420), `BodyMapAnatomical` (1383).
  (Padrão já aplicado em `EvolutionTimeline`.)

### Fase 4 — Payload de dados

- **T9 — Dicionários estáticos grandes** (`exerciseDictionary` 4434 linhas,
  `physioDictionary` 3067, `clinicalTestsCatalog` 2139, `knowledgeBase` 1166) →
  JSON sob demanda ou KV/D1. Tira centenas de KB do parse dos chunks de feature.

### Fase 5 — API / over-fetching / cold start

- **T10 — Deduplicar requests.** Observado na tela de Pacientes: a MESMA query
  `GET /api/appointments?...` disparou 3× e `GET /api/patients?...minimal` 2×.
  Unificar query keys / `staleTime` para eliminar chamadas redundantes.
- **T11 — Cold start do Worker** (`/api/health` 0.6–0.9s frio vs 0.11–0.19s quente).
  Avaliar Smart Placement (já local-GRU) e warmup cron leve.
  > ⛔ **NÃO** usar o cache de query do Hyperdrive como alavanca de perf: ele serve
  > leituras stale e quebra write-then-read em dados clínicos (agenda reverte
  > alterações). Manter `caching.disabled = true`. Ver `docs/AGENDA.md` §4.1 e o
  > AVISO no `docs/operations/neon-cost-analysis-2026-05-04.md`.

---

## 4. Resposta: isso quebra o offline?

**Não — desde que os gates sejam respeitados.** O modelo offline tem duas camadas:

- **Precache (shell):** `index-*`, CSS, HTML, fontes. Já funciona em reload offline.
- **Runtime `CacheFirst` em `/assets/*.js`:** **qualquer** chunk (feature ou vendor)
  é cacheado após o 1º acesso online. Como os nomes têm hash, ficam imutáveis 30 dias.

Implicações por tipo de mudança:

| Mudança                                                    | Offline?                                                                                                                                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lazy de **features** (FullCalendar, wiki, PDF…) — Fase 1/3 | ✅ OK. Cacheado no 1º uso online. **É o comportamento atual e já aceito** (feature só funciona offline depois de aberta 1× online).                                          |
| Tirar `api/v2`/sync do entry — **T1**                      | ✅ OK **se** o chunk `vendor-data` for adicionado ao **precache** do SW (não só runtime). Assim o reload offline no boot não depende de ter carregado online antes.          |
| Deferir providers (Realtime/Statsig) — **T5**              | ✅ OK. Realtime já não funciona offline (precisa de rede); deferir não muda isso.                                                                                            |
| Dicionários → JSON/KV — **T9**                             | ⚠️ Cuidar: se um JSON for buscado por rede sob demanda, precisa entrar no precache **ou** runtime-cache para uso offline. Preferir import estático que vira chunk cacheável. |

**Único risco real:** um chunk **necessário no boot** que seja movido para fora do
precache E nunca tenha sido carregado online. Mitigação padrão: **tudo que é crítico
no boot vai para `globPatterns` do precache.** Features sob demanda continuam no
runtime-cache (como hoje).

**Teste de regressão offline (rodar a cada fase):**

1. Carregar o app online 1×.
2. DevTools → Network → Offline.
3. F5 → app shell abre.
4. Navegar para Agenda/Pacientes → dados do IndexedDB aparecem.
5. Criar/editar (mutação) offline → fica "Pendente".
6. Voltar online → mutação sincroniza (resumePausedMutations).

---

## 5. Ordem sugerida

Fase 1 (T1→T3) tem o maior ROI no cold-LCP e é onde mora o risco offline (T1) —
fazer primeiro, com o teste offline acima. Depois Fase 2, 5 (T10 é barato), 3, 4.
Cada fase: branch → build/type-check → Lighthouse antes/depois → teste offline →
deploy staging → smoke → produção.
