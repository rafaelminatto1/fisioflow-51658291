# Estratégia de Testes — FisioFlow

> Stack: Vitest (unit) + Playwright (e2e)  
> Última revisão: 2026-04-28

---

## Estrutura atual

```
apps/api/src/routes/__tests__/          # unit tests da API (Workers)
  appointmentHelpers.test.ts            # 20 testes — funções puras
  patients.test.ts                      # 8 testes — RBAC + rotas
  sessions.test.ts                      # 9 testes — RBAC + rotas SOAP
  ...

src/components/ui/__tests__/           # unit tests de componentes web
  badge.test.tsx, button.test.tsx       # componentes Shadcn
  card.test.tsx, input.test.tsx
  select.test.tsx, empty-state.test.tsx
  loading-skeleton.test.tsx
  patient-combobox.test.tsx
  responsive-table.test.tsx
  virtual-list.test.tsx

e2e/
  smoke.spec.ts                         # 5 testes @smoke para CI
```

---

## Ferramentas

| Camada | Ferramenta | Config |
|---|---|---|
| Unit (API) | Vitest | `apps/api/vitest.config.ts` |
| Unit (Web) | Vitest + jsdom | `vitest.config.ts` (raiz) |
| E2E | Playwright | `playwright.config.ts` |

---

## Comandos

```bash
# Unit — API (Workers)
pnpm --filter @fisioflow/api test:unit

# Unit — Web
pnpm --filter fisioflow-web test:unit
# ou na raiz:
pnpm test

# E2E — local (requer servidor rodando)
pnpm --filter fisioflow-web test:e2e

# E2E — apenas smoke (CI)
pnpm --filter fisioflow-web test:e2e:ci --grep "@smoke"

# Cobertura
pnpm --filter fisioflow-web test:coverage
```

---

## Jobs de CI (`.github/workflows/ci.yml`)

| Job | Trigger | Bloqueia deploy |
|---|---|---|
| `test-api` | Todos os pushes | Sim |
| `test-web` | Todos os pushes | Sim |
| `validate-migrations` | Todos os pushes | Sim |
| `e2e-smoke` | Apenas PRs | Não bloqueia deploy direto |

---

## Testes de smoke E2E (@smoke)

Executados em cada PR para garantir que o golden path não quebrou.

| Teste | O que valida |
|---|---|
| Páginas públicas (`/`, `/auth`, `/pre-cadastro`) | HTTP 200 + título FisioFlow |
| Health da API (`GET /api/health`) | JSON com campo `status` |
| Login inválido | Formulário renderiza + mensagem de erro aparece |

Para adicionar um novo smoke test: criar spec em `e2e/` com tag `@smoke` no nome do test.

---

## Padrão de mock (unit tests de rotas)

```typescript
vi.mock("../../lib/db", () => ({
  createDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    // ...
  })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c, next) => {
    c.set("user", { id: "user-1", role: "fisioterapeuta", organizationId: "org-1" });
    return next();
  }),
}));
```

Assertivas preferidas para rotas com lógica de DB complexa:

```typescript
// ✅ Valida que auth passou (não 401/403)
expect(res.status).not.toBe(401);
expect(res.status).not.toBe(403);

// ✅ Valida resposta de auth negada
expect(res.status).toBe(401);
```

Não exigir status exato (200/201) em rotas que dependem de DB mock imperfeito — isso gera falsos negativos.

---

## Metas de cobertura

| Área | Meta | Status atual |
|---|---|---|
| APIs críticas (patients, sessions, appointments) | ≥ 70% | RBAC + happy path cobertos |
| Helpers de negócio (appointmentHelpers) | ≥ 90% | 20 testes cobrindo funções puras |
| Componentes UI (Shadcn base) | ≥ 70% | 10 componentes com testes |
| E2E smoke | ≥ 5 cenários | 5 cenários em `e2e/smoke.spec.ts` |

---

## Fluxos a cobrir com e2e (próximo ciclo)

- [ ] Cadastro de paciente (admin)
- [ ] Agendamento de sessão (fisioterapeuta)
- [ ] Criação de evolução SOAP
- [ ] Prescrição de exercício (HEP)
- [ ] Login + logout com Neon Auth

---

## O que não testar

- Lógica interna do Drizzle ORM / Radix UI (libs de terceiros)
- Comportamento exato de HTTP status codes quando o mock não replica o DB fielmente
- Integrações externas (WhatsApp, LiveKit) — usar mocks sempre
- Cloudflare bindings (KV, R2, D1) em unit — testar apenas via e2e ou staging
