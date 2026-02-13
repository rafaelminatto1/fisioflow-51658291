# 📋 PLANEJAMENTO ESTRATÉGICO FISIOFLOW v3.0 - 2026

> **Documento de Alinhamento:** Baseado na documentação técnica em `docs/2026/`
> **Data de Criação:** 25 de Dezembro de 2025
> **Versão Alvo:** 3.0.0

---

## 📊 ANÁLISE DO ESTADO ATUAL

### ✅ Funcionalidades Já Implementadas

| Módulo | Status | Cobertura |
|--------|--------|-----------|
| **Gestão de Pacientes** | ✅ Completo | 95% |
| **Agendamentos** | ✅ Completo | 90% |
| **Prontuários SOAP** | ✅ Completo | 90% |
| **Exercícios** | ✅ Completo | 85% |
| **Prescrições** | ✅ Parcial | 70% |
| **Financeiro/Pagamentos** | ✅ Parcial | 75% |
| **WhatsApp** | ✅ Parcial | 60% |
| **Relatórios** | ✅ Parcial | 65% |
| **Mapa de Dor** | ✅ Parcial | 50% |
| **Lista de Espera** | ✅ Parcial | 60% |
| **Pacotes de Sessões** | ⚠️ Básico | 40% |

### 🏗️ Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + TypeScript + Vite + shadcn/ui + TailwindCSS     │
├─────────────────────────────────────────────────────────────┤
│                     SUPABASE BACKEND                         │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │  PostgreSQL │  Auth + RLS │  Storage    │  Realtime   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Edge Functions (27 funções)                  │ │
│  │  • AI Chat              • AI Treatment Assistant        │ │
│  │  • Send WhatsApp        • Stripe Webhook               │ │
│  │  • Notifications        • Reports                      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 GAPS IDENTIFICADOS (OpenAPI v3.0 vs Implementação)

### 🔴 Críticos (Alta Prioridade)

#### 1. **API REST Padronizada**
- **Documentação:** Define API REST completa com versionamento `/api/v1`
- **Atual:** Usa diretamente Supabase client (não há camada REST)
- **Ação:** Implementar Edge Functions como camada REST

#### 2. **Rate Limiting Global**
- **Documentação:** 100 req/min por IP, 1000 req/hora por usuário
- **Atual:** Rate limiting apenas em algumas Edge Functions
- **Ação:** Implementar rate limiting centralizado

#### 3. **Pain Maps (Mapa de Dor)**
- **Documentação:** CRUD completo, comparação de mapas, evolução
- **Atual:** Componente básico implementado
- **Ação:** Completar endpoints e funcionalidades de comparação

#### 4. **Pacotes de Sessões**
- **Documentação:** Sistema completo de pacotes com validade
- **Atual:** Estrutura básica, sem controle de saldo
- **Ação:** Implementar controle de saldo e validade

### 🟡 Importantes (Média Prioridade)

#### 5. **Lista de Espera Inteligente**
- **Documentação:** Oferta automática de vagas, prioridades, recusas
- **Atual:** CRUD básico
- **Ação:** Implementar automação e notificações

#### 6. **Webhooks**
- **Documentação:** Clerk, Stripe, Evolution API
- **Atual:** Stripe implementado, outros parciais
- **Ação:** Completar integrações de webhooks

#### 7. **Relatórios Financeiros**
- **Documentação:** Relatório completo com receita por método, terapeuta
- **Atual:** Dashboard básico
- **Ação:** Implementar relatórios detalhados

### 🟢 Melhorias (Baixa Prioridade)

#### 8. **Documentação de API**
- **Documentação:** OpenAPI completo disponível
- **Atual:** Não há Swagger/OpenAPI integrado
- **Ação:** Expor documentação interativa

#### 9. **Códigos de Erro Padronizados**
- **Documentação:** Tabela de códigos 400, 401, 403, 404, 409, 422, 429, 500
- **Atual:** Erros inconsistentes
- **Ação:** Padronizar respostas de erro

---

## 📅 ROADMAP DE IMPLEMENTAÇÃO

### 🚀 FASE 1: API Foundation (2 semanas)

**Objetivo:** Criar camada REST padronizada conforme OpenAPI

```
Semana 1:
├── Criar Edge Functions REST:
│   ├── /api/v1/patients
│   ├── /api/v1/appointments  
│   ├── /api/v1/sessions
│   └── /api/v1/exercises
├── Implementar middleware de autenticação
└── Configurar rate limiting global

Semana 2:
├── Criar Edge Functions REST:
│   ├── /api/v1/payments
│   ├── /api/v1/packages
│   ├── /api/v1/waitlist
│   └── /api/v1/reports
├── Implementar tratamento de erros padronizado
└── Documentar endpoints com OpenAPI
```

**Entregáveis:**
- [ ] 15+ Edge Functions REST
- [ ] Rate limiting funcional
- [ ] Documentação Swagger

---

### 🗺️ FASE 2: Pain Maps Completo (1 semana)

**Objetivo:** Sistema completo de mapa de dor corporal

```
Tarefas:
├── Endpoints REST:
│   ├── GET/POST /sessions/{sessionId}/pain-maps
│   ├── GET /pain-maps/{painMapId}
│   └── GET /patients/{patientId}/pain-maps/compare
├── Componentes Frontend:
│   ├── Canvas interativo corpo humano (frente/costas)
│   ├── Marcação de pontos de dor com intensidade
│   ├── Tipos de dor (aguda, latejante, queimação, etc)
│   └── Comparação visual de evolução
└── Relatórios:
    └── PDF de evolução da dor
```

**Entregáveis:**
- [ ] API completa de Pain Maps
- [ ] Interface visual interativa
- [ ] Comparação lado a lado
- [ ] Cálculo de % melhoria

---

### 📦 FASE 3: Pacotes de Sessões (1 semana)

**Objetivo:** Sistema completo de pacotes com controle financeiro

```
Tarefas:
├── Modelo de dados:
│   ├── packages (templates de pacotes)
│   ├── patient_packages (pacotes comprados)
│   └── package_usage (consumo de sessões)
├── Funcionalidades:
│   ├── Venda de pacotes (integração Stripe)
│   ├── Desconto automático ao agendar
│   ├── Alertas de pacote expirando
│   └── Histórico de consumo
└── Interface:
    ├── Configuração de pacotes (admin)
    ├── Compra de pacotes (paciente)
    └── Dashboard de saldo
```

**Entregáveis:**
- [ ] CRUD de pacotes
- [ ] Sistema de saldo
- [ ] Integração com agendamentos
- [ ] Alertas automáticos

---

### 📋 FASE 4: Lista de Espera Inteligente (1 semana)

**Objetivo:** Automação de oferta de vagas

```
Tarefas:
├── Engine de matching:
│   ├── Filtro por dias preferidos
│   ├── Filtro por períodos preferidos
│   ├── Priorização (normal/alta/urgente)
│   └── Histórico de recusas
├── Automação:
│   ├── Trigger ao cancelar agendamento
│   ├── Notificação automática WhatsApp
│   ├── Timeout de resposta (24h)
│   └── Próximo da fila se recusar
└── Interface:
    ├── Dashboard de lista de espera
    ├── Configuração de preferências
    └── Histórico de ofertas
```

**Entregáveis:**
- [ ] Engine de oferta automática
- [ ] Integração WhatsApp
- [ ] Dashboard de gestão
- [ ] Relatórios de eficiência

---

### 📊 FASE 5: Relatórios Avançados (1 semana)

**Objetivo:** Relatórios financeiros e operacionais completos

```
Tarefas:
├── Relatório Financeiro:
│   ├── Receita total por período
│   ├── Receita por método de pagamento
│   ├── Receita por terapeuta
│   ├── Taxa de inadimplência
│   └── Comparativo mensal/anual
├── Relatório de Evolução:
│   ├── Progresso do paciente
│   ├── Evolução da dor (Pain Maps)
│   ├── Aderência a exercícios
│   └── Recomendações
├── Dashboard KPIs:
│   ├── Pacientes ativos
│   ├── Taxa de ocupação
│   ├── Taxa de no-show
│   ├── NPS Score
│   └── Consultas do dia
└── Exportações:
    ├── PDF profissional
    ├── Excel/CSV
    └── API para BI externo
```

**Entregáveis:**
- [ ] 5+ tipos de relatórios
- [ ] Exportação PDF/Excel
- [ ] Dashboard executivo

---

### 🔗 FASE 6: Integrações (1 semana)

**Objetivo:** Completar webhooks e integrações externas

```
Tarefas:
├── Clerk Webhook:
│   ├── Sincronização de usuários
│   ├── Eventos de login/logout
│   └── Gestão de organizações
├── Evolution API (WhatsApp):
│   ├── Recebimento de mensagens
│   ├── Status de entrega
│   └── Respostas automáticas
├── Stripe Webhook (melhorias):
│   ├── Assinaturas
│   ├── Reembolsos
│   └── Disputas
└── Integrações futuras:
    ├── Google Calendar sync
    ├── SMS fallback
    └── Email marketing
```

**Entregáveis:**
- [ ] 3 webhooks funcionais
- [ ] Logs de integração
- [ ] Retry automático

---

## 📐 ESPECIFICAÇÕES TÉCNICAS

### Estrutura de Endpoints (conforme OpenAPI)

```yaml
# Pacientes
GET    /api/v1/patients              # Lista paginada
POST   /api/v1/patients              # Criar paciente
GET    /api/v1/patients/{id}         # Detalhes
PATCH  /api/v1/patients/{id}         # Atualizar
DELETE /api/v1/patients/{id}         # Soft delete
GET    /api/v1/patients/{id}/medical-record

# Agendamentos
GET    /api/v1/appointments          # Lista por período
POST   /api/v1/appointments          # Criar
GET    /api/v1/appointments/{id}     # Detalhes
PATCH  /api/v1/appointments/{id}     # Atualizar
POST   /api/v1/appointments/{id}/confirm
POST   /api/v1/appointments/{id}/cancel
GET    /api/v1/appointments/availability

# Sessões/Evoluções
GET    /api/v1/sessions              # Lista
POST   /api/v1/sessions              # Iniciar sessão
GET    /api/v1/sessions/{id}         # Detalhes
PATCH  /api/v1/sessions/{id}         # Atualizar SOAP
POST   /api/v1/sessions/{id}/complete

# Pain Maps
GET    /api/v1/sessions/{id}/pain-maps
POST   /api/v1/sessions/{id}/pain-maps
GET    /api/v1/pain-maps/{id}
GET    /api/v1/patients/{id}/pain-maps/compare

# Lista de Espera
GET    /api/v1/waitlist
POST   /api/v1/waitlist
DELETE /api/v1/waitlist/{id}
POST   /api/v1/waitlist/{id}/offer

# Pacotes
GET    /api/v1/packages
POST   /api/v1/packages

# Pagamentos
GET    /api/v1/payments
POST   /api/v1/payments
POST   /api/v1/payments/checkout

# Exercícios e Prescrições
GET    /api/v1/exercises
POST   /api/v1/exercises
GET    /api/v1/prescriptions
POST   /api/v1/prescriptions

# WhatsApp
POST   /api/v1/whatsapp/send
GET    /api/v1/whatsapp/status

# Relatórios
GET    /api/v1/reports/dashboard
GET    /api/v1/reports/financial
GET    /api/v1/reports/patient/{id}/evolution

# Webhooks
POST   /api/v1/webhooks/clerk
POST   /api/v1/webhooks/stripe
POST   /api/v1/webhooks/evolution
```

### Schemas de Dados Principais

```typescript
// Patient
interface Patient {
  id: string;           // UUID
  name: string;         // 3-100 chars
  cpf: string;          // 11 dígitos
  phone: string;
  email: string;
  birthDate: Date;
  photoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  address?: Address;
  emergencyContact?: EmergencyContact;
  insurance?: Insurance;
  medicalRecord?: MedicalRecord;
}

// Appointment
interface Appointment {
  id: string;
  patientId: string;
  therapistId: string;
  startTime: Date;
  endTime: Date;
  duration: 30 | 60 | 90;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  reminderSent: boolean;
}

// Session (Evolução SOAP)
interface Session {
  id: string;
  appointmentId: string;
  patientId: string;
  therapistId: string;
  status: 'draft' | 'completed';
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  evaScore?: number;      // 0-10
  painMaps: PainMap[];
  startedAt: Date;
  completedAt?: Date;
}

// Pain Map
interface PainMap {
  id: string;
  sessionId: string;
  view: 'front' | 'back';
  points: PainPoint[];
  createdAt: Date;
}

interface PainPoint {
  id: string;
  region: string;
  regionCode: string;
  intensity: number;      // 0-10
  painType: 'sharp' | 'throbbing' | 'burning' | 'tingling' | 'numbness' | 'stiffness';
  notes?: string;
}

// Waitlist Entry
interface WaitlistEntry {
  id: string;
  patientId: string;
  preferredDays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT')[];
  preferredPeriods: ('morning' | 'afternoon' | 'evening')[];
  priority: 'normal' | 'high' | 'urgent';
  status: 'waiting' | 'offered' | 'scheduled' | 'removed';
  refusalCount: number;
  createdAt: Date;
}

// Package
interface Package {
  id: string;
  name: string;
  sessionsCount: number;
  price: number;
  validityDays: number;
  isActive: boolean;
}
```

---

## ⏱️ CRONOGRAMA CONSOLIDADO

| Fase | Duração | Período Estimado | Prioridade |
|------|---------|------------------|------------|
| Fase 1 - API Foundation | 2 semanas | Jan 1-14, 2026 | 🔴 Crítica |
| Fase 2 - Pain Maps | 1 semana | Jan 15-21, 2026 | 🔴 Crítica |
| Fase 3 - Pacotes | 1 semana | Jan 22-28, 2026 | 🟡 Alta |
| Fase 4 - Lista de Espera | 1 semana | Jan 29 - Fev 4, 2026 | 🟡 Alta |
| Fase 5 - Relatórios | 1 semana | Fev 5-11, 2026 | 🟡 Alta |
| Fase 6 - Integrações | 1 semana | Fev 12-18, 2026 | 🟢 Média |
| **Buffer/QA/Testes** | 2 semanas | Fev 19 - Mar 4, 2026 | - |

**Total: ~10 semanas para v3.0 completa**

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Antes de cada release:

- [ ] Todos os endpoints respondem conforme OpenAPI
- [ ] Rate limiting funcionando (100 req/min IP)
- [ ] Autenticação JWT validada
- [ ] Erros padronizados (códigos corretos)
- [ ] Testes E2E passando
- [ ] Documentação Swagger atualizada
- [ ] Performance < 200ms p95
- [ ] RLS policies verificadas
- [ ] Logs de auditoria funcionando

### Métricas de Sucesso v3.0:

- [ ] 100% endpoints documentados funcionais
- [ ] < 1% taxa de erro em produção
- [ ] > 95% cobertura de testes
- [ ] NPS > 8 de usuários beta
- [ ] Tempo de resposta < 300ms

---

## 📚 REFERÊNCIAS

- Documentação OpenAPI: `docs/2026/FisioFlow_OpenAPI.yaml`
- Requisitos Funcionais: `docs/2026/FisioFlow_Requisitos_Funcionais.docx`
- Requisitos Não-Funcionais: `docs/2026/FisioFlow_Requisitos_Nao_Funcionais.docx`
- Casos de Uso: `docs/2026/FisioFlow_Casos_de_Uso.docx`
- Diagrama de Classes: `docs/2026/FisioFlow_Diagrama_Classes.docx`
- Plano de Testes: `docs/2026/FisioFlow_Plano_Testes.docx`
- Guia de Implantação: `docs/2026/FisioFlow_Guia_Implantacao.docx`

---

*Documento gerado automaticamente com base na análise da documentação técnica v3.0*
*Última atualização: 25/12/2025*

