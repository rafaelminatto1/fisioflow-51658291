# PLAN-cache-strategy

## 1. Visão Geral (Context Check)
O objetivo deste plano é implementar uma estratégia de cache de alta performance no FisioFlow, mantendo a diretriz arquitetural de **100% Cloudflare**. O usuário expressou a necessidade de melhorar a velocidade de carregamento, com **prioridade máxima absoluta para Evoluções (`/evolution` / `/notes`) e Agendamentos (`/appointments` / `/scheduling`)**.

**Decisões Arquiteturais Definidas (via /grill-me):**
- **Tecnologia:** Cloudflare Cache API (Cache HTTP nativo) e Hyperdrive (já configurado para o Neon DB). **Não** adicionaremos Redis (Upstash) para manter a stack consolidada.
- **Invalidação:** TTL curto para rotas read-heavy gerais, porém com purge ativo (por URL) para Evoluções e Agendamentos, garantindo que o usuário veja seus dados imediatamente após mutações.

## 2. Fase de Planejamento e Estratégia (Socratic Gate)

Como Agendamentos e Evoluções são entidades altamente mutáveis (o profissional edita e precisa ver a mudança na hora), a estratégia de cache não pode depender apenas de um TTL estático. 

### Estratégia Proposta para Agendamentos e Evoluções:
1. **Cache Control Headers & Edge Cache:**
   - As respostas de GET para `/appointments` e `/notes`/`/evolution` receberão cabeçalhos `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
   - Isso instrui a CDN da Cloudflare a guardar a resposta e servir em edge.
2. **Purge on Mutation (Invalidação Ativa):**
   - Ao fazer um POST, PUT ou DELETE nestas rotas, o Worker disparará ativamente um `caches.default.delete(url)` para as rotas que foram modificadas (ex: listas do dia, paciente específico).
   - *Nota:* O Cloudflare Cache API suporta `delete()` na mesma zona.
3. **Hyperdrive Optimization:**
   - Garantir que as rotas de leitura estejam envelopadas com as configurações corretas do Hyperdrive para aproveitar o pool de conexões com o Neon PostgreSQL.

### Estratégia para Outras Rotas (Exercícios, Configurações):
- **Short TTL estático:** `Cache-Control: public, max-age=300` para rotas como `/exercises` ou `/protocols`.

## 3. Task Breakdown (Tarefas de Implementação)

- [ ] **Task 1: Utilitário de Cache HTTP**
  - Criar um middleware/utilitário em `apps/api/src/lib/cache.ts` para facilitar a definição de headers de cache (`s-maxage`, `stale-while-revalidate`) no Hono.
  - Implementar uma função segura de `purgeCache(urls)` usando `caches.default.delete()`.

- [ ] **Task 2: Cache em Agendamentos (`appointments.ts` / `scheduling.ts`)**
  - Adicionar o middleware de cache nas rotas `GET /appointments` (ex: listagem diária, semanal).
  - Integrar a chamada de `purgeCache()` nos endpoints de criação (`POST`), edição (`PUT`) e deleção/cancelamento (`DELETE`).

- [ ] **Task 3: Cache em Evoluções Clínicas (`evolution.ts` / `notes.ts`)**
  - Adicionar o middleware de cache nos endpoints de leitura de evoluções de um paciente.
  - Integrar `purgeCache()` nos métodos de salvar/assinar evolução.

- [ ] **Task 4: Cache em Rotas Estáticas / Read-Heavy (`exercises.ts`, etc.)**
  - Configurar TTL de 5 minutos (300s) para o catálogo de exercícios, protocolos e métricas pesadas do dashboard (`/financial-analytics`).

- [ ] **Task 5: Revisão Mobile (Client-side)**
  - Garantir que o React Query no App Mobile (paciente/profissional) esteja configurado com refetch adequado (mutations invalidando as queries corretas), trabalhando em harmonia com o SWR do backend.

## 4. Verification Checklist
- [ ] Testar localmente simulando requisições (verificar hit/miss headers).
- [ ] Confirmar no Cloudflare Dashboard que o Cache nativo está sendo servido.
- [ ] Testar cenário de mutação: Criar agendamento -> Listar agenda (deve vir o novo agendamento, sem lag do cache).
- [ ] Validar tempo de carregamento de evoluções em staging.

## Próximos Passos
Por favor, revise o plano acima. Se estiver de acordo, execute o comando `/create` para começarmos a implementação dessas tarefas!
