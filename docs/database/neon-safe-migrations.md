# Fluxo Seguro de Migrations (Neon + Drizzle)

## 1. O Problema
No ambiente Serverless (Cloudflare Workers) utilizando o Neon Postgres via Neon Serverless Driver, alterações estruturais de banco de dados diretamente na branch de produção (`main`) carregam alto risco de instabilidade, downtime ou inconsistência com conexões cacheadas no *Hyperdrive* e no pool de borda.

## 2. A Solução: Branching & Testes de Integração Isolados
O Neon Platform permite o "Branching", criando clones instantâneos do banco de dados (Copy-on-Write) com os mesmos dados de produção em milissegundos.

O Fluxo Seguro de Deploy Database (SSDF) implementado neste projeto segue:

1. **Branching**: A ramificação é criada no Neon.
2. **Geração**: O `drizzle-kit generate` constrói o SQL.
3. **Aplicação Temporária**: A migration roda apenas no branch recém-criado.
4. **Validação**: Testes end-to-end ou de integração validam as aplicações conectadas contra este branch.
5. **Aplicação de Produção**: O deploy ocorre no Worker, em seguida a migration é rodada em produção — ou melhor ainda, aplicamos o Padrão *"Expand and Contract"*.

## 3. Checklist de "Expand and Contract" (Compatibilidade)

Regra de ouro: **Toda migration deve ser retrocompatível** para garantir Zero-Downtime Deployers com Workers e Hyperdrive.

- [ ] **NÃO dropar uma coluna/tabela sem fase de compatibilidade:** Nunca faça `DROP COLUMN`. Na fase 1, pare de usar a coluna e apenas esconda do schema. Na fase 2, drope de fato.
- [ ] **NÃO renomear colunas diretamente:** Dual-write. Adicione a coluna nova, grave em ambas (Trigger ou Aplicação), migre os dados retroativamente (Backfill), leia da nova, pare de gravar na velha, e finalmente remova a velha.
- [ ] **Índices Gigantes (Cuidado):** Para tabelas massivas como `sessions` e `ai_usage_events`, criar índices (via `CREATE INDEX CONCURRENTLY` manual, não usar drizzle block automático se tabela tiver gigabytes).
- [ ] **NOT NULL Constraints:** Adicione a coluna como `NULL` -> Faça backfill de *default values* -> Trave com `NOT NULL` numa segunda migration.

## 4. Scripts Implementados (`package.json`)

Para proteger o `DATABASE_URL` (nunca exposto diretamente), os scripts invocam ferramentas injetando o contexto seguro.

- `pnpm db:generate`: Inspeciona o código Drizzle e constrói o `000X_migration.sql` sem encostar no banco.
- `pnpm db:branch`: Cria uma branch temporária de homologação diretamente do main via Neon CLI.
- `pnpm db:migrate`: Aplica as migrations contidas na pasta `/packages/db/migrations` ao banco de dados setado no env atual.
- `pnpm db:backup`: Puxa uma tag/PITR (Point in Time Restore) para recuperação de desastre.

## 5. Passos Práticos para uma Nova Feature

```bash
# 1. Altere o schema.ts em packages/db/src/schema/
# 2. Gere o SQL de alteração localmente
pnpm db:generate

# 3. Crie uma branch de testes com os dados ATUAIS de prod
pnpm db:branch feature-nova-tabela

# 4. Pegue o DATABASE_URL temporário que foi gerado e aplique no seu .env.local
# 5. Rode a migration na branch para testar
pnpm db:migrate

# 6. Teste e aprove manualmente na sua máquina
```

## 6. Hyperdrive e Pooling

**Atenção:** O Cloudflare Hyperdrive faz pooling persistente com o banco de dados.
Se uma tabela for "dropada" ou alterada agressivamente, conexões antigas no pool do Hyperdrive podem disparar erros em transações que pressupunham um cache antigo da estrutura interna do PG. A compatibilidade de 2-fases (Expand & Contract) evita 100% desse problema.
