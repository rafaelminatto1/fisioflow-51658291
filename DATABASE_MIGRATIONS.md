# Database Migrations Guide

## Overview

Este projeto usa **Drizzle ORM + Neon PostgreSQL** com automação completa de migrations e otimizações de performance para evitar travamentos no `drizzle-kit`.

## Ambiente Local

### Conexões

O projeto usa **duas conexões separadas** para diferentes propósitos:

- **DATABASE_URL** (pooled) - para aplicações normais
  - Usa PgBouncer com `-pooler` no hostname
  - Para: Cloudflare Workers, Workers API, aplicações em produção
  - Exemplo: `postgresql://user:pass@ep-project-region-pooler.aws.neon.tech/neondb?sslmode=require`

- **DATABASE_DIRECT_URL** (direta) - para ferramentas de migration
  - NÃO usa `-pooler` (conexão direta ao Postgres)
  - Para: Drizzle Kit, `drizzle-kit push/migrate/introspect`
  - Exemplo: `postgresql://user:pass@ep-project-region.aws.neon.tech/neondb?sslmode=require`

**Por quê duas conexões?**
- Drizzle Kit tem problemas conhecidos com conexões pooled (travamentos, timeouts)
- Conexões diretas são mais rápidas para operações de schema (migrations, introspect)
- Conexões pooled são melhores para aplicações (melhor uso de conexões, suporta mais clientes)

### Scripts Disponíveis

```bash
# Scripts otimizados para desenvolvimento
pnpm db:introspect      # Pux schema do banco (para ver o estado atual)
pnpm db:backup         # Faz backup do schema antes de migrations
pnpm db:safe-push       # Backup + Push (para dev local)
pnpm db:safe-migrate    # Backup + Migrate (para CI/CD)
pnpm db:push            # Push direto (sem backup - uso com cautela)
pnpm db:generate        # Gera migration files (SQL)
pnpm db:migrate         # Aplica migrations (usa DATABASE_DIRECT_URL)
pnpm db:studio          # Abre Drizzle Studio (interface visual)
```

## GitHub Actions

### Workflow: CI (Pull Requests)

Rodou em todo PR para `main`:

1. **Cria preview branch no Neon**
   - Nome: `preview/pr-{PR_NUMBER}`
   - Baseado na branch `production`
   - Automaticamente pelo GitHub Action

2. **Aplica migrations no preview branch**
   - Usa `db:safe-migrate` (faz backup primeiro)
   - Usa `DATABASE_DIRECT_URL` (conexão direta - mais rápido)
   - Testa migrations em ambiente isolado

3. **Gera schema diff (comentário no PR)**
   - Compara branch `production` com `preview/pr-{PR_NUMBER}`
   - Mostra adição/remoção de tabelas, colunas, índices, FKs
   - Aparece automaticamente como comentário no PR

### Workflow: Deploy (Produção)

Rodou em todo push para `main`:

1. **Faz backup automático**
   - Script `db:backup` roda antes das migrations
   - Salva em `./drizzle/backup/schema-backup-{timestamp}.sql`
   - Inclui tabelas, colunas, índices, foreign keys

2. **Aplica migrations em produção**
   - Usa `db:safe-migrate` (backup + migrate)
   - Usa `DATABASE_DIRECT_URL` (conexão direta)
   - Mais rápido e confiável

3. **Deploya Workers + Pages**
   - Cloudflare Workers API
   - Cloudflare Pages (frontend)

### Workflow: Schema Diff (Standalone)

Rodou automaticamente em todo PR para `main`:

- Gera schema diff entre `production` e `preview/pr-{PR_NUMBER}`
- Atualiza automaticamente quando PR é atualizado
- Aparece como comentário no PR

## Otimizações de Performance

### drizzle.config.ts

Configurações otimizadas para Neon:

```typescript
export default defineConfig({
  schema: './src/server/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL!, // ✅ Sempre usar direta para migrations
    connectTimeout: 10000,              // 10 segundos timeout de conexão
    idleTimeout: 20000,                 // 20 segundos timeout inativo
  },
  tablesFilter: ['*'],                   // Filtra todos os schemas
  verbose: false,                         // Desliga logs para mais performance
  strict: true,                            // Verificação estrita de tipos
});
```

**Por quê essas otimizações:**
- `DATABASE_DIRECT_URL` - Evita travamentos do PgBouncer
- `connectTimeout: 10000` - Evita esperas eternas
- `idleTimeout: 20000` - Fecha conexões inativas (economiza recursos)
- `tablesFilter: ['*']` - Processa apenas schemas necessários
- `verbose: false` - Menos logs, mais performance

### Backup Automático

Script `scripts/backup-before-migration.mjs`:

**O que faz:**
- Conecta ao banco usando `DATABASE_DIRECT_URL`
- Extrai todas as tabelas do schema `public`
- Extrai todas as colunas (nome, tipo, nullable, default)
- Extrai todos os índices
- Extrai todas as foreign keys
- Gera arquivo SQL com schema completo

**Onde salva:**
- `./drizzle/backup/schema-backup-{timestamp}.sql`
- Timestamp no formato: `YYYY-MM-DDTHH-MM-SS`

**O que contém:**
- Comentários com timestamp e lista de tabelas
- Definições de tabelas e colunas (tipo, tamanho, nullable, default)
- Índices (CREATE INDEX)
- Foreign Keys (ALTER TABLE ... ADD CONSTRAINT)

## Boas Práticas

### 1. **SEMPRE** usar `db:safe-migrate` em produção
- Faz backup antes de aplicar migrations
- Evita perda de dados irreversível
- Pode rollback facilmente se necessário

### 2. **SEMPRE** testar migrations em preview branch primeiro
- Preview branch é ambiente isolado
- Dados de produção são copiados
- Teste migrations antes de aplicar em produção

### 3. **SEMPRE** revisar schema diff antes de merge
- Schema diff mostra todas as mudanças
- Aparece automaticamente no PR
- Revisar se mudanças estão corretas

### 4. **NUNCA** fazer mudanças diretas em produção sem migration
- Sempre usar `db:generate` para criar migration files
- Sempre usar `db:migrate` para aplicar
- Nunca alterar schema diretamente no Neon Console em produção

### 5. **SEMPRE** testar localmente antes de push
```bash
# Fluxo de desenvolvimento recomendado:
pnpm db:introspect      # Ver estado atual do banco
pnpm db:generate        # Criar migration file
pnpm db:safe-migrate    # Aplicar (com backup)
pnpm db:studio          # Verificar visualmente
```

## Troubleshooting

### drizzle-kit está travando?

**Sintoma:** `drizzle-kit push` ou `db:migrate` fica travado em "Pulling schema from database..."

**Causas possíveis:**
1. ❌ Usando `DATABASE_URL` (pooled) em vez de `DATABASE_DIRECT_URL`
2. ❌ Timeout muito baixo na conexão
3. ❌ Firewall bloqueando conexão

**Soluções:**
1. ✅ Verificar se está usando `DATABASE_DIRECT_URL` no `drizzle.config.ts`
2. ✅ Aumentar `connectTimeout` no `drizzle.config.ts` (ex: 30000)
3. ✅ Verificar se VPN/firewall está bloqueando
4. ✅ Usar `pnpm db:introspect` para testar conexão

**Comando para debug:**
```bash
# Verificar conexão
DATABASE_DIRECT_URL="postgresql://..." pnpm db:introspect

# Ver timeout
drizzle-kit push --verbose
```

### Migrations falhando?

**Sintoma:** Erro ao rodar `pnpm db:migrate`

**Soluções:**
1. ✅ Verificar logs de backup em `./drizzle/backup/`
   - Backup foi criado com sucesso?
   - Tamanho do arquivo parece razoável?

2. ✅ Reverter usando schema diff
   - Ver comentário no PR
   - Identificar mudanças que causaram problema

3. ✅ Testar migration manualmente
   ```bash
   # Copiar SQL do migration file
   # Aplicar manualmente no Neon Console
   psql postgresql://... -f drizzle/0000_migration.sql
   ```

4. ✅ Criar issue com logs completos
   - Incluir: versão do Drizzle, versão do Node, logs de erro
   - Anexar: migration file, backup, schema diff

### Schema diff não aparece no PR?

**Sintoma:** Comentário com schema diff não aparece no PR

**Causas possíveis:**
1. ❌ `NEON_API_KEY` não configurado nos secrets
2. ❌ `NEON_PROJECT_ID` não configurado nos variables
3. ❌ Workflow falhou (verificar tab Actions)

**Soluções:**
1. ✅ Verificar secrets do GitHub
   - Settings → Secrets and variables → Actions
   - `NEON_API_KEY` deve existir
   - `NEON_PROJECT_ID` deve existir nas variables

2. ✅ Verificar workflow
   - Actions → Schema Diff → Ver logs
   - Verificar se workflow rodou com sucesso

### Conexão falhando?

**Sintoma:** Erro de conexão ao rodar scripts

**Soluções:**
1. ✅ Verificar se `.env` está correto
   ```bash
   # Testar conexão
   psql postgresql://user:pass@... -c "SELECT 1"
   ```

2. ✅ Verificar SSL
   - Connection string deve ter `sslmode=require`
   - Neon exige conexão SSL

3. ✅ Verificar hostname
   - Pooled: `...-pooler.region.aws.neon.tech`
   - Direta: `...region.aws.neon.tech` (sem `-pooler`)

## Links

- [Drizzle ORM](https://orm.drizzle.team/) - Documentação oficial
- [Drizzle Kit](https://orm.drizzle.team/kit-docs-overview) - CLI para migrations
- [Neon Console](https://console.neon.tech/) - Dashboard do Neon
- [Neon Project](https://console.neon.tech/app/projects/purple-union-72678311) - Projeto FisioFlow
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) - Como funciona o PgBouncer
- [Neon Schema Diff](https://neon.com/blog/track-schema-changes-automatically-in-your-pull-requests) - Schema diff automático

## Checklist de Deploy

Antes de fazer deploy para produção:

- [ ] Testou migrations em preview branch?
- [ ] Revisou schema diff no PR?
- [ ] Backup foi criado automaticamente?
- [ ] Migrations foram aplicadas com sucesso?
- [ ] Verificou dados após migrations?
- [ ] Deployou Workers + Pages?
- [ ] Testou aplicação em produção?

## Support

Se encontrar problemas ou dúvidas:

1. Verificar logs no GitHub Actions
2. Verificar logs de backup em `./drizzle/backup/`
3. Consultar documentação do Drizzle e Neon
4. Criar issue com detalhes completos

---

**Última atualização:** 2026-03-18
**Versão do Drizzle:** 0.45.1
**Versão do Neon:** PostgreSQL 17 (AWS sa-east-1)

// Teste de automação de migrations
// Criado em: 2026-03-18
// Objetivo: Testar workflows de CI e deploy

