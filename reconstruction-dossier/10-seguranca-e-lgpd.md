# 10 — Segurança e LGPD

> Auditoria somente leitura @ commit `9b5c76f10`. Nenhum segredo/valor reproduzido — apenas nomes. Confiança: **A** (código lido), **B** (inferido), **C** (indício).

## 1. Autenticação

### 1.1 Login / logout / recuperação
- **Login staff**: front (Neon Auth SDK) + proxy `POST /api/auth/*` que encaminha ao Neon Auth (`apps/api/src/routes/auth.ts:41-55`). Rate limit de login: 10 tentativas / 15 min por IP (`auth.ts:12-20`). Signup: 5/h por IP + **Turnstile** (`auth.ts:27-32,226`). Reset de senha: 5/15min (`auth.ts:34-38`). Confiança A.
- **Logout**: SDK `signOut()` + `POST {NEON_AUTH_URL}/sign-out` explícito (`src/contexts/AuthContextProvider.tsx:310-331`) — revoga a sessão no Neon Auth.
- **Login paciente (portal)**: OTP 6 dígitos por telefone, validade 10 min, single-use (`apps/api/src/routes/patientPortal.ts:499-576`). Ver riscos §6 (R6).

### 1.2 Sessões, tokens, expiração, revogação
- **Verificação**: JWT do Neon Auth validado via **JWKS remoto** (`jose`), `clockTolerance: 2m`, issuer/audience opcionais por env (`apps/api/src/lib/auth.ts:312-337`). Tokens opacos (cookie de sessão Better Auth) validados via `/get-session` ou consulta direta a `neon_auth.session` com checagem de `expiresAt > now()` (`auth.ts:441-483`).
- **Fontes de token**: header `Authorization`, query `?token=` (WebSocket) e 4 nomes de cookie (`auth.ts:347-365`). Token em query string aparece em logs de acesso — risco baixo/médio (C).
- **Caches no Worker**: token verificado cacheado 60 s; usuário resolvido cacheado 10 min em memória (`auth.ts:17-18`). Consequência: revogação/alteração de papel pode demorar até 60 s (token) / 10 min (role/org) para valer num isolate quente. Confiança A.
- **Portal**: JWT próprio assinado (`SignJWT`) com `role: "patient"`, cookie `patient_session_token`; `clockTolerance: 10m` (`apps/api/src/lib/auth/patientAuth.ts:48-50`).

### 1.3 MFA
- **Existe como feature, não como controle**: UI (`src/components/auth/MFASettings.tsx`), serviço (`src/lib/auth/mfa.ts`) e backend (`apps/api/src/routes/security.ts:117-320` — tabela `mfa_settings`, enroll/enable/disable/OTP, eventos de segurança). **Porém nada no fluxo de login exige o segundo fator** — `routes/auth.ts` e `lib/auth.ts` não consultam `mfa_settings` (rg sem hits). MFA é efetivamente decorativo hoje. Confiança A.
- Backup codes gerados com `Math.random()` no cliente (`src/lib/auth/mfa.ts:57-60`) — não criptograficamente seguros (agravante menor, dado que MFA não é imposto).

## 2. Autorização server-side e RLS

- **Autorização**: `requireAuth` em praticamente todas as rotas; `requireRole` apenas em módulos admin/gamificação/KB/anúncios/import; RBAC granular só no WhatsApp (`apps/api/src/middleware/whatsapp-rbac.ts`). Detalhe completo no doc 03 e no CSV. **Gap sistêmico: financeiro, CRM, marketing, relatórios e prontuário não têm verificação de papel na API** — qualquer papel staff autenticado acessa tudo dentro da org. Confiança A.
- **RLS pretendido**: migrations criam policies `org_isolation_*` sobre `current_setting('app.org_id', true)` e `app.org_id` é setado por `runWithOrg` no `requireAuth` (`apps/api/src/lib/auth.ts:553`, `lib/db.ts`). No banco vivo, o inventário registra **260 tabelas com RLS habilitado e 43 desabilitado**, 339 policies, **33 tabelas com policy mas RLS desligado** e **28 com RLS ligado sem policy**. Logo, a cobertura não pode ser descrita como uniforme nem completa.
- **Ressalva crítica**: a role de conexão de produção é `neondb_owner` (**BYPASSRLS**) — evidência: queries fora de contexto de org funcionam (ex.: `patientPortal.ts:506` busca `patients` por telefone sem `app.org_id`), e a migration 0057 documenta a intenção não concretizada de role `app_runtime NOBYPASSRLS` (`0057_rls_complete.sql:4`). O isolamento real depende dos `WHERE organization_id` das rotas. RLS hoje é código dormant, não defesa ativa. Confiança B (confirmado por memória do projeto).
- **Fallback de org**: token válido sem profile → `DEFAULT_ORG_ID` como `viewer` (`lib/auth.ts:227-241`); auto-sync de profile por e-mail (`lib/auth.ts:156-188`) — ver riscos R4/R5.

## 3. Rate limiting, anti-abuso, Turnstile

- **Middleware** `rateLimit` sobre D1 `fisioflow-edge-cache` (contador atômico por org/IP + endpoint + janela; headers `X-RateLimit-*`; `Retry-After`) — `apps/api/src/middleware/rateLimit.ts:28-84`. **Fail-open** em erro de D1 e bypass quando `EDGE_CACHE` ausente (dev).
- Cobertura (confiança A): `/api/ai/*` 100/h por org (`routes/ai.ts:19`), copilot 60/h, briefing 120/h + send 20/h, fisiobrain 60/h, retention 60/min, criação de agendamentos 500/h, surveys, webchat (mensagem + poll), public booking/check-in, e auth (login/signup/reset por IP).
- **Turnstile**: `middleware/turnstile.ts` (verificação server-side no siteverify, IP incluído; bypass se `TURNSTILE_SECRET_KEY` ausente). Aplicado em signup (`routes/auth.ts:226`) e public booking (`routes/publicBooking.ts`). **Não aplicado** no OTP do portal do paciente (R6).

## 4. Auditoria e criptografia

- **Auditoria em 3 trilhas** (confiança A):
  1. `writeAuditLog` → D1 `audit_log` + Analytics Engine, ações tipadas incl. `lgpd.data_export/data_delete/consent_update` (`apps/api/src/lib/auditLog.ts:1-60`), fire-and-forget.
  2. `clinical_access_logs` em Neon — acesso a dados clínicos (read/create/update/delete/export) com IP e user-agent, "LGPD G2, Parecer DPO 2026-05-19" (`apps/api/src/lib/clinicalAccessLog.ts`; migration `0094`). Consulta admin via `GET /api/lgpd/clinical-access-logs` (`routes/lgpd.ts:96+`).
  3. Eventos de segurança (`logSecurityEvent` em `routes/security.ts` — mfa_enabled/disabled etc.).
  - UI: `/admin/audit-logs` (admin-only no front, `src/routes/admin.tsx:82`); o mount da API `/api/audit-logs` não tem `requireRole` visível (B).
- **Criptografia**: em trânsito TLS (Cloudflare/Neon); em repouso delegada a Neon/R2/D1 (padrão dos provedores). **Não há criptografia de campo** (CPF, prontuário) evidenciada no código (rg por libs de crypto aplicadas a colunas sem hits relevantes). Mídia de paciente servida via URL assinada S3/R2 com expiração (`patientPortal.ts:1673`, presigner AWS SDK). Confiança B.

## 5. LGPD

- **Política de retenção**: `LGPD_RETENTION_POLICY.md` (raiz, 227 linhas) — prontuário/evoluções/exames 20 anos (CFM/Lei 13.787), áudios Scribe 30 dias, logs de acesso 1 ano, financeiro/fiscal 10 anos, cadastro 5 anos pós-inatividade; procedimentos de soft-delete + anonimização (UPDATE zerando cpf/email/phone). É documento vivo com revisão trimestral prevista (próxima 2026-07-29 — vencendo).
- **Exclusão de dados**: `POST /api/lgpd/data-deletion-request` com resposta automatizada por escopo (`all` → negado com base legal Lei 13.787 art. 6 + LGPD art. 16 II; `cadastral` → revisão humana 15 dias úteis; `marketing` → revogação imediata) e registro em `lgpd_deletion_requests` (`apps/api/src/routes/lgpd.ts:29-73`). Autoexclusão do staff desativa acesso mantendo clínico 20 anos (`routes/profile.ts:655-662`). Mobile profissional tem `dataDeletionService` (`apps/professional-app/lib/services/dataDeletionService.ts`).
- **Consentimentos**: `marketing_consents` (migration `0036_missing_tables.sql:154`); revogação via escopo `marketing` do endpoint LGPD; ação de auditoria `lgpd.consent_update`. Consentimento clínico estruturado (termo de tratamento versionado) não evidenciado (C).
- **Exportação**: ação `lgpd.data_export` tipada no audit log e export de pacientes no front (`src/pages/patients/usePatientsExport.ts`); endpoint dedicado de portabilidade ao titular não localizado (B).
- **Anonimização**: prevista na política (SQL de anonimização); execução automatizada (cron) não localizada no código (C).

## 6. Riscos classificados

| # | Gravidade | Risco | Evidência | Confiança |
|---|---|---|---|---|
| R1 | **Alta (histórica, mitigada)** | Credencial `neondb_owner` vazada no histórico git — já **rotacionada** sem downtime; secrets diretos deletados; conexão só via Hyperdrive | memória do projeto (rotação Jul/2026); não reproduzir valores | B |
| R2 | **Alta** | RLS inerte em produção: role de conexão com BYPASSRLS; isolamento multi-tenant depende 100% de `WHERE organization_id` manual em ~150 arquivos de rota — um esquecimento = vazamento cross-org | `0057_rls_complete.sql:4`; `patientPortal.ts:506` (query cross-org funcional) | B |
| R3 | **Alta** | Autorização por papel ausente na API para financeiro/CRM/marketing/prontuário — estagiário/parceiro/viewer autenticado acessa dados financeiros e clínicos da org inteira via API direta | `routes/financial.ts`, `crm.ts`, `marketing.ts` sem `requireRole`; doc 03 §2.2 | A |
| R4 | **Média-alta** | MFA não imposto no login (feature morta) | `routes/auth.ts` sem consulta a `mfa_settings` | A |
| R5 | **Média-alta** | Auto-vinculação de profile por e-mail no auth (`user_id` re-apontado para o novo UID) — potencial account-takeover se o provedor não exigir verificação de e-mail no signup | `lib/auth.ts:156-188` | B |
| R6 | **Média-alta** | OTP do portal do paciente: sem rate limit, sem Turnstile, permite enumeração de telefones de pacientes (404 vs 200), **OTP logado em console** (visível em Workers Logs) e envio real por WhatsApp ainda stub (comentário); `dev_otp` retornado quando `ENVIRONMENT !== "production"` | `patientPortal.ts:499-538` | A |
| R7 | **Média** | Qualquer usuário autenticado cria convites com qualquer papel (incl. admin? — papel do convite não é validado contra whitelist) e cria organizações | `invitations.ts:22-53`; `organizations.ts:163-188` | A |
| R8 | **Média** | Fallback `DEFAULT_ORG_ID`/`viewer` para token válido sem membership — usuário não aprovado obtém contexto de org default; combinado com R3, rotas sem requireRole respondem | `lib/auth.ts:227-241` | A |
| R9 | **Média (LGPD)** | Screenshots de produção **versionados no git** com potenciais dados reais de pacientes (`patients_production.png`, `dashboard_production.png`, `crm_whatsapp_production.png` etc.) e transcrições de sessões de agente (`*-this-session-is-being-continued-*.txt`) na raiz, tracked | `git ls-files` na raiz | A |
| R10 | **Média (LGPD, local)** | CSV com dados de pacientes na raiz do working tree (`Pacientes - Activity Fisioterapia - *.csv`) — **não tracked** (ignorado por `.gitignore:299-300` `Pacientes*.csv`/`*.pii.csv`), mas presente em disco fora de área segura | ls raiz + `.gitignore:299` | A |
| R11 | **Baixa-média** | Rate limit fail-open (erro de D1 libera tráfego); Turnstile bypass silencioso sem secret | `middleware/rateLimit.ts:76-79`; `middleware/turnstile.ts:23-26` | A |
| R12 | **Baixa** | Hard-delete de paciente autorizado por e-mail hardcoded no código além de admin | `routes/patients.ts:1465` | A |
| R13 | **Baixa** | Token aceito via query string (WS) pode vazar em logs; caches de auth em memória atrasam revogação em até 10 min | `lib/auth.ts:353`, `auth.ts:17-18` | A |

## 7. Dados clínicos em mobile (alto nível)

- **Patient app** (`apps/patient-app/`, Expo): dados cacheados em `AsyncStorage` (não criptografado por padrão); logout limpa o storage (`app/(tabs)/settings.tsx:166`, `lib/storage.ts:68`). Confiança A.
- **Professional app** (`apps/professional-app/`): possui tela de bloqueio/unlock (`app/(auth)/unlock.tsx`), `auditLogger` e `dataDeletionService` locais — indícios de tratamento consciente de dados clínicos no dispositivo; profundidade da limpeza no logout não auditada linha a linha aqui. Confiança B.
- Recomendação de reconstrução: dados sensíveis no mobile deveriam ir a `SecureStore`/Keychain, com TTL e wipe garantido no logout/troca de usuário.
