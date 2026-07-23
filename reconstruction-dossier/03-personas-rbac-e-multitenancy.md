# 03 — Personas, RBAC e Multi-tenancy

> Auditoria somente leitura @ commit `9b5c76f10`. Evidências em `arquivo:linha`. Confiança: **A** (código lido diretamente), **B** (inferido de múltiplas evidências), **C** (indício, não confirmado em runtime).

## 1. Personas e papéis reais

O modelo de papéis vive em `profiles.role` (TEXT) + `profiles.roles` (TEXT[], multi-role). O backend normaliza e aceita ambos (`apps/api/src/lib/auth.ts:261-275`, `userHasRole`).

Papéis observados no código (confiança A):

| Papel | Origem/uso | Observações |
|---|---|---|
| `admin` | whitelist de aprovação (`apps/api/src/routes/profile.ts:704-711`), `requireRole("admin")` em rotas admin | acesso total; também aceito como `owner` em algumas rotas |
| `owner` | aceito em `requireRole(["admin","owner"])` (`apps/api/src/routes/admin/cloudflare-control.ts:16`, `clinicalDocs.ts:20`, `cloudflareAnalytics.ts:8`, `announcements.ts:57`) | não está na whitelist de aprovação — papel "fantasma": só chega via edição direta do banco (confiança B) |
| `fisioterapeuta` | whitelist de aprovação; guards frontend; matriz WhatsApp | profissional pleno |
| `estagiario` | whitelist; matriz WhatsApp (`apps/api/src/middleware/whatsapp-rbac.ts:34-39`); edição colaborativa (`apps/api/src/agents/EvolutionCollaboration.ts:10`) | subconjunto do fisioterapeuta |
| `recepcionista` | whitelist; matriz WhatsApp (`whatsapp-rbac.ts:40-51`) | vê todas conversas + financeiro no WhatsApp, sem clínico |
| `paciente` | `PatientRoute` frontend (`src/components/ProtectedRoute.tsx:178-180`); portal separado | ver §5 |
| `parceiro` | `PartnerRoute` (`ProtectedRoute.tsx:182-184`); whitelist de aprovação | educador físico/parceiro — pouca superfície além do guard |
| `pending` | estado transitório pós-cadastro (`ProtectedRoute.tsx:114-123`) | bloqueado em `/pending-approval` até aprovação |
| `viewer` | **default de fallback do backend** quando o profile não tem role (`apps/api/src/lib/auth.ts:197,220,240,468`) | não existe guard frontend nem permissões definidas para ele — é um papel implícito |

## 2. Onde cada camada aplica a regra

### 2.1 Frontend (React)
- Guard central: `src/components/ProtectedRoute.tsx` — `allowedRoles`, multi-role (`roles[]` filtrando `pending`, linhas 126-132), redirecionamento de pendentes (114-118), e conveniências `AdminRoute`/`ProfessionalRoute`/`TherapistRoute`/`PatientRoute`/`PartnerRoute` (160-184).
- Rotas admin com role: `src/routes/admin.tsx:70-221` (`/admin/users`, `/admin/audit-logs`, `/admin/security` = admin; `/admin/crud`, goals, gamification = admin+fisioterapeuta).
- **Gap importante**: `src/routes/financial.tsx`, `src/routes/marketing.tsx` (e a maioria dos módulos) usam `<ProtectedRoute>` **sem `allowedRoles`** — qualquer papel logado acessa Financeiro/CRM/Marketing pela URL; a "restrição de fisios a CRM/financeiro" é essencialmente ocultação de menu (`src/components/layout/Sidebar.tsx:261-263` só esconde itens de admin). Confiança A.

### 2.2 API (Hono middleware)
- `requireAuth` (`apps/api/src/lib/auth.ts:537-554`): valida token, resolve profile→org e roda o handler dentro de `runWithOrg(organizationId)`.
- `requireRole` (`auth.ts:277-287`): usado apenas em um subconjunto pequeno: rotas `admin/*` (`trigger-digital-twin.ts:19`, `slo-metrics.ts:8`, `dlq-replay.ts:13`, `seed-templates.ts:16`, `cloudflare-control.ts:16`, `trigger-session-archive.ts:15`), `clinicalDocs.ts:20`, `cloudflareAnalytics.ts:8`, endpoints admin de gamificação (`gamification.ts:934-1303`), `exercise-import.ts:61-121` (função `isAdmin` local), `announcements.ts:57-146`, aprovação de usuários (`profile.ts:671-704`).
- RBAC mais rico só no WhatsApp: `apps/api/src/middleware/whatsapp-rbac.ts:6-52` define matriz de 15 permissões × 4 papéis e `getScopedConversationsFilter` (126-182) restringe fisio/estagiário às conversas atribuídas/dos seus pacientes.
- **Gap principal**: `financial.ts`, `crm.ts`, `marketing.ts`, `reports.ts`, `patients.ts` (exceto hard-delete), `sessions.ts` etc. têm **zero verificação de papel** — apenas `requireAuth` + isolamento por org. Um estagiário autenticado consegue chamar toda a API financeira/CRM. Confiança A (rg sem hits de `requireRole|userHasRole` nesses arquivos).
- Smell: `patients.ts:1465` — hard delete permitido para `role === "admin"` **ou um e-mail hardcoded** (verificação por identidade individual embutida no código).

### 2.3 Banco (RLS)
- RLS é **por organização, não por papel**: policies `org_isolation_*` com `current_setting('app.org_id', true)` (`apps/api/migrations/0057_rls_complete.sql:7-40` e sucessoras 0091/0100/0106/0110/0111/0140). Nenhuma policy diferencia admin de estagiário.
- Cobertura estática nas migrations não corresponde ao banco vivo. O inventário de produção registra 303 tabelas: **260 com RLS habilitado, 43 desabilitado, 339 policies, 33 tabelas com policy mas RLS desligado e 28 com RLS ligado sem policy**. Essas contagens substituem a estimativa por `rg` de 124 tabelas para descrever o AS-IS.
- **Ressalva crítica**: em produção o Worker conecta como `neondb_owner`, que tem `BYPASSRLS` (memória do projeto + evidência indireta: `patientPortal.ts:506-524` consulta `patients` sem contexto de org e funciona). A migration 0057 anota a intenção de usar role `app_runtime (NOBYPASSRLS)` (`0057_rls_complete.sql:4`), mas isso não está em vigor. O isolamento efetivo vem do `WHERE organization_id = $1` nas queries + `runWithOrg`. Confiança B.

## 3. Matriz papel × módulo × ação (resumo)

Legenda: ✅ enforced, 👁 só visual (menu escondido), ❌ ausente. Matriz completa em `inventories/roles-permissions.csv`.

| Módulo / Ação | Frontend | API | RLS | Comentário |
|---|---|---|---|---|
| Admin (usuários, audit, security) | ✅ `allowedRoles:["admin"]` | ✅ `requireRole`/check inline | org-only | camadas alinhadas |
| Aprovação de cadastro | ✅ (página admin) | ✅ `profile.ts:672,695` | org-only | ok |
| Financeiro (todas ações) | ❌ (`ProtectedRoute` sem roles) | ❌ (só `requireAuth`) | org-only | **regra "fisio não vê financeiro" só existe no menu** |
| CRM / Marketing | ❌ | ❌ | org-only | idem |
| WhatsApp inbox | 👁 | ✅ matriz de permissões + escopo de conversas | org-only | melhor RBAC do sistema |
| Pacientes/prontuário CRUD | ❌ | ❌ (qualquer papel staff) | org-only | estagiário edita prontuário sem restrição server-side |
| Hard delete de paciente | — | ✅ admin (ou e-mail fixo) | org-only | smell do e-mail hardcoded |
| Gamificação (definições) | ✅ admin+fisio | ✅ `requireRole("admin")` | org-only | API mais restrita que o front |
| Exercícios import | — | ✅ admin | org-only | ok |
| Docs clínicos (KB) | 👁 | ✅ admin/owner | org-only | ok |
| Convites | 👁 (tela admin) | ❌ (`invitations.ts:22` só `requireAuth`) | org-only | **qualquer usuário logado pode convidar com qualquer papel** |
| Criar organização | — | ❌ (`organizations.ts:163` só `requireAuth`) | — | qualquer logado cria org |
| Portal do paciente | ✅ `PatientRoute` | ✅ `requirePatientAuth` (JWT `role=patient`) | org-only | trilho separado, bem isolado |
| Colaboração de evolução (WS) | — | ✅ `EDITABLE_ROLES` (`EvolutionCollaboration.ts:10`) | — | ok |

## 4. Multi-tenancy

- **Modelo**: tabela `organizations` + `organization_id` em ~124 tabelas. Na prática é **clínica única**: `DEFAULT_ORG_ID = "00000000-...-0001"` (`auth.ts:25`).
- **Injeção do org_id**: `requireAuth` resolve o profile do usuário no banco (`resolveAuthContext`, `auth.ts:123-242`) e chama `runWithOrg(user.organizationId, next)` (`auth.ts:553`), que faz `SELECT set_config('app.org_id', ...)` na conexão (`apps/api/src/lib/db.ts`). As rotas ainda filtram explicitamente por `organization_id = $1` nas queries (defesa dupla, e a que de fato vale dado o bypassrls).
- **Fallbacks perigosos** (confiança A): token válido sem profile → cai em `DEFAULT_ORG_ID` com role `viewer` (`auth.ts:227-241`) "para completar cadastro"; e auto-sync de `user_id` por e-mail (`auth.ts:156-188`) — se um e-mail de profile existente for registrado de novo no Neon Auth, o novo UID assume o profile antigo (vetor de account-takeover se e-mail não for verificado; mitigado se Neon Auth verificar e-mail — não confirmado, confiança C).
- **Troca de org**: não há UI/endpoint de "switch org"; `GET /api/organizations/current` retorna a org do profile; `PUT /:id` só atualiza a própria org (`organizations.ts:228-235`, `WHERE id=$n AND id=orgId do usuário`). Porém `POST /` cria org sem gate de papel (`organizations.ts:163-188`).
- **Portal do paciente**: JWT próprio com `orgId` no payload (`apps/api/src/lib/auth/patientAuth.ts:53-70`), isolado do staff.

## 5. Convites, onboarding, aprovação

- **Cadastro**: `POST /api/auth/signup` (rate-limit 5/h por IP + Turnstile — `auth.ts (routes):27-38,226`) proxy para Neon Auth `/sign-up/email`; profile nasce como `pending`.
- **Pending approval**: front bloqueia em `/pending-approval` (`ProtectedRoute.tsx:114-123`; página `src/pages/PendingApproval.tsx`); admin lista via `GET /api/profile/admin/pending` e aprova via `POST /api/profile/admin/approve/:profileId` com whitelist de papéis e suporte multi-role (`profile.ts:671-758`). O papel `pending` nunca concede acesso sozinho (`ProtectedRoute.tsx:126-130`).
- **Convites** (`apps/api/src/routes/invitations.ts`): tabela `user_invitations`, token de 64 hex, expira em 7 dias, papel default `fisioterapeuta`. Endpoints públicos `GET /validate/:token` e `POST /use/:token`. Gaps: criação de convite sem checagem de admin (linha 22); `POST /use/:token` não valida que o e-mail do usuário logado bate com o do convite (marca como usado sem vínculo, confiança A).
- **Multi-role**: `roles TEXT[]` respeitado no front (`ProtectedRoute.tsx:126-132`), no back (`userHasRole`, `auth.ts:261-275`) e na aprovação (`profile.ts:715-717`).

## 6. Portal do paciente — o que vê/faz

- **Web**: rota `/portal` (`src/routes/patients.tsx:115`, página `src/pages/PatientPortal.tsx`), guard `PatientRoute`.
- **Login do portal** (fluxo separado do staff): OTP de 6 dígitos por telefone — `POST /api/patient-portal/auth/request-otp` e `/auth/verify-otp` (`patientPortal.ts:499-576`); token JWT com `role: "patient"`, cookie `patient_session_token`. Ver riscos deste fluxo no doc 10 (§ riscos).
- **Funcionalidades** (`patientPortal.ts:595-1673`, confiança A): perfil (ler/editar), lista de fisioterapeutas + vínculo, agendamentos (ver/confirmar/cancelar), exercícios prescritos (ver/concluir/log), notificações, progresso/estatísticas, indicação (referral), digital twin / AI snapshot, gamificação, PROMs, fotos e pedidos médicos (mídia com URL assinada R2), e pedido de exclusão LGPD (via `lgpd.ts`, `request_origin: patient_portal`).
- **App mobile paciente**: `apps/patient-app/` (Expo) consome os mesmos endpoints; logout limpa `AsyncStorage` (`apps/patient-app/app/(tabs)/settings.tsx:166`, `lib/storage.ts:68`).
- O que o paciente **não** faz: agendar do zero (memória do projeto: pacientes sem agendamento — apenas confirmar/cancelar; confiança B), acessar qualquer rota staff (guard `role !== "patient"` → 403, `patientAuth.ts:53-55`).
