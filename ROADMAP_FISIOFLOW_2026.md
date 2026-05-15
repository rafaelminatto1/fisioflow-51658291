# FisioFlow — Relatório Estratégico + Roadmap 2026

> **Data da análise:** 04/05/2026  
> **Metodologia:** Auditoria de codebase (150+ rotas), pesquisa competitiva (9 concorrentes), análise de métricas CAC/LTV/Payback para clínicas de fisioterapia, benchmarks internacionais.

---

## 1. PROBLEMA CENTRAL

A Activity Fisioterapia (plataforma FisioFlow) tem um codebase **tecnicamente superior a todos os concorrentes** — com IA, biomecânica avançada, app mobile, gamificação, telemedicina, marketing suite. Mas o gestor da clínica provavelmente **não consegue responder a estas 3 perguntas hoje**:

1. Quanto custa adquirir um novo paciente? (**CAC**)
2. Quanto um paciente gera em toda a vida dele na clínica? (**LTV**)
3. Em quantos meses o investimento em aquisição retorna? (**Payback**)

Sem essas métricas, a clínica cresce "por instinto" — não por dados. O objetivo deste roadmap é inverter isso.

---

## 2. ANÁLISE COMPETITIVA

### 2.1 Mapa de Concorrentes

| Software                | Foco                  | Preço        | Diferencial Chave                                          |
| ----------------------- | --------------------- | ------------ | ---------------------------------------------------------- |
| **FisioSync**           | Fisio/Pilates         | Freemium     | IA secretária WhatsApp 24h, lembretes ilimitados sem custo |
| **GestãoDS**            | Médico/Saúde          | Alto         | CRM funil marketing, relatórios financeiros avançados      |
| **EffiClin / ZenFisio** | "De fisio para fisio" | Baixo        | Simplicidade, jornada básica funciona bem                  |
| **Ikora**               | Clínicas fisio        | Freemium     | VAS visual, gestão de turmas, WhatsApp automático          |
| **Clinora**             | Modular               | R$49,90/user | Flexibilidade modular, agentes IA de confirmação           |
| **HumanDoctor**         | Autônomo              | Único plano  | Consultório virtual exclusivo, WhatsApp ilimitado          |
| **NinSaúde**            | Enterprise/Franquia   | Alto         | CRM nativo, Power BI, home care, TISS                      |
| **WIO Clinic**          | IA-first              | Sob consulta | Portal paciente, compliance HEP, IA prontuário             |
| **Cliniconect**         | Multidisciplinar      | Sob consulta | IA prontuário lançada mai/2026, TISS, ICP-Brasil           |
| **FisioAvalia**         | IA avaliação          | Trial 7d     | IA em fichas de avaliação, condutas por evidências         |

### 2.2 O que o FisioFlow já tem que os concorrentes NÃO têm

| Diferencial                                                  | Status FisioFlow | Concorrentes          |
| ------------------------------------------------------------ | ---------------- | --------------------- |
| Biomecânica avançada (marcha, postura, salto, corrida)       | ✅ Implementado  | ❌ Nenhum             |
| IA Studio + Computer Vision + AR                             | ✅ Implementado  | ❌ Nenhum             |
| Gamificação completa (XP, quests, shop, leaderboard)         | ✅ Implementado  | ❌ Nenhum completo    |
| App mobile paciente (React Native/Expo)                      | ✅ Desenvolvido  | Apenas NinSaúde/WIO   |
| NFS-e nativo (XML, SP, ABRASF)                               | ✅ Implementado  | Raramente             |
| Marketing suite (16 módulos: SEO, ROI, referral, reativação) | ✅ Implementado  | Parcial               |
| Voice Scribe (ditado → SOAP via IA)                          | ✅ Implementado  | ❌ Nenhum             |
| Telemedicina integrada (LiveKit)                             | ✅ Implementado  | Apenas alguns         |
| Stack edge moderna (Cloudflare + Neon PG)                    | ✅ Implementado  | Infraestrutura legada |

### 2.3 Gaps vs. Concorrentes (a resolver)

| Gap                                             | Impacto                                   | Prioridade |
| ----------------------------------------------- | ----------------------------------------- | ---------- |
| Dashboard CAC/LTV/Payback não existe            | Alto — gestão às cegas                    | P1         |
| WhatsApp confirmação end-to-end não verificado  | Alto — no-show alto                       | P1         |
| Gestão de turmas (Pilates/grupos) ausente       | Médio — perda de segmento                 | P2         |
| AI Concierge 24h para novos leads no WhatsApp   | Alto — resposta lenta = perda de paciente | P1         |
| Wearables integration (HealthKit/Garmin/Strava) | Médio-Alto — diferencial único            | P2         |
| App não publicado nas stores                    | Alto — pacientes não engajam              | P1         |
| CRM reativação pós-alta ausente                 | Alto — LTV perdido                        | P1         |

---

## 3. MÉTRICAS CAC / LTV / PAYBACK

### 3.1 Por que são críticas

```
LTV:CAC < 1   →  🔴 Você perde dinheiro para cada paciente novo
LTV:CAC = 1   →  🟡 Empate — sem margem
LTV:CAC > 3   →  🟢 Modelo saudável e escalável
LTV:CAC > 5   →  💡 Possível subinvestimento em marketing
```

**Regra de ouro:** O LTV deve ser pelo menos **3× o CAC**. Payback ideal: **< 6 meses**.

### 3.2 Fórmulas para implementar no FisioFlow

```
CAC = Total investido em marketing e vendas ÷ Novos pacientes no período

LTV = Ticket médio por sessão × Média de sessões por tratamento × Taxa de retenção para 2º tratamento

Payback (meses) = CAC ÷ (Receita média mensal por paciente)
```

**Exemplo prático:**

- Ticket médio: R$80/sessão
- Média de sessões: 20 sessões por tratamento
- Taxa de renovação para 2° tratamento: 40%
- LTV = R$80 × 20 × (1 + 0,4) = R$2.240

- Investimento marketing: R$2.000/mês
- Novos pacientes: 10/mês
- CAC = R$200

- **LTV:CAC = R$2.240 / R$200 = 11,2** → Excelente 🟢
- **Payback = R$200 / (R$80 × 4 sessões/mês) = 0,6 meses** → Ótimo 🟢

### 3.3 10 KPIs a monitorar no dashboard

| #   | KPI                                    | Meta            | Frequência |
| --- | -------------------------------------- | --------------- | ---------- |
| 1   | Taxa de Ocupação da Agenda             | ≥ 75%           | Diária     |
| 2   | No-Show Rate                           | < 15%           | Semanal    |
| 3   | Ticket Médio por Sessão                | Benchmark local | Mensal     |
| 4   | LTV estimado por paciente              | 3× CAC          | Trimestral |
| 5   | CAC por canal                          | Menor possível  | Mensal     |
| 6   | Payback em meses                       | < 6 meses       | Mensal     |
| 7   | LTV:CAC ratio                          | ≥ 3:1           | Mensal     |
| 8   | Taxa de Conversão avaliação→tratamento | ≥ 70%           | Mensal     |
| 9   | Taxa de Renovação de Pacotes           | > 60%           | Mensal     |
| 10  | Churn Rate mensal                      | < 10%           | Mensal     |

---

## 4. COMO REDUZIR CAC (sem perder qualidade)

### Canal 1 — Indicações (CAC próximo de zero)

- Pacientes satisfeitos indicam → ganham sessão grátis
- Rastrear origem de cada novo paciente
- Os "super promotores" (>2 indicações) merecem VIP treatment

### Canal 2 — SEO Local (CAC baixo, 3-6 meses para resultado)

- Página pública `/agendar/:slug` com Schema markup LocalBusiness
- Blog com artigos: "fisioterapia [bairro]", "tratamento dor lombar [cidade]"
- Google My Business otimizado + respostas automáticas de reviews

### Canal 3 — Automação WhatsApp AI Concierge (CAC médio, resposta imediata)

- Novos leads no WhatsApp recebem triagem IA em < 1 minuto
- Benchmarks (Triagefy): tempo de resposta manual = 1-4h; com IA = < 1 min
- Resultado: 20-30% mais conversão de leads para agendamentos

### Canal 4 — Reativação pós-alta (CAC = quase zero, LTV += 40%)

- Trigger automático: 6 meses após alta → WhatsApp de reavaliação
- "Oi [Nome], faz 6 meses da sua alta do tratamento de [condição]. Que tal agendarmos uma reavaliação de performance física?"
- ROI muito alto: paciente já conhece a clínica, CAC é praticamente zero

---

## 5. COMO AUMENTAR LTV (menos churn, mais retenção)

### Tática 1 — Mostrar resultado ao paciente (principal driver de retenção)

- Gráfico VAS (dor) ao longo das sessões — visível para o paciente
- Comparativo foto before/after no app
- Celebração de milestones: "Você completou 10 sessões! Sua evolução foi incrível 🎉"

### Tática 2 — Gamificação ativa (já implementada, melhorar visibilidade)

- Badgets por assiduidade ("7 dias seguidos")
- XP por fazer exercícios HEP em casa
- Ranking entre pacientes (com privacidade respeitada)

### Tática 3 — HEP + Wearables (compliance fora da clínica = maior resultado = menor abandono)

- Paciente faz exercícios em casa → app registra
- Fisioterapeuta vê compliance de HEP antes de cada sessão
- Wearable (smartwatch) envia dados de atividade → aparece na evolução

### Tática 4 — Comunicação proativa anti-churn

- Trigger: sem sessão há 14 dias → WhatsApp automático
- Trigger: pacote com 2 sessões → WhatsApp para renovar
- Trigger: NPS < 7 → contato pessoal do fisio responsável

---

## 6. INTEGRAÇÃO DE WEARABLES (sem FHIR)

A abordagem recomendada é **OAuth 2.0 + REST APIs diretas** — sem burocracia de saúde.

### Camada 1 — HealthKit + Google Health Connect (via patient-app)

```
Paciente tem smartphone → app FisioFlow solicita permissão →
lê dados localmente (passos, BPM, sono, carga de treino) →
POST /api/wearables/sync → dados aparecem na evolução
```

### Camada 2 — APIs de Fabricantes (Garmin, Strava, Oura)

```
Portal do paciente → "Conectar Garmin" → OAuth 2.0 →
Webhook em tempo real quando o paciente treina →
dados: distância, pace, FC, HRV, carga de treino →
aparecem automaticamente na evolução do próximo dia
```

### Camada 3 — Google Fit REST API

```
Conta Google do paciente → OAuth 2.0 →
histórico de passos, peso, atividades consolidadas →
gráfico de atividade no perfil do paciente
```

**Por que não FHIR?** FHIR é arquitetura para sistemas hospitalares. Para dados de wearables de consumidor, OAuth 2.0 + REST é o padrão correto — mais simples, sem conformidade complexa, controle na mão do paciente.

---

## 7. ROADMAP COMPLETO — 16 SPRINTS (32 SEMANAS)

### Legenda de prioridade

- 🔴 P0 = Quebrado — corrigir imediatamente
- 🟠 P1 = Alto impacto na receita/retenção, baixo/médio esforço
- 🟡 P2 = Alto impacto, maior esforço
- 🟢 P3 = Diferencial estratégico, alto esforço

---

### SPRINT 1 (Semana 1-2) 🔴 — Auditoria + Correções P0

**Pré-requisito:** Deletar lock do Chrome DevTools MCP:

```bash
rm ~/.cache/chrome-devtools-mcp/chrome-profile/Default/SingletonLock
rm ~/.cache/chrome-devtools-mcp/chrome-profile/Default/SingletonSocket
rm ~/.cache/chrome-devtools-mcp/chrome-profile/Default/SingletonCookie
```

**TODO List:**

- [ ] Navegar todas as 28 rotas em produção (moocafisio.com.br) com DevTools
- [ ] Capturar todos os erros de console (P0 = erros, P1 = warnings)
- [ ] Testar CRUDs: Paciente / Agendamento / Evolução / Exercício / Protocolo / Financeiro
- [ ] Identificar requests com 4xx/5xx
- [ ] Corrigir todos os bugs P0 identificados
- [ ] Verificar mobile responsiveness em páginas críticas
- [ ] Testar NFSe ponta a ponta em produção SP

**Critério de sucesso:** Zero erros P0 no console. Todas as 28 rotas carregam sem crash.

---

### SPRINT 2 (Semana 3-4) 🟠 — Dashboard "Saúde do Negócio"

**Objetivo:** Gestor vê CAC / LTV / Payback / Ocupação em 1 tela

**TODO List:**

- [ ] Criar `src/components/dashboard/ClinicHealthKPIs.tsx`
  - [ ] Widget: Taxa de Ocupação da Agenda (live — query `appointments`)
  - [ ] Widget: No-Show Rate (30/90 dias)
  - [ ] Widget: Ticket Médio por Sessão
  - [ ] Widget: LTV estimado (configurável pelo gestor)
  - [ ] Widget: CAC manual mensal (gestor digita gasto de marketing)
  - [ ] Widget: Payback calculado automaticamente
  - [ ] Widget: LTV:CAC ratio com semáforo (🔴🟡🟢)
- [ ] Criar `workers/src/routes/clinic-metrics.ts` — `GET /api/clinic-metrics/kpis`
  - [ ] Query: `appointments` + `sessions` + `patients` + `commissions`
  - [ ] Cache KV 5 minutos
- [ ] Integrar no `/dashboard` como seção "Saúde do Negócio"
- [ ] Adicionar configuração de metas em `/settings`
  - [ ] Ticket médio alvo
  - [ ] % ocupação meta
  - [ ] Churn aceitável
  - [ ] Gasto marketing mensal (para cálculo de CAC)

**Critério de sucesso:** Dashboard exibe LTV:CAC ratio com dados reais de appointments + sessions.

---

### SPRINT 3 (Semana 5-6) 🟠 — Evolução "One-Click" com Voice + IA

**Objetivo:** Fisioterapeuta dita evolução em voz → IA estrutura SOAP em segundos

**TODO List:**

- [ ] Melhorar botão 🎤 no formulário de evolução (mais visível/acessível)
- [ ] Adicionar feedback visual durante transcrição (waveform animado)
- [ ] IA estrutura automaticamente: Subjetivo / Objetivo / Avaliação / Plano + escala de dor + exercícios realizados
- [ ] Templates de evolução rápidos "1-click" por condição:
  - [ ] LCA (Pré/Pós-cirúrgico)
  - [ ] Lombar (Aguda/Crônica)
  - [ ] Cervical
  - [ ] Ombro (Manguito)
  - [ ] Neurológico
  - [ ] Pós-operatório geral
- [ ] Templates editáveis em `/cadastros/templates-evolucao`
- [ ] Checklist de evolução rápida (checkboxes) para sessões de rotina
- [ ] Salvar preferência de template por condição do paciente

**Critério de sucesso:** Evolução completa registrada em < 2 minutos com voice scribe.

---

### SPRINT 4 (Semana 7-8) 🟠 — Anti-Churn: Pacientes em Risco + Inadimplência

**Objetivo:** Identificar e agir sobre pacientes prestes a abandonar + inadimplentes

**TODO List:**

- [ ] Conectar `AtRiskPatients.tsx` com dados reais do banco
- [ ] Critérios de risco configuráveis:
  - [ ] Sem sessão há ≥ 14 dias (configurável)
  - [ ] Pacote com ≤ 2 sessões restantes
  - [ ] NPS < 7 nas últimas surveys
  - [ ] Sequência de 2 faltas consecutivas
- [ ] Action button "Enviar WhatsApp" direto do widget
- [ ] Widget "Valores em Aberto" no dashboard financeiro:
  - [ ] Lista de inadimplentes com valor e dias em aberto
  - [ ] Botão: enviar cobrança amigável via WhatsApp + link PIX
- [ ] Automação: após X dias em aberto → WhatsApp cobrança amigável
- [ ] CRM de reativação pós-alta (HIGH VALUE):
  - [ ] Configurar em `/marketing/reativacao`
  - [ ] Trigger: N meses após alta (configurável: 3, 6, 12 meses)
  - [ ] Template: "Oi [Nome], faz [N] meses da sua alta de [condição]. Que tal agendarmos uma reavaliação?"
  - [ ] Worker cron diário verificando pacientes elegíveis

**Critério de sucesso:** Widget lista pacientes em risco corretamente + WhatsApp enviado e confirmado no histórico.

---

### SPRINT 5 (Semana 9-10) 🟠 — WhatsApp: Confirmação Automática + AI Concierge

**Objetivo:** Reduzir no-show ≥ 30% + triagem de novos pacientes 24/7

**TODO List (Confirmação automática):**

- [ ] Worker cron: 48h antes da sessão → WhatsApp de confirmação
  - [ ] Template: "[Nome], confirme sua sessão [dia] às [hora] 👇"
  - [ ] Botões: "✅ Confirmado" / "❌ Preciso cancelar"
- [ ] Worker cron: 2h antes, se não confirmou → segundo lembrete
- [ ] Resposta "Cancelar" → libera slot na agenda automaticamente
- [ ] Notificação para secretária/recepção quando há cancelamento
- [ ] Usar Cloudflare Queue `fisioflow-background-tasks` para envios

**TODO List (AI Concierge):**

- [ ] Criar fluxo de triagem no WhatsApp para número da clínica
- [ ] Menu inicial: "1️⃣ Marcar avaliação 2️⃣ Falar com equipe 3️⃣ Dúvidas"
- [ ] Fluxo "Marcar avaliação": coletar nome → queixa principal → plano de saúde → propor horários disponíveis → confirmar agendamento
- [ ] Integrar Claude AI para entender mensagens livres (não só botões)
- [ ] Encaminhar para profissional correto com base na queixa
- [ ] Horário fora do expediente: resposta automática + opção de agendar

**Critério de sucesso:** Testar confirmação end-to-end. No-show rate < 20% após 30 dias.

---

### SPRINT 6 (Semana 11-12) 🟠 — Controle de Pacotes + Previsão de Receita

**Objetivo:** Gestor sabe exatamente o que vai receber e quem precisa renovar

**TODO List:**

- [ ] Widget "Pacotes" no dashboard financeiro:
  - [ ] Pacientes com pacote expirando em < 7 dias
  - [ ] Pacientes com saldo zero (renovação pendente)
  - [ ] Receita prevista para o mês (sessões futuras × ticket médio)
- [ ] Alerta automático WhatsApp para renovação: "Seu pacote tem 2 sessões restantes. Vamos renovar?"
- [ ] Melhorar simulador de receita (`/financeiro/simulador`):
  - [ ] "Se preencher X% da agenda → receita estimada R$Y"
  - [ ] Meta de ocupação para ponto de equilíbrio
  - [ ] Projeção de 3/6/12 meses
- [ ] Relatório "Previsão vs. Realizado" mensal

**Critério de sucesso:** Dashboard mostra receita prevista para o mês com desvio < 10% do real.

---

### SPRINT 7 (Semana 13-14) 🟡 — Gestão de Turmas (Pilates/Grupos)

**Objetivo:** Controlar check-ins, vagas e lista de espera para turmas

**TODO List:**

- [ ] Migration: `workers/migrations/0036_groups.sql`
  - Tabelas: `group_sessions`, `group_enrollments`, `group_waitlist`
- [ ] Worker route: `workers/src/routes/groups.ts`
  - [ ] CRUD turmas (nome, capacidade, horário, profissional)
  - [ ] Enroll / unenroll de paciente
  - [ ] Check-in manual e via QR code
  - [ ] Lista de espera automática
- [ ] UI: `/cadastros/turmas` — gestão de turmas
- [ ] View "Turmas" na agenda (além do modo individual)
- [ ] Relatório de ocupação de turmas por mês
- [ ] Financeiro: pacote de turmas (mensalidade vs. avulso)

**Critério de sucesso:** Criar turma, enrollar pacientes, fazer check-in, gerar relatório de ocupação.

---

### SPRINT 8 (Semana 15-16) 🟡 — Gestão de Pessoas + Performance Equipe

**Objetivo:** Gestor visualiza produtividade individual e compara a equipe

**TODO List:**

- [ ] Enriquecer `/performance-equipe`:
  - [ ] Ocupação por profissional (% agenda preenchida) com gráfico
  - [ ] Faturamento por profissional (já tem `commissions`)
  - [ ] Taxa de comparecimento dos pacientes por profissional
  - [ ] LTV médio dos pacientes atendidos por profissional
  - [ ] Meta vs. realizado por profissional com semáforo
- [ ] `/cadastros/escalas` — nova aba "Escalas de Trabalho":
  - [ ] Definir dias/horários disponíveis por profissional
  - [ ] Bloqueios por folga/feriado integrado com `appointments`
  - [ ] Cálculo automático de horas disponíveis por semana

**Critério de sucesso:** Comparativo visual de produtividade entre todos os profissionais da clínica.

---

### SPRINT 9 (Semana 17-18) 🟡 — Wearables Integration

**Objetivo:** Dados de atividade física do paciente aparecem na evolução clínica

**TODO List (Camada 1 — HealthKit/Health Connect):**

- [ ] `apps/patient-app/app/(tabs)/wellness.tsx` — solicitar permissão de saúde
- [ ] Ler dados locais: batimentos cardíacos, passos, sono, carga de treino
- [ ] `POST /api/wearables/sync` — enviar dados para Neon DB (`wearable_data` já existe)
- [ ] Widget "Dados do Paciente" na evolução clínica

**TODO List (Camada 2 — Garmin/Strava/Oura):**

- [ ] Tela `/portal/integrations` no portal do paciente
  - [ ] Botões "Conectar Garmin" / "Conectar Strava" / "Conectar Oura"
- [ ] Worker endpoints OAuth:
  - [ ] `GET /api/wearables/oauth/:provider/start`
  - [ ] `GET /api/wearables/oauth/:provider/callback`
  - [ ] `POST /api/wearables/webhook/:provider`
- [ ] Dados: distância, pace, FC, HRV, carga de treino
- [ ] Aparecem automaticamente na evolução quando há atividade recente

**TODO List (Camada 3 — Google Fit):**

- [ ] Integração OAuth com conta Google do paciente
- [ ] Gráfico de atividade física no perfil do paciente

**Critério de sucesso:** Paciente conecta Garmin → corre 5km → próxima evolução do fisio já mostra os dados do treino.

---

### SPRINT 10 (Semana 19-20) 🟠 — App Mobile: Publicação nas Stores

**Objetivo:** Pacientes engajam pelo app → menos churn → maior LTV

**TODO List:**

- [ ] Verificar `apps/patient-app/eas.json` e `app.json`
- [ ] Assets para as stores:
  - [ ] Ícone 1024×1024 e 512×512
  - [ ] Screenshots PT-BR (iPhone 6.5" + 5.5" + iPad; Android 16:9)
  - [ ] Descrição curta (80 chars) e longa (4000 chars) PT-BR
  - [ ] Keywords de ASO
- [ ] Publicar Google Play via EAS Submit
- [ ] Publicar App Store via EAS Submit (requer conta Apple Developer)
- [ ] Push Notifications via Expo Notifications:
  - [ ] Lembrete de HEP (exercícios em casa)
  - [ ] Confirmação/lembrete de agendamento
  - [ ] Parabéns por milestone de gamificação
  - [ ] Aviso de pacote expirando
- [ ] Deep link: link web de agendamento → abre app se instalado

**Critério de sucesso:** App disponível na Play Store. 30% dos pacientes instala em 60 dias.

---

### SPRINT 11 (Semana 21-22) 🟠 — Agendamento Online Auto-Serviço

**Objetivo:** Paciente agenda sozinho sem passar pelo balcão/WhatsApp

**TODO List:**

- [ ] Audit completo da página `/agendar/:slug`:
  - [ ] Testar fluxo: serviço → horário disponível → dados pessoais → confirmar → email/WhatsApp de confirmação
  - [ ] Identificar e corrigir bugs no fluxo
- [ ] SEO e Conversão:
  - [ ] Meta tags: título, descrição, OG/Twitter cards
  - [ ] Schema markup `LocalBusiness` + `MedicalOrganization` + `Service`
  - [ ] Mobile-first totalmente responsivo
- [ ] Integração Google Calendar público (mostrar disponibilidade em tempo real)
- [ ] CTA nos canais da clínica:
  - [ ] Link na bio Instagram → página de agendamento
  - [ ] Botão no WhatsApp Business → link agendamento
  - [ ] QR code na recepção

**Critério de sucesso:** Agendamento online funciona 100% sem intervenção humana. Medir % de agendamentos que vêm do online.

---

### SPRINT 12 (Semana 23-24) 🟡 — NFS-e + DRE Gerencial

**Objetivo:** Clínica tem visão financeira 360° sem planilha paralela

**TODO List:**

- [ ] Audit NFS-e SP ponta a ponta em produção
  - [ ] Testar emissão com dados reais
  - [ ] Verificar configuração certificado digital A1/A3
  - [ ] Error handling legível para rejeições da prefeitura
- [ ] DRE Gerencial no `/financeiro/demonstrativo`:
  - [ ] Receita bruta por período
  - [ ] Deduções: impostos, descontos convênio
  - [ ] Despesas fixas (aluguel, salários) — input manual
  - [ ] Despesas variáveis (materiais, comissões)
  - [ ] **Lucro líquido estimado**
  - [ ] Comparativo mês a mês em gráfico de barras
- [ ] Relatório para contador:
  - [ ] Export CSV/PDF de todos os lançamentos categorizados
  - [ ] Filtro por período e categoria

**Critério de sucesso:** NFS-e emitida com sucesso. DRE mostra lucro líquido com desvio < 5% do real.

---

### SPRINT 13 (Semana 25-26) 🟡 — SEO + Aquisição Orgânica

**Objetivo:** Reduzir CAC com presença orgânica — pacientes chegam sem pagar por anúncio

**TODO List:**

- [ ] FisioLink (`/marketing/fisiolink`):
  - [ ] Página link-in-bio com SEO local
  - [ ] Schema markup LocalBusiness
  - [ ] Botão para Google Maps, Instagram, agendar online
- [ ] Blog com IA (`/marketing/content-generator`):
  - [ ] Gerar 2 artigos/mês: "fisioterapia [bairro]", "dor lombar tratamento", etc.
  - [ ] Publicar em subpath `/blog` ou subdomínio
- [ ] Google My Business:
  - [ ] Automatizar solicitação de reviews pós-alta
  - [ ] Monitorar e responder reviews
- [ ] Rastrear CAC por canal no dashboard:
  - [ ] Campo "Como nos encontrou?" no cadastro de novo paciente
  - [ ] Opções: WhatsApp orgânico / Google / Indicação / Redes Sociais / Busca Orgânica / Outros
  - [ ] Gráfico de origem × conversão × LTV por canal

**Critério de sucesso:** Posição Google Maps para "fisioterapia [bairro]" melhora em 45 dias. CAC do canal orgânico < 50% do CAC pago.

---

### SPRINT 14 (Semana 27-28) 🟡 — Programa de Indicação

**Objetivo:** Transformar pacientes satisfeitos em canal de aquisição (CAC ≈ zero)

**TODO List:**

- [ ] Melhorar `/marketing/referral`:
  - [ ] Landing page para o indicado com desconto de boas-vindas
  - [ ] "Indique um amigo → ganhe 1 sessão grátis"
- [ ] Rastreamento de origem no cadastro de pacientes
- [ ] Dashboard: quais pacientes mais indicam (top promotores)
- [ ] Automatizar pedido de indicação pós-milestone:
  - [ ] Trigger: após completar 10 sessões → "Você está adorando a fisioterapia? Indica para um amigo e ganhe 1 sessão!"
- [ ] Integrar com gamificação: XP por indicação convertida
- [ ] Relatório: indicações por mês × conversão × LTV dos indicados

**Critério de sucesso:** ≥ 10% dos novos pacientes vem por indicação rastreada.

---

### SPRINT 15 (Semana 29-30) 🟢 — Relatórios Avançados + Business Intelligence

**TODO List:**

- [ ] Relatório de cohort melhorado (`/admin/cohorts`):
  - [ ] Retenção por mês de início de tratamento
  - [ ] Cohort de receita (LTV por coorte)
- [ ] Relatório de churn mensal:
  - [ ] Quem abandonou, em que mês do tratamento
  - [ ] Motivo (survey, inferido)
  - [ ] Receita perdida estimada
- [ ] Relatório de origem de pacientes:
  - [ ] Canal × LTV × Taxa de conversão × CAC
- [ ] Export para Excel/CSV de qualquer relatório/tabela
- [ ] (Futuro) Integração Power BI via Cloudflare Analytics Engine

**Critério de sucesso:** Relatório de cohort mostra claramente os meses com mais abandono.

---

### SPRINT 16 (Semana 31-32) 🟢 — Polimento + Onboarding de Novos Usuários

**Objetivo:** Ativar mais rápido → reduzir churn dos primeiros 30 dias

**TODO List:**

- [ ] Checklist de onboarding no primeiro login:
  - [ ] "Configure sua agenda" ✅
  - [ ] "Cadastre seus serviços" ✅
  - [ ] "Adicione seus primeiros pacientes" ✅
  - [ ] "Configure o WhatsApp" ✅
  - [ ] "Convide sua equipe" ✅
- [ ] Tour interativo nas páginas principais (tooltip guiado)
- [ ] Wiki interna (`/wiki`) populada com guias de uso do FisioFlow
- [ ] Email de onboarding: sequência de 7 dias com uma dica por dia
- [ ] Chat de suporte integrado no produto (não apenas WhatsApp externo)

**Critério de sucesso:** Novos usuários completam setup em < 30 minutos. Ativação (primeira evolução registrada) em < 24h.

---

## 8. METAS DE NEGÓCIO — 6 MESES

| KPI                                | Baseline (estimado hoje) | Meta 6 meses                |
| ---------------------------------- | ------------------------ | --------------------------- |
| No-show rate                       | ~25%                     | **< 12%**                   |
| Taxa de ocupação agenda            | ~60%                     | **≥ 80%**                   |
| Churn rate mensal                  | ~20%                     | **< 10%**                   |
| LTV:CAC ratio                      | Desconhecido             | **≥ 3:1**                   |
| Payback                            | Desconhecido             | **≤ 6 meses**               |
| NPS interno                        | Desconhecido             | **≥ 50**                    |
| Pacientes usando app mobile        | ~0%                      | **≥ 50% da base**           |
| Conversão avaliação→tratamento     | Desconhecido             | **≥ 70%**                   |
| Inadimplência                      | Desconhecida             | **< 5%**                    |
| % pacientes de indicação rastreada | ~0%                      | **≥ 10%**                   |
| CAC (custo por novo paciente)      | Desconhecido             | **Calculável e monitorado** |

---

## 9. SEQUÊNCIA RECOMENDADA DE EXECUÇÃO

```
AGORA (pré-requisito)
└── Deletar SingletonLock do Chrome DevTools MCP

SEMANAS 1-2 (SPRINT 1 — URGENTE)
└── Auditoria completa em produção + correções P0

SEMANAS 3-4 (SPRINT 2 — IMPACTO IMEDIATO)
└── Dashboard KPI CAC/LTV/Payback/Ocupação

SEMANAS 5-6 (SPRINT 3 — RETENÇÃO)
└── Evolução one-click com voice scribe

SEMANAS 7-8 (SPRINT 4 — ANTI-CHURN)
└── Pacientes em risco + cobrança automática

SEMANAS 9-10 (SPRINT 5 — REVENUE)
└── WhatsApp: confirmação automática + AI concierge

SEMANAS 11-12 (SPRINT 6 — PREVISIBILIDADE FINANCEIRA)
└── Controle de pacotes + previsão de receita

SEMANAS 13-14 (SPRINT 7 — NOVO SEGMENTO)
└── Gestão de turmas (Pilates/grupos)

SEMANAS 15-16 (SPRINT 8 — OPERAÇÃO)
└── Performance equipe + escalas de trabalho

SEMANAS 17-18 (SPRINT 9 — DIFERENCIAL ÚNICO)
└── Integração wearables

SEMANAS 19-20 (SPRINT 10 — ENGAJAMENTO)
└── App mobile publicado nas stores

SEMANAS 21-22 (SPRINT 11 — AQUISIÇÃO)
└── Agendamento online otimizado

SEMANAS 23-24 (SPRINT 12 — FISCAL)
└── NFS-e + DRE gerencial completo

SEMANAS 25-26 (SPRINT 13 — CAC REDUÇÃO)
└── SEO local + aquisição orgânica

SEMANAS 27-28 (SPRINT 14 — CAC ≈ ZERO)
└── Programa de indicação

SEMANAS 29-30 (SPRINT 15 — INTELIGÊNCIA)
└── Relatórios avançados + BI

SEMANAS 31-32 (SPRINT 16 — POLIMENTO)
└── Onboarding + suporte integrado
```

---

## 10. RESUMO EXECUTIVO

O FisioFlow já tem a **melhor stack técnica do mercado** de software para fisioterapia. O problema não é falta de features — é que as features mais importantes para gestão do negócio (CAC, LTV, Payback, churn, anti-abandono) não estão visíveis na interface ou não estão conectadas a dados reais.

**O plano tem 3 grandes apostas:**

1. **Visibilidade de métricas** (Sprints 1-6): Transformar o gestor de "pilotando no escuro" para "painel de controle completo" — ocupação, no-show, LTV:CAC, inadimplência, pacotes a vencer, tudo em 1 dashboard.

2. **Automação de retenção** (Sprints 4-5): WhatsApp automático para confirmar sessões, alertar sobre risco de abandono e reativar pacientes pós-alta. Benchmark: redução de 30-40% no churn.

3. **Diferencial IA + Wearables** (Sprints 3, 9): Voice scribe + templates one-click + dados de wearables na evolução. Nenhum concorrente do Brasil tem isso funcionando end-to-end.

**Implementando os Sprints 1-6 você já resolve os problemas do dia a dia da clínica e tem métricas reais de CAC/LTV/Payback. Os Sprints 7-16 são o que vão fazer o FisioFlow ser reconhecido como o software mais avançado do mercado.**

---

## 8. PRÓXIMA FRONTEIRA: INOVAÇÕES ENTREGUES (MAIO/2026)

Além do roadmap original, as seguintes tecnologias de elite foram integradas:

### 8.1 Inteligência Clínica Avançada

- **Digital Twin (Gêmeo Digital):** Predição de alta e risco de abandono baseada em trajetória histórica.
- **RAG de Exames:** Chat com laudos PDF via Cloudflare Vectorize.
- **Vision AI Verifier:** Auditoria de execução de testes clínicos via câmera em tempo real.

### 8.2 Gestão de Alta Performance

- **Edge Caching Turbo:** Agenda carregando em < 50ms via Cloudflare KV/D1.
- **Smart Inventory Forecasting:** Previsão de demanda de materiais baseada na agenda futura.
- **Regional Enterprise Dashboard:** Visão consolidada para redes de múltiplas clínicas.
- **AI Reimbursement Billing:** Inteligência de faturamento para maximizar reembolsos de convênios.

### 8.3 Patient Experience (UX)

- **Omnisearch (Cmd+K):** Busca global unificada e semântica.
- **Live Waiting Room TV:** Painel em tempo real para recepção via D1.
- **Programa de Indicação (MGM):** Crescimento orgânico integrado ao portal do paciente.
