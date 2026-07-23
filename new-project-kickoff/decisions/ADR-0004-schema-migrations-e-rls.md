# ADR-0004 — Schema, migrations e RLS

**Status:** Proposta forte

## Decisão

- Postgres é o sistema de registro.
- Drizzle descreve o schema que a aplicação possui; SQL explícito cobre recursos Postgres não representados adequadamente.
- Existe **um** diretório e **um** ledger de migrations.
- Migrations aplicadas são imutáveis; correção sempre em nova migration.
- A role dona do schema e as roles de capacidade são `NOLOGIN`. As roles de login reais de staff, paciente e jobs são `NOBYPASSRLS`, não são owner e recebem somente as capacidades necessárias. A role migrator é controlada; leitura administrativa ocorre apenas por views/casos aprovados, não por acesso cru a PHI.
- Criação, rotação e revogação de roles de login não acontecem nas migrations comuns executadas pela aplicação. O grafo exato de herança/`SET ROLE` no Neon permanece decisão de infraestrutura a validar no DG-01/DG-02.
- Tabelas com dados de organização usam `ENABLE` + `FORCE ROW LEVEL SECURITY`, policies por operação, grants mínimos e testes Org A/B. O CI verifica owner, `rolbypassrls`, flags RLS, policies e grants de toda tabela tenant-scoped.
- Contexto de org/paciente vem da autenticação, exige membership/link ativo e é aplicado com `SET LOCAL` dentro da mesma transação e conexão da query, nunca do payload.
- O retorno de conexão ao pool é testado após commit, rollback e exceção para provar que contexto anterior não vaza.

## Padrões

- UUID v4/v7 ou equivalente decidido uma vez.
- `timestamptz` em UTC; datas clínicas puras como `date`.
- dinheiro em `numeric`, API como string decimal + moeda.
- soft delete somente onde requisito de retenção justificar; não como default universal.
- JSONB somente para extensão deliberada, com schema/versionamento.
- sem enum duplicado PT/EN; valor técnico estável e label localizada.
- escopo de dados (RLS) e permissão funcional (RBAC) são matrizes diferentes e ambas precisam autorizar a operação.

## Proibição

O CSV de 5.838 objetos do dossiê não é fonte suficiente para gerar DDL: faltam definições completas de constraints, defaults, policies, funções e triggers.

O contexto de sessão é uma entrada confiável somente quando criado pelo bootstrap interno de autenticação. RLS não transforma SQL arbitrário ou vulnerável a injection em execução segura.
