# 🗄️ FisioFlow - Database Documentation

Este diretório contém a documentação e o histórico de evolução do banco de dados do FisioFlow.

## 🚀 Stack Tecnológica

- **Motor**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM v0.45.2
- **Pooling**: Cloudflare Hyperdrive
- **Schema Shared**: Localizado em `packages/db/src/schema/`

## 📐 Estrutura do Schema

O banco de dados é projetado seguindo um modelo **Multi-tenant**, onde a maioria das tabelas principais possui uma coluna `organization_id` para isolamento de dados.

### Principais Entidades:

- **`organizations`**: Clínicas ou profissionais autônomos.
- **`users`**: Usuários do sistema (Fisioterapeutas, Secretárias, Administradores).
- **`patients`**: Registro central de pacientes.
- **`evolutions`**: Registros de evolução clínica (SOAP / Blocos).
- **`activities`**: Catálogo de exercícios e atividades.
- **`financial_transactions`**: Controle de caixa e faturamento.

## 🔄 Fluxo de Migrações

As migrações são geradas a partir do schema TypeScript no pacote `@fisioflow/db`.

1. **Alteração**: Modifique o arquivo `packages/db/src/schema/index.ts`.
2. **Geração**: Execute `pnpm --filter @fisioflow/db db:generate`.
3. **Aplicação Local**: Execute `pnpm --filter @fisioflow/db db:push` (apenas para ambiente dev).
4. **Aplicação Produção**: O deploy no Neon é feito via `pnpm db:migrate` durante o CI/CD.

## 🔐 Segurança e Performance

- **RLS (Row Level Security)**: Aplicado via aplicação através de filtros automáticos no Drizzle ORM.
- **Indexação**: Índices GIN para busca textual em evoluções e B-Tree para chaves estrangeiras e datas.
- **Pooling**: Conexões via Hyperdrive garantem latência reduzida (<10ms) entre Cloudflare Workers e o Neon DB.

---

**Última Atualização:** Abril 2026
**Status:** ✅ Schema v4.5 (Estável)
