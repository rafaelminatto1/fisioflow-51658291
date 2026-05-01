# PRD: FisioFlow — Plano de Implementação Completo 2026

## Metadata

| Campo | Valor |
|-------|-------|
| Autor | Rafael Minatto |
| Data | 2026-04-29 |
| Status | Aprovado |
| Versão | 1.0 |
| Escopo | Maio–Agosto 2026 (4 meses / 8 sprints de 2 semanas) |

---

## Resumo Executivo

O FisioFlow possui fundação técnica sólida (96 rotas, 57 migrations, RLS multi-tenant, CI/CD) mas tem gaps críticos que impedem lançamento seguro e adoção em escala: sync offline silencioso (placeholder), agendamento público sem frontend, push notifications pendentes, e patient app desconectado da API real. Este plano fecha todos esses gaps e adiciona os diferenciais competitivos aprovados (Digital Twin IA, HEP gamificado, check-in QR, assinatura digital, relatório de alta PDF) ao longo de 8 sprints.

**Fora de escopo:** Convênios/TISS (planos de saúde) · Marketplace de Protocolos

---

## Estado Atual vs. Meta

| Área | Hoje | Meta |
|------|------|------|
| Launch Checklist | 0/35 itens ✅ | 35/35 ✅ |
| Offline Sync | Placeholder silencioso | IndexedDB + Background Sync real |
| Agendamento Público | Backend pronto, sem frontend | Página `/agendar/:slug` em produção |
| Push Notifications | TODO no código | Web Push disparando em eventos reais |
| Patient App | Expo estruturado, sem integração real | Conectado à API, HEP gamificado |
| Digital Twin IA | Trigger existe, sem UI | Painel Prognóstico com gráficos PROMs |
| Relatório de Alta | Ausente | PDF gerado automaticamente ao fechar ciclo |
| Check-in QR | Ausente | QR na recepção → check-in pelo celular |
| Assinatura Digital | Tabela criada, sem integração | Contratos com validade jurídica |

---

## Personas

**Fisioterapeuta (primária):** Atende 6–12 pacientes/dia, 30% dos atendimentos fora de Wi-Fi (domiciliar, escolar). Precisa de prontuário que funcione offline e de automações que eliminem burocracia.

**Recepcionista:** Gerencia agenda e recepção. Precisa de check-in ágil e confirmações automáticas.

**Paciente (secundária):** 25–60 anos, baixa literacia digital. Quer agendar online sem ligar, receber lembretes e ver seus exercícios no celular.

**Admin/Gestor:** Dono ou coordenador da clínica. Precisa de relatórios financeiros, comissões e emissão de nota fiscal.

---

# SPRINT 0 — Fundação de Lançamento (Semana 1–2)

> **Objetivo:** Fechar o launch checklist e habilitar o pipeline de staging. Nada de feature nova antes disso.

## S0-A: Utilitário Global de Datas (Bug Crítico)

**Problema:** Agendamentos não aparecem na agenda por parse UTC + fuso BRT (UTC-3).

**Entregável:** `src/lib/date-utils.ts`

```ts
// parseLocalDate("2026-05-10") → Date no fuso local (não UTC midnight)
export function parseLocalDate(ymd: string): Date
export function toLocalYMD(date: Date): string   // "2026-05-10"
export function formatBRT(date: Date, fmt: string): string
```

**Aplicar em:**
- `src/hooks/useAppointments*.ts` — todos os filtros de data
- `src/components/schedule/` — seletor de dia no calendário
- `apps/api/src/routes/appointments.ts` — query por `appointment_date`
- `e2e/validate-agenda.spec.ts` — smoke test para regressão

**Critérios de aceite:**
- [ ] Agendamento criado em qualquer hora do dia aparece na data correta
- [ ] Smoke test `validate-agenda.spec.ts` passa em CI
- [ ] Nenhuma referência a `new Date(ymd)` direta fora de `date-utils.ts`

---

## S0-B: Down Scripts das Migrations

**Problema:** 14 das 18 migrations sem `.down.sql` — rollback de produção impossível.

**Entregável:** Stubs de rollback para `0032` a `0053` (as sem down script).

**Padrão de cada arquivo:**
```sql
-- 0032_boards.down.sql
ALTER TABLE tarefas DROP COLUMN IF EXISTS board_id, DROP COLUMN IF EXISTS column_id;
DROP TABLE IF EXISTS board_columns;
DROP TABLE IF EXISTS boards;
```

**Critérios de aceite:**
- [ ] `ls apps/api/migrations/*.down.sql | wc -l` = 18
- [ ] Script `scripts/check-migrations.sh` valida existência dos downs

---

## S0-C: Launch Checklist — Itens Operacionais

**Ações manuais (Rafael executa):**

| Item | Comando / Local |
|------|----------------|
| Secrets CI staging | GitHub → Settings → Secrets: `STAGING_TEST_USER_EMAIL`, `STAGING_TEST_USER_PASSWORD`, `STAGING_BASE_URL` |
| Alerta erro rate >1% | Cloudflare → Notifications → Workers → Error Rate |
| Alerta latência P95 >300ms | Cloudflare → Notifications → Workers → CPU Time |
| Alerta health check down | Cloudflare → Traffic → Health Checks → `https://fisioflow-api.rafalegollas.workers.dev/api/health` |
| VAPID keys geradas | `wrangler secret put VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` |
| `wrangler secret list --env production` completo | Verificar todos os secrets listados no `Env` type |

**Critérios de aceite:**
- [ ] Todos os 35 itens do `LAUNCH_CHECKLIST.md` marcados ✅
- [ ] Pipeline CI verde com staging secrets
- [ ] 3 alertas Cloudflare ativos e testados

---

## S0-D: E2E Smoke Tests em Staging

**Entregável:** `e2e/smoke.spec.ts` com 5 cenários `@smoke` passando em CI contra staging.

Cenários mínimos:
1. Login → dashboard carrega
2. Criar paciente → aparece na lista
3. Criar agendamento → aparece na agenda na data correta
4. Criar evolução SOAP → salva sem erro
5. Logout → cookie removido + redirect para login

---

# SPRINT 1 — Push Notifications & Sync Offline (Semana 3–4)

## S1-A: Web Push Notifications Reais

**Contexto:** `pushSubscriptions` tabela existe, `notificationPreferences.ts` rota existe. Falta o disparo real.

**Arquitetura:**
```
Evento (novo agendamento, lembrete, nova evolução)
  → Worker route trigger
  → Queue: fisioflow-background-tasks (type: SEND_PUSH)
  → Consumer: busca subscriptions do usuário no DB
  → Web Push API (RFC 8030) com VAPID
  → Service Worker do PWA recebe e exibe
```

**Entregáveis:**

1. `apps/api/src/lib/webpush.ts` — cliente Web Push para Workers:
```ts
export async function sendPushToUser(userId: string, payload: PushPayload, env: Env): Promise<void>
export async function sendPushToOrg(orgId: string, payload: PushPayload, env: Env): Promise<void>
interface PushPayload { title: string; body: string; icon?: string; url?: string; tag?: string }
```

2. Disparos automáticos em:
   - `appointments.ts POST /` → push para terapeuta + recepção: "Novo agendamento: [paciente] às [hora]"
   - `apps/api/src/routes/announcements.ts` → completar TODO de disparo em massa
   - Cron 06h BRT → push de lembretes do dia seguinte

3. `src/service-worker.ts` → handler `push` + `notificationclick` (redireciona para agenda/sessão)

4. `src/hooks/usePushNotifications.ts` → solicita permissão + registra subscription na API

**Tipos de notificação:**
| Evento | Destinatário | Tag (dedup) |
|--------|-------------|-------------|
| Novo agendamento | Fisio + recepção | `appointment-new-{id}` |
| Lembrete 24h antes | Fisio + paciente | `reminder-{appointmentId}` |
| Evolução registrada | Admin | `session-new-{id}` |
| NFS-e aprovada | Admin | `nfse-approved-{id}` |
| Anúncio em massa | Todos da org | `announcement-{id}` |

**Critérios de aceite:**
- [ ] Push aparece no browser após criar agendamento
- [ ] Clique na notificação abre a página correta
- [ ] Dedup por `tag` evita notificações duplicadas
- [ ] Usuário sem permissão → silencioso (sem erro)

---

## S1-B: Offline Sync Real (IndexedDB + Background Sync)

**Contexto:** `offlineSync.ts` atual tem `apiPost/apiPatch/apiDelete` como placeholders que não persistem.

**Arquitetura:**

```
[Fisio digita evolução SOAP offline]
  → useOfflineSync detecta navigator.onLine === false
  → Serializa payload em IndexedDB (idb-keyval ou dexie)
  → Service Worker registra SyncTag: "fisioflow-sync"
  → Quando volta online: Background Sync API dispara
  → Service Worker processa fila IndexedDB em ordem
  → PATCH/POST para API com retry exponencial (1s, 2s, 4s, max 3 tentativas)
  → Sucesso: remove da fila + invalida TanStack Query
  → Falha permanente: move para dead-letter local + alerta usuário
```

**Entregáveis:**

1. `src/lib/offline-queue.ts`:
```ts
export interface OfflineOp { id: string; method: string; url: string; body: unknown; createdAt: number; attempts: number }
export async function enqueue(op: Omit<OfflineOp, 'id'|'createdAt'|'attempts'>): Promise<void>
export async function dequeue(): Promise<OfflineOp[]>
export async function markDone(id: string): Promise<void>
export async function markFailed(id: string, error: string): Promise<void>
```

2. `src/service-worker.ts` → handler `sync` para tag `fisioflow-sync`

3. `src/services/offlineSync.ts` → substituir placeholders pelos métodos reais usando `offline-queue.ts`

4. `src/components/sync/SyncManager.tsx` → banner "X alterações pendentes de sincronização" + indicador de status

5. `apps/api/src/routes/sessions.ts` → endpoint `POST /api/sessions/bulk-sync` para sincronizar múltiplas evoluções de uma vez

**Casos offline suportados no MVP:**
- ✅ Criar/editar evolução SOAP
- ✅ Registrar presença/falta em agendamento
- ✅ Completar exercício no HEP
- ❌ Criar novo paciente (requer backend para dedup — fase 2)

**Critérios de aceite:**
- [ ] Criar evolução offline → aparece na lista após reconectar sem intervenção manual
- [ ] Banner mostra quantidade de itens pendentes
- [ ] Recarregar página com itens pendentes → sync continua (não perde dados)
- [ ] Teste unitário `offlineSync.test.ts` cobre enqueue + dequeue + retry

---

# SPRINT 2 — Agendamento Público (FisioLink) (Semana 5–6)

## S2-A: Perfil Público do Fisioterapeuta

**Contexto:** `GET /api/public-booking/booking/:slug` já retorna dados. Falta a migration de perfil público e o frontend.

**Migration necessária:**
```sql
-- 0058_public_profile.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_services JSONB DEFAULT '[]';
-- public_services: [{name, duration_minutes, price, color}]

CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug) WHERE is_public = true;
```

**Frontend — Settings:**
- `src/pages/configuracoes/PublicProfileSettings.tsx` — aba no painel de configurações:
  - Ativar/desativar perfil público
  - Definir slug (valida disponibilidade via `GET /api/public-booking/check-slug/:slug`)
  - Bio, foto, especialidade
  - Serviços oferecidos com duração e preço
  - Preview do link público: `https://fisioflow.pages.dev/agendar/[slug]`

---

## S2-B: Página Pública de Agendamento

**Rota:** `apps/web/src/pages/public/PublicBooking.tsx` (sem autenticação)

**Fluxo UX (3 passos):**

```
[1] Seleciona serviço
      ↓
[2] Seleciona data → horários disponíveis (grade)
      ↓
[3] Preenche nome + telefone + e-mail → Turnstile widget → Confirmar
      ↓
[Confirmação] Tela de sucesso + WhatsApp de confirmação automático
```

**Endpoints adicionais no backend:**
```
GET  /api/public-booking/booking/:slug/availability?date=YYYY-MM-DD
     → { slots: ["08:00","08:30",...], bookedSlots: ["09:00"] }

POST /api/public-booking/booking
     → { slug, service, date, time, patient: {name, phone, email} }
     → cria appointment + envia WhatsApp de confirmação
```

**Proteções:**
- Cloudflare Turnstile obrigatório no POST (já implementado no backend)
- Rate limit: 30 req/15min por IP (já implementado)
- Horários bloqueados por business hours + agendamentos existentes

**Notificações automáticas pós-agendamento:**
- WhatsApp para o paciente: "Seu agendamento foi confirmado para [data] às [hora] com [fisio]"
- Push para o fisioterapeuta: "Novo agendamento via link público: [nome] às [hora]"

**Critérios de aceite:**
- [ ] Página carrega sem autenticação
- [ ] Horários já ocupados não aparecem disponíveis
- [ ] Agendamento aparece na agenda do fisio imediatamente
- [ ] WhatsApp de confirmação enviado em <30s
- [ ] Turnstile bloqueia bots

---

## S2-C: Check-in Autônomo por QR Code

**Fluxo:**

```
Recepção imprime/exibe QR → paciente escaneia com câmera
  → Abre URL: /checkin?token=[JWT de uso único]
  → Página pública confirma identidade (nome do paciente)
  → Botão "Confirmar Check-in"
  → API marca appointment.status = 'present'
  → Recepcionista vê update em tempo real na agenda
```

**Entregáveis:**

1. `apps/api/src/routes/appointments.ts`:
```
POST /api/appointments/:id/qr-token   → gera JWT RS256 (exp: 2h), retorna { token, url }
POST /api/public/checkin              → verifica token + marca presente
```

2. `src/components/schedule/AppointmentQRCode.tsx` — botão "Gerar QR" no card do agendamento, exibe QR code (`qrcode.react`)

3. `src/pages/public/CheckIn.tsx` — página pública leve (sem layout do dashboard)

4. Realtime: `broadcastToOrg` (já existe) dispara `appointment:checked-in` → agenda atualiza sem F5

**Critérios de aceite:**
- [ ] QR gerado na agenda do fisio
- [ ] Scan → check-in em <3 segundos
- [ ] Token expira em 2h (não reutilizável)
- [ ] Agenda atualiza em tempo real para todos na org

---

# SPRINT 3 — Assinatura Digital & Relatório de Alta (Semana 7–8)

## S3-A: Assinatura Digital de Documentos

**Contexto:** `document_signatures` tabela existe, `documentSignatures.ts` (frontend) existe.

**Abordagem MVP (sem ITI/gov.br — complexidade alta):**
Assinatura com certificado digital auto-gerado + hash SHA-256 do documento + timestamp auditável. Validade jurídica via cláusula contratual (aceite eletrônico LGPD-compliant). Integração com ITI/ICP-Brasil como fase 2.

**Arquitetura:**
```
[Fisio cria documento] → PDF gerado pelo sistema
  → Hash SHA-256 do conteúdo
  → Enviado ao paciente via link seguro (token 48h)
  → Paciente acessa /assinar/:token → visualiza PDF
  → Clica "Assinar" → registra: IP, timestamp, user-agent, geolocalização
  → Hash armazenado em document_signatures + D1 (imutável)
  → PDF final gerado com "Assinado eletronicamente em [data] por [nome] — Hash: [sha256]"
```

**Tipos de documento suportados:**
- Contrato de serviço / TCLE (Termo de Consentimento Livre e Esclarecido)
- Autorização de uso de imagem
- Plano de tratamento

**Entregáveis:**

1. `apps/api/src/routes/documentSignatures.ts` — adicionar:
```
POST /api/document-signatures/:id/send-for-signature  → gera token + envia WhatsApp
GET  /api/public/sign/:token                          → retorna documento (sem auth)
POST /api/public/sign/:token/confirm                  → registra assinatura
GET  /api/document-signatures/:id/certificate         → PDF com comprovante
```

2. `src/pages/public/DocumentSigning.tsx` — página de assinatura (sem auth)

3. `src/components/documents/SignatureStatus.tsx` — badge "Aguardando assinatura / Assinado em [data]"

4. D1 audit log: `INSERT INTO fisioflow-db.evolution_index` com tipo `document_signed` + hash

**Critérios de aceite:**
- [ ] Link de assinatura enviado via WhatsApp
- [ ] Paciente assina sem criar conta
- [ ] Hash do documento verificável após assinatura
- [ ] PDF de comprovante gerado com metadados de auditoria
- [ ] Token expira em 48h

---

## S3-B: Relatório de Alta Clínica (PDF)

**Trigger:** ao fechar um `treatment_cycle` (status → `completed`)

**Conteúdo do PDF:**
```
┌─────────────────────────────────────────────────┐
│  RELATÓRIO DE ALTA FISIOTERAPÊUTICA             │
│  Clínica: [nome]    CRF: [número]               │
├─────────────────────────────────────────────────┤
│  PACIENTE: [nome]   Idade: [X]   CID: [código]  │
│  Período: [data início] a [data alta]           │
│  Total de sessões: [N]                          │
├─────────────────────────────────────────────────┤
│  DIAGNÓSTICO FISIOTERAPÊUTICO                   │
│  [texto da primeira evolução S]                 │
├─────────────────────────────────────────────────┤
│  EVOLUÇÃO CLÍNICA                               │
│  Gráfico PROMs: [VAS/PSFS/DASH/etc. ao longo   │
│  do tempo — se preenchidos]                     │
│  Resumo de evoluções: [primeiras + últimas]     │
├─────────────────────────────────────────────────┤
│  PLANO DE ALTA (HEP)                            │
│  [exercícios do último plano ativo]             │
│  Frequência recomendada: [X]x/semana            │
├─────────────────────────────────────────────────┤
│  Assinatura Digital: [hash se assinado]         │
│  CRF: [número]  Data: [hoje]                    │
└─────────────────────────────────────────────────┘
```

**Implementação:**

1. `apps/api/src/lib/pdf/discharge-report.ts` — usa `@react-pdf/renderer` ou `pdfkit` (via Worker):
```ts
export async function generateDischargeReport(cycleId: string, env: Env): Promise<Uint8Array>
```

2. `apps/api/src/routes/treatmentCycles.ts`:
```
POST /api/treatment-cycles/:id/close     → fecha ciclo + gera PDF + salva em R2
GET  /api/treatment-cycles/:id/report    → retorna PDF do R2
```

3. `src/components/patients/TreatmentCycleCard.tsx` — botão "Encerrar Ciclo → Gerar Relatório"

4. Trigger automático: ao fechar ciclo → PDF em R2 + push para fisio + WhatsApp para paciente com link

**Critérios de aceite:**
- [ ] PDF gerado em <5s
- [ ] Gráfico PROMs aparece se houver ao menos 2 registros
- [ ] HEP do último plano ativo incluso
- [ ] PDF disponível para download por 1 ano (R2)
- [ ] Link enviado via WhatsApp ao paciente

---

# SPRINT 4 — Patient App HEP Gamificado (Semana 9–10)

## S4-A: Conexão do Patient App com a API Real

**Contexto:** `apps/patient-app/` (Expo/React Native) existe com estrutura, testes de serviços, mas sem conexão validada ao Worker de produção.

**Entregáveis:**

1. `apps/patient-app/lib/api.ts` — cliente autenticado:
```ts
const API_BASE = process.env.EXPO_PUBLIC_API_URL // https://fisioflow-api.rafalegollas.workers.dev
// JWT: Neon Auth (mesmo fluxo do web app)
export const api = { get, post, patch, delete: del }
```

2. Fluxo de autenticação do paciente:
   - Login via `Neon Auth` (email/senha ou magic link)
   - Patient role: acesso restrito a `/api/patient-portal/*`
   - `apps/api/src/routes/patientPortal.ts` já existe — validar e completar

3. Telas mínimas funcionais:
   - `(tabs)/index.tsx` → Próximas consultas
   - `(tabs)/exercise/` → HEP do dia
   - `(tabs)/gamification.tsx` → XP, nível, badges
   - `profile/` → Configurações + logout

**Critérios de aceite:**
- [ ] Login com conta de paciente → acesso ao app
- [ ] Próximas consultas aparecem corretamente
- [ ] Exercícios do HEP listados com instruções e vídeo

---

## S4-B: HEP Gamificado

**Mecânica de jogo:**

| Ação | XP ganho |
|------|---------|
| Completar exercício do dia | +10 XP |
| Completar todos os exercícios do dia | +25 XP (bônus streak) |
| Streak de 7 dias | +100 XP + badge "Semana Perfeita" |
| Streak de 30 dias | +500 XP + badge "Dedicação Total" |
| Registrar dor (PROMs) | +5 XP |
| Check-in na consulta | +15 XP |

**Níveis do paciente:**
```
Nível 1: Iniciante     (0–100 XP)
Nível 2: Comprometido  (101–300 XP)
Nível 3: Disciplinado  (301–600 XP)
Nível 4: Atleta        (601–1000 XP)
Nível 5: Campeão       (1001+ XP)
```

**Entregáveis:**

1. `apps/api/src/routes/patientPortal.ts`:
```
POST /api/patient-portal/hep/:planId/complete-exercise   → +XP + streak update
GET  /api/patient-portal/gamification                    → XP atual, nível, badges, streak
POST /api/patient-portal/proms                           → registra escala + +XP
```

2. `apps/patient-app/app/(tabs)/exercise/` — tela de exercício:
   - Lista do dia com checkboxes
   - Animação de conclusão (confete)
   - Progresso do dia (3/5 exercícios)
   - Streak counter ("🔥 5 dias seguidos!")

3. `apps/patient-app/app/(tabs)/gamification.tsx`:
   - Barra de XP para próximo nível
   - Grid de badges (obtidos + bloqueados)
   - Ranking opcional (vs. média de pacientes anônimos)

4. Push notification diária às 09h: "Seus exercícios de hoje estão esperando! 💪 [streak atual]"

5. `src/components/patients/PatientGamificationSummary.tsx` — no prontuário web do fisio: ver XP e aderência do paciente

**Critérios de aceite:**
- [ ] XP acumulado após completar exercício em <1s
- [ ] Streak resetado à meia-noite se não completar
- [ ] Badge "Semana Perfeita" desbloqueado automaticamente
- [ ] Fisio vê % de aderência ao HEP no prontuário web
- [ ] Notificação diária configurável (paciente pode silenciar)

---

# SPRINT 5 — Digital Twin & Prognóstico IA (Semana 11–12)

## S5-A: Painel de Prognóstico IA (Digital Twin)

**Contexto:** `apps/api/src/routes/analytics/trigger-digital-twin.ts` já existe. A ideia é um painel por paciente que agrega dados para predição clínica.

**Dados utilizados:**
- Histórico de PROMs (VAS, PSFS, DASH, Oswestry, NDI, LEFS, Berg) ao longo do tempo
- Frequência de comparecimento vs. faltas
- Aderência ao HEP (XP/dias completados)
- Quantidade e cadência de sessões
- Diagnóstico CID-10

**Entregável — API:**
```
GET /api/analytics/patient/:id/digital-twin
→ {
    proms_timeline: [{date, scale, score, percentile}],
    adherence_score: 0-100,
    attendance_rate: 0-100,
    predicted_sessions_to_discharge: number | null,
    dropout_risk: "low" | "medium" | "high",
    dropout_risk_factors: string[],
    trend: "improving" | "stable" | "declining",
    ai_insights: string[]          // gerado por Claude via /api/ai/service
  }
```

**Lógica de risco de abandono (regras + IA):**
- Alto: >2 faltas consecutivas OU aderência HEP <30% OU sem agendamento nos últimos 14 dias
- Médio: 1 falta + aderência <60% OU intervalo >10 dias
- Baixo: comparecimento regular + HEP ativo

**AI insights** → Claude (via `apps/api/src/routes/ai.ts`):
```ts
const prompt = `
Paciente com ${age} anos, diagnóstico ${cid}, ${sessions} sessões.
PROMs recentes: ${JSON.stringify(promsTimeline.slice(-5))}.
Aderência HEP: ${adherenceScore}%. Taxa de comparecimento: ${attendanceRate}%.
Gere 3 insights clínicos concisos e 1 recomendação de conduta (máx 2 linhas cada).
`
```

**Entregável — Frontend:**

`src/components/patients/DigitalTwinPanel.tsx` — nova aba "Prognóstico" no prontuário do paciente:

```
┌──────────────────────────────────────────────┐
│  📈 Evolução PROMs                           │
│  [Gráfico Recharts: linhas por escala]       │
├──────────────────────────────────────────────┤
│  Aderência HEP: ████░░ 68%  🟡               │
│  Comparecimento: ████████ 92% 🟢             │
│  Risco de abandono: BAIXO 🟢                 │
├──────────────────────────────────────────────┤
│  🤖 Insights da IA                           │
│  • Melhora consistente no VAS (-3 pts/mês)   │
│  • Aderência HEP acima da média para CID     │
│  • Previsão de alta: ~6 sessões              │
│  ▶ Recomendação: manter frequência atual    │
└──────────────────────────────────────────────┘
```

**Alerta proativo:** quando `dropout_risk = "high"`, dispara push para o fisio: "⚠️ [paciente] com alto risco de abandono — última sessão há X dias"

**Critérios de aceite:**
- [ ] Gráfico PROMs renderiza com ao menos 2 pontos
- [ ] Risco de abandono atualizado após cada sessão
- [ ] Insights IA gerados em <3s (cache 24h em KV)
- [ ] Alerta push disparado quando risco muda para "high"
- [ ] Painel vazio gracioso quando dados insuficientes

---

## S5-B: Melhorias de Robustez da API

**Rotas com >800 linhas — refatorar para sub-rotas:**

| Arquivo atual | Linhas | Quebrar em |
|--------------|--------|-----------|
| `ai.ts` | 1617 | `ai-chat.ts`, `ai-documents.ts`, `ai-clinical.ts`, `ai-audio.ts` |
| `scheduling.ts` | 1375 | `scheduling-appointments.ts`, `scheduling-settings.ts`, `scheduling-waitlist.ts` |
| `appointments.ts` | 798 | extrair helpers adicionais para `appointmentHelpers.ts` |

**Critérios de aceite:**
- [ ] Nenhum arquivo de rota >600 linhas
- [ ] TypeScript 0 erros após refatoração
- [ ] Todos os testes existentes passando

---

# SPRINT 6 — Polimento & Performance (Semana 13–14)

## S6-A: Performance Frontend

**Baseline atual (estimado):** LCP ~2s, bundle não analisado

**Ações:**
1. `pnpm dlx vite-bundle-visualizer` → identificar top 5 dependências por tamanho
2. Lazy loading de rotas pesadas: `IAStudio`, `AdvancedAnalytics`, `TelemedicineRoom`
3. Imagens R2: garantir `srcset` + AVIF/WebP para todas as fotos de exercícios
4. `apps/web/src/asset-worker.ts` → verificar cache headers (já modificado no git status)

**Meta:** LCP <1.2s em Lighthouse CI (já definido no PRD)

## S6-B: Acessibilidade (a11y)

**Critérios de aceite:**
- [ ] Lighthouse Accessibility ≥ 90 em todas as rotas principais
- [ ] Navegação por teclado completa no agendamento público
- [ ] `aria-label` em todos os ícones sem texto

## S6-C: Documentação Técnica

1. `ARCHITECTURE.md` — diagrama de componentes atualizado (apps, packages, workers, DB, bindings)
2. Storybook para os 25 componentes do Design System
3. API docs OpenAPI gerada via Hono's `@hono/zod-openapi` (rotas principais)

---

# SPRINT 7 — Financeiro Completo & NFS-e (Semana 15–16)

## S7-A: Dashboard Financeiro Consolidado

**Contexto:** `financial.ts`, `financial-analytics.ts`, `financial-commerce.ts`, `commissions.ts`, `recibos.ts` existem. Falta unificar na UI.

**Tela `src/pages/financeiro/`:**
```
┌─ Resumo do Mês ──────────────────────────────┐
│  Receita: R$ X.XXX   Despesas: R$ X.XXX      │
│  A receber: R$ X.XXX  Inadimplência: X%      │
├─ Comissões ──────────────────────────────────┤
│  [tabela por fisioterapeuta]                  │
├─ NFS-e ─────────────────────────────────────┤
│  Pendentes: X  Aprovadas: X  Rejeitadas: X   │
│  [botão Emitir em Lote]                      │
└──────────────────────────────────────────────┘
```

**Emissão em lote de NFS-e:**
- Selecionar período → listar sessões sem NFS-e emitida → emitir todas com 1 clique
- Queue `fisioflow-background-tasks` → processamento assíncrono
- Push notification quando lote concluído

## S7-B: Recibos e Comprovantes

**Entregável:** `src/components/financial/ReceiptGenerator.tsx`
- PDF de recibo por sessão (R2 storage)
- Envio automático via WhatsApp após pagamento registrado
- QR code Pix gerado dinamicamente (via API pública do Banco Central)

---

# SPRINT 8 — Lançamento Beta & Monitoramento (Semana 17–18)

## S8-A: Onboarding de Beta Testers

**Fluxo:**
1. `/pre-cadastro` já existe → validar formulário completo
2. Admin aprova → convite automático por e-mail (Neon Auth)
3. Wizard de primeira configuração: clínica → horários → primeiro fisio → primeiro paciente

## S8-B: SLO Baselining

Após 14 dias em produção com tráfego real:
- Medir P95 de latência por rota (Analytics Engine)
- Ajustar thresholds de alerta Cloudflare
- Calcular uptime real vs. meta 99.9%
- Relatório quinzenal automático (cron Cloudflare)

## S8-C: Feedback Loop

- `src/pages/Surveys.tsx` (NPS) → disparar automaticamente após 7 dias de uso
- `satisfaction_surveys` tabela já existe
- Dashboard de NPS em `src/pages/analytics/`

---

# Resumo por Sprint

| Sprint | Período | Entregável Principal | Impacto |
|--------|---------|---------------------|---------|
| **S0** | Sem 1–2 | Launch checklist, bug de datas, down scripts | Desbloqueador |
| **S1** | Sem 3–4 | Push notifications + Offline sync real | Confiabilidade |
| **S2** | Sem 5–6 | Agendamento público + Check-in QR | Aquisição |
| **S3** | Sem 7–8 | Assinatura digital + Relatório de Alta PDF | Retenção |
| **S4** | Sem 9–10 | Patient App + HEP gamificado | Engajamento paciente |
| **S5** | Sem 11–12 | Digital Twin IA + refatoração API | Diferencial |
| **S6** | Sem 13–14 | Performance, a11y, documentação | Qualidade |
| **S7** | Sem 15–16 | Financeiro consolidado + NFS-e em lote | Operacional |
| **S8** | Sem 17–18 | Beta launch + monitoramento | Go-to-market |

---

# Dependências Críticas

| Dependência | Bloqueia | Status |
|-------------|---------|--------|
| VAPID keys geradas (`wrangler secret put`) | S1-A Push Notifications | Pendente |
| Secrets CI staging configurados no GitHub | S0-C + todos os E2E | Pendente |
| `0058_public_profile.sql` migration aplicada | S2-A/B | Planejado |
| LiveKit tokens funcionando em produção | Telemedicina (já existe) | Verificar |
| `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` em prod | S1, S2, S3 | Verificar |

---

# Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Background Sync API não suportada em Safari iOS | Alta | Alto | Fallback: sync ao abrir app (foreground sync) |
| SOAP da prefeitura SP instável (NFS-e) | Média | Médio | Retry + dead letter + alertas |
| Claude API latência em insights IA | Baixa | Médio | Cache KV 24h, skeleton loading |
| Expo push notifications iOS requer APNs | Alta | Alto | Configurar APNs no Sprint 4 |
| PDF generation em Workers (limite memória) | Média | Médio | Gerar via Stream + salvar em R2 |

---

# Métricas de Sucesso

| Métrica | Baseline | Meta (Semana 18) |
|---------|---------|-----------------|
| Launch Checklist | 0% | 100% |
| Latência API P95 | ~? ms | <200ms |
| Uptime | ~? | >99.9% |
| Aderência HEP (pacientes com app) | ~? | >60% |
| Agendamentos via link público | 0 | >20% do total |
| Churn de pacientes (abandono) | ~? | -20% vs. baseline |
| NPS clínicas beta | — | >50 |

---

# Decisões Abertas

- [ ] **D6:** Patient App entra nas stores (App Store + Play Store) ou apenas TestFlight/APK interno?
- [ ] **D7:** Canal de alertas de incidentes — WhatsApp do Rafael ou canal Slack?
- [ ] **D8:** Política de retenção de dados de pacientes (LGPD) — 5 anos após alta?
- [ ] **D9:** APNs certificado para iOS push — registrar conta Apple Developer?
- [ ] **D10:** Assinatura digital: aceite eletrônico simples ou integração ICP-Brasil no futuro?

---

*FisioFlow — Plano de Implementação v1.0 | Rafael Minatto | Abril 2026*
