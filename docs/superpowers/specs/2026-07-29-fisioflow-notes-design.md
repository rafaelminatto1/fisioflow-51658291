# FisioFlow Notas — Design aprovado

## Objetivo

Criar um workspace de notas conectado para FisioFlow que combine editor por blocos, colaboração, relações entre entidades, compartilhamento granular e busca, sem substituir a evolução clínica oficial.

O produto atende cinco cenários: notas pessoais, notas de equipe, notas vinculadas ao paciente, notas de atendimento e conhecimento/protocolos.

## Decisão de produto

`Nota colaborativa` e `evolução clínica` são entidades distintas.

- **Notas** são rascunhos, contexto, preparação de atendimento, reunião, protocolo e trabalho operacional.
- **Evoluções** permanecem no módulo Clinical e são o documento clínico oficial, com seu fluxo de rascunho, revisão, finalização, assinatura, PDF e auditoria.
- Uma nota pode gerar um rascunho de evolução somente por ação explícita, selecionando blocos e registrando nota, versão, autor e revisor de origem.

Não haverá migração big-bang de Wiki ou Evoluções. A experiência será unificada primeiro; as fontes de verdade atuais permanecem.

| Domínio | Fonte de verdade |
| --- | --- |
| Conhecimento institucional | `wiki_pages` |
| Registro clínico e legal | `sessions` |
| Trabalho operacional | modelo de tarefas que alimenta a UI atual |
| Nota pessoal, de equipe e de paciente | novo módulo `notes` |

## Referências de experiência

| Referência | Aplicação no FisioFlow |
| --- | --- |
| Notion | blocos, templates, comentários, páginas, compartilhamento por pessoa/equipe |
| Obsidian | relações, backlinks, propriedades e grafo opcional para conhecimento |
| Evernote | captura, anexos, OCR e busca documental |
| OneNote | áudio, imagem, PDF e desenho/anotações visuais |
| Coda | blocos que viram tarefas e automações explícitas |
| Anytype | privacidade por padrão e offline restrito |

Não serão adotados: link público aberto para nota clínica, plugins arbitrários, grafo obrigatório para pacientes ou conversão automática de qualquer nota em prontuário.

## Navegação e tipos

Nova área `/notas`, com as visões:

```text
Recentes
Minhas notas
Compartilhadas comigo
Favoritas
Notas de pacientes
Reuniões
Protocolos e Biblioteca
Templates
Arquivadas
```

Tipos aceitos inicialmente:

```text
personal | team | patient_context | appointment | meeting |
clinical_protocol | operational | template
```

Cada nota possui título, tipo, estado, classificação, pasta/espaço, tags, favorito, autor, responsáveis, data de criação/alteração e relações com entidades.

Valores iniciais controlados:

```text
status: draft | active | under_review | archived
classification: private | team | operational | clinical
sensitivity_level: internal | patient_personal | clinical_sensitive | restricted
```

## Editor e blocos

O formato canônico de notas novas é TipTap/ProseMirror JSON. HTML e texto puro são projeções para visualização, exportação e busca; não são fonte de verdade.

Blocos iniciais:

```text
paragraph | heading | bullet_list | numbered_list | checklist | callout |
table | quote | divider | image | file | audio | video | embed |
mention | task | link | comment_anchor
```

O editor deve oferecer `/` para inserir blocos, autosave visível, histórico de versões, comentários por bloco/seleção, anexos por arrastar e soltar e conversão explícita de checklist em tarefa.

## Menções e relações

`@` abre uma busca server-side, já filtrada por autorização, agrupando:

```text
Pacientes | Pessoas | Equipes | Tarefas | Agenda | Evoluções |
Notas | Protocolos | Exercícios | Documentos
```

Menções são nós semânticos, não texto solto:

```json
{
  "type": "mention",
  "attrs": {
    "entityType": "patient",
    "entityId": "uuid",
    "label": "Maria S."
  }
}
```

Uma menção grava uma relação persistente e alimenta backlinks. Remover a menção remove ou invalida a relação derivada. Menção a pessoa pode disparar notificação neutra; menção a paciente não notifica o paciente nem concede acesso à nota.

Relações suportadas:

```text
note ↔ note | patient | appointment | session | task | document |
protocol | exercise | profile | team
```

## Integrações de produto

| Origem | Comportamento |
| --- | --- |
| Paciente | aba Notas com notas vinculadas, mencionadas e protocolos relacionados |
| Agenda | criar/abrir nota pré e pós-atendimento, vinculada a paciente e agendamento |
| Evolução | criar nota preparatória; inserir blocos selecionados em rascunho de evolução |
| Tarefas | converter bloco em uma tarefa existente, mantendo sincronização de status e backlink |
| Wiki | consumir Wiki como fonte/template; preservar URLs e editor atual na primeira fase |
| Documentos | anexar e abrir via URL temporária, com auditoria |
| Portal | publicar somente uma projeção explícita e aprovada para o paciente |

Checkbox permanece local à nota. Só se torna tarefa global se houver uma ação explícita e dados operacionais como responsável, prazo ou prioridade.

## Compartilhamento e autorização

Papéis por recurso:

```text
owner | editor | commenter | viewer | no_access
```

Capabilities separadas:

```text
view | comment | edit_content | edit_properties | share | export |
publish | manage_permissions | delete
```

Mapa mínimo de capabilities:

| Papel | Capacidades padrão |
| --- | --- |
| owner | todas |
| editor | view, comment, edit_content, edit_properties |
| commenter | view, comment |
| viewer | view |
| no_access | nenhuma |

`share`, `export`, `publish`, `manage_permissions` e `delete` exigem concessão explícita; nunca são inferidas apenas por `editor`.

Concessões podem ser para membro, equipe, cargo, organização (somente não clínica), portal ou compartilhamento temporário autenticado.

Acesso efetivo é calculado no servidor:

```text
identidade
→ organização/RLS
→ ACL da nota
→ acesso ao paciente e finalidade, se houver paciente
→ capability solicitada
```

Princípios:

- Negar por padrão e aplicar menor privilégio.
- Nota vinculada a paciente inicia `restricted` e no mínimo `clinical_sensitive`.
- Acesso ao paciente não concede acesso automático a toda nota; acesso à nota não abre o prontuário inteiro.
- Recepção, financeiro e marketing não têm acesso implícito a nota clínica.
- Compartilhamento externo de nota clínica não permite “qualquer pessoa com o link”. Se habilitado futuramente, exige destinatário autenticado, expiração, revogação, sem exportação por padrão e auditoria.
- Revogação encerra WebSockets, invalida URLs temporárias, remove resultados/backlinks/caches e bloqueia sincronização futura.

## LGPD, auditoria, IA e offline

Dados de saúde, título clínico, tags clínicas, anexos, versões, menções a paciente e embeddings são sensíveis.

Eventos mínimos de auditoria:

```text
note.create | note.view | note.update | note.archive | note.restore |
note.permission.grant | note.permission.revoke | note.share.create |
note.comment.create | note.mention.create | note.export | note.print |
note.attachment.view | note.attachment.download | note.version.restore |
note.ai.request | note.ai.source_access | note.search.execute |
note.offline.cache | note.offline.sync | note.offline.conflict |
note.convert_to_evolution | note.portal.publish | note.portal.view
```

Os logs nunca guardam o conteúdo integral. Leitura de nota/anexo, download e exportação são auditados. Notificações externas usam texto neutro e não incluem paciente, diagnóstico, título ou trecho.

IA e busca semântica:

- Notas clínicas começam com `ai_indexing_policy = disabled`.
- A autorização precede recuperação textual ou vetorial: ACL, organização, paciente, classificação e estado de publicação são filtros obrigatórios.
- Dados enviados ao modelo devem ser minimizados; não treinar com conteúdo clínico.
- IA sugere; não finaliza evolução, não prescreve, não compartilha e não modifica registro clínico sem revisão humana.
- Busca sem autorização devolve resultado neutro e não revela existência da nota.

Offline:

- Opt-in por dispositivo confiável; conteúdo criptografado e com TTL.
- Proibido persistir notas clínicas em `localStorage` ou cache HTTP compartilhado.
- Apenas rascunhos/notas previamente autorizadas; anexos sensíveis não são baixados por padrão.
- Revogação, logout e remoção de usuário disparam limpeza local quando possível.
- Conflitos nunca sobrescrevem conteúdo clínico silenciosamente.

Antes de ativar IA, links externos ou cache offline clínico, elaborar RIPD com DPO/jurídico.

## Modelo de dados

### Entidades novas

```text
notes
├── id, organization_id, parent_note_id
├── title, type, status, classification, sensitivity_level
├── patient_id?, appointment_id?, session_id?
├── owner_id, created_by, updated_by
├── canonical_json, rendered_html, plaintext
├── metadata_version, acl_version, ai_indexing_policy
├── created_at, updated_at, archived_at, deleted_at

note_revisions
├── note_id, revision_number, snapshot_json, reason
├── created_by, created_at, immutable

note_permissions
├── note_id, organization_id, principal_type, principal_id
├── capability, expires_at, granted_by, revoked_at

note_mentions
├── note_id, block_id, mention_type, target_id, display_label
├── created_by, created_at

note_relations
├── source_note_id, target_type, target_id, relation_type
├── created_by, created_at

note_comments
note_attachments
note_tasks
note_audit_logs
```

No futuro, uma camada de leitura `content_resources` pode catalogar Wiki, notas e evoluções para feed, busca e backlinks sem mover o conteúdo de origem.

## API

```http
GET    /api/notes
POST   /api/notes
GET    /api/notes/:noteId
PATCH  /api/notes/:noteId              # If-Match para metadados
DELETE /api/notes/:noteId              # soft delete/autorizado

GET    /api/notes/:noteId/revisions
POST   /api/notes/:noteId/revisions
POST   /api/notes/:noteId/restore/:revisionId

GET    /api/notes/:noteId/permissions
PUT    /api/notes/:noteId/permissions
DELETE /api/notes/:noteId/permissions/:permissionId

POST   /api/notes/:noteId/relations
POST   /api/notes/:noteId/comments
POST   /api/notes/:noteId/tasks
GET    /api/notes/:noteId/backlinks
POST   /api/notes/:noteId/collaboration-ticket
```

APIs existentes continuam intactas nesta fase: `/api/wiki/*`, `/api/evolution/*`, `/api/sessions/*` e `/api/tarefas/*`.

## Colaboração e Cloudflare Workers

O plano Workers pago será aproveitado com a infraestrutura Cloudflare já existente:

| Serviço | Uso |
| --- | --- |
| Worker Hono | autenticação, APIs, ACL, tickets de colaboração e URLs temporárias |
| Durable Object `NoteCollaboration` | uma sala `note:{noteId}` para Yjs, presença, cursores e checkpoint |
| R2 `MEDIA_BUCKET` | anexos privados em `orgs/{orgId}/patients/{patientId}/notes/...` |
| Queues | auditoria durável, extração de relações, OCR, indexação e notificações neutras |
| Workflows | processos longos de exportação, revisão/publicação para portal e limpeza/retencão |
| Hyperdrive + Neon | fonte transacional de notas, ACL, versões e relações |
| Analytics Engine | telemetria sanitizada, nunca conteúdo clínico |
| Workers AI/Vectorize | somente em índice autorizado e segregado; não para rascunhos clínicos por padrão |

Fluxo de colaboração:

```text
Editor TipTap + Y.Doc
→ POST collaboration-ticket (60–120 s, uso único)
→ WebSocket para DO note:{noteId}
→ DO valida org, nota, ACL e versão da ACL
→ awareness de presença/cursor e merge CRDT
→ checkpoint com debounce para Neon
→ revisão em ações relevantes
```

O DO deve usar WebSocket hibernável, armazenar só attachment mínimo por conexão e revalidar o ticket/ACL. Uma mudança de ACL incrementa `acl_version` e encerra sockets sem permissão. A organização recebe apenas eventos leves, sem conteúdo clínico.

## Layout aprovado

O projeto Stitch privado `FisioFlow — Notas Clínicas & Knowledge Hub` contém:

1. Central de Notas com espaços, recentes, filtros, menções e tarefas originadas em notas.
2. Editor clínico com canvas central, contexto do paciente, backlinks, comentários, versão e menções semânticas.
3. Painel de compartilhamento com equipe/membro, nível de acesso, expiração e origem da permissão.

O padrão de desktop é três colunas: navegação, editor e contexto. Em tablet, a navegação principal reduz a ícones; em mobile, os painéis viram drawers e o editor ocupa a tela.

## Entrega incremental

| Fase | Escopo | Condição de saída |
| --- | --- | --- |
| 0. Diagnóstico | inventário de Wiki/evoluções/legados e testes de contrato | fontes canônicas formalizadas |
| 1. Fundação | schema, RLS, ACL, auditoria e APIs de notas novas | nenhuma alteração em rotas existentes |
| 2. MVP Notes | editor, tipos, anexos, pacientes, tarefas, templates e compartilhamento | notas funcionam sem escrever em Wiki/Evolução |
| 3. Conexões | menções, backlinks, agenda, paciente, comentários e versões | relações aparecem nas superfícies relacionadas |
| 4. Colaboração | DO por nota, Yjs, presença e conflito offline | revogação e auditoria validadas |
| 5. Busca/IA | busca textual federada; IA/semântica opt-in | filtros de ACL testados antes da recuperação |
| 6. Legados | adaptadores e migração gradual de leitores | sem exclusão de origem até reconciliação aprovada |

## Critérios de aceite essenciais

1. Usuário sem permissão não descobre título, paciente, snippet, backlink ou existência de nota.
2. Acesso é reavaliado em leitura, WebSocket, busca, IA, anexos, versões e exportação.
3. Revogação remove acesso de UI, API, WebSocket, anexos e sincronização futura.
4. Toda abertura clínica, download, exportação e alteração de ACL tem evento auditável sem conteúdo clínico nos logs.
5. Portal mostra somente conteúdo publicado explicitamente, sem comentários/versões/metadados internos.
6. Busca textual e semântica aplicam ACL antes de recuperar e rankear.
7. Tarefa convertida de uma nota é uma única tarefa global, com backlink e sem duplicação.
8. Evolução finalizada não é alterada pela nota; toda conversão preserva origem e revisão.
9. Testes cobrem cross-tenant, ACL, escalonamento por ID, revogação durante sessão, link temporário, exportação, portal, IA e conflito offline.

## Fontes

- Notion: compartilhamento e permissões — https://www.notion.com/help/sharing-and-permissions
- Obsidian: links internos — https://obsidian.md/help/Linking%2Bnotes%2Band%2Bfiles/Internal%2Blinks
- Evernote: busca — https://help.evernote.com/hc/en-us/articles/360040282613-Search-overview
- Cloudflare: Durable Objects/WebSocket hibernation — https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
- LGPD — https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
