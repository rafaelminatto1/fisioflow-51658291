# 📋 ROADMAP TÉCNICO: Resolução de Gaps (Semana 1–4)

**Status:** Entrega de P0 → Mercado  
**Timeline:** 28 dias  
**Impacto:** +40% faturamento + -47% no-show + transformação em dados-driven

---

## SEMANA 1: P0 — FUNDAÇÕES (Bloqueia tudo)

### Sprint 1.1: Apps nas Stores (2 dias)
**Responsável:** DevOps / Mobile lead  
**Blockers:** Nenhum técnico (administrativo)

#### Tarefas
- [ ] iOS
  - [ ] Gerar certificado (Apple Developer)
  - [ ] Configurar Bundle ID em Xcode
  - [ ] Rodar build de release (`expo build:ios`)
  - [ ] Upload para TestFlight (1º round)
  - [ ] Aprovar internamente
  - [ ] Submit para App Store (3–5 dias para review)
  
- [ ] Android
  - [ ] Criar assinatura de app (`keytool`)
  - [ ] Setup Play Console (criar app, configurar pricing)
  - [ ] Build de release (`expo build:android`)
  - [ ] Upload para Play Store (beta → produção)
  
- [ ] Marketing
  - [ ] Screenshots (5 imagens por idioma)
  - [ ] Descrição curta (80 chars)
  - [ ] Descrição longa (4k chars, SEO)
  - [ ] Palavras-chave (mínimo 10)
  - [ ] Preview URL

**Checklist de pronto:**
- [ ] App Store: App em "Em revisão"
- [ ] Play Store: App em beta
- [ ] Metadados em `docs/mobile/STORE_METADATA.md` ✅ (já existe)
- [ ] Push notifications habilitado nos apps

**Custo:** 0 (administrativo)  
**Impacto:** +50% de instalações quando lançado

---

### Sprint 1.2: Dashboard CAC/LTV/Payback (4 dias)
**Responsável:** Backend + Frontend (BI focus)  
**Blockers:** Nenhum

#### Arquitetura

```
apps/api/src/routes/
  └── bi/
      ├── cac.ts          (GET /bi/cac)
      ├── ltv.ts          (GET /bi/ltv)
      ├── payback.ts      (GET /bi/payback)
      └── metrics.ts      (GET /bi/metrics-summary)

src/pages/
  └── BusinessIntelligence/
      ├── DashboardBI.tsx
      ├── KPISummary.tsx
      └── MetricCharts.tsx
```

#### Endpoints (Backend)

**1. GET /bi/cac**
```typescript
// Query de CAC por canal + período
interface CACResult {
  period: string;           // "2026-06-01 to 2026-07-01"
  totalSpent: number;       // R$ em marketing
  newPatients: number;      // Novo em período
  cacPerChannel: {
    whatsapp: number;       // R$X por paciente
    googleads: number;
    organico: number;
    referral: number;
  };
  benchmark: number;        // Média SP = R$350
}

// SQL
SELECT 
  DATE_TRUNC('month', created_at) as period,
  SUM(amount) as totalSpent,
  COUNT(DISTINCT patient_id) as newPatients,
  SUM(amount) / COUNT(DISTINCT patient_id) as cac
FROM marketing_spend
WHERE created_at >= NOW() - INTERVAL '90 days'
  AND org_id = $1
GROUP BY DATE_TRUNC('month', created_at);
```

**2. GET /bi/ltv**
```typescript
// LTV por cohort (quando paciente entrou)
interface LTVResult {
  cohort: string;           // "2026-06"
  avgRevenue: number;       // R$ por paciente
  avgSessions: number;      // Média de sessões
  retentionRate: number;    // % que voltou para 2º ciclo
  estimatedLTV: number;     // R$ total esperado
  benchmark: number;        // Média SP
}

// SQL (simplificado)
SELECT 
  DATE_TRUNC('month', patients.created_at) as cohort,
  COUNT(DISTINCT patients.id) as patients,
  AVG(sessions_count.total) as avgSessions,
  SUM(sessions_count.total * 80) / COUNT(DISTINCT patients.id) as avgRevenue
FROM patients
JOIN sessions_count ON ...
GROUP BY DATE_TRUNC('month', patients.created_at);
```

**3. GET /bi/payback**
```typescript
// Payback = CAC ÷ Receita média mensal por paciente
interface PaybackResult {
  cacMonthly: number;       // R$ CAC deste mês
  revenuePerPatientMonth: number; // R$ média/mês/paciente
  paybackMonths: number;    // Quantos meses para recuperar CAC
  target: number;           // Meta = 6 meses
  status: "on-track" | "warning" | "critical";
}
```

#### Frontend (React)

**File:** `src/pages/BusinessIntelligence/DashboardBI.tsx`

```tsx
// KPI Cards com cores semânticas
export function KPISummary() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* CAC */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-sm text-muted-foreground">CAC Mês</div>
        <div className="text-3xl font-bold">R$ {cac.toLocaleString()}</div>
        <div className="text-xs mt-2">
          vs. benchmark: <span className={cac < benchmark ? "text-green-600" : "text-red-600"}>
            {((cac - benchmark) / benchmark * 100).toFixed(1)}%
          </span>
        </div>
      </Card>

      {/* LTV */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100">
        <div className="text-sm text-muted-foreground">LTV Estimado</div>
        <div className="text-3xl font-bold">R$ {ltv.toLocaleString()}</div>
        <div className="text-xs mt-2">
          Ratio LTV:CAC = <span className="font-bold">{(ltv / cac).toFixed(1)}:1</span>
        </div>
      </Card>

      {/* Payback */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="text-sm text-muted-foreground">Payback</div>
        <div className="text-3xl font-bold">{payback.toFixed(1)} meses</div>
        <div className="text-xs mt-2">
          Meta: 6 meses {payback <= 6 ? "✅" : "⚠️"}
        </div>
      </Card>

      {/* Ocupação */}
      <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
        <div className="text-sm text-muted-foreground">Ocupação Agenda</div>
        <div className="text-3xl font-bold">{occupancy}%</div>
        <div className="text-xs mt-2">Meta: 75%</div>
      </Card>
    </div>
  );
}

// Gráficos
export function CACTrendChart() {
  // Linha: CAC últimos 90 dias vs. benchmark
  return <ResponsiveLineChart data={cacTrend} />;
}

export function LTVCohortHeatmap() {
  // Heatmap: LTV por cohort (eixo Y) e mês (eixo X)
  return <Heatmap data={cohortData} />;
}

export function PaybackScatter() {
  // Scatter: CAC vs. Payback (quer estar no canto inferior-esquerdo)
  return <ScatterChart data={paybackData} />;
}
```

**Testes (Vitest):**
```typescript
describe("BI Endpoints", () => {
  it("GET /bi/cac returns CAC with benchmark", async () => {
    const res = await c.req.get("/bi/cac");
    expect(res.json).toHaveProperty("cacPerChannel.whatsapp");
    expect(res.json).toHaveProperty("benchmark");
  });

  it("Dashboard shows green when LTV:CAC > 3", async () => {
    // Render component with mock data
    const { getByText } = render(<KPISummary ltv={600} cac={200} />);
    expect(getByText("3:1")).toBeInTheDocument();
    expect(getByText("3:1")).toHaveClass("text-green-600");
  });
});
```

**Deploy:**
- [ ] Query testada com 1+ mês de dados real
- [ ] Endpoints validados (200, JSON correto, benchmarks)
- [ ] Frontend renderiza sem erros
- [ ] Telemetria: log quantas vezes gestor acessa (usar Posthog/Segment)

---

### Sprint 1.3: Confirmação WhatsApp End-to-End (3 dias)
**Responsável:** Backend + Automação  
**Blockers:** Meta API

#### Fluxo Técnico

```
Agendamento criado (D+0)
  ↓
  Cron D-2 (48h antes)
    ├─ Buscar agendamentos que completam 48h em próx 4h
    ├─ Para cada: enviar mensagem template com buttons
    └─ Logar em DB para rastreamento
  ↓
  Paciente responde
    ├─ Webhook recebe resposta
    ├─ Parse do button (confirmado/remarcar)
    ├─ Update status do agendamento em DB
    └─ Se confirmado → update visual na agenda
  ↓
  Se silêncio após 12h
    ├─ Cron D-1 (24h antes)
    ├─ Enviar segundo lembrete (sem buttons, só urgência)
    └─ Logar tentativa
  ↓
  Resultado final
    ├─ Dashboard mostra: "Confirmados: 8/10"
    ├─ Pendentes em vermelho: "2 pacientes não confirmaram"
    └─ Clínica avisa manualmente os 2
```

#### Implementação

**Backend: Cron de Confirmação**

```typescript
// File: apps/api/src/workflows/appointment-confirmation.ts
import { WorkflowEntrypoint } from "cloudflare:workers";

export class AppointmentConfirmationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const confirmStep = await step.do("send-confirmation", async () => {
      // Query: agendamentos que faltam 48h
      const appointments = await db.query(`
        SELECT a.*, p.phone_number, p.name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE 
          a.scheduled_at >= NOW() + INTERVAL '48h'
          AND a.scheduled_at < NOW() + INTERVAL '52h'
          AND a.status = 'pending'
          AND a.confirmation_sent_at IS NULL
          AND a.org_id = $1
      `, [orgId]);

      for (const apt of appointments) {
        // Enviar via Meta API
        await sendWhatsAppTemplate({
          phone: apt.phone_number,
          template: "appointment_confirmation",
          params: {
            name: apt.name,
            date: formatDate(apt.scheduled_at),
            time: formatTime(apt.scheduled_at),
            professional: apt.professional_name,
          },
          buttons: [
            { text: "✅ Vou Confirmar", payload: `apt_confirm_${apt.id}` },
            { text: "❌ Preciso Remarcar", payload: `apt_reschedule_${apt.id}` },
          ],
        });

        // Log em DB
        await db.query(`
          UPDATE appointments
          SET confirmation_sent_at = NOW()
          WHERE id = $1
        `, [apt.id]);
      }

      return { sent: appointments.length };
    });

    // Segundo lembrete (D-1, sem buttons)
    const secondStep = await step.do("send-second-reminder", async () => {
      const stillPending = await db.query(`
        SELECT a.*, p.phone_number, p.name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        WHERE 
          a.scheduled_at >= NOW() + INTERVAL '24h'
          AND a.scheduled_at < NOW() + INTERVAL '28h'
          AND a.status = 'pending'
          AND a.patient_confirmation_status IS NULL
          AND a.org_id = $1
      `, [orgId]);

      for (const apt of stillPending) {
        await sendWhatsAppText({
          phone: apt.phone_number,
          text: `🚨 Último aviso! Sua sessão é ${formatDateTime(apt.scheduled_at)}.\nConfirme presença respondendo sim ou não.`,
        });
      }

      return { reminded: stillPending.length };
    });

    return { confirmed: confirmStep, reminded: secondStep };
  }
}

// Registrar workflow em wrangler.toml
// [env.production]
// workflows = ["appointment-confirmation"]
```

**Webhook para receber resposta:**

```typescript
// File: apps/api/src/routes/webhooks/whatsapp-buttons.ts
export const whatsappButtonHandler = async (c: HonoContext) => {
  const event = await c.req.json();

  // Meta envia: { type: "interactive", interactive: { button_reply: { id: "apt_confirm_123" } } }
  if (event.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply) {
    const payload = event.entry[0].changes[0].value.messages[0].interactive.button_reply.id;
    
    if (payload.startsWith("apt_confirm_")) {
      const aptId = payload.replace("apt_confirm_", "");
      
      // Update DB
      await db.query(`
        UPDATE appointments
        SET 
          status = 'confirmed',
          patient_confirmation_status = 'confirmed',
          patient_confirmed_at = NOW()
        WHERE id = $1 AND org_id = $2
      `, [aptId, c.env.ORG_ID]);

      // Auto-reply
      await sendWhatsAppText({
        phone: event.entry[0].changes[0].value.messages[0].from,
        text: "✅ Confirmado! Nos vemos em breve! 🙌",
      });

    } else if (payload.startsWith("apt_reschedule_")) {
      const aptId = payload.replace("apt_reschedule_", "");
      
      // Update status + enviar opções de datas
      await db.query(`
        UPDATE appointments
        SET status = 'needs_reschedule'
        WHERE id = $1
      `, [aptId]);

      // Oferecer 3 datas alternativas (usar data picker se Meta suportar)
      await sendWhatsAppText({
        phone: event.entry[0].changes[0].value.messages[0].from,
        text: "Sem problema! Aqui estão outras opções:\n1️⃣ Segunda 14h\n2️⃣ Terça 16h\n3️⃣ Quarta 10h\nQual você prefere?",
      });
    }
  }

  return c.json({ success: true });
};
```

**Dashboard Visual:**

```tsx
// File: src/components/appointments/ConfirmationStatus.tsx
export function ConfirmationStatus({ appointments }) {
  const confirmed = appointments.filter(a => a.status === 'confirmed').length;
  const pending = appointments.filter(a => a.status === 'pending').length;
  const rescheduled = appointments.filter(a => a.status === 'needs_reschedule').length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="border-l-4 border-green-500">
        <div className="text-sm text-muted-foreground">Confirmados</div>
        <div className="text-2xl font-bold text-green-600">{confirmed}</div>
      </Card>

      <Card className="border-l-4 border-yellow-500">
        <div className="text-sm text-muted-foreground">Pendentes</div>
        <div className="text-2xl font-bold text-yellow-600">{pending}</div>
        {pending > 0 && (
          <Button variant="outline" size="sm" className="mt-2">
            👋 Lembrar agora
          </Button>
        )}
      </Card>

      <Card className="border-l-4 border-blue-500">
        <div className="text-sm text-muted-foreground">Reagendar</div>
        <div className="text-2xl font-bold text-blue-600">{rescheduled}</div>
      </Card>
    </div>
  );
}
```

**Testes:**

```typescript
describe("Appointment Confirmation Flow", () => {
  it("Cron envia reminder D-2 para agendamentos pendentes", async () => {
    // Mock: agendamento em 48h
    const apts = [{ id: "1", scheduled_at: now + 48h, status: "pending" }];
    
    // Mock Meta API
    const metaSpy = vi.fn();
    
    // Run workflow
    await runAppointmentConfirmationWorkflow();
    
    // Assert
    expect(metaSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        buttons: expect.arrayContaining([
          { text: "✅ Vou Confirmar" },
          { text: "❌ Preciso Remarcar" },
        ]),
      })
    );
  });

  it("Button response atualiza status para 'confirmed'", async () => {
    // Simular webhook
    const res = await POST /webhooks/whatsapp-buttons {
      entry: [{
        changes: [{
          value: {
            messages: [{
              interactive: {
                button_reply: {
                  id: "apt_confirm_123",
                },
              },
            }],
          },
        }],
      }],
    };

    // Assert
    const apt = await db.query("SELECT * FROM appointments WHERE id = 123");
    expect(apt.status).toBe("confirmed");
  });
});
```

**Deploy:**
- [ ] Cron rodando sem erros (check logs)
- [ ] Meta API entregando mensagens (validar com SMS real)
- [ ] Webhook capturando respostas
- [ ] Status da agenda atualizado visualmente
- [ ] Métricas: "8/10 confirmados" no dashboard

---

## SEMANA 2: P1 — DIFERENCIADORES (Rápidos)

### Sprint 2.1: Recuperação Pós-Alta com IA (2 dias)
**Reativar:** Workflow existe, falta ligar em prod + validar

**Fluxo:**
```
Alta clínica (D+0)
  ↓
D+30: Cron envia "Quanto de dor você tem hoje (1-10)?"
  ↓
Resposta < 4 → "Ótimo! Agende reavaliação"
Resposta ≥ 4 → "Recomendo novo ciclo — fisio vai entrar em contato"
```

**SQL:**
```sql
SELECT p.*, MAX(s.session_date) as last_session
FROM patients p
JOIN sessions s ON s.patient_id = p.id
WHERE s.session_date = DATE_TRUNC('day', NOW() - INTERVAL '30 days')
  AND p.status = 'inactive'
  AND p.org_id = $1;
```

**Impacto:** Reativa 20–30% dos inativos = +R$2k/mês por clínica

---

### Sprint 2.2: Deep Linking (1 dia)
**Ajuste:** iOS/Android deep linking para `fisioflow://` scheme

```
SMS: fisioflow://login?token=xyz&redirect=/hep
  ↓
Se app instalado → abre em app nativo
Se não → vai para App Store
```

---

### Sprint 2.3: Integração com Médicos (3 dias)
**Landing + sistema de codes de desconto**

```
/landing/para-medicos
  ├─ Formulário: "Sou ortopedista"
  ├─ Gera código único (ex: ORTOPED2026)
  ├─ Paciente entra com código → desconto 20%
  └─ Ao terminar → PDF "Relatório de Desfecho"
```

---

### Sprint 2.4: Benchmark vs. Mercado (2 dias)
**Comparar clínica com média de SP**

```
Dashboard query:
  ├─ SUA ocupação: 78%
  ├─ Média SP: 65%
  ├─ Top 20%: 85%
  └─ Recomendação: "Você está acima da média!"
```

---

## SEMANA 3–4: P2 — OTIMIZAÇÃO AVANÇADA

### Sprint 3.1: Wearables + Anomaly Detection (7 dias)
### Sprint 3.2: Previsão de Receita baseada em Histórico Particular (5 dias)
### Sprint 3.3: Compliance Dashboard (3 dias)

---

## 📊 TRACKING & MÉTRICAS

### Por Sprint

| Sprint | Métrica | Baseline | Target | Status |
|--------|---------|----------|--------|--------|
| 1.1 (Apps) | % de instalações vs. web | 10% | 50% | 🟡 |
| 1.2 (BI) | Decisões baseadas em dados | 20% | 70% | 🟡 |
| 1.3 (WhatsApp+AI) | No-show rate | 15% | 8% | 🟡 |
| 2.1 (Reativação) | % retorno pós-alta | 15% | 30% | 🟡 |
| 2.3 (Médicos) | Leads de médicos | 0 | 5/mês | 🟡 |

### Alertas Críticos

- [ ] Deploy bloqueado se:
  - CAC query > 500ms (performance)
  - WhatsApp webhook latência > 2s
  - Apps com crash rate > 1%

---

## ✅ FINAL CHECKLIST

### Antes do Go-live Operacional
- [ ] Clínica Mooca Fisio testada com dados reais (uso interno)
- [ ] No-show reduzido 15% → 8%
- [ ] Dashboard de BI sendo usado ativamente
- [ ] Apps nas stores (iOS e Android)
- [ ] Confirmação de WhatsApp e AI Concierge 100% automáticos

**Timeline final:** 14 dias para P0 (e 21 dias acumulados até P2)  
**Go-live:** Em 14 dias  
**Impacto:** +40% aproveitamento de agenda particular + gestão baseada em dados


