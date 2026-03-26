# 🏗️ Relatório de Infraestrutura Cloudflare 2026

**Data:** 26 de Março de 2026  
**Status:** ✅ Otimizado e Limpo

Este documento detalha a grande faxina realizada na infraestrutura Cloudflare do FisioFlow, eliminando redundâncias e adotando uma arquitetura de ambientes (Environments) profissional.

---

## 1. O que foi Limpo?

Removemos projetos duplicados que estavam poluindo o dashboard e gerando custos/complexidade desnecessária.

### 🗑️ Projetos Excluídos
| Tipo | Nome | Motivo |
| :--- | :--- | :--- |
| **Worker** | `fisioflow-web-production` | Redundante (Usa o principal `fisioflow-web`) |
| **Worker** | `fisioflow-web-staging` | Substituído por `--env staging` no projeto principal |
| **Worker** | `fisioflow-api-staging` | Substituído por `--env staging` no `fisioflow-api` |
| **Worker** | `fisioflow-workers` | Nome obsoleto/antigo |
| **Worker** | `backend` | Versão inicial da API (Obsoleta) |
| **Worker** | `minatto-fisio-api` | Consolidado na API principal |
| **Worker** | `moocafisio-root-redirect` | Substituído por regras nativas de Redirecionamento |
| **Pages** | `cloudflare-neon-dashboard` | Template/Teste inativo |

### 📦 Recursos de Dados
- **D1 Database**: `professional-db` (removido por estar vazio e sem uso).
- **KV Namespace**: `FISIOFLOW_CONFIG_STAGING` (consolidado).

---

## 2. Nova Arquitetura de Ambientes (Best Choice)

Em vez de criar novos projetos para cada ambiente, agora usamos a funcionalidade nativa de **Environments** do Wrangler.

### Configuração no `wrangler-api.toml`:
```toml
# Produção (Padrão)
name = "fisioflow-api"

# Staging (Ambiente de Teste)
[env.staging]
name = "fisioflow-api-staging"
```

### Como fazer o deploy agora?
```bash
# Deploy em PRODUÇÃO
npx wrangler deploy --config cloudflare-worker/wrangler-api.toml

# Deploy em STAGING
npx wrangler deploy --config cloudflare-worker/wrangler-api.toml --env staging
```

---

## 3. Benefícios Imediatos
- **Dashboard Limpo**: Apenas os projetos principais estão visíveis.
- **Gestão de Segredos Centralizada**: Use `wrangler secret` com `--env` para gerenciar chaves separadamente.
- **Custos Reduzidos**: Menos recursos ativos desnecessários.
- **CI/CD Simplificado**: Scripts de deploy agora são mais previsíveis.

---

## 4. Próximos Passos (Recomendados)
1.  **Exclusão Manual**: Alguns recursos (Queues e KV específicos) requerem exclusão manual via painel por questões de permissão de Token.
2.  **Automação**: Integrar o `wrangler deploy --env staging` no seu workflow de desenvolvimento.

---
**Responsável:** Gemini CLI Agent  
**Ambiente:** Cloudflare V8 Runtime (2026) ✅
