# FisioFlow Phase 2 Implementation Plan

## Overview

Implementação completa da Fase 2 do FisioFlow (Maio–Agosto 2026), abrangendo: 1) Testes E2E (Playwright), 2) Preparação App Mobile para Stores, 3) Melhorias de UX/Adoção (NFS-e, WhatsApp) e 4) Qualidade de Código (Testes Unitários e Oxlint).

## Project Type

WEB e BACKEND (Fases 1, 3, 4) e MOBILE (Fase 2)

## Success Criteria

- Testes E2E cobrindo os 6 "golden paths" configurados com Playwright.
- Fluxo de configuração de NFS-e transformado num Wizard passo-a-passo e testado.
- Cobertura de testes unitários >60% no backend para rotas críticas (Workers).
- Resolução dos principais ofensores de avisos (warnings) do Oxlint.
- Verificação de logs e estabilidade da cronjob do WhatsApp.

## Tech Stack

- **E2E:** Playwright Test.
- **Frontend:** React, TailwindCSS, Vite.
- **Backend:** Cloudflare Workers, Hono, Vitest (Unitários).
- **Mobile:** Expo, EAS Build.

## Task Breakdown

- **T1:** Instalar e configurar `@playwright/test` na raiz.
- **T2:** Escrever fluxos de Auth e Agenda (Playwright).
- **T3:** Escrever fluxos E2E de SOAP, NFSe e Pacotes.
- **T4:** Auditar automações do WhatsApp (Wranger tail).
- **T5:** Criar interface Wizard para configuração NFS-e.
- **T6:** Escrever os 3 testes unitários no Cloudflare Workers.
- **T7:** Corrigir o Top 10 de warnings levantados pelo Oxlint.
- **T8:** Documentar o onboarding (Markdown docs/guides).

## Verification Plan (Phase X)

### Automated Tests

Serão executados localmente para garantir sucesso antes do encerramento da branch/tarefa:

```bash
# E2E Tests
npx playwright test

# Backend Tests
npm run test --workspace=workers

# Lint & Qualidade
pnpm lint 2>&1 | grep "warning" | wc -l # Validar se < 495
```
