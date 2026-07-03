# ⚡ QUICK-START: 14 Dias para Operação Otimizada (Sprint Roadmap)

**Início:** Hoje  
**Alvo:** Go-live Produção (dia 14)  
**Escopo:** Clínica própria Mooca Fisio (uso interno exclusivo)


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

### Sprint 1.3: WhatsApp Confirmação + AI Concierge (5 dias)
**Responsável:** Backend + IA Specialist  
**Paralelo:** SIM

```
DIA 1: Backend WhatsApp — Cron + Webhook
  ☐ Cron de Confirmação (D-2, 48h antes)
    ├─ Query: agendamentos pendentes em 48h
    ├─ Loop: enviar template via Meta API com buttons
    ├─ Log: confirmation_sent_at no DB
    └─ Testes: Mock Meta API, validar payload
    
  ☐ Webhook /webhooks/whatsapp-buttons
    ├─ Parse response (button_reply.id)
    ├─ Update DB (status = 'confirmed')
    ├─ Auto-reply via WhatsApp
    └─ Testes: Simular button click, assert DB update

DIA 2: Cron D-1 + UI do Status
  ☐ Cron D-1 (24h antes, segunda tentativa)
    ├─ Query: ainda pendentes (não responderam)
    ├─ Enviar mensagem de texto sem buttons (urgência)
    └─ Testes: Validar escalation
    
  ☐ Frontend: Confirmation Status Card
    ├─ Cards: Confirmados (verde) | Pendentes (amarelo) | Reagendar (azul)
    ├─ Button: "Lembrar agora" (dispara manual D-2)
    └─ Integrar em dashboard

DIA 3: AI Concierge — Resposta a Leads
  ☐ Endpoint /ai/concierge/lead-response
    ├─ Recebe: WhatsApp message de novo lead
    ├─ IA geraResponse (Gemini 1.5 Flash + system prompt particular)
    ├─ Envia mensagem de resposta via Meta API
    ├─ Log: latência, tokens, confidence
    └─ Teste: Responder simuladamente e agendar avaliação particular

DIA 4: Telemetria IA + Conversão
  ☐ Dashboard: Conversão de leads em agendamentos
    ├─ Gráficos de leads respondidos vs. agendados
    └─ Conversion rate % e histórico 30 dias

DIA 5: Testes E2E em Staging
  ☐ Teste completo: lead entra → responde IA → agenda → confirma D-2
  ☐ Deploy staging

Resultado: WhatsApp automático e IA conversando com leads em staging
Impacto: No-show 15%→8% e conversão de leads 5%→15%
```


---

## 🎯 SEMANA 2: AJUSTES E VALIDAÇÃO (Sprint 2.1–2.2)

### Sprint 2.1: Usabilidade Particular & Checkout Digital (3 dias)
**Responsável:** Frontend + Mobile  
**Paralelo:** NÃO

```
DIA 1: Checkout e NFS-e Direta
  ☐ Configuração do Certificado Digital A1 no backend (São Paulo)
  ☐ Endpoint de emissão automática pós-confirmação de pagamento particular
  ☐ Geração de Recibo PDF simples para paciente

DIA 2: Jornada Premium do Paciente Particular
  ☐ Polimento visual do aplicativo do paciente (Home Exercise Prescription)
  ☐ Visualização de histórico de avaliações biomecânicas
  ☐ Testes de login sem fricção (PWA e nativo)

DIA 3: Deploy em Staging + Correção de Bugs
  ☐ Correções baseadas em testes rápidos de interface
  ☐ Uptime e testes de stress em queries de BI

Resultado: Aplicativos polidos e checkout particular operacional
Impacto: Redução do atrito de pagamento e experiência premium
```

---

### Sprint 2.2: Testes E2E & Homologação Mooca Fisio (4 dias)
**Responsável:** Backend + QA + Gestor  
**Paralelo:** NÃO

```
DIA 1–2: Testes E2E (Playwright)
  ☐ Fluxo completo do paciente particular
    ├─ Gestor vê BI (CAC/LTV)
    ├─ Paciente recebe lembrete no WhatsApp D-2
    ├─ Resposta automática de confirmação atualiza status na agenda
    └─ Novo lead é atendido e agendado pelo AI Concierge
  ☐ Testes de carga (API latency <100ms)

DIA 3: Homologação com Dados Reais
  ☐ Gestor Mooca Fisio acessa dashboard em staging
  ☐ Simulação de mensagens reais de pacientes no WhatsApp
  ☐ Validação de números de faturamento no BI
  ☐ Coleta de feedback e ajuste imediato de textos de IA

DIA 4: Preparação para Produção (Go-live setup)
  ☐ Backup preventivo do banco
  ☐ Script de migrations testado em staging
  ☐ Definição de rollback plan rápido (<5 min)

Resultado: Sistema robustecido e validado pelo gestor
Impacto: Zero downtime no go-live
```


---

## 🎯 SEMANA 3: GO-LIVE (Sprint 3.1)

### Sprint 3.1: Deploy Produção + Soft Launch (7 dias)
**Responsável:** DevOps + Backend Lead + Support  
**Paralelo:** NÃO

```
DIA 1: Deploy em Produção (SEGUNDA)
  ☐ PRÉ-DEPLOY (30 min antes)
    ├─ Backup DB completo
    ├─ Teste de rollback (dry-run)
    └─ Equipe em stand-by (DevOps + Backend)
    
  ☐ DEPLOY (15 min)
    ├─ API (Cloudflare Workers)
    ├─ Frontend (Cloudflare Pages)
    └─ Smoke tests em produção
    
  ☐ PÓS-DEPLOY (30 min)
    ├─ Monitorar logs e erros em tempo real
    ├─ Validar latência Meta API (<2s)
    └─ Notificar equipe do go-live concluído

DIA 2–3: Ativação das Regras Operacionais na Mooca
  ☐ Habilitar feature flags:
    ├─ Dashboard BI: 100% tráfego particular
    ├─ WhatsApp confirmação: 100% tráfego
    └─ AI Concierge: 100% tráfego de leads
  ☐ Acompanhamento visual da agenda de pacientes reais

DIA 4–7: Coleta de Feedback + Ajustes Finos
  ☐ Reunião rápida diária com o gestor (10 min)
  ☐ Resolução imediata de bugs de usabilidade
  ☐ Otimização de prompt da IA com base em conversas reais

Resultado: Go-live Produção concluído com sucesso e 100% operacional
Impacto: Agenda particular otimizada e processos automatizados
```


---

## 📊 TRACKING DIÁRIO

### Status Board
```
SEMANA 1
┌─────────────────────────────────────────────┐
│ Sprint 1.1 (Apps):        [████░░] 50%      │
│ Sprint 1.2 (BI):          [░░░░░░] 0%       │
│ Sprint 1.3 (WhatsApp+AI): [░░░░░░] 0%       │
│ Blocker: Nenhum            ✅                │
│ Próximo: Start 1.2 today   ⏰                │
└─────────────────────────────────────────────┘

Métricas Esperadas (FIM SEMANA 1):
✓ Apps em TestFlight (iOS) + Beta (Android)
✓ BI queries <500ms em staging
✓ WhatsApp webhook e AI Concierge capturando leads e confirmações
```

### Métricas Críticas (Weekly)
| Métrica | Target | Semana 1 | Semana 2 |
|---------|--------|----------|----------|
| **Deploy Frequency** | Daily | 1× | Prod live |
| **Build Pass Rate** | >95% | - | >98% |
| **E2E Test Coverage** | >80% | - | >85% |
| **Staging Uptime** | >99% | >99% | >99% |
| **Prod Latency (API)** | <200ms | - | <100ms |
| **Prod Errors** | <0.1% | - | <0.05% |

---

## 🚀 MILESTONES & GATES

### Gate 1: Fim Semana 1 ✅ BLOCKER
- [ ] Apps submetidos para stores
- [ ] BI endpoints ativos
- [ ] WhatsApp cron + webhook + AI em staging
- **Decision:** Continuar para validação?

### Gate 2: Produção Live ✅ EPIC
- [ ] Testes E2E passando sem erros
- [ ] Homologação concluída com dados particulares reais
- [ ] Deploy produção realizado com sucesso
- **Next:** Oportunidades P1 (Reativação de pacientes pós-alta)

---

## 💬 COMUNICAÇÃO INTERNA

### Alinhamento Técnico Diário (10 min)
**Formato:** Standup rápido de progresso de código
**Foco:** Garantir que as APIs de BI, WhatsApp e IA estejam integradas sem gargalos.

### Homologação Operacional (Dia 12)
**Participantes:** Desenvolvedores + Gestor da Clínica  
**Objetivo:** Validar na prática a visualização dos dados e as conversas de teste no WhatsApp.


---

## 🛟 ESCALAÇÃO & RISCOS

### Risco 1: Apps não aprovados pelas lojas a tempo
**Mitigação:** Envio imediato no Dia 2; manter PWA web responsivo como contingência operacional.

### Risco 2: Latência do AI Concierge no WhatsApp
**Mitigação:** Utilizar o cache de contexto da API do Gemini para respostas rápidas (<2s).

---

## ✅ FINAL CHECKLIST (GO LIVE)

**PRÉ-DEPLOY:**
- [ ] Backup do banco de dados concluído
- [ ] Migrations validadas em staging
- [ ] Script de rollback testado

**PÓS-DEPLOY:**
- [ ] Smoke tests validados em produção (BI, WhatsApp, AI)
- [ ] Agenda funcionando sem erros de concorrência
- [ ] Logs limpos

**GO LIVE OPERACIONAL:**
- [ ] Clínica Mooca Fisio rodando com dados reais
- [ ] Métricas sendo coletadas com sucesso (CAC, no-show)
- [ ] Início do planejamento das oportunidades P1

---

**Timeline resumida:** 14 dias para operação live  
**Status:** 65% do código pronto, em fase de integração


---

**Timeline resumida:** 21 dias → Market-ready  
**Status:** 60% do código pronto, falta integração + validação  
**Confidence:** 95% (blockers identificados, mitigações claras)

**Próximo passo:** Aprovação, start HOJE.

