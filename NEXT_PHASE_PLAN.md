# FisioFlow — Plano Fase 2 (Maio–Agosto 2026)

> Baseado na auditoria de produção (2026-05-05):  
> **129 pacientes · 253 consultas/mês · 109 evoluções/mês · 8 NFS-e total · 0 pacotes em uso · 0 wearables conectados**

---

## Diagnóstico Rápido

| Área | Estado | Ação necessária |
|------|--------|-----------------|
| Agenda + SOAP | ✅ Ativo e funcionando | Proteger com testes E2E |
| NFS-e | ⚠️ Só 8 notas em 2 meses | Investigar adoção / UX |
| Pacotes de sessão | ❌ 0 em uso | Feature construída, zero adoção |
| App mobile paciente | ❌ Não publicado nas stores | EAS Submit |
| Wearables | ❌ 0 conexões | Depende do app nas stores |
| Push notifications | ❌ Sem pacientes com app | Depende do app nas stores |
| WhatsApp automações | ❓ Status desconhecido | Verificar se crons disparando |

---

## Fase 1 — Estabilidade: Testes E2E dos Golden Paths

**Duração:** 1 semana  
**Por que fazer primeiro:** 253 consultas/mês dependem do sistema. Um bug num deploy pode parar a clínica.

### Sprint 1.1 — Suite Playwright nos fluxos críticos

**Fluxos cobertos:**

1. **Login → Dashboard** — verifica que o dashboard carrega com dados reais
2. **Criar agendamento** — novo paciente → horário → confirmar → aparece na agenda
3. **Evolução SOAP** — abrir paciente → escrever evolução → salvar → consta no histórico
4. **Emitir NFS-e** — selecionar sessão → preencher dados → emitir → status "autorizado"
5. **Criar pacote** — criar template → atribuir a paciente → consumir sessão → saldo diminui
6. **WhatsApp confirmação** — agendar consulta para D+2 → verificar que template foi enfileirado

**Arquivos a criar:**
- `e2e/flows/auth.spec.ts`
- `e2e/flows/schedule.spec.ts`
- `e2e/flows/soap-evolution.spec.ts`
- `e2e/flows/nfse.spec.ts`
- `e2e/flows/packages.spec.ts`
- `e2e/playwright.config.ts` (base URL: staging)

**CI:** rodar em `pnpm deploy:api:staging` antes de cada deploy de produção.

---

## Fase 2 — App Mobile nas Stores

**Duração:** 2–3 semanas  
**Impacto:** 129 pacientes com app = push notifications ativas = no-show cai imediatamente

### Sprint 2.1 — Preparação (3 dias)

- [ ] Gerar screenshots PT-BR para App Store (6 telas: agenda, SOAP, HEP, gamificação, wearables, notificações)
- [ ] Escrever descrição PT-BR para ambas as stores (App Store Connect + Google Play Console)
- [ ] Verificar privacy policy acessível em URL pública (obrigatório nas stores)
- [ ] Testar build de produção em dispositivo físico: `eas build --profile production`
- [ ] Testar push notification end-to-end em dispositivo real

### Sprint 2.2 — Submissão iOS (1 semana)

- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios --profile production` → envia para TestFlight
- [ ] Convidar grupo de beta testers (pacientes voluntários da Activity)
- [ ] Coletar feedback 5 dias
- [ ] Submeter para App Store Review
- [ ] Aprovação esperada: 1–3 dias úteis

### Sprint 2.3 — Submissão Android (paralelo ao iOS)

- [ ] `eas build --platform android --profile production`
- [ ] Criar conta Google Play Console (se não existir) — US$25 taxa única
- [ ] `eas submit --platform android --profile production`
- [ ] Período de revisão Android: 3–7 dias

### Sprint 2.4 — Onboarding dos pacientes existentes (após aprovação)

- [ ] Automação WhatsApp: "Olá [Nome]! O app FisioFlow Paciente chegou às stores. Baixe agora e acompanhe seus exercícios: [link]"
- [ ] QR code na recepção linkando para o app
- [ ] Meta: 30% dos 129 pacientes com app instalado em 30 dias (≈ 39 pacientes)

---

## Fase 3 — Adoção das Features Construídas

**Duração:** 3–4 semanas  
**Por que:** O roadmap foi inteiramente implementado mas zero adoção em pacotes e wearables.

### Sprint 3.1 — NFS-e: por que só 8 notas?

**Investigação (1 dia):**
- Abrir `/financeiro/nfse` em produção e fazer o fluxo do zero
- Checar se configuração de razão social / CNPJ / CPF estão preenchidos
- Verificar se o endpoint da Prefeitura SP está retornando sucesso

**Prováveis causas:**
- Configuração inicial da NFS-e nunca foi feita (tela de config não óbvia)
- UI confusa para criar a primeira nota

**Ação:**
- [ ] Gravar vídeo de 2 minutos mostrando como emitir a primeira NFS-e
- [ ] Simplificar tela de configuração: wizard com 4 passos (dados fiscais → certificado → teste → ativar)
- [ ] Meta: 20 NFS-e emitidas em junho

### Sprint 3.2 — Pacotes de Sessão: onboard na clínica

**Problema:** Feature construída mas nunca apresentada para a Activity.

- [ ] Criar 3 templates de pacote mais comuns (ex: "10 sessões lombar", "20 sessões pilates", "Avaliação + 5 sessões")
- [ ] Apresentar feature para o Rafael em call de 30 min
- [ ] Atribuir pacotes aos 20 pacientes mais frequentes como piloto
- [ ] Dashboard mostra pacotes vencendo → disparar WhatsApp de renovação

### Sprint 3.3 — Automações WhatsApp: verificar se estão ativas

- [ ] Acessar `/whatsapp/automations` em produção
- [ ] Confirmar que cron `0 9 * * *` (06h BRT) está disparando os lembretes
- [ ] Verificar logs do Worker: `wrangler tail --env production`
- [ ] Testar: agendar consulta fictícia para D+2 e checar se WhatsApp é enviado em D+0 e D-2h

### Sprint 3.4 — Dashboard KPI: primeira leitura dos números reais

**Sentar com o Rafael e olhar:**
- Taxa de ocupação da agenda: 253 consultas ÷ capacidade instalada = ?
- No-show rate: agendamentos cancelados / total = ?
- Churn rate: quem tinha consultas em março mas sumiu em abril = ?
- Ticket médio por sessão
- LTV estimado vs. CAC (input manual o quanto gasta em marketing)

**Saída:** lista dos 3 maiores problemas do negócio, ranqueados por impacto financeiro.

---

## Fase 4 — Qualidade de Código

**Duração:** 1 semana  
**Fazer por último** — não bloqueia nenhum valor de negócio.

### Sprint 4.1 — Oxlint warnings (495)

- [ ] `pnpm lint 2>&1 | grep "warning" | cut -d: -f1 | sort | uniq -c | sort -rn | head -20` — identificar os arquivos com mais warnings
- [ ] Resolver os top-10 arquivos (provavelmente cobrem 80% dos 495 warnings)
- [ ] Configurar oxlint para falhar em CI se warnings aumentarem (threshold atual = 495)

### Sprint 4.2 — Testes unitários para rotas críticas do Worker

- [ ] `workers/src/routes/__tests__/nfse.test.ts` — mock da Prefeitura SP
- [ ] `workers/src/routes/__tests__/appointments.test.ts` — conflito de horários
- [ ] `workers/src/routes/__tests__/packages.test.ts` — consumo de saldo
- [ ] Meta: cobertura > 60% nas rotas de negócio

### Sprint 4.3 — Documentação de onboarding (para nova clínica)

- [ ] `docs/guides/onboarding_nova_clinica.md`: checklist passo a passo para configurar uma nova clínica no FisioFlow
- [ ] Gravar Loom de 10 min mostrando o setup completo (agenda → pacientes → WhatsApp → NFS-e)

---

## Cronograma Resumido

```
Semana 1      → Fase 1: Testes E2E golden paths
Semana 2-4    → Fase 2: App mobile (build + submissão + TestFlight)
Semana 4-7    → Fase 3: Adoção features (NFS-e + pacotes + WhatsApp + KPIs)
Semana 7-8    → App aprovado nas stores + onboarding pacientes
Semana 8-9    → Fase 4: Qualidade de código
```

---

## Métricas de Sucesso — Fim de Agosto 2026

| KPI | Hoje | Meta |
|-----|------|------|
| NFS-e emitidas/mês | ~4 | ≥ 20 |
| Pacotes ativos | 0 | ≥ 15 |
| Pacientes com app | 0 | ≥ 40 (30%) |
| No-show rate | desconhecido | < 15% |
| WhatsApp confirmações automáticas | ❓ | 100% dos agendamentos D+2 |
| Testes E2E cobrindo golden paths | 0 | 6 fluxos cobertos |
| Oxlint warnings | 495 | < 50 |

---

## Próximo Passo Imediato

Começar pela **Fase 1 — testes E2E**. É o menor esforço com o maior impacto de risco: protege os 253 agendamentos/mês que já estão funcionando antes de qualquer mudança futura.

```bash
# Instalar Playwright no projeto raiz
pnpm add -D @playwright/test -w
npx playwright install chromium
# Criar e2e/playwright.config.ts
# Implementar os 6 fluxos
```
