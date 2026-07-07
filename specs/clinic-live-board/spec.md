> **⚠️ PARADO (Jul/2026 — decisão de produto):** o banco não rastreia 'chegou'/'em atendimento' e o cliente não tem recepcionista, então check-in manual atrapalharia o dia a dia. Este painel só faz sentido com captura automática de chegada (câmera/leitor biométrico). Fundação (reducer+hydrate) commitada na branch `feat/clinic-live-board`, NÃO mergeada. Reavaliar no futuro.

# Spec — Clinic Live Board (painel de ocupação & check-in ao vivo)

**Slug:** `clinic-live-board` · **Data:** 2026-07-06 · **Épico:** M1 — Dashboards de clínica em tempo real
**Status:** aprovado (design) → pronto p/ plano

## Contexto

Os dashboards atuais (clínica/financeiro/CRM) consultam o Neon (OLTP) direto, pesando no banco transacional, e **não há visão ao vivo** do dia. A clínica precisa de um painel de recepção/gestão que mostre o estado da agenda **em tempo real (<2s)**: quem chegou, está em atendimento, faltou; ocupação de salas; próximos; fila de espera.

FisioFlow já tem em produção o padrão Durable Object + WebSocket (colaboração de evolução `EvolutionCollaborationSql`, auth WS por JWT+org+RBAC, fallback clássico). Este spec reusa esse padrão para uma **projeção viva** do quadro do dia.

**Fonte de verdade = Neon.** O Durable Object é uma projeção em memória/SQLite, reconstruível a qualquer momento (hydrate/resync). Nenhum dado clínico nasce ou morre no DO.

## User Stories

### P1 — Painel de ocupação & check-in ao vivo (escopo deste spec)

**US-1 (recepção):** Como recepcionista, quero ver a agenda de hoje atualizando sozinha em <2s conforme os pacientes chegam/são atendidos/faltam, para gerir a sala de espera sem apertar F5.

**US-2 (gestão do dia):** Como coordenador, quero ver ocupação de salas/terapeutas e os próximos atendimentos ao vivo, para remanejar encaixes e furos.

**US-3 (multi-cliente):** Como equipe, quero que uma ação de um (ex.: marcar "chegou") apareça no painel de todos os outros em <2s, sem recarregar.

**US-4 (resiliência):** Como usuário, se a conexão ao vivo cair, quero que o painel continue mostrando um snapshot recente (degrada, não quebra) e se reconecte sozinho.

#### Acceptance Scenarios (P1)

1. **Dado** o painel aberto por 2 usuários da mesma org, **quando** um marca um agendamento como "chegou", **então** o card muda de estado nos dois painéis em <2s.
2. **Dado** um DO frio (sem clientes há tempo), **quando** o 1º usuário abre o painel, **então** o DO reidrata do Neon com **1 query** e entrega o snapshot do dia < 1,5s.
3. **Dado** um novo agendamento criado/movido/cancelado via API, **quando** o commit no Neon conclui, **então** o delta chega ao painel em <2s (sem novo fetch do cliente).
4. **Dado** o WS indisponível, **quando** o painel carrega, **então** ele busca `GET /clinic-board/today` (snapshot REST) e faz retry com backoff; ao reconectar, pede resync.
5. **Dado** um gap de `seq` detectado pelo cliente, **quando** ele percebe o buraco, **então** solicita snapshot completo e reconcilia sem estado inconsistente.
6. **Dado** um usuário sem permissão (RBAC) ou de outra org, **quando** tenta conectar ao WS, **então** a conexão é recusada (mesma guarda JWT+org+RBAC da colaboração).
7. **Dado** ninguém conectado, **quando** passa o tempo de inatividade, **então** o DO faz scale-to-zero (sem custo ocioso).

### P2 — Migrar dashboards de BI para camada edge (fora do OLTP) [fase futura]

**US-5:** Como gestor, quero os dashboards de financeiro/funil-histórico/PROMs lendo de uma camada edge (Analytics Engine + D1 materializado por cron), não do Neon, para não competir com o transacional.

### P3 — Demais painéis ao vivo [fase futura]

**US-6:** Risco de no-show do dia ao vivo. **US-7:** Funil CRM ao vivo. Ambos reusam o `ClinicLiveBoard`.

## Escopo & não-escopo

**No escopo (P1):** DO `ClinicLiveBoard` por org; hydrate do Neon; notificação pós-commit das mutações de agenda de hoje; broadcast WS com `seq`; hook `useLiveClinicBoard`; fallback REST `/clinic-board/today`; auth WS; scale-to-zero; testes.

**Fora (P1):** migração dos dashboards de BI (P2); no-show/CRM ao vivo (P3); histórico/persistência de séries temporais no DO (o board é só "hoje"); push mobile.

## Requisitos não-funcionais

- **Latência:** delta visível em <2s p95; hydrate inicial <1,5s p95.
- **Isolamento:** 1 DO por `org_id`; auth JWT+org+RBAC no WS (reusar guarda da colaboração).
- **Resiliência:** fallback REST; resync por `seq`; DO reconstruível do Neon; degrade sem quebrar.
- **Custo:** DO só ativo com clientes conectados/eventos; scale-to-zero.
- **Consistência:** eventual — o DO reflete o Neon; divergência se resolve no próximo hydrate/resync. Neon é a verdade.
- **Sem regressão:** as mutações de agenda continuam funcionando se o DO falhar (notificação é best-effort via `waitUntil`, não bloqueia o commit nem a resposta ao usuário).

## Riscos & mitigações

- **Fan-out das mutações:** todo handler de agenda-do-dia precisa notificar o DO. Mitigação: um único helper `notifyClinicBoard(env, orgId, delta)` chamado via `waitUntil` após o commit; centralizar nos handlers de appointment (create/update/status/checkin/cancel).
- **DO como novo caminho crítico:** mitigado por ser best-effort + fallback REST (nunca bloqueia a escrita).
- **Custo de DO sempre-ligado:** mitigado por scale-to-zero e board só-de-hoje.
- **Gotcha conhecido:** `pg` quebra o bundler de Workers → seguir o padrão já usado (mock/driver serverless); reusar a infra de DO da colaboração que já resolveu isso.

## Métricas de sucesso

- p95 do delta <2s medido em prod (Analytics Engine).
- Redução de queries de "agenda de hoje" batendo direto no Neon a partir dos painéis abertos (1 hydrate por DO frio vs N polls por cliente).
- 0 regressão nas mutações de agenda (taxa de sucesso de create/update/status inalterada).
