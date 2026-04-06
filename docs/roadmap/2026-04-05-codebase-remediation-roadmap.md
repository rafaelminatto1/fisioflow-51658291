# Codebase Remediation Roadmap

Data: 2026-04-05

## Fase 1 — Estabilizacao da Base

Objetivo: restaurar confianca operacional minima para evoluir a codebase com risco controlado.

TODO:
- Corrigir falhas de `lint` e `type-check` que quebram CI.
- Alinhar contratos criticos entre apps clientes e API.
- Remover configuracoes inseguras ou ambiguidade de ambiente mais evidentes.
- Validar checks essenciais localmente.

Status:
- Fase concluida.
- `apps/web/public/sw.js` ajustado para ser parseavel antes da substituicao de placeholders.
- `apps/api/tsconfig.json` ajustado para TypeScript 6.
- `apps/patient-app/lib/api.ts` alinhado ao prefixo canonico `/api/patient-portal`.
- `apps/api` e `apps/patient-app` com type-check restabelecido.
- `fisioflow-web` com type-check e lint sem erros.

## Fase 2 — Consolidacao Arquitetural

Objetivo: eliminar a arquitetura hibrida entre `apps/*`, `src/` raiz e pacotes compartilhados.

TODO:
- Definir frontend web canonico entre `apps/web` e `src`.
- Remover duplicacao entre bootstraps e roteamento.
- Reduzir imports de pacotes apontando para `src/` raiz.
- Isolar ou remover artefatos legados inseguros.

Status:
- Em andamento.
- Runtime compartilhado extraido para `src/app/AppRuntime.tsx`, reduzindo a duplicacao entre `src/App.tsx` e `src/root.tsx`.
- Worker legado `cloudflare-worker/fisioflow-api.ts` neutralizado em modo fail-closed.
- Configuracao legacy `cloudflare-worker/wrangler-api.toml` renomeada para evitar colisao com a API canonica.
- `apps/web` passou a expor entrypoints proxy locais (`root.tsx`, `routes.ts`, `entry.client.tsx`, `entry.server.tsx`, `main.tsx`) em vez de apontar diretamente o `appDirectory` para `src/`.
- `@fisioflow/db` ganhou uma superficie local `./schema`, reduzindo o acoplamento direto do pacote ao caminho relativo do `src/` raiz.

## Fase 3 — Hardening de Backend e Seguranca

Objetivo: reduzir superficie de erro operacional e risco de exposicao.

TODO:
- Centralizar resolucao de envs e endpoints.
- Revisar fallbacks de auth e pontos criticos com `any`.
- Remover hardcodes indevidos de dominios e rotas.
- Garantir que chamadas de IA sensiveis ocorram no backend.

Status:
- Em andamento.
- Criado `src/lib/config/server-only.ts` para padronizar a leitura de segredos apenas em runtime server-side.
- `src/lib/ai/gateway.ts`, `src/lib/gemini-ai.ts`, `src/lib/integrations/google/client.ts`, `src/lib/ai/pain-analysis.ts` e `src/integrations/neon/ai.ts` deixaram de ler chaves privadas via `import.meta.env`.
- `src/lib/api/graphql.ts` deixou de enviar `x-hasura-admin-secret` do cliente.
- `src/lib/email.ts` foi fechado para browser runtime, exigindo fluxo backend para envio real.
- `src/lib/calendar/google-sync.ts` passou a tratar troca/refresh de token Google como operacao server-side.
- `src/components/evolution/NotionEvolutionEditor.tsx` migrou de token estatico exposto no frontend para `uploadToR2` + autenticacao do usuario via `getNeonAccessToken()`.
- `src/styles/schedulex.css` foi saneado para remover referencia a pacote ausente que quebrava `pnpm --filter fisioflow-web build`.
- `ReceiptOCR`, `GlobalCommandPalette`, `TreatmentAssistant`, `ClinicalImportIA`, `SmartAI`, `PatientRetentionAgent`, `utils/images` e `tts` passaram a consumir `getWorkersApiUrl()` em vez de domínios ou envs soltas no frontend.

## Fase 4 — Cobertura e Confiabilidade

Objetivo: tornar regressao detectavel antes de merge e deploy.

TODO:
- Expandir testes de API por dominio critico.
- Criar testes de contrato entre clientes e backend.
- Reforcar gates de CI para rotas, auth e fluxos principais.
- Revisar criterios de deploy e smoke checks.

Status:
- Em andamento.
- Adicionados testes de rota para `media`, `search`, `patient-portal` e `auth` em `apps/api/src/routes/__tests__/media.test.ts`, `search.test.ts`, `patientPortal.test.ts` e `authProxy.test.ts`.
- Adicionado teste unitario de contrato do app paciente em `apps/patient-app/lib/api.test.ts` para travar o prefixo `/api/patient-portal`; o mock de sessao foi estabilizado contra `resetMocks` e a execucao isolada do Jest passou a ficar verde.
- Scripts de teste do `apps/patient-app` ajustados em `apps/patient-app/package.json` para usar `pnpm exec jest`, reduzindo divergencia entre execucao via script e execucao direta no workspace.
- `apps/patient-app/hooks/useColorScheme.test.ts` foi simplificado para não depender de `@testing-library/react-native` num harness jsdom, destravando a execucao do lote inicial de hooks/storage.
- Adicionados testes unitarios para `getWorkersApiUrl()` em `src/lib/api/__tests__/config.test.ts`, cobrindo fallback, host `workers.dev` e saneamento de env URL.
- Adicionados testes unitarios para o bridge de callables legadas em `src/lib/http/__tests__/function-http.test.ts`, cobrindo mapeamento de rota, retry com refresh de token em `401` e erro explicito para funcoes sem compatibilidade.
- Expandida a cobertura de `src/lib/auth/__tests__/neon-token.test.ts` para auth desabilitado, token expirado e bypass de cache com `forceSessionReload`.
- Adicionados testes unitarios para `src/api/v2/base.ts` em `src/api/v2/__tests__/base.test.ts`, cobrindo header auth, retry em `401`, propagacao de erro com payload, resposta PDF e chamada publica sem token.
- Adicionados testes unitarios para `src/api/v2/exercises.ts` em `src/api/v2/__tests__/exercises.test.ts`, cobrindo montagem de query string, encoding de busca semantica e o endpoint separado de analise de imagem.
- Adicionados testes unitarios para `src/api/v2/imaging.ts` em `src/api/v2/__tests__/imaging.test.ts`, cobrindo serializacao de query, encoding de UIDs DICOM, upload em lote e resolucao centralizada da WADO URL.
- A suite da API passou a cobrir upload autenticado com pre-signed URL, bloqueio de delecao fora do ownership, busca via Vectorize, indisponibilidade de indexacao sem binding, fallback de perfil no portal do paciente, `session` sem token, proxy de `get-session`, validacoes de `signup` e fluxo de `reset-password`.
- Suite atual da API validada com `50` testes passando; o frontend web tambem ficou verde no contrato de resolucao da Workers API.
- Validado tambem `cd apps/patient-app && pnpm exec jest --runInBand --runTestsByPath lib/api.test.ts` com `3` testes passando.
- Validado tambem `pnpm --filter fisioflow-patient-ios test -- --runInBand --runTestsByPath lib/api.test.ts` com `3` testes passando.
- Validado tambem o lote `hooks/useColorScheme.test.ts`, `hooks/useNetworkStatus.test.ts` e `lib/storage.test.ts` com `15` testes passando no workspace do app paciente.
- Validados tambem os lotes `hooks/useLocalStorage.test.ts`, `hooks/usePrevious.test.ts`, `hooks/useDebounce.test.ts`, `hooks/useHooks.test.ts` (`17` testes) e `hooks/useTheme.test.ts`, `hooks/useAccessibility.test.ts`, `hooks/useOfflineSync.test.ts` (`16` testes), todos verdes no workspace do app paciente.

## Fase 5 — Refino e Performance

Objetivo: reduzir custo de manutencao e melhorar a previsibilidade de evolucao.

TODO:
- Quebrar arquivos excessivamente grandes por responsabilidade.
- Reduzir `any`, `ts-ignore` e TODOs em areas quentes.
- Atacar hotspots de performance e carregamento.
- Revisar documentacao operacional e padroes de contribuicao.

Status:
- Em andamento.
- `src/lib/auth/neon-token.ts` deixou de depender de casts genéricos para a leitura principal de token/session no SDK.
- `apps/patient-app/lib/api.ts` ganhou tipagem dedicada para sessão e callback de `getSession`, reduzindo `any` na autenticação do app paciente.
- Validação mantida com `pnpm exec vitest run src/lib/auth/__tests__/neon-token.test.ts`, `pnpm --filter fisioflow-web type-check` e `pnpm --filter fisioflow-patient-ios type-check`.
