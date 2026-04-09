# 🔒 Segurança - FisioFlow (Arquitetura v4.0)

## Visão Geral

O FisioFlow segue um modelo de segurança "Edge-First", onde a autenticação e o isolamento de dados são processados na borda (Cloudflare Workers) e reforçados no banco de dados relacional (Neon PostgreSQL).

## 🛡️ Medidas de Segurança Implementadas

### 1. Isolamento de Multi-tenancy (Drizzle/Neon)

Diferente do modelo RLS (Row Level Security) tradicional, o FisioFlow utiliza **Isolamento via Contexto de Aplicação**:
- ✅ **organizationId Obrigatório:** Todas as queries SQL injetam automaticamente o `organizationId` do usuário autenticado.
- ✅ **Middleware de Tenant:** O Hono.js valida se o usuário tem permissão para acessar aquela organização antes de chegar ao banco.
- ✅ **Validadores Zod:** Garantem que nenhum dado de uma organização seja enviado para outra através de payloads.

### 2. Autenticação (Neon Auth / Better Auth)

- ✅ **Validação JWKS:** Os tokens JWT são validados localmente nos Cloudflare Workers usando chaves públicas, reduzindo latência.
- ✅ **Refresh Tokens:** Implementado rotação automática de tokens.
- ✅ **MFA Nativo:** Suporte para autenticação de dois fatores via Neon Auth.
- ✅ **Proteção WAF:** Proteção contra ataques de força bruta e DDoS via Cloudflare WAF.

### 3. Criptografia e Infraestrutura

- ✅ **TLS 1.3:** Comunicação exclusiva via protocolo TLS mais recente.
- ✅ **Serverless Encryption:** Dados criptografados em repouso pelo Neon (PostgreSQL).
- ✅ **Secret Management:** Todas as chaves (API Keys, Database URLs) são gerenciadas via **Cloudflare Environment Secrets** (criptografadas no dashboard).

---

## 🔐 Variáveis de Ambiente (2026)

### Obrigatórias (Cloudflare Secrets)

```bash
# Database & Pooling
DATABASE_URL=postgres://...          # Direct Neon URL
HYPERDRIVE_ID=...                      # ID do Hyperdrive no Wrangler

# Auth & Security
AUTH_SECRET=...                        # Chave secreta do Better Auth
BETTER_AUTH_URL=...                    # URL base do serviço de Auth

# Cloudflare Assets
CLOUDFLARE_R2_BUCKET=...
```

---

## ⚠️ Boas Práticas para Desenvolvedores

### 1. Consultas ao Banco (Drizzle ORM)

Sempre inclua o `organizationId` em suas queries para garantir o isolamento.

```typescript
// ✅ CORRETO - Filtro explícito garantido pelo middleware
const results = await db.select()
  .from(patients)
  .where(
    and(
      eq(patients.organizationId, ctx.get('organizationId')),
      eq(patients.id, targetId)
    )
  );
```

### 2. Sanitização e XSS

- ✅ **React 19:** Utiliza proteção nativa contra XSS no render.
- ✅ **Sanitização de Rich Text:** O editor de prontuário utiliza sanitização rigorosa antes de persistir o HTML no banco.

---

## 🔍 Checklist de Auditoria

- [ ] Variáveis sensíveis configuradas como `secret`, não `plaintext` no Wrangler.
- [ ] Middleware `auth` ativo em todas as rotas de `apps/api`.
- [ ] Todas as tabelas no Drizzle possuem a coluna `organizationId`.
- [ ] Headers de segurança (CSP, HSTS) injetados pelo Cloudflare Pages.
- [ ] `npm audit` sem vulnerabilidades críticas.

---

**Última atualização**: Abril 2026  
**Status**: ✅ Compliant (Neon-Native Strategy)
