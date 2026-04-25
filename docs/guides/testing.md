# 🧪 Guia de Testes - FisioFlow (v4.0)

## 📦 Configuração de Ambiente

O projeto utiliza **Vitest** como motor principal de testes, integrado ao **Vite 8** e otimizado para **Node.js v20.12.0+**.

### Tecnologias

- `vitest` - Framework de testes unitários e integração.
- `@testing-library/react` - Testes de componentes (React 19).
- `playwright` - Testes End-to-End (E2E).
- `msw` - Mock Service Worker para simular APIs.

## 🚀 Comandos Disponíveis

```bash
# Rodar todos os testes do monorepo
pnpm test

# Rodar testes específicos da API (Hono/Drizzle)
cd apps/api && pnpm test

# Rodar testes unitários do Frontend
pnpm --filter fisioflow-web test:unit
```

## 📁 Estrutura de Testes

### Backend (API)

Localizados em `apps/api/src/__tests__/`:

- `schema.test.ts` - Validação de integridade do banco (Drizzle).
- `auth.test.ts` - Validação de JWT e permissões.

### Frontend (Web)

Localizados em `apps/web/src/**/*.test.{ts,tsx}`:

- Testes de componentes UI e Hooks customizados.

## ✅ Exemplos de Teste (Drizzle/Neon)

### Validando Tabelas Core

```typescript
import { describe, it, expect } from "vitest";
import { patients } from "@fisioflow/db";

describe("Schema Integrity", () => {
  it("should ensure patients table has organizationId", () => {
    expect(patients.organizationId).toBeDefined();
  });
});
```

---

## 📊 Estratégia de Cobertura

1. **Unitário (Logic):** 100% de cobertura em schemas Zod e cálculos financeiros.
2. **Integração (API):** Cobertura das rotas principais de `patientPortal`.
3. **E2E (User Flow):** Jornada crítica: _Agendamento -> Triagem -> Evolução SOAP_.

## 🐛 Troubleshooting (Node 20+)

### Erro: `styleText` is not defined

**Causa:** Node.js v18 ou inferior detectado.  
**Solução:** Certifique-se de estar usando o Node v20.12.0+. Utilize `nvm use 20`.

### Problemas com Mocks de Banco

O FisioFlow utiliza o client do Drizzle. Para testes, prefira usar o database local ou `pg-mem` para maior fidelidade aos tipos do PostgreSQL.

---

**Última atualização**: Abril 2026  
**Status**: ✅ Alinhado com Node v20/Vite 8
