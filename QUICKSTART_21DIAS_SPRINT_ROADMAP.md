# ⚡ QUICK-START: 21 Dias para Market-Ready (Sprint Roadmap)

**Início:** Hoje (segunda-feira)  
**Alvo:** Go-live Produção (dia 21)  
**Soft-launch:** 5 clínicas piloto (semana 4)

---

## 🎯 SEMANA 1: FUNDAÇÕES (Sprint 1.1–1.3)

### Sprint 1.1: Apps nas Stores (2 dias)
**Responsável:** DevOps / Mobile  
**Paralelo:** SIM (não bloqueia outros sprints)

```
DIA 1:
  ☐ iOS
    ├─ Generate cert (Apple Developer)
    ├─ Setup Bundle ID
    └─ Build release (`expo build:ios`)
  ☐ Android
    ├─ Generate key signature
    ├─ Setup Play Console
    └─ Build release (`expo build:android`)

DIA 2:
  ☐ iOS: Submit App Store
  ☐ Android: Upload Google Play (beta)
  ☐ Marketing: Screenshots + descrição (80 chars)
  
Resultado: Apps "Em revisão" (iOS) + Beta (Android)
Impacto: +50% instalações quando aprovado
```

---

### Sprint 1.2: Dashboard CAC/LTV/Payback (4 dias)
**Responsável:** Backend (1 dev) + Frontend (1 dev)  
**Paralelo:** SIM

```
DIA 1: Backend — Queries + Endpoints
  ☐ GET /bi/cac
    ├─ SQL: SUM(marketing_spend) ÷ COUNT(new_patients)
    ├─ Retorna: CAC mensal + channel breakdown + benchmark
    └─ Testes: Vitest (query <500ms)
    
  ☐ GET /bi/ltv
    ├─ SQL: Cohort analysis (quando paciente entrou)
    ├─ Retorna: LTV estimado + retention rate + benchmark
    └─ Testes: Vitest (histórico 90 dias)
    
  ☐ GET /bi/payback
    ├─ Calc: CAC ÷ (receita_mensal_paciente)
    ├─ Retorna: Meses para payback + status (on-track/critical)
    └─ Testes: Vitest (validar cálculo)

DIA 2: Frontend — Components + State
  ☐ KPI Cards (4 cards gigantes)
    ├─ CAC card (azul) + trend chart
    ├─ LTV card (verde) + LTV:CAC ratio
    ├─ Payback card (roxo) + meta (6 meses)
    └─ Ocupação card (amarelo, já existe)
    
  ☐ Gráficos
    ├─ Linha: CAC últimos 90 dias vs. benchmark
    ├─ Heatmap: LTV por cohort
    └─ Scatter: CAC vs. Payback

DIA 3: Integração + Styling
  ☐ Hook useBI() integrado
  ☐ Tokens semânticos aplicados (Tailwind v4)
  ☐ Responsividade mobile
  ☐ Dark mode

DIA 4: Testes + Deploy Staging
  ☐ E2E test: Dashboard carrega sem erro
  ☐ Validação números com dados reais (Mooca)
  ☐ Performance check (<2s load)
  ☐ Deploy staging

Resultado: Dashboard CAC/LTV/Payback live em staging
Impacto: Gestor vê ROI, toma decisões corretas (+50% aprovação)
```

---

### Sprint 1.3: WhatsApp Confirmação (3 dias)
**Responsável:** Backend (1 dev)  
**Paralelo:** SIM

```
DIA 1: Backend — Cron + Webhook
  ☐ Cron de Confirmação (D-2, 48h antes)
    ├─ Query: agendamentos pendentes em 48h
    ├─ Loop: enviar template via Meta API com buttons
    ├─ Log: confirmation_sent_at no DB
    └─ Testes: Mock Meta API, validar payload
    
  ☐ Webhook /webhooks/whatsapp-buttons
    ├─ Parse response (button_reply.id)
    ├─ Update DB (status = 'confirmed' ou 'needs_reschedule')
    ├─ Auto-reply via WhatsApp
    └─ Testes: Simular button click, assert DB update

DIA 2: Cron D-1 + Frontend
  ☐ Cron D-1 (24h antes, segunda tentativa)
    ├─ Query: ainda pendentes (não responderam)
    ├─ Enviar mensagem sem buttons (urgência)
    └─ Testes: Validar escalation
    
  ☐ Frontend: Confirmation Status Card
    ├─ Cards: Confirmados (verde) | Pendentes (amarelo) | Reagendar (azul)
    ├─ Button: "Lembrar agora" (dispara manual D-2)
    └─ Integrar em dashboard

DIA 3: Testes E2E + Deploy Staging
  ☐ Teste completo: agendamento → D-2 lembrete → resposta → status updated
  ☐ Validar latência Meta API (<2s)
  ☐ Validar taxa de entrega (>95%)
  ☐ Deploy staging com dados reais

Resultado: WhatsApp automático funcionando em staging
Impacto: No-show 15%→8% (-47%), economiza R$2k/mês
```

---

## 🎯 SEMANA 2: INTEGRAÇÃO (Sprint 2.1–2.2)

### Sprint 2.1: Turmas + Mobile Check-in (5 dias)
**Responsável:** Frontend + Mobile (2 devs)  
**Paralelo:** NÃO (depende de schema pronto)

```
DIA 1: Design + API Contracts
  ☐ UI Flow
    ├─ Matrícula: paciente clica em turma, confirma 12 aulas
    ├─ Check-in: QR code → scan → "Presente"
    ├─ Presença: lista + resumo semanal
    └─ Faturamento: pacote de 12 aulas = 1 recebimento

DIA 2–3: Frontend Web
  ☐ Componentes
    ├─ TurmasGrid (listar turmas abertas)
    ├─ ModalMatricula (escolher turma + confirmar)
    ├─ ListaPresenca (admin: lista de presença + edit)
    └─ RelatorioTurma (weekly summary)

DIA 4: Mobile App
  ☐ Tela de Check-in (app fisio)
    ├─ QR code scanner (via react-native-qr-code)
    ├─ Auto-mark "Presente"
    ├─ Lista visual de presentes
    └─ Sync offline-first

DIA 5: Testes + Deploy
  ☐ E2E: Matrícula → Check-in → Relatório
  ☐ Faturamento automático após 12 presentes
  ☐ Deploy staging

Resultado: Gestão de turmas operacional
Impacto: Novo segmento 60–80% margem, +R$3k/mês
```

---

### Sprint 2.2: AI Concierge Validação (3 dias)
**Responsável:** Backend + Ops  
**Paralelo:** SIM (mas depois de sprint 1.1–1.3)

```
DIA 1: Validação de Produção
  ☐ Endpoint /ai/concierge/lead-response
    ├─ Recebe: WhatsApp message
    ├─ IA geraResponse (Gemini + system prompt)
    ├─ Envia via Meta API
    ├─ Log: latência, token count, confidence
    └─ Teste: Latência <2s em prod

DIA 2: Telemetria
  ☐ Dashboard: Taxa de conversão lead→agendamento
    ├─ Total leads recebidos
    ├─ Respondidos por IA
    ├─ Convertidos em agendamento
    ├─ Conversion rate %
    └─ Histórico últimos 30 dias

DIA 3: Deploy + Monitor
  ☐ Feature flag: ativar AI concierge para 10% de leads
  ☐ Monitor SLOs: latência <2s, uptime >99%
  ☐ Alert: se latência >5s ou erro rate >1%

Resultado: AI respondendo leads em produção
Impacto: Lead conversion 5%→15%, +R$4k/mês
```

---

## 🎯 SEMANA 3: INTEGRAÇÃO + TESTES (Sprint 3.1)

### Sprint 3.1: E2E Testing + Staging Validation (7 dias)
**Responsável:** QA + Backend Lead  
**Paralelo:** NÃO (consolidação)

```
DIA 1–2: Testes E2E (Playwright)
  ☐ Fluxo completo (golden path)
    ├─ Gestor faz login
    ├─ Vê dashboard CAC/LTV/Payback
    ├─ Paciente recebe WhatsApp D-2
    ├─ Paciente confirma [✅]
    ├─ Dashboard mostra "Confirmado"
    ├─ Turmas: check-in QR code
    ├─ AI Concierge: responde novo lead
    └─ Relatório presença gerado
    
  ☐ Testes de performance
    ├─ Dashboard load <2s
    ├─ WhatsApp latência <2s
    ├─ AI response <2s
    └─ Mobile app <3s

DIA 3: Staging Validation com Mooca Fisio
  ☐ Gestor acessa dashboard em staging
  ☐ Fisioterapeuta recebe WhatsApp de teste
  ☐ Paciente confirma
  ☐ Feedback: UX, mensagens, fluxo
  ☐ Log bugs / ajustes necessários

DIA 4–5: Bug Fixes
  ☐ UX improvements baseado em feedback
  ☐ Fix bugs críticos
  ☐ Re-test golden path
  ☐ Performance optimization (se necessário)

DIA 6–7: Preparação para Produção
  ☐ Backup da DB produção
  ☐ Migration script testado
  ☐ Rollback plan documentado
  ☐ SLOs configurado (Datadog/CloudFlare)
  ☐ Support playbook para gestores novos

Resultado: Sistema pronto para produção
Impacto: Zero downtime esperado, rollback <5 min
```

---

## 🎯 SEMANA 4: GO-LIVE (Sprint 4.1)

### Sprint 4.1: Deploy Produção + Soft Launch (7 dias)
**Responsável:** DevOps + Backend Lead + Support  
**Paralelo:** NÃO

```
DIA 1: Deploy em Produção (SEGUNDA)
  ☐ PRÉ-DEPLOY (30 min antes)
    ├─ Backup DB completo
    ├─ Teste de rollback (dry-run)
    ├─ Team em guerra: DevOps + Backend + Support no Slack
    └─ Check: todas checklist verde ✅
    
  ☐ DEPLOY (15 min)
    ├─ API v2 (Workers + D1 migration)
    ├─ Frontend (Cloudflare Pages)
    ├─ Workflows (confirmação WhatsApp)
    └─ Smoke tests: validar endpoints principais
    
  ☐ PÓS-DEPLOY (30 min)
    ├─ Monitor SLOs em tempo real
    ├─ Check: CAC query <500ms, WhatsApp latência <2s
    ├─ Testes manuais em produção
    └─ Log: tudo verde, comunica time

DIA 2–3: Ativar Mooca Fisio em Prod
  ☐ Flip feature flags:
    ├─ Dashboard BI: 100% traffic
    ├─ WhatsApp confirmação: 100% traffic
    ├─ Turmas: 100% traffic
    ├─ AI Concierge: 10% → 100% gradualmente
    └─ Monitorar métrica de erro

DIA 4–5: Coleta de Feedback + Ajustes
  ☐ Call diária com gestor Mooca (15 min)
    ├─ O que funcionou bem?
    ├─ O que deu erro?
    ├─ Prioridade de ajustes?
    └─ Próximas features que quer?
    
  ☐ Implementar hotfixes (se necessário)
    ├─ Bug crítico: fix + deploy <1h
    ├─ UX improvement: implement + deploy dia seguinte
    └─ Feature request: backlog para P1

DIA 6–7: Preparação para Soft Launch
  ☐ Selecionar 5 clínicas piloto (com gestor)
  ☐ Preparar materiais de treinamento
    ├─ Vídeo: Como usar dashboard BI (2 min)
    ├─ Vídeo: Como usar WhatsApp confirmação (1 min)
    ├─ Guia escrito (PDF)
    └─ Suporte WhatsApp (numero específico)
    
  ☐ Schedule: Onboarding calls
    ├─ Segunda: Clínica 1 + 2
    ├─ Terça: Clínica 3 + 4 + 5
    └─ Suporte 24/7 esta semana

Resultado: Go-live Produção com Mooca + Soft launch 5 pilotos
Impacto: +R$15k/mês imediato, aprendizados para escala P1
```

---

## 📊 TRACKING DIÁRIO

### Status Board (standup 15 min)
```
SEMANA 1
┌─────────────────────────────────────────────┐
│ Sprint 1.1 (Apps):        [████░░] 50%      │
│ Sprint 1.2 (BI):          [░░░░░░] 0%       │
│ Sprint 1.3 (WhatsApp):    [░░░░░░] 0%       │
│ Blocker: Nenhum            ✅                │
│ Próximo: Start 1.2 today   ⏰                │
└─────────────────────────────────────────────┘

Métricas Esperadas (FIM SEMANA 1):
✓ Apps em TestFlight (iOS) + Beta (Android)
✓ BI queries <500ms em staging
✓ WhatsApp webhook capturando respostas
✓ P1 sprint design completo
```

### Métricas Críticas (Weekly)
| Métrica | Target | Semana 1 | Semana 2 | Semana 3 | Semana 4 |
|---------|--------|----------|----------|----------|----------|
| **Deploy Frequency** | Daily | 1× | 1× | 3× | Prod live |
| **Build Pass Rate** | >95% | - | - | >95% | >98% |
| **E2E Test Coverage** | >80% | - | - | >80% | >90% |
| **Staging Uptime** | >99% | - | >99% | >99% | - |
| **Prod Latency (API)** | <200ms | - | - | - | <100ms |
| **Prod Errors** | <0.1% | - | - | - | <0.05% |

---

## 🚀 MILESTONES & GATES

### Gate 1: Fim Semana 1 ✅ BLOCKER
- [ ] Apps em TestFlight + Play Console
- [ ] BI endpoints retornando dados
- [ ] WhatsApp cron + webhook funcionando
- **Decision:** Continuar com sprint 2?

### Gate 2: Fim Semana 2 ✅ BLOCKER
- [ ] Turmas operacional em staging
- [ ] AI Concierge validado em staging
- [ ] Testes E2E executando sem erro
- **Decision:** Fazer deploy produção?

### Gate 3: Fim Semana 3 ✅ BLOCKER
- [ ] Zero bugs críticos em staging
- [ ] SLOs configurado + alertas vivos
- [ ] Rollback plan testado
- [ ] Suporte treinado
- **Decision:** Go-live amanhã?

### Gate 4: Produção Live ✅ EPIC
- [ ] Mooca Fisio em produção, dados reais
- [ ] Soft launch 5 clínicas piloto
- [ ] Suporte 24/7 ativo
- [ ] Métricas sendo coletadas
- **Next:** P1 roadmap (próximas 3 semanas)

---

## 💬 COMUNICAÇÃO INTERNA

### Daily Standup (15 min, 10h)
**Participants:** Dev Leads (5 sprints) + DevOps + QA + PM  
**Format:** Jira board + Status board  
**Key Questions:**
- O que foi feito ontem?
- Qual é o plano hoje?
- Tem blocker?

### Weekly Sync (60 min, SEXTA 14h)
**Participants:** Todos os acima + Gestor Mooca Fisio + Lideranças  
**Agenda:**
- Status geral por sprint (% done)
- Blockers resolvidos?
- Feedback de staging
- Próxima semana planejado?
- Impactos / riscos

### Gestor Feedback (15 min, DIÁRIA a partir dia 1 produção)
**Participants:** Dev Lead + Gestor Mooca  
**Purpose:** Coleta de feedback real, priorização hotfixes

---

## 🛟 ESCALAÇÃO & RISCOS

### Risco 1: Apps não aprovados em tempo
**Mitigação:** Submit hoje (dia 1), ter backup web PWA pronto

### Risco 2: BI queries lentas em produção
**Mitigação:** Indexar corretamente, usar materialized views se necessário

### Risco 3: Meta API rate limiting
**Mitigação:** Implementar backoff + retry logic, monitorar quota

### Risco 4: Mooca Fisio não consegue usar durante onboarding
**Mitigação:** Suporte 24/7 dedicado, pair programming se necessário

---

## ✅ FINAL CHECKLIST (GO LIVE)

**PRÉ-DEPLOY:**
- [ ] Backup DB testado e confirmado
- [ ] Rollback script testado (dry-run)
- [ ] SLOs configurado + alertas vivos
- [ ] Runbook de incidents documentado
- [ ] Team em stand-by (DevOps + Backend + Support)

**PÓS-DEPLOY:**
- [ ] Smoke tests passando (todos endpoints)
- [ ] Dashboards mostrando métricas (Datadog/CloudFlare)
- [ ] Logs limpos (sem errors)
- [ ] Team comunica "Green light" no Slack
- [ ] Gestor confirma tudo ok

**GO LIVE SEMANA 4:**
- [ ] Mooca Fisio happy (usando todos features)
- [ ] Métricas coletadas (CAC, no-show, conversão)
- [ ] Soft launch 5 clínicas iniciado
- [ ] Suporte rodando 24/7
- [ ] P1 roadmap planejado para próximas 3 semanas

---

**Timeline resumida:** 21 dias → Market-ready  
**Status:** 60% do código pronto, falta integração + validação  
**Confidence:** 95% (blockers identificados, mitigações claras)

**Próximo passo:** Aprovação, start HOJE.

