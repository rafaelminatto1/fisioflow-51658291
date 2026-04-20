# 🔌 FisioFlow - API Documentation

Documentação técnica do backend serverless (Edge API) do ecossistema FisioFlow.

## 🚀 Stack Tecnológica
- **Framework**: [Hono.js](https://hono.dev/)
- **Runtime**: Cloudflare Workers v4
- **Linguagem**: TypeScript 6.0.2
- **Tipagem Compartilhada**: `@fisioflow/shared-api`

## 🏗️ Arquitetura da API

A API reside em `apps/api` e é projetada para ser stateless, escalando globalmente na borda da Cloudflare.

### Camadas:
1. **Middlewares**: Autenticação, CORS, Logger e Error Handling.
2. **Routes**: Definições de endpoints organizados por domínio (ex: `/patients`, `/evolution`).
3. **Services**: Lógica de negócio e interação com o Banco de Dados (Drizzle).
4. **Validators**: Validação de schema de entrada via **Zod v4.3.6**.

## 🔐 Autenticação e Segurança

O sistema utiliza **Neon Auth** com verificação de tokens JWT via **JWKS**.

- **Fluxo**: 
  1. Client obtém JWT do Neon Auth.
  2. Request inclui JWT no header `Authorization: Bearer <token>`.
  3. Worker valida o token localmente usando a chave pública (JWKS) do emissor.
  4. Contexto do usuário (`userId`, `organizationId`) é injetado no objeto `c` (contexto do Hono).

## 📡 Padronização de Respostas

Seguimos o padrão JSON:API simplificado:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100 } // Opcional
}
```

Em caso de erro:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição detalhada",
    "details": [ ... ]
  }
}
```

## 🛠️ Comandos de Desenvolvimento
- `pnpm dev`: Inicia o ambiente local com Wrangler.
- `pnpm deploy`: Faz o deploy para o ambiente de produção.
- `pnpm test`: Executa os testes de integração com Vitest.

---
**Última Atualização:** Abril 2026
**Status:** ✅ Operacional
