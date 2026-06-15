# Roadmap pós-S8 — S9 / S10 / S11

**Criado**: 2026-05-20
**Contexto**: Sprint S8 fechado (SLO dashboard + cron). Backlog priorizado pelo DPO/sócio Rafael.

---

## Visão geral

| Sprint  | Tema                                        | Esforço     | Janela alvo |
| ------- | ------------------------------------------- | ----------- | ----------- |
| **S9**  | Estabilidade — investigar e zerar erros 5xx | 1-2 dias    | Agora       |
| **S10** | QA financeiro ponta-a-ponta                 | 3-5 dias    | Após S9     |
| **S11** | Patient App — HEP gamificado                | 3-4 semanas | Após S10    |

Ordem proposta pela regra: **risco/custo crescente, valor decrescente em prazo curto**. S9 dá uptime de 99.4% → 99.9%, S10 estabiliza a operação financeira diária, S11 abre nova frente de produto.

---

## S9 — Estabilidade: zerar 5xx (1-2 dias)

### Estado atual

- Uptime 24h: **99.424%** (meta 99.9%)
- **9 erros 5xx** em 1.562 requests (24h)
- **76 erros 4xx** (alguns esperados — 401 sem auth, 404 SPA — outros precisam triagem)

### Objetivos mensuráveis

- **SC-1**: uptime 7d ≥ 99.9% no `/admin/system-health` após PR
- **SC-2**: 0 erros 5xx recorrentes no top 10 do `errorBreakdown` em 48h pós-deploy

### Tarefas

| ID  | Descrição                                                                                                 | Esforço |
| --- | --------------------------------------------------------------------------------------------------------- | ------- |
| T1  | Query Analytics Engine: identificar rota+causa de cada 5xx (errorBreakdown + Worker logs Axiom)           | 30min   |
| T2  | Reproduzir bug localmente / em staging quando possível                                                    | 1-3h    |
| T3  | Abrir PRs pequenos por bug (1 fix = 1 PR pra reverter fácil)                                              | 2-6h    |
| T4  | Investigar 4xx legítimos vs ruidosos (separar 401 esperado de 404 de bug)                                 | 1h      |
| T5  | Setup alerta automático: se uptime 1h cair abaixo de 99.5%, push notif admin (extensão do `sloReport.ts`) | 1h      |

### Entregáveis

- 1-N PRs de fix (cada um pequeno e focado)
- 1 PR de alerting automático
- Doc `specs/s9-stability/incident-log.md` com lista dos 5xx + fix aplicado

---

## S10 — QA Financeiro ponta-a-ponta (3-5 dias)

### Estado atual

- Código completo (S7): 5.970 linhas frontend + 2.087 backend
- 9 componentes financeiros, 15+ endpoints, batch NFS-e via queue, recibo PDF, PIX QR, WhatsApp
- **Nunca foi testado end-to-end como fisio real**

### Riscos não validados

- Recibo PDF: gera mesmo em paciente sem CPF?
- PIX QR: txid colide se 2 cobranças no mesmo dia?
- NFS-e batch: 100 sessões → quanto demora? Timeout no consumer?
- Comissões: cálculo bate com planilha manual?
- Envio WhatsApp: template aprovado? Rate limit Meta?

### Objetivos mensuráveis

- **SC-1**: 100% dos 9 fluxos principais executados sem erro em prod
- **SC-2**: relatório de bugs encontrados + PR de fix por bug crítico

### Tarefas

| ID  | Descrição                                                                                                            | Esforço |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| T1  | Lista os 9 fluxos críticos (gerar recibo, emitir NFS-e, lote, PIX, WhatsApp, comissões, DRE, fluxo caixa, simulador) | 30min   |
| T2  | Cria spec `specs/s10-financial-qa/test-plan.md` com cada fluxo + passos detalhados                                   | 1h      |
| T3  | Para cada fluxo: navegar via chrome-devtools, executar, capturar erros (console + network)                           | 4-8h    |
| T4  | Para cada bug encontrado: abrir issue GitHub + tentar fix imediato se trivial, ou marcar pra próximo sprint          | 4-8h    |
| T5  | Doc final: matriz fluxo×status (PASS/WARN/FAIL) com link pros PRs/issues                                             | 30min   |

### Entregáveis

- `specs/s10-financial-qa/test-plan.md` (input)
- `specs/s10-financial-qa/results.md` (output)
- PRs de bugfix conforme necessário
- Issues GitHub pra gaps grandes

### Pré-requisitos (você)

- Existir pelo menos 1 paciente real ou de teste em prod
- Ter token NFS-e válido (certificado A1)
- Conta WhatsApp Business com template `recibo_paciente` aprovado

---

## S11 — Patient App: HEP gamificado (3-4 semanas)

### Contexto

- S4 do plano original. App mobile (`apps/patient-app/` existe)
- Memory: existem `useHEPCompliance.ts`, `HEPComplianceDashboard.tsx`, `gamification` schema
- Falta: experiência de paciente — exercícios prescritos com pontos, conquistas, streak

### Escopo proposto (MVP)

**S11.1 — Foundation (semana 1):**

- Auditar `apps/patient-app/` atual (Expo SDK 55, RN 0.83.2)
- Criar tela `Home` com exercícios do dia
- Conectar a `/api/exercise-plans` + `/api/exercise-sessions`
- Login via Neon Auth (Better Auth mobile)

**S11.2 — Engagement (semana 2):**

- Player de vídeo (já tem `exercise_videos` via Cloudflare Stream)
- Botão "Concluí" → POST `/api/exercise-sessions`
- Calcular streak diário + exibir
- Push notification de lembrete diário (cron 18:00 BRT)

**S11.3 — Gamification (semana 3):**

- Tabela `shop_items` + `user_inventory` já existem
- Tela "Loja" — troca pontos por recompensas (cupons, badges)
- Conquistas: "10 dias seguidos", "1º exercício avançado", etc.
- Tela "Perfil" com nível + barra XP

**S11.4 — Polish (semana 4):**

- Onboarding (3 telas explicando como funciona)
- Empty states + skeletons
- iOS + Android build + TestFlight + Play Store interno
- Teste com 1-2 pacientes piloto

### Objetivos mensuráveis

- **SC-1**: 1 paciente piloto fazendo ≥3 exercícios via app em 1 semana
- **SC-2**: build iOS + Android disponível em TestFlight/Play
- **SC-3**: streak retention ≥ 50% (paciente abre app 2+ dias seguidos)

### Riscos

- **R1** — Expo SDK 55 release recente, possíveis bugs nativos. Mitigação: ficar em SDK 54 se R55 instável.
- **R2** — Push notif iOS exige APN config + cert Apple Developer. Custa $99/ano.
- **R3** — App Store review pode demorar 1-2 semanas. Não bloqueia TestFlight.
- **R4** — Risco de over-engineering. Mitigação: começar pelo Home minimal, iterar.

### Entregáveis por fase

- S11.1: app rodando em simulador com Home funcional
- S11.2: app instalado em phone real, lembrete diário chegando
- S11.3: gamification visível, paciente piloto convidado
- S11.4: TestFlight + Play Internal Testing publicados

---

## Sequência recomendada

```
HOJE     [S9 5xx audit ──────] (2d)
              ↓
DIA 3    [S10 financeiro QA ─────────────] (5d)
              ↓
DIA 8    [S11.1 foundation ────] (5d)
              ↓
DIA 13   [S11.2 engagement ────] (5d)
              ↓
DIA 18   [S11.3 gamification ────] (5d)
              ↓
DIA 23   [S11.4 polish + pilot ────] (5d)
              ↓
DIA 28   ✅ MVP em piloto
```

**Total: ~4 semanas** com 1 fisio piloto testando o Patient App ao fim.

---

## O que precisa de você (não-código)

| Item                                                                   | Quando          | Prioridade                              |
| ---------------------------------------------------------------------- | --------------- | --------------------------------------- |
| Adicionar `Workers Scripts:Edit` + `User Memberships:Read` no token CF | Antes de S9     | Alta — desbloqueia deploys via wrangler |
| Apple Developer account $99/ano                                        | Antes de S11.4  | Alta se quiser App Store iOS            |
| Lista de 1-2 pacientes piloto pro Patient App                          | Antes de S11.4  | Média                                   |
| Template WhatsApp `recibo_paciente` aprovado pela Meta                 | Antes de S10 T3 | Média (bloqueia 1 fluxo financeiro)     |
