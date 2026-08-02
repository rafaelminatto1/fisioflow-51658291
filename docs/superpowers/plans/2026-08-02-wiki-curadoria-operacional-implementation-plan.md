# Plano de implementação — Wiki Curadoria Operacional

## Escopo

Implementar o primeiro incremento aprovado no spec
`2026-08-02-wiki-curadoria-operacional-design.md`: governança por capabilities,
estado editorial versionado, backfill seguro, fila operacional e integração com a
consulta existente. Não inclui taxonomia avançada, IA editorial ou novos escopos
de coleção.

## Contrato frontend/backend

- `GET /api/wiki-curation/capabilities` → `{ data: { capabilities: string[] } }`.
- `GET /api/wiki-curation/queue` recebe `status`, `assignee`, `priority`, `validity`,
  `kind`, `technicalStatus`, `q`, `cursor`, `limit`.
- A fila retorna `{ data, meta: { nextCursor, counts, requestId } }`; cada item traz
  `id`, `versionId`, `rowVersion`, `title`, `kind`, `editorialStatus`,
  `technicalStatus`, `assignee`, `priority`, `dueAt`, `validUntil`, `provenance` e
  `allowedActions`.
- `GET /api/wiki-curation/items/:id` retorna detalhe, fontes, revisão e ações.
- `POST /api/wiki-curation/items/:id/transitions` recebe `action`, `versionId`,
  `expectedVersion`, `reason?`, `validUntil?` e exige `Idempotency-Key`.
- `POST /api/wiki-curation/items/:id/assignments` recebe versão, responsável,
  prioridade, prazo e `expectedVersion`.

## Marco 1 — Persistência e segurança

1. Criar migration `0158_wiki_operational_curation.sql` aditiva e reversão segura.
2. Criar representação Drizzle em `packages/db/src/schema/knowledge-curation.ts`.
3. Implementar `knowledgeCapabilities.ts` e testes.
4. Implementar `knowledgeTransitions.ts` com matriz completa e testes.
5. Criar backfill idempotente em lotes; legado entra em `draft`/`triage`.

## Marco 2 — API

1. Criar router `wikiCuration.ts` antes das rotas genéricas de Wiki.
2. Implementar capabilities, fila paginada, detalhe, transições e atribuições.
3. Retornar `allowedActions` calculadas no servidor.
4. Proteger mutações legadas de Wiki, Knowledge e Evidence Workspace.
5. Converter status/curadoria legada em adaptador; bloquear escrita direta.

## Marco 3 — Interface

1. Criar tipos, service e hook próprios de curadoria.
2. Exibir Gestão da Biblioteca somente com capability editorial.
3. Criar fila desktop/mobile, filtros persistidos na URL e estados completos.
4. Criar detalhe lateral com proveniência, validade, responsável e estados técnicos.
5. Implementar transições com versão otimista e erros 409 explícitos.
6. Manter triagem antiga apenas como referência visual, nunca como estado.

## Marco 4 — Verificação e rollout

1. Testar capabilities, matriz de transições, cursor, RLS, autoaprovação e backfill.
2. Executar Prettier, Oxlint direcionado, TypeScript, testes e build.
3. Aplicar migration de produção antes do deploy da API.
4. Publicar em commit isolado, acompanhar CI e validar produção autenticada.
5. Validar desktop/mobile, teclado, sem overflow, console e fluxos principais.

## Guardrails

- Não tocar nas alterações não relacionadas do worktree.
- Não conceder `clinical_review` automaticamente.
- Não tratar `is_published`/`verified` legado como aprovação sem auditoria.
- Não permitir edição pós-aprovação da mesma versão.
- Não registrar texto clínico livre em logs, métricas ou eventos.
- Acesso cruzado retorna 404; capability ausente retorna 403.
