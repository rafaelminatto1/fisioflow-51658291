# 13 — Testes e Paridade

> Inventário completo em `inventories/tests.csv` (442 arquivos). Objetivo: garantir que o sistema reconstruído tem paridade comprovável com o atual, com critérios independentes da implementação antiga.

## Testes existentes (AS-IS)

| Tipo | Arquivos | Framework | Observação |
|---|---|---|---|
| API/integração | 139 | Vitest | apps/api/src/**/*.test.ts; testTimeout 15s (flakiness de contenção) |
| E2E | 135 | Playwright | e2e/, playwright/; audit config separado |
| Unit | 167 | Vitest + Testing Library | src/ + packages/ |
| Integração dedicada | 1 | Vitest | — |
| **Total** | **442** (~2.629 asserts) | | |

Gotcha crítico: o teste do tick de cron `*/5` **deve ser DB-free** — se falhar, bloqueia silenciosamente TODOS os deploys de produção (memória CRM backend / cron.test.ts).

## Cobertura vs domínios (lacunas)

- **Bem coberto**: agenda, evolução (autosave/colaboração), CRM WhatsApp, financeiro (pacotes), auth.
- **Sub-coberto**: RLS/isolamento multi-tenant (crítico dado que RLS é inerte), portal do paciente, biomecânica (mock), mobile offline/sync, os 8 buracos de auth de 14.C.

## Estratégia de testes para a reconstrução (TO-BE)

Cada funcionalidade crítica deve ter critério de aceite **independente da implementação antiga** (comportamento observável, não código). Camadas:

1. **Unitários** — regras de negócio puras (lead score, comissão 40%, consumo de pacote, parseAnyDate, janela 24h).
2. **Contrato de API** — snapshot dos 1.168 endpoints ativos (method+path+auth+shape). Gerar do `api-endpoints.csv` como baseline.
3. **Integração/API** — handlers contra Postgres de teste (Neon branch efêmero ou Postgres local).
4. **Banco/RLS** — **testes de isolamento por org** rodando como role de runtime NÃO-owner: garantir que org A não lê dados de org B em cada tabela sensível. É o teste que hoje falta e que o AS-IS falha por design.
5. **E2E** — Playwright nos fluxos: agendar→atender→evoluir→finalizar→cobrar; inbox WhatsApp; booking público; portal paciente.
6. **Segurança** — testes negativos para cada item de 14.C (endpoint sem token deve dar 401; .ics sem token 401; OTP rate-limited).
7. **Acessibilidade** — axe nos fluxos críticos.
8. **Performance** — orçamento de bundle e p95 de API.
9. **Offline/sync (mobile)** — fila de mutação, replay, conflito, idempotência.
10. **Migração de dados** — ver 17: contagens origem×destino, checksums por tabela, reconciliação de FKs.
11. **Smoke pós-deploy** — já existe; manter.

## Testes de paridade (o núcleo)

Para declarar o sistema novo equivalente, um conjunto de **testes de paridade** deve rodar contra os dois sistemas (ou contra fixtures derivadas do atual) e comparar resultados:

| Área | Critério de paridade |
|---|---|
| Agenda | mesmo agendamento gera mesmo conflito 409; disponibilidade idêntica dado feriados/bloqueios |
| Financeiro | consumo/expiração/renovação de pacote produz mesmos saldos; comissão idêntica |
| CRM | classificação de lead score idêntica para mesma entrada; janela 24h decide igual |
| Evolução | autosave idempotente; finalização e is_edited coerentes |
| RLS | isolamento por org **passa** (diferente do atual, que é o comportamento desejado, não a paridade cega) |
| Relatórios | métricas agregadas batem dentro de tolerância |

⚠️ Onde o comportamento atual é um **bug** (RLS inerte, buracos de auth), a paridade é com o comportamento **correto**, não com o atual. Marcado explicitamente na coluna de cada teste.

A matriz `traceability.csv` já associa cada jornada crítica a um `teste_paridade` nomeado (ex.: T-AGENDA-conflito-409, T-PKG-consumo-atomico, T-AUTH-rls-isolamento).
