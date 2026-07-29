# Plano de implementação — FisioFlow Notas

Base: `docs/superpowers/specs/2026-07-29-fisioflow-notes-design.md`.

## Estratégia de entrega

Implementar por adição e feature flag. Não alterar contratos atuais de Wiki, Evoluções ou Tarefas no início. O MVP não inclui busca semântica clínica, portal de notas, link externo ou offline clínico persistente.

Flags por organização:

```text
notes_v1
notes_patient_links
notes_collaboration
notes_ai_indexing
```

## Fase 0 — auditoria de fontes e convenções

1. Confirmar em produção/staging os modelos ativos de `sessions`, `treatment_sessions`, `soap_records`, `wiki_pages` e tarefas.
2. Formalizar `sessions` como fonte clínica corrente sem remover legados.
3. Mapear o modelo de tarefa efetivamente usado pela UI e criar adapter único para `note_tasks`.
4. Validar a consulta de colaboração da evolução contra os nomes reais de coluna (`organization_id` vs. legados).

Saída: documento de inventário, contagens reconciliadas e testes de contrato das APIs existentes.

## Fase 1 — fundação do módulo Notes

### Banco e RLS

Criar migration aditiva e schema em `packages/db/src/schema/notes.ts`:

```text
notes
note_revisions
note_permissions
note_mentions
note_relations
note_comments
note_attachments
note_tasks
note_audit_logs
```

Requisitos:

- `organization_id` e RLS em todas as tabelas.
- enums de `note_type`, `note_status`, `note_classification`, `note_sensitivity` e capability.
- índices por organização, paciente, atualização, alvo de relação e principal de ACL.
- soft delete e versão imutável.
- `acl_version` e `metadata_version` para invalidação e ETag.

### Backend

Criar:

```text
apps/api/src/routes/notes.ts
apps/api/src/services/notes/NoteRepository.ts
apps/api/src/services/notes/PermissionResolver.ts
apps/api/src/services/notes/NoteAuditService.ts
apps/api/src/services/notes/NoteRelationService.ts
```

Endpoints da primeira entrega:

```http
GET/POST /api/notes
GET/PATCH/DELETE /api/notes/:id
GET/PUT/DELETE /api/notes/:id/permissions
GET /api/notes/:id/revisions
POST /api/notes/:id/revisions
```

Critérios:

- autorização em cada handler, nunca somente na UI;
- resposta neutra para recurso não autorizado;
- auditoria para leitura clínica, alteração, ACL e exclusão;
- `PATCH` com `If-Match` para metadados concorrentes.

Testes:

- RLS cross-tenant;
- user da mesma organização sem ACL;
- acesso por equipe, membro e expiração;
- revogação e versão histórica;
- soft delete.

## Fase 2 — editor e notas não colaborativas

### Frontend

Criar rotas e superfícies:

```text
/notas
/notas/:noteId
/notas/compartilhadas
/notas/paciente/:patientId
```

Componentes previstos:

```text
NotesHomePage
NoteEditorPage
NoteEditor
NotePropertiesPanel
NoteContextRail
NoteShareDialog
NoteVersionDrawer
NoteTemplatePicker
```

Reutilizar o schema/editor de evolução onde compatível; encapsular extensões específicas de Notes em pacote próprio. O conteúdo novo será TipTap JSON, com HTML/texto derivados no backend.

Escopo:

- texto, títulos, listas, checklist, callout, imagem/arquivo, links;
- autosave e estado visível;
- templates essenciais: reunião, nota de equipe, pré-atendimento, pós-atendimento e protocolo;
- classificação e badges de privacidade;
- compartilhamento por membro/equipe;
- anexos privados em R2 com URLs curtas.

Fora de escopo: cursor em tempo real, IA, portal e offline clínico.

Testes:

- editor serializa/restaura conteúdo sem perda;
- UI bloqueia capacidades ausentes;
- upload não vaza chave de R2;
- e2e criar, editar, compartilhar e revogar.

## Fase 3 — relações, menções e integrações

### Menções

Adicionar extensão de menção e endpoints de pesquisa server-side:

```http
GET /api/notes/mentionables?query=&types=
POST /api/notes/:id/relations
GET /api/notes/:id/backlinks
```

Tipos MVP: paciente, profissional, tarefa, agendamento, sessão, nota e documento.

Requisitos:

- nó semântico com `entityType/entityId`;
- autorização antes do autocomplete;
- relações persistidas por transação após salvar conteúdo;
- remoção/reconciliação de relações ao editar;
- notificação neutra somente para profissionais/equipes.

### Integrações de páginas

- Paciente: aba Notas e backlinks autorizados.
- Agenda: criar/abrir nota associada ao agendamento.
- Tarefa: origem, backlink e criação explícita a partir de bloco.
- Evolução: criar nota preparatória e converter blocos selecionados em rascunho, com proveniência.

Testes:

- paciente não aparece em autocomplete sem permissão;
- uma checkbox não cria tarefa global sem ação explícita;
- atualização de tarefa reflete no chip da nota;
- conversão de nota não modifica evolução finalizada.

## Fase 4 — colaboração com Workers pagos

### Cloudflare

Adicionar binding e migration de Durable Object `NoteCollaboration` em `apps/api/wrangler.toml`.

Criar:

```text
apps/api/src/agents/NoteCollaboration.ts
apps/api/src/routes/note-collaboration.ts
```

Fluxo:

1. Usuário autorizado solicita ticket de uso único (60–120 segundos).
2. Worker valida identidade, organização, ACL, paciente e capability.
3. WebSocket entra no DO determinístico `note:{id}`.
4. DO usa WebSocket hibernável, Yjs e awareness efêmero.
5. Snapshot possui debounce e persiste no Neon; revisão é criada em ações relevantes.
6. Mudança de ACL incrementa `acl_version` e desconecta sockets revogados.

Usar R2 para anexos, Queue para auditoria/indexação e Analytics Engine somente para telemetria sanitizada. `OrganizationState` recebe eventos leves, nunca conteúdo da nota.

Testes:

- dois editores fazem merge CRDT;
- reconexão offline preserva mudanças;
- usuário revogado é desconectado;
- presença/cursor não fica persistido como conteúdo;
- checkpoint e revisão podem ser recuperados.

## Fase 5 — busca, IA e offline controlado

Pré-requisito: RIPD aprovado por DPO/jurídico e política organizacional configurada.

1. Implementar busca textual com ACL antes da consulta.
2. Separar índices: conhecimento, operacional e clínico.
3. Permitir IA somente por política/escopo explícito; origem e fontes sempre auditáveis.
4. Adicionar rascunho offline criptografado apenas para dispositivo confiável e com expiração.
5. Publicação para portal vira projeção separada, revisada e revogável.

Testes de segurança obrigatórios:

- busca e vetor não revelam existência de nota sem acesso;
- IA não recebe contexto fora do escopo;
- exportação só é entregue após auditoria durável;
- portal não mostra conteúdo interno;
- logout/revogação invalida cache clínico.

## Rollout

1. Ambiente local e staging com dados sintéticos.
2. Canary interno via `notes_v1`.
3. Uma organização piloto sem IA/offline/links externos.
4. Monitorar erros, latência, falhas de auditoria, revogações e conflitos.
5. Liberar por organização; manter rollback desligando flag.

Nenhuma tabela/rota legada é removida nesta iniciativa. Migração de Wiki/Evoluções só ocorre após reconciliação, shadow-read e período de observação.

## Verificação final do MVP

- criação, edição, arquivamento, versões, ACL e auditoria de notas;
- associação segura com paciente, agenda e tarefa;
- @menções autorizadas e backlinks;
- anexos privados;
- UI desktop/mobile conforme mockups Stitch;
- testes unitários, integração e e2e dos caminhos críticos;
- documentação operacional para suporte e DPO.
