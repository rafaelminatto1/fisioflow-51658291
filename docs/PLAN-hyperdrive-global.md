# PLAN-hyperdrive-global

## 🧠 Planejamento da Decisão: Hyperdrive Global

Este plano detalha as etapas para implementar a adoção global do Cloudflare Hyperdrive e remover hacks de instanciamento TCP do arquivo `db.ts` no backend do FisioFlow.

### Contexto Descoberto
Após inspecionar `apps/api/src/lib/db.ts`, foi constatado que a aplicação **já tenta** usar o Hyperdrive para o Drizzle (`isTcpConnection` retorna `true` se o `HYPERDRIVE` estiver configurado). 
No entanto, a implementação atual é um **hack anti-pattern**: ela instancia um `pgClient` (TCP), invoca o `connect()`, roda a query, e invoca o `end()` para **CADA consulta no banco de dados**, envelopando isso num adaptador do `neon-http`. Isso destrói a performance, multiplicando a criação de sockets e exaurindo os limites do Hyperdrive.

### Objetivos (Task Breakdown)

- [ ] **1. Instalar Adapter Padrão do Drizzle**: O driver atual `drizzle-orm/neon-http` deve ser substituído pelo driver TCP adequado (como `drizzle-orm/postgres-js` ou `drizzle-orm/node-postgres`). Como o Neon suporta `Pool` via `@neondatabase/serverless` que opera nativamente em Cloudflare via TCP, precisamos unificar o driver.
- [ ] **2. Refatorar `createDb` e Connection Pooling**: 
  - Remover a recriação do cliente `pg` por query.
  - O Cloudflare Workers prefere usar um objeto global ou um `Pool` persistente para enviar as requisições ao Hyperdrive sem fazer handshakes repetitivos por chamada de instrução (`db.select()`).
  - Remover a dependência do `neon-http` quando a URL for do Hyperdrive.
- [ ] **3. Refatorar `createPool`**: A mesma lógica vale para as consultas brutas via `createPool`. Não instanciar cliente novo a cada `.query()`.
- [ ] **4. Aplicar o Padrão de RLS**: Migrar a segurança via Drizzle (a camada que envelopava a string do RLS na conexão do PG) para ser executada apenas no escopo da transação do pool.
