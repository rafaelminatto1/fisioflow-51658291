# 11 — Requisitos Não-Funcionais (AS-IS + alvo)

> Requisitos NFR derivados do comportamento e configuração atuais. Onde o AS-IS é fraco, o alvo é marcado como recomendação para a reconstrução (TO-BE leve — o TO-BE completo está em 15).

## Desempenho

- **Web**: eager bundle reduzido 4024→1675KB (−58%) em jul/2026 (memória perf agenda); fontes WOFF2, HTTP/3+zstd, cache `_headers` imutável. Alvo: manter LCP < 2,5s no desktop (hardware clínica i5/8GB sem GPU).
- **API**: smart placement; Hyperdrive com caching **desligado** (consistência sobre latência). Neon compute 0.25CU fixo (sempre ligado). Alvo: p95 < 300ms para reads simples.
- Hardware alvo da clínica: i5/8GB sem GPU; mobile iOS nativo mínimo **iPhone 14** (memória).

## Escalabilidade

- Single-tenant hoje (1 org, ~1k pacientes, ~14k agendamentos). Modelo multi-tenant pronto no schema. Cloudflare Workers escala horizontalmente sem gestão. Alvo: suportar dezenas de clínicas sem re-arquitetar (RLS real + índices por org).

## Disponibilidade & resiliência

- Deploy resiliente de Workflows é ponto fraco conhecido (raiz de falha flaky de deploy — memória roadmap). Queues com DLQ para WhatsApp e background. Neon scale-to-zero desabilitado em prod (suspend 0).
- Alvo: deploy idempotente de Workflows; smoke test pós-deploy (já existe em `production.yml`).

## Observabilidade

- Logs CF 10% + traces 5% + Axiom (`fisioflow-logs`) + Grafana OTLP + ntfy alertas + Sentry (web, lazy). ⚠️ Sentry mobile provavelmente mudo.
- Alvo: DSN Sentry nos builds iOS; dashboards de erro por domínio; alerta de RLS/isolamento.

## Segurança (detalhe em 10 e 14)

- Rate limiting via D1 (auth/AI/booking/webchat), Turnstile em signup/booking. Gaps críticos de auth listados em 14.C.
- Alvo: deny-by-default, RLS efetivo, MFA imposto, rate limit no OTP, sem dados sensíveis no repo.

## Privacidade & LGPD (detalhe em 10)

- Retenção formal (20 anos clínico) em `LGPD_RETENTION_POLICY.md`; endpoint de exclusão com base legal; 3 trilhas de auditoria. `lgpd_consents` vazia.
- Alvo: registrar consentimentos de fato; anonimização; limpeza de dados clínicos no logout dos apps.

## Acessibilidade

- UI PT-BR; superfícies sólidas (sem glassmorphism, por convenção). Acessibilidade observável não auditada em runtime (lacuna). Alvo: WCAG AA nos fluxos críticos.

## Internacionalização

- PT-BR fixo. Sem i18n. Datas: cuidado com off-by-one (parseAnyDate corrige UTC-midnight e dd/MM×MM/dd — memória). Timezone América/São_Paulo implícito.

## Offline & sincronização (detalhe em 12)

- Web: offline-first completo (PersistQueryClient + optimistic + badge Pendente). Apps: fila de escrita, sem cache de leitura persistido. Alvo: paridade offline entre web e apps; idempotência de mutações reenfileiradas.

## Compatibilidade

- Web: navegadores modernos, foco desktop. iOS: mínimo iPhone 14; Expo 55/RN 0.83; builds só via GitHub Action macOS (dev em Linux).
