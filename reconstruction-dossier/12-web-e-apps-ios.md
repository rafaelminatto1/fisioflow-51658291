# Fase 10 — Web e aplicativos iPhone (AS-IS)

> Auditoria somente leitura no commit `9b5c76f1069e5bc6bbab22397e69028d314cc3be` (13/jul/2026).
> Escopo: `apps/professional-app`, `apps/patient-app`, legados mobile (`apps/mobile-ios`, `android/`, Capacitor, Codemagic) e pipeline iOS.
> Convenção: evidências citadas como `arquivo:linha`. Onde não foi possível confirmar, marcado **não verificado**.

---

## 1. App profissional — `apps/professional-app` ("FisioFlow Pro")

### 1.1 Identidade e versões

| Item | Valor | Evidência |
|---|---|---|
| Nome / slug | FisioFlow Pro / `fisioflow-pro` | `apps/professional-app/app.json:3-4` |
| Bundle ID iOS | `com.fisioflow.professionals` (team `G7FDW933SF`) | `app.json` (bloco `ios`) |
| Scheme (deep link) | `fisioflowpro` | `app.json:9` |
| Versão / runtimeVersion | 1.0.0 / `"1.0.0"` fixo | `app.json` (final) |
| Expo / RN / React | Expo ~55.0.23, RN 0.83.6, React 19.2.0 | `apps/professional-app/package.json` |
| EAS project | `ca7042a7-03d4-4731-b4e5-6f5de3b48300`, owner `rafaelminatto` | `app.json` (`extra.eas`) |
| OTA updates | expo-updates habilitado, canal por perfil, `enableBsdiffPatchSupport` | `app.json` (`updates`) |
| iOS mínimo | **não definido explicitamente** — usa default do Expo SDK 55 (prebuild); alvo de hardware mínimo iPhone 14 é decisão de produto, não codificada | `app.json` (sem `deploymentTarget`) |

### 1.2 Navegação (expo-router, `app/`)

Entry `expo-router/entry` (`package.json:11`). ~78 arquivos de rota, **74 telas** (4 `_layout`). Grupos:

- **`(auth)/`** — `login`, `forgot-password`, `biometric-setup`, `pin-setup`, `unlock` (bloqueio de sessão com biometria/PIN — `store/auth.ts` tem `lockSession/unlockSession`).
- **`(tabs)/`** (shell principal, 12 abas/telas) — `index` (dashboard), `agenda`, `patients`, `messages`, `whatsapp`, `crm`, `tarefas`, `financials`, `groups`, `communications`, `menu`, `profile`.
- **Pacientes/clínica** — `patient-form`, `patient/[id]`, `patient/[id]/evolution`, `patient/[id]/ai-assessment`, `evolution-form`, `evolution-detail`, `evolution-mobile`, `evolutions-list`, `appointment-form`, `group-session` ( `(app)/group-session.tsx` ).
- **Exercícios/protocolos/HEP** — `exercises`, `exercises/[id]`, `exercise-form`, `protocols`, `protocol-detail`, `protocol-form`, `apply-protocol`, `hep-compliance`, `proms`, `prom-form`, `leaderboard`.
- **Biomecânica** — dois conjuntos: `app/biomecanica/` (index/tests/capture/analysis/comparison/report + `_layout`) e `app/(app)/biomechanics.tsx` → `biomechanics-impl.tsx` (câmera nativa; ver §1.9).
- **Financeiro/fiscal** — `financial-form`, `nfse-form`, `reports`.
- **Comunicação** — `messages/[id]`, `whatsapp-chat/[id]`, `notifications`, `telemedicine`.
- **IA/voz** — `(app)/clinical-test-ai`, `(app)/voice-task`, `insights/search`, `wiki` + `wiki/[id]`.
- **Settings/LGPD** — `(settings)/`: `audit-log`, `consent-management`, `data-deletion`, `data-export`, `data-transparency`, `help`, `notification-preferences`, `working-hours`; `(legal)/`: `onboarding`, `privacy-policy`, `terms-of-service`; `change-password`, `profile-edit`.

Typed routes habilitado (`app.json` `experiments.typedRoutes: true`).

### 1.3 Consumo da API

- Client próprio `fetchApi` em `apps/professional-app/lib/api.ts` (não compartilha o client da web). Base URL: **hardcoded** `https://fisioflow-api.rafalegollas.workers.dev` com lógica que rejeita env vars "legadas" (`lib/config.ts:13-24` recusa URLs com `moocafisio.com.br`/`api-pro` — ou seja, o perfil `testflight` do eas.json que aponta `https://api-pro.moocafisio.com.br` é sobrescrito em runtime pelo default do workers.dev).
- Normalização camelCase↔snake_case feita no client (`lib/api.ts:49-77`, `normalizeAppointment`/`normalizeAppointmentPayload`).
- **Auth divergente da web**: usa endpoint próprio `POST /api/auth/login` do Worker (que existe: `apps/api/src/routes/auth.ts:150`) retornando `{ user, token, refreshToken }` (`lib/auth-api.ts:14-26`), com refresh via `authApi.refreshToken()` em 401 (`lib/auth-api.ts:46-60`) — não é o fluxo Neon Auth/better-auth da web.
- Token em `expo-secure-store` (`lib/token-storage.ts:1-20`, chave `FISIOFLOW_AUTH_TOKEN`).
- Gate de roles no login: apenas `professional|fisioterapeuta|admin|recepcionista|estagiario` (`store/auth.ts:26-35`).
- ~40 hooks TanStack Query cobrindo dashboard, agenda, pacientes, evoluções, exercícios, protocolos, PROMs, tarefas, WhatsApp, leads/CRM, NFSe, telemedicina, wiki, feature flags etc. (`hooks/` — ex.: `useNFSe.ts:1-12`, `useTelemedicine.ts:1-20` — todos chamando `lib/api.ts` real, não mock).

### 1.4 Offline / cache

- TanStack Query com `staleTime` 5min / `gcTime` 10min (`app/_layout.tsx:40-50`) — **sem PersistQueryClient**: cache de leitura NÃO sobrevive a restart (diferente da web, que tem PersistQueryClient).
- **Fila de mutações offline**: `store/sync-store.ts` (zustand `persist` em AsyncStorage, `sync-storage`) com `MutationRequest{endpoint,method,data}` e modelo de conflito (`SyncConflict`, resolução local/server/both — `sync-store.ts:75-92`). `fetchApi` enfileira quando a rede falha (`lib/api.ts:381-383`); replay via `processQueue` disparado por listener NetInfo em `app/_layout.tsx:107-156`; UI de conflito em `components/ui/SyncConflictModal.tsx`.
- `hooks/useSyncStatus.ts` reporta online/offline via NetInfo (estado local, não conectado à fila — `useSyncStatus.ts:20-35`).
- `config.enableOfflineMode: true` (`lib/config.ts:32`).

### 1.5 Push notifications

- `expo-notifications` com canais Android e plugin com `enableBackgroundRemoteNotifications` (`app.json` plugins; `lib/notifications.ts:1-70`).
- Token Expo Push obtido e registrado no backend em `store/auth.ts:101-103` → `POST /api/push-subscriptions?token=...`; registro também no boot pós-login (`app/_layout.tsx:96`).
- Envio server-side existe (`lib/notifications.ts:310` chama `/api/notifications/send-push`).
- **APNs direto não é usado** — é Expo Push Service (exige `EXPO_PUBLIC_EXPO_PROJECT_ID`, presente em todos os perfis do `eas.json`).
- Limpeza do token push no logout: **não verificado** no professional-app (`authApi.logout` só limpa o JWT — `lib/auth-api.ts:28-40`); o patient-app faz (`services/authService.ts:115`).

### 1.6 Câmera / mídia / sensores

- `react-native-vision-camera` 4.7.3 + pose detection (`@scottjgilroy/react-native-vision-camera-v4-pose-detection`) + módulo nativo local `modules/expo-vision-pose-detector` (link workspace — `package.json`), Skia 2.4.18 para overlay.
- `expo-camera`, `expo-image-picker`, `expo-media-library`, `expo-audio` (gravação p/ voice scribe — `hooks/useAudioRecorder.ts`, `hooks/useVoiceScribe.ts`), `expo-print`/`expo-sharing` (PDF), `react-native-signature-canvas` (assinaturas), `expo-location` (check-in — `lib/geolocation.ts`, `hooks/useCheckIn.ts`), `expo-local-authentication` (Face ID) — permissões descritas em PT-BR no `app.json` (infoPlist), incl. HealthKit share/update.
- Patch pnpm em `expo-modules-core@55.0.25` (`pnpm-workspace.yaml`, `patches/`).

### 1.7 Sentry / crash reporting

- `@sentry/react-native` ~7.11.0, plugin expo configurado (org `activity-fisioterapia-rg`, projeto `fisioflow-professional` — `app.json` plugins).
- Init condicional: só em build de produção **e se `EXPO_PUBLIC_SENTRY_DSN` estiver setado** (`app/_layout.tsx:26-34`).
- **Lacuna atual**: `EXPO_PUBLIC_SENTRY_DSN` NÃO aparece em `apps/professional-app/eas.json` nem em `.github/workflows/ios-build.yml` (grep vazio); `ios-build.yml` ainda seta `SENTRY_DISABLE_AUTO_UPLOAD=true` (linha do step Build & Archive). Ou seja, IPAs gerados pelo workflow atual tendem a sair **sem Sentry ativo** (regressão vs. o fix de jun/2026 registrado em memória — provavelmente o fix estava no fluxo EAS, não neste workflow xcodebuild).

### 1.8 Deep links / universal links

- Apenas custom scheme `fisioflowpro` (`app.json:9`). **Sem `associatedDomains`/universal links** (grep vazio em `app.json`). `expo-linking` presente.

### 1.9 Real vs. mock por área

| Área | Status | Evidência |
|---|---|---|
| Dashboard, agenda, pacientes, evoluções, exercícios, protocolos, tarefas, WhatsApp, CRM, financeiro, NFSe, telemedicina, wiki | **Real** (hooks → `lib/api.ts` → Worker) | `hooks/*.ts`; ex. `useNFSe.ts:2`, `useTelemedicine.ts:2-8` |
| Biomecânica — API client | **Real** — `lib/api/biomechanics.ts` cobre upload R2 (presigned), jobs, workbench, annotations, assessments (`:226-341`), e as rotas existem no Worker (`apps/api/src/index.ts:371` monta `/api/biomechanics`) | |
| Biomecânica — telas `app/biomecanica/*` | **Parcial/mock**: `index.tsx` tem KPIs hardcoded (`KPIS` const, `index.tsx:15-30`) mas importa `biomechanicsApi`; `analysis.tsx` usa `MOCK_TRAJECTORY` (`analysis.tsx:70,176,449`). Confirma memória: UI construída com dados mock, backend existe mas integração incompleta | |
| Biomecânica tempo real `(app)/biomechanics.tsx` | Real porém **gated**: exige dev build (vision-camera indisponível no Expo Go; fallback `FeatureUnavailable` — `biomechanics.tsx:6-31`); impl em `biomechanics-impl.tsx` |
| Voice scribe / clinical-test-ai / insights | Real (hooks `useVoiceScribe`, `lib/ai/`, `lib/semanticSearch.ts`) — **não validado em runtime** | |

Resíduos de desenvolvimento commitados no diretório: `doctor_output.txt`, `error_chunk.txt`, `error_zone.txt`, `expo_output.log`, `coverage/`, `dist/` (listagem do diretório) — higiene pendente.

---

## 2. App paciente — `apps/patient-app` ("FisioFlow Paciente")

### 2.1 Identidade e versões

| Item | Valor | Evidência |
|---|---|---|
| Nome / slug / scheme | FisioFlow Paciente / `fisioflow-patient` / `fisioflow` | `apps/patient-app/app.json:3-9` |
| Bundle ID | `com.fisioflow.patients`, `newArchEnabled: true` | `app.json` |
| Pacote | `fisioflow-patient-ios@1.0.0` | `package.json:2-3` |
| Expo / RN | Expo ^55.0.23, RN 0.83.6, React 19.2.0, Sentry RN ~8.7.0 (mais novo que o do prof) | `package.json` |
| EAS project | `3dc7141f-4e97-4c2c-b4aa-959888a0e810` | `eas.json` (env) |
| OTA | expo-updates, `runtimeVersion.policy: appVersion` | `app.json:145-152` |
| Privacy manifest iOS | `privacyManifests` completo (UserDefaults, HealthAndMedical etc.) | `app.json:35-60` |

### 2.2 Navegação (25 telas)

- **`(auth)/`** — `login`, `register`, `forgot-password`, `link-professional` (vínculo com fisioterapeuta).
- **`(tabs)/`** — `index` (home), `exercises` (HEP), `appointments`, `progress`, `wellness` (passos/HealthKit), `media`, `profile`, `settings`.
- **Stack** — `onboarding`, `exercise/[id]` (execução), `exercise/report`, `exercise/vision/[id]` (pose detection por câmera), `book-appointment` (auto-agendamento), `chat/[professionalId]`, `duvidas`, `gamification`, `biomechanics`, `profile/edit`, `profile/integrations`.

**O que o paciente pode fazer**: executar HEP com vídeo e feedback de pose (vision-camera + pose detection, flag `EXPO_PUBLIC_ENABLE_AI_POSE_DETECTION` no `eas.json`), marcar/ver consultas (`book-appointment.tsx`, `useAppointments.ts`, sync com calendário via `expo-calendar`/`useCalendarSync.ts`), chat com o profissional, gamificação (XP/quests/loja — `useGamification.ts` → `gamificationApi.getProfile()` real), progresso/PROs, wellness (HealthKit/Health Connect — `lib/healthkit.ts`, `lib/healthConnect.ts`), exportação de dados (`lib/dataExport.ts`), i18n (`i18n-js`, `lib/i18n.ts`).

### 2.3 API e auth

- Client em `lib/api.ts` com base `EXPO_PUBLIC_API_URL || https://api.moocafisio.com.br` e prefixo `/api/patient-portal` (`lib/api.ts:23-25`).
- **Auth = Neon Auth/better-auth de verdade** (diferente do prof): `better-auth` + `@neondatabase/neon-js` (`package.json`), `authClient.signIn.email` em `services/authService.ts:27-34`, token de sessão extraído via `authClient.getSession()` (`lib/api.ts:66-70`).
- Logout limpa push token no servidor e encerra sessão (`services/authService.ts:106-122`).

### 2.4 Offline / push / Sentry / links

- **OfflineManager** dedicado: fila persistida em AsyncStorage (`@fisioflow_offline_queue`), tipos de operação (`complete_exercise`, `book_appointment`…), retries, listener NetInfo com `isInternetReachable`, sync por usuário (`lib/offlineManager.ts:1-60`), consumido por `hooks/useOfflineSync.ts` e integrado ao `lib/api.ts:3`.
- Push: Expo Push token registrado/limpo via `lib/notificationsSystem.ts` (`:62,89`) no login/logout; lembretes locais de exercício/consulta (`lib/exerciseReminders.ts`, `lib/appointmentReminders.ts`).
- Sentry: init incondicional com **fallback placeholder** `https://placeholder@sentry.io/placeholder` se DSN ausente (`app/_layout.tsx:16-17`) — smell: inicializa SDK apontando para DSN inválido em vez de desabilitar.
- Deep link: scheme `fisioflow`; **sem universal links** (sem `associatedDomains`).
- Testes: jest unit por serviço (`services/*.test.ts`, `hooks/*.test.ts`), Playwright configurado (`playwright.config.ts`, `e2e/` com 3 specs) — cobertura E2E roda contra web export (`index.html`, `public/`).

### 2.5 Real vs. mock

Maioria real (services → `/api/patient-portal`). Pontos mock/parciais: `chat/[professionalId].tsx:122-123` gera `mockConversationId` local (conversa não criada no backend por esse caminho — **parcial**); `wellness.tsx:251-253` usa dados mockados fora de dispositivo com HealthKit (fallback 5000 passos). `biomechanics.tsx` no paciente: espelho simplificado, **não verificado** em profundidade.

---

## 3. Legados — classificação

| Artefato | Classe | Evidência |
|---|---|---|
| `apps/mobile-ios/` | **MORTO** — scaffold Expo intocado ("Open up App.js to start working" — `apps/mobile-ios/App.js:4-9`), sem router, excluído do workspace (`pnpm-workspace.yaml`: `"!apps/mobile-ios"`), último toque 11/mai/2026 | candidato a remoção |
| `android/` (raiz) | **LEGADO dormente** — shell Capacitor Android para embutir `apps/web/dist`; criado 25/abr/2026 (`bc7acb56b`), sem commits desde então | |
| `capacitor.config.ts` (raiz) | **LEGADO dormente** — `appId com.moocafisio.fisioflow`, `webDir: apps/web/dist`, allowNavigation p/ domínios moocafisio + Neon Auth (`capacitor.config.ts:1-40`); estratégia "web embrulhada" abandonada em favor dos apps Expo nativos; último toque 25/abr | |
| `codemagic.yaml` | **MORTO na prática** — pipeline Codemagic p/ professional-app com **Xcode 16.4** (`codemagic.yaml:10`), que segundo o próprio ios-build.yml **não compila** Expo SDK 55/RN 0.83 (`ios-build.yml:23` comentário "macos-latest = Xcode 16.4 não compila expo-modules-core"); último toque 25/abr | |
| `eas.json` (raiz) | **LEGADO** — perfis genéricos (`professional-dev` com gradleCommand p/ monorepo) que não batem com os `eas.json` reais dentro de cada app; último toque 25/abr | |
| `.github/workflows/mobile-ios.yml` / `mobile-android.yml` | **LEGADO dormente** — builds Capacitor (título "Mobile iOS (Capacitor)" — `mobile-ios.yml:1`), gatilho só em branches `release/mobile-*`/tags `mobile-v*` (nunca usados que se saiba), Xcode 16.2, aponta API legada `api-pro.moocafisio.com.br` | |
| `.github/workflows/eas-professional-build.yml` | **DESABILITADO** — comentário "DESABILITADO: usa EAS cloud (consome quota). Use eas-professional-build-local.yml" (`eas-professional-build.yml:7`), só workflow_dispatch | |
| `.github/workflows/ios-build.yml` | **ATIVO** — pipeline canônico atual (ver §5); último fix 13/jun/2026 (`b243ee691`) | |
| `.github/workflows/eas-professional-build-local.yml`, `eas-dev-build.yml` | Alternativas EAS-local — **não auditadas a fundo** | |

---

## 4. Matriz de capacidades (web desktop × app profissional × app paciente)

Legenda: ✅ implementado · ◐ parcial · Ⓜ mock/protótipo · ✗ ausente. "Web" = dashboard `src/` (React 19/Vite).

| Funcionalidade | Web desktop | App profissional | App paciente | Evidência mobile |
|---|---|---|---|---|
| Agenda (ver/criar/editar) | ✅ FullCalendar | ✅ | ◐ (ver + auto-agendar) | `(tabs)/agenda.tsx`, `appointment-form.tsx`; `book-appointment.tsx` |
| Pacientes (CRUD/prontuário) | ✅ | ✅ | ✗ (só o próprio perfil) | `(tabs)/patients.tsx`, `patient/[id].tsx` |
| Evolução clínica | ✅ (TipTap + colaborativo Yjs) | ◐ (form próprio, sem editor colaborativo) | ✗ | `evolution-form.tsx`, `evolution-mobile.tsx` |
| Ditado/voz (scribe) | ✅ (Nova-3) | ◐ (`useVoiceScribe.ts`, não validado) | ✗ | |
| Exercícios/protocolos/HEP | ✅ | ✅ | ✅ (execução HEP) | `protocols.tsx`, `apply-protocol.tsx`; `(tabs)/exercises.tsx` |
| Pose detection por câmera | ✗ | ◐ (dev build only, gated Expo Go) | ◐ (`exercise/vision/[id].tsx`, flag) | `(app)/biomechanics.tsx:6-31` |
| Lab. biomecânico (telas análise/laudo) | ◐ | Ⓜ/◐ (UI pronta, `MOCK_TRAJECTORY`; API client real existe) | Ⓜ (tela única) | `biomecanica/analysis.tsx:70`; `lib/api/biomechanics.ts` |
| WhatsApp inbox/CRM | ✅ | ✅ | ✗ | `(tabs)/whatsapp.tsx`, `(tabs)/crm.tsx`, `useLeads.ts` |
| Chat interno paciente↔profissional | ◐ | ✅ (`(tabs)/messages.tsx`) | ◐ (`mockConversationId`) | `chat/[professionalId].tsx:122` |
| Tarefas | ✅ (paridade Jira) | ✅ | ✗ | `(tabs)/tarefas.tsx`, `useTarefas.ts` |
| Financeiro / NFSe | ✅ | ✅ | ✗ | `(tabs)/financials.tsx`, `nfse-form.tsx` |
| Telemedicina (LiveKit) | ◐ | ◐ (`telemedicine.tsx`, `EXPO_PUBLIC_LIVEKIT_URL` só no perfil dev) | ◐ (`useTelemedicine.ts`) | `eas.json` dev env |
| Gamificação | ◐ | ◐ (`leaderboard.tsx`) | ✅ (perfil XP/quests/loja) | `useGamification.ts` |
| Wellness/HealthKit | ✗ | ✗ (permissões declaradas, uso não verificado) | ◐ (fallback mock) | `(tabs)/wellness.tsx:251-253` |
| Offline (fila de escrita) | ✅ PersistQueryClient + optimistic | ◐ (fila zustand+replay, sem persistência do cache de leitura) | ◐ (OfflineManager próprio) | §1.4, §2.4 |
| Push | ✗ (web push não implementado) | ✅ Expo Push | ✅ Expo Push | §1.5, §2.4 |
| Wiki / IA copilot / insights | ✅ | ◐ (`wiki.tsx`, `insights/search.tsx`) | ✗ | |
| LGPD (export/deleção/consentimento) | ◐ | ✅ (telas `(settings)/`) | ◐ (`lib/dataExport.ts`) | |

---

## 5. Pipeline de build/assinatura iOS

Fluxo atual (dev em Linux, sem macOS local — instalação por USB via libimobiledevice):

1. **Disparo manual** — `workflow_dispatch` com inputs `app` (default `professional-app`) e `profile` (`ios-build.yml:4-13`). Sem gatilho por push: builds iOS são sempre deliberados.
2. **Runner `macos-26`** (Xcode 26.2) — obrigatório para SDK 55/RN 0.83/Swift 6; `macos-latest` (Xcode 16.4) não compila `expo-modules-core` (`ios-build.yml:23`).
3. `pnpm install --filter "@fisioflow/<app>..."` → `npx expo prebuild --platform ios --clean` (pasta `ios/` gerada a cada build, não versionada como fonte de verdade).
4. **Patch de Podfile** injetando `SWIFT_STRICT_CONCURRENCY=minimal` em todos os pods (`ios-build.yml:44-70`) → `pod install --repo-update`.
5. **Assinatura manual**: certificado `.p12` + senha via secrets (`APPLE_CERTIFICATE_P12_BASE64` etc.) importados em keychain temporário; provisioning profile escolhido por app — secrets `APPLE_PROVISIONING_PROFILE_PACIENTES_BASE64` / `_PROFISSIONAIS_BASE64` (`ios-build.yml:96-118`). Identidade `Apple Distribution`, `CODE_SIGN_STYLE=Manual`.
6. `xcodebuild archive` com `SENTRY_DISABLE_AUTO_UPLOAD=true` → empacote manual do `.app` em `Payload/*.ipa` (zip) → artifact `ios-<app>-<sha>` retido 14 dias → download e instalação por cabo USB (libimobiledevice). Keychain limpo em `always()`.
7. **TestFlight**: perfil `testflight` existe no `eas.json` do prof (canal production, `ascAppId 6504123456`, `appleId` vazio — `apps/professional-app/eas.json`), mas o `ios-build.yml` **não faz upload para App Store Connect**; submissão dependeria de `eas submit` (fluxo EAS, quota — workflow correspondente desabilitado).

**Problemas conhecidos/observados**:
- Sentry: DSN não injetado no build deste workflow e auto-upload de symbols desativado (§1.7) — crash reporting provavelmente mudo nos IPAs atuais.
- Perfil `testflight` aponta `EXPO_PUBLIC_API_URL=https://api-pro.moocafisio.com.br`, mas `lib/config.ts` descarta esse valor em runtime (§1.3) — configuração conflitante/enganosa.
- `eas.json` (dev/preview) contém `EAS_BUILD_NPM_CACHE_URL: http://10.254.24.9:4873` (registry interno EAS) — inócuo no workflow xcodebuild, ruído de configuração.
- 6 workflows mobile coexistem (ios-build ativo + 2 Capacitor dormentes + 3 EAS variantes) — superfície de manutenção alta.
- Histórico (memória do projeto): crash SIGABRT "Gradient package not found" resolvido exigindo rebuild do IPA — sintomático do ciclo lento build-na-nuvem→USB.

---

## 6. Auditoria técnica mobile (checklist)

| Dimensão | Professional | Patient |
|---|---|---|
| Cache local de leitura | TanStack em memória apenas (sem persister) — perde tudo no cold start | AsyncStorage ad-hoc (`lib/storage.ts`, `useLocalStorage`) + TanStack em memória |
| Escrita offline / fila | ✅ fila zustand persistida + replay NetInfo + modal de conflito (§1.4); replay para no primeiro erro ("Break the queue" — `_layout.tsx:146`) | ✅ OfflineManager com retries e tipos de operação (§2.4) |
| Limpeza no logout | ◐ limpa JWT (`clearToken`); **não** limpa fila de sync, cache de queries nem push token no servidor (não verificado além do grep) | ✅ `clearPushToken` + `authClient.signOut` (`authService.ts:106-122`); limpeza de fila offline **não verificada** |
| Tokens push | ✅ registrado em `/api/push-subscriptions` (`store/auth.ts:101-103`) | ✅ `registerPushToken` no login (`authService.ts:46`) |
| Universal links | ✗ (só scheme `fisioflowpro`) | ✗ (só scheme `fisioflow`) |
| iOS mínimo | Default SDK 55 (não pinado); iPad suportado (`supportsTablet: true`) | Idem + privacy manifests |
| Acessibilidade | ◐ 17 arquivos com `accessibilityLabel` (grep) — sem auditoria sistemática | ◐ 6 arquivos + `lib/accessibility.ts` e `useAccessibility.ts` (com teste) |
| Crash reporting | ◐ Sentry configurado mas DSN ausente no pipeline ativo (§1.7) | ◐ Sentry 8.x com DSN placeholder fallback (§2.4) — envio real depende de env não verificado |
| Conectividade ruim | Timeouts por request (`fetchApi` aceita `timeout`, ex. 5000/8000ms em `auth-api.ts`), retry TanStack = 1; fila cobre falha total, mas degradação parcial (latência alta) **não verificada** | NetInfo com `isInternetReachable` (mais correto que só `isConnected`); retries na fila; **não verificado** comportamento de streaming/vídeo offline |
| Segurança local | SecureStore p/ JWT, Face ID/PIN de sessão (`(auth)/unlock.tsx`, `biometricAuthService`), audit logger (`lib/services/auditLogger`) | SecureStore (expo-secure-store), better-auth session |

---

## 7. Fatos AS-IS relevantes para arquitetura futura (sem propostas)

- **Compartilhamento de código com a web é quase nulo**: único pacote compartilhado é `@fisioflow/core` (dep do prof — `package.json:31`), que contém apenas `ai/`, `audioCapturePolicy.ts` e `index.ts` (`packages/core/src/`). Tipos de API, clients HTTP, validação e mappers são **duplicados 3×** (web `src/`, prof `lib/api.ts`+`types/`, patient `lib/api.ts`+`lib/mappers.ts`). O patient-app nem usa `@fisioflow/core`.
- **Três autenticações distintas** contra o mesmo backend: web = Neon Auth cookies/JWKS; prof = `POST /api/auth/login` com JWT próprio + refresh; patient = better-auth/Neon Auth nativo. Qualquer mudança de auth atinge 3 implementações.
- **Dependência profunda de Expo**: expo-router, expo-updates (OTA ativo nos dois apps), EAS credenciais remotas, módulo nativo local (`modules/expo-vision-pose-detector`) e patch em `expo-modules-core` — o custo de sair do Expo é alto; o custo de ficar é o acoplamento a Xcode bleeding-edge (macos-26) no CI.
- **Dois apps, duas bases de UI**: nenhum design system compartilhado entre os apps RN (constants/estilos próprios em cada um) nem com a web (Tailwind/Shadcn).
- A estratégia Capacitor (web embrulhada) foi montada e abandonada sem remoção — `android/`, `capacitor.config.ts`, 2 workflows e deps residuais continuam no repo.

---

## Resumo (20 linhas)

1. App profissional: **74 telas** expo-router (12 abas + auth c/ biometria/PIN + settings LGPDA completos); Expo 55/RN 0.83.6.
2. App paciente: **25 telas** (8 abas; HEP com pose detection, auto-agendamento, chat, gamificação, wellness/HealthKit).
3. Ambos consomem o Worker Hono real via TanStack Query — a grande maioria das áreas é **real, não mock**.
4. Mock confirmado: biomecânica no prof (KPIs hardcoded `biomecanica/index.tsx` + `MOCK_TRAJECTORY` em `analysis.tsx`), embora o client `lib/api/biomechanics.ts` e as rotas `/api/biomechanics` existam — integração incompleta.
5. Outros mocks: chat do paciente gera `mockConversationId` local; wellness cai em passos mockados sem HealthKit.
6. Auth divergente 3×: web (Neon Auth), prof (endpoint `/api/auth/login` + JWT em SecureStore), paciente (better-auth nativo).
7. Offline: os dois apps têm **fila de mutações persistida + replay via NetInfo** (prof: zustand `sync-store` c/ modal de conflito; paciente: `OfflineManager` c/ retries).
8. Lacuna offline: nenhum dos apps persiste o cache de leitura (sem PersistQueryClient como na web) — cold start offline fica vazio.
9. Lacuna logout no prof: não limpa fila de sync, cache nem push token do servidor.
10. Push: Expo Push Service em ambos, token registrado em `/api/push-subscriptions`; sem APNs direto; sem web push.
11. Deep links: só custom schemes (`fisioflowpro`/`fisioflow`); **universal links ausentes** nos dois apps.
12. Pipeline iOS ativo = `.github/workflows/ios-build.yml`: dispatch manual → runner `macos-26` (Xcode 26.2 obrigatório p/ SDK 55) → prebuild → patch Podfile (Swift concurrency) → assinatura manual (p12 + provisioning por app via secrets) → IPA artifact 14 dias → instalação USB.
13. TestFlight: perfil existe no eas.json mas o workflow ativo não sobe para ASC; workflows EAS cloud desabilitados por quota.
14. **Sentry provavelmente mudo nos IPAs atuais**: DSN não injetado no ios-build.yml e `SENTRY_DISABLE_AUTO_UPLOAD=true`; paciente usa DSN placeholder como fallback.
15. Config conflitante: perfil `testflight` aponta `api-pro.moocafisio.com.br`, mas `lib/config.ts` do prof rejeita essa URL em runtime e força workers.dev.
16. Legados: `apps/mobile-ios` = scaffold morto (fora do workspace); `android/` + `capacitor.config.ts` + workflows `mobile-ios/android.yml` = estratégia Capacitor dormente (abr/2026); `codemagic.yaml` = morto (Xcode 16.4 incompatível); `eas.json` raiz = obsoleto.
17. 6 workflows mobile coexistem; só 1 é o caminho real.
18. Compartilhamento de código web↔mobile ≈ zero (`@fisioflow/core` minúsculo, só no prof); tipos/clients duplicados 3×.
19. Dependência forte de Expo: OTA updates ligado, módulo nativo local de pose, patch em expo-modules-core, credenciais EAS remotas.
20. iOS mínimo não pinado (default SDK 55); iPhone 14 como alvo mínimo é decisão de produto não codificada; acessibilidade presente mas superficial (17/6 arquivos com labels).
