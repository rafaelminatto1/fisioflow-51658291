# Wiki Clínica — Curadoria Operacional

Data: 2026-08-02
Status: direção visual aprovada pelo usuário

## Objetivo

Transformar a Wiki Clínica em uma biblioteca organizável e governada, útil tanto
para o fisioterapeuta que consulta evidências quanto para quem administra a
qualidade do acervo. A experiência deve reduzir ruído, tornar o próximo passo
óbvio e separar confiança clínica de processamento técnico.

## Decisão de produto

A direção escolhida é **Curadoria operacional**, complementada por automações
assistivas. A fila de trabalho é o núcleo da administração; busca e coleções são o
núcleo da consulta. IA pode enriquecer metadados, sugerir relações e apontar
duplicidades, mas nenhuma sugestão altera o estado clínico sem confirmação humana.

## Perfis e autorização

### Fisioterapeuta

- consulta todo conteúdo publicado e vigente da organização;
- mantém favoritos, histórico e coleções pessoais;
- participa de coleções compartilhadas quando convidado;
- importa fontes e sugere conteúdo para triagem;
- pode comentar ou solicitar correção;
- não publica, arquiva, altera taxonomia canônica ou aprova a própria submissão.

### Capacidades editoriais

Papéis de autenticação não concedem autoridade clínica implicitamente. A API resolve
capacidades explícitas:

- `manage_library`: organiza fila, taxonomia, duplicidades e responsáveis;
- `clinical_review`: emite parecer clínico e aprova uma versão específica;
- `publish_knowledge`: publica ou despublica versão já aprovada e vigente;
- `manage_library_policy`: configura vigência, papéis e regras da organização.

Administrador pode receber capacidades administrativas, mas somente profissional
habilitado e designado recebe `clinical_review`. Publicar exige
`publish_knowledge`, não concede aprovação clínica e nunca ignora parecer ausente.
O autor/submissor de uma versão não pode aprová-la. A transição grava
`submitted_by`, `reviewer_id`, `approved_by` e valida a separação atomicamente.

Capabilities são grants organizacionais persistidos em `knowledge_capability_grants`
com `(organization_id, user_id, capability)` único, `granted_by`, `granted_at`,
`revoked_by`, `revoked_at` e justificativa. Somente `manage_library_policy` concede
ou revoga grants, sempre com auditoria. No bootstrap, o `owner` ativo mais antigo
recebe `manage_library_policy`, `manage_library` e `publish_knowledge`; não recebe
`clinical_review` automaticamente. Esse grant exige designação explícita por outro
gestor habilitado ou, enquanto não existir segundo gestor, operação de bootstrap
auditada com confirmação de credencial profissional. Ninguém concede a si próprio
`clinical_review`. Revogação vale na requisição seguinte e invalida o cache.

Controles visuais devem refletir capacidades devolvidas pela API. Toda mutação é
revalidada no backend. Esconder um botão nunca constitui autorização.

## Arquitetura da informação

### Navegação principal

1. **Consultar** — busca unificada e conteúdo clínico publicado.
2. **Coleções** — pessoais, compartilhadas e institucionais.
3. **Fontes científicas** — artigos, diretrizes e documentos importados.
4. **FisioBrain** — consulta assistida com citações verificáveis.
5. **Gestão da Biblioteca** — visível a quem possua alguma capability editorial,
   nunca pelo nome do papel.

O dicionário deixa de competir como destino principal e passa a integrar a busca
unificada, com acesso dedicado secundário. “Base Clínica”, “Artigos”, “Trilhas” e
“Explorar” deixam de representar silos equivalentes.

### Modelo de conhecimento

```text
Fonte científica
  └─ Síntese de evidência
      └─ Conteúdo clínico
          ├─ orientação clínica
          ├─ protocolo ou trilha
          ├─ teste ou critério
          └─ exercício

Todos relacionados a:
  ├─ conceitos clínicos canônicos e sinônimos
  ├─ população, condição, região e fase de cuidado
  ├─ proveniência e referências
  ├─ proprietário, revisor e organização
  └─ revisão editorial versionada
```

Coleção é agrupamento de trabalho e apresentação; não substitui a taxonomia.

## Ciclos de vida

### Estado editorial canônico por versão

Estados persistíveis: `draft`, `triage`, `clinical_review`, `changes_requested`,
`rejected`, `approved`, `published`, `review_due`, `superseded` e `archived`.
As constraints do banco usam exatamente esse conjunto; o fluxo principal é
`draft → triage → clinical_review → approved → published → review_due`, com os
desvios e retornos definidos na tabela abaixo.

- `approved` registra aprovação clínica, mas ainda não significa visibilidade.
- `published` exige aprovação válida e torna o conteúdo consultável.
- `review_due` mantém rastreabilidade e sinaliza perda de vigência; a política da
  organização decide se o conteúdo continua visível com alerta ou é ocultado.
- `archived` preserva histórico e sai da consulta padrão.

A coluna de estado pertence a `knowledge_item_versions`, permitindo uma versão
publicada coexistir com uma nova versão em elaboração. `knowledge_items` guarda
somente ponteiros e estado derivado para leitura. A aprovação referencia
`approved_version_id` imutável e a publicação referencia
`published_version_id`. Editar cria nova versão em `draft`/`triage`; a versão
publicada anterior permanece intacta até a substituta ser aprovada e publicada.
`valid_until` pertence à revisão da versão. Por padrão, conteúdo vencido sai da
busca e do FisioBrain e permanece acessível por link com alerta; política explícita
da organização pode mantê-lo nos resultados com rebaixamento e aviso.

### Estados técnicos independentes

- importação: `pending → fetching → imported | failed | cancelled`;
- indexação: `not_started → queued → processing → indexed | failed`;
- enriquecimento: `not_started → queued → processing → suggested | failed`.

Nenhum estado técnico concede confiança clínica. `organization_evidence.review_status`
é absorvido como estado editorial da associação fonte-organização, não permanece
como segunda fonte de verdade: `pending → triage`, `in_review → clinical_review`,
`verified → approved` somente se houver revisor e data auditáveis; sem ambos volta
a `triage`; `rejected → archived` com motivo; `archived → archived`. Conteúdo legado é migrado como
`triage` ou `draft`, nunca como `approved`, salvo quando já houver auditoria de
aprovação inequívoca.

### Tabela de transições editoriais

| Ação | Origem | Destino | Capability | Efeito |
| --- | --- | --- | --- | --- |
| submeter | `draft` | `triage` | autor autenticado | grava submissor |
| iniciar revisão | `triage`, `changes_requested` | `clinical_review` | `clinical_review` | atribui revisor |
| solicitar mudanças | `clinical_review` | `changes_requested` | `clinical_review` | exige parecer |
| rejeitar | `clinical_review` | `rejected` | `clinical_review` | exige parecer |
| aprovar | `clinical_review` | `approved` | `clinical_review` | define ponteiro e bloqueia autoaprovação |
| publicar | `approved` | `published` | `publish_knowledge` | troca ponteiro publicado atomicamente |
| despublicar | `published`, `review_due` | `approved` | `publish_knowledge` | remove ponteiro publicado |
| marcar vencida | `published` | `review_due` | sistema | aplica política de visibilidade |
| reabrir | `approved`, `rejected`, `review_due` | `triage` | `manage_library` | cria nova versão |
| arquivar | qualquer, exceto `published` | `archived` | `manage_library` | preserva histórico |

Arquivar versão publicada exige despublicação. Publicar substituta muda a anterior
para `superseded`, preserva auditoria e atualiza os ponteiros na mesma transação.
Toda transição usa lock ou versão otimista.

## Experiência — Consultar

A tela inicia com busca única e filtros progressivos por tipo de conteúdo, região,
condição, população, fase do cuidado, nível de evidência e validade. Resultados
distinguem claramente orientação, protocolo, teste, exercício, fonte e termo.

Cada resultado mostra apenas os sinais necessários para decidir se deve ser
aberto: tipo, título, aplicação clínica, vigência, força/nível da evidência e
origem. Detalhes editoriais aparecem em painel lateral ou tela de detalhe.

O início do fisioterapeuta contém:

- continuar de onde parou;
- favoritos reais e histórico pessoal;
- coleções próprias ou compartilhadas;
- atualizações relevantes nas áreas acompanhadas;
- nenhum painel de auditoria, fila vazia ou métrica administrativa.

## Experiência — Gestão da Biblioteca

O painel abre em uma fila compacta, não em cartões promocionais. Abas e contadores:

- Caixa de entrada;
- Em triagem;
- Em revisão clínica;
- Aguardando publicação;
- Revisão vencendo;
- Falhas técnicas;
- Arquivados.

Cada linha informa título, tipo, prioridade, responsável, prazo, proveniência,
estado editorial e estado técnico relevante. Filtros são refletidos na URL. Ações
em lote são permitidas apenas quando a mesma transição é válida para todos os itens.

Abrir um item revela painel de trabalho com:

- metadados e taxonomia;
- fonte, licença e identificadores;
- resumo clínico e limitações;
- histórico de versões e decisões;
- comentários e solicitações de mudança;
- conflitos, duplicidades e sugestões automatizadas;
- ação primária correspondente ao próximo estado válido.

## Coleções

Escopos canônicos:

- **pessoal:** somente proprietário;
- **compartilhada:** membros explícitos com papel de leitor ou editor;
- **institucional:** publicada e administrada por curadores.

Na migração, `personal` permanece `personal`; `organization` vira `shared`, com o
proprietário como editor e membros ativos da organização como leitores. Promoção a
`institutional` exige `manage_library` e publicação explícita. Durante a transição,
a API traduz os valores antigos, mas o banco novo grava apenas os canônicos.

Coleções possuem descrição, proprietário, colaboradores, capa opcional, ordem
manual, tags e data de atualização. Um item pode pertencer a várias coleções.
Remover de uma coleção não remove a fonte nem o conteúdo clínico. Exclusões são
soft-delete com restauração por 30 dias.

## Taxonomia

Criar vocabulário canônico para:

- região corporal;
- condição/diagnóstico;
- população;
- fase de cuidado;
- intervenção;
- desfecho;
- tipo de conteúdo e desenho de estudo.

Conceitos aceitam termo preferencial, inglês, sinônimos, siglas, relações e estado
editorial. Tags livres existentes permanecem pesquisáveis como aliases durante a
migração. IA pode sugerir mapeamentos, mas curador confirma criação ou fusão.

## Modelo de dados incremental

Reutilizar `evidence_resources`, `organization_evidence`, coleções e revisões do
workspace científico. Adicionar de forma aditiva:

- `knowledge_items`: entidade editorial canônica e organização;
- `knowledge_item_versions`: conteúdo versionado, autor e submissor;
- `knowledge_reviews`: transições, parecer, revisor e validade;
- `knowledge_assignments`: responsável, prazo e prioridade;
- `knowledge_concepts` e `knowledge_concept_aliases`;
- `knowledge_item_concepts`: relação tipada entre item e conceito;
- `knowledge_sources`: vínculo entre conteúdo clínico e fonte científica;
- `collection_members`: colaboradores e permissões;
- `knowledge_activity`: favoritos e histórico pessoal minimizado.

`knowledge_items` mantém `approved_version_id` e `published_version_id`; revisões
referenciam a versão e guardam `valid_until`. Uma tabela `knowledge_source_map`
registra `(source_type, source_id, organization_id, knowledge_item_id)` com origem
em `wiki_pages`, `knowledge_articles`, `evidence_resources` ou
`organization_evidence`. DOI/PMID normalizados têm precedência para fontes;
`wiki_pages.slug` preserva rotas; colisões ficam em triagem e nunca são fundidas
automaticamente. O backfill cria primeiro todas as associações
`organization_evidence` ausentes e só então monta o mapa idempotente.

Todas as tabelas de organização usam `organization_id NOT NULL`, índices iniciados
pela organização, soft-delete quando aplicável e RLS estrita. Recursos científicos
globais não recebem dados pessoais. FKs entre entidades organizacionais incluem ou
validam a organização para impedir referência cruzada.

RLS também aplica escopo de usuário: `knowledge_activity` é visível somente ao
próprio `user_id`; coleção pessoal somente ao proprietário; coleção compartilhada
somente a membro ativo; institucional publicada aos membros da organização.
Service role não é usada em requisições comuns. Testes SQL cobrem leitura, escrita e
negação entre usuários da mesma organização e entre organizações.

## Contratos de API

- `GET /api/wiki/search`: busca unificada, filtros, cursor e tipos de resultado;
- `GET /api/wiki/home`: recentes, favoritos, coleções e atualizações do usuário;
- `GET /api/wiki/capabilities`: ações permitidas e políticas editoriais;
- `GET /api/wiki/curation`: fila com facetas e contadores;
- `POST /api/wiki/items/:id/transitions`: `{ action, versionId, expectedVersion,
  reason?, validUntil? }`, transição editorial validada;
- `POST /api/wiki/items/:id/assignments`: atribuição de responsável/revisor;
- CRUD `/api/wiki/collections` e `/members`;
- CRUD `/api/wiki/taxonomy`, limitado a curadores;
- `POST /api/wiki/items/:id/suggestions/:suggestionId/accept|reject`.

Listagens usam paginação por cursor, limite padrão 20 e máximo 50. Criações e
transições aceitam `Idempotency-Key`, escopada por organização, ator, operação e
hash do payload por 24 horas. Mutações exigem `expectedVersion`; conflito retorna
`409 VERSION_CONFLICT`. Ações em lote são transações por item com resultado
individual e só aceitam uma ação que seja válida para todos; nenhuma aprovação
parcial fica oculta. Respostas seguem `{ data, error?, meta? }` e incluem
`requestId`. Acesso cruzado responde `404` sem confirmar existência.

Mapa mínimo de autorização: submeter requer usuário autenticado; atribuir e alterar
taxonomia requer `manage_library`; aprovar requer `clinical_review`, versão vigente
e revisor diferente do submissor; publicar requer `publish_knowledge` e
`approved_version_id === versionId`; arquivar requer `manage_library`. Todas as
transições inválidas retornam `409 INVALID_TRANSITION`.

## Processamento Cloudflare

- **Queue:** importação, extração, indexação, enriquecimento e retentativas.
- **Workflow:** pipeline durável importação → licença → metadados → deduplicação →
  indexação → triagem, com estado consultável.
- **Vectorize/AI Search:** busca híbrida com filtros de metadados e citações.
- **R2:** PDFs permitidos e artefatos privados, com chaves por organização.
- **AI Gateway:** observabilidade, limites, cache seguro e fallback de modelos;
  payload clínico não é registrado.
- **Analytics Engine:** tempo até encontrar conteúdo, buscas sem resultado,
  throughput e SLA de curadoria; nunca texto clínico livre.
- **Browser Rendering:** verificação programada de DOM, acessibilidade e snapshots
  visuais após deploy.

Trabalho assíncrono não bloqueia a requisição. Promises pós-resposta são enviadas a
`waitUntil`; nenhuma informação de requisição fica em estado global mutável.

## Automação assistida

Automações elegíveis:

- normalizar DOI/PMID e preencher metadados;
- detectar prováveis duplicidades;
- sugerir conceitos e aliases;
- extrair PICO, limitações e desenho do estudo;
- apontar fontes sem licença ou conteúdo sem revisão;
- preparar resumo comparativo com citações vinculadas.

Toda sugestão registra modelo, versão, fontes e horário. Aceitar ou rejeitar gera
auditoria. A IA não publica, não aprova, não substitui parecer e não escreve no
prontuário.

## LGPD, segurança e auditoria

- Não incluir paciente em coleções, taxonomia ou processamento editorial.
- Contexto do paciente permanece desligado por padrão e segue o contrato separado
  do workspace científico.
- Favoritos e histórico pertencem ao usuário, são minimizados e têm retenção
  configurável; não alimentam avaliação profissional.
- Registrar transições, mudança de permissão, exportação, consulta sensível e
  acesso administrativo com ator, organização, entidade, ação e requestId.
- Comentários livres não entram em logs, traces, métricas ou prompts sem
  sanitização explícita.
- Exportação e exclusão respeitam escopo, retenção legal e trilha de auditoria.

## Acessibilidade e responsividade

- alvo WCAG 2.2 AA;
- navegação, filas, filtros e painéis operáveis por teclado;
- estados não dependem apenas de cor;
- atualizações assíncronas usam regiões de status sem excesso de anúncios;
- tabela da fila vira lista estruturada no mobile, preservando ação e estado;
- ações críticas não ficam exclusivas em hover;
- foco retorna ao item correto ao fechar painéis e diálogos;
- safe-area e navegação inferior são respeitadas.

## Performance e métricas de sucesso

- shell útil em até 2,5 s em conexão móvel mediana;
- primeira página com no máximo 20 resultados e nenhuma lista sem paginação;
- busca local percebida abaixo de 100 ms e busca remota com feedback imediato;
- zero consultas de catálogo sem filtro de organização quando aplicável;
- busca sem resultado, tempo até abrir conteúdo, taxa de reaproveitamento,
  itens vencidos e tempo de ciclo medidos sem conteúdo clínico livre;
- metas operacionais: reduzir itens sem responsável, revisões vencidas e falhas de
  indexação; aumentar conteúdo com proveniência e validade explícitas.

## Migração e rollout

1. Proteger mutações legadas de `knowledge.ts`, `wiki.ts` e workspace com as mesmas
   capabilities e transições; anotações organizacionais viram sugestão/comentário.
2. Criar esquema canônico, versionamento, mapa de origem e APIs de leitura.
3. Completar o backfill de associações organizacionais e migrar entidades legadas
   para `draft`/`triage`, preservando IDs e URLs.
4. Tornar o modelo novo autoritativo. Escritas antigas no mesmo PostgreSQL passam
   por adaptador que grava uma outbox idempotente na mesma transação; não existe
   sincronização reversa. Fontes em outra persistência têm a escrita legada
   bloqueada ou chamam a API canônica. Eventos externos entram por inbox idempotente
   com reconciliação explícita; não se promete atomicidade entre persistências.
5. Ativar fila e consulta por feature flag para curadores internos.
6. Validar busca, autorização, RLS, contagens, reconciliação e links antigos.
7. Liberar para a organização piloto e encerrar o adaptador após sete dias sem
   divergência, zero consumidor legado e reconciliação completa.

Rollback desativa a flag e mantém leitura pelo legado; a outbox preserva as novas
escritas para replay. Nenhuma etapa destrói conteúdo. Backfill e reconciliação são
idempotentes, auditáveis e reiniciáveis.

## Fora do primeiro incremento

- edição colaborativa em tempo real;
- aprovação autônoma por IA;
- uso de dados clínicos do paciente para priorizar conteúdo automaticamente;
- publicação pública fora da organização;
- substituição integral imediata do dicionário ou do sistema de protocolos.

## Primeiro incremento aprovado

O primeiro incremento entrega somente: capabilities e proteção das rotas legadas;
modelo editorial versionado; backfill/mapeamento; fila de curadoria; detalhes com
proveniência, validade e responsável; adaptação da consulta atual para consumir o
estado canônico. Busca unificada completa, taxonomia avançada, favoritos/histórico,
novos escopos de coleção, sugestões de IA e novos Workflows ficam nos incrementos
seguintes. A infraestrutura existente continua sendo reutilizada.

## Critérios de aceite do primeiro incremento

- fisioterapeuta não vê nem executa ações de curadoria restrita;
- curador filtra e processa uma fila real com estados independentes;
- conteúdo mostra fonte, validade e responsável quando existirem;
- itens legados aparecem como não revisados, nunca falsamente aprovados;
- coleções existentes permanecem acessíveis sem ampliar permissões;
- filtros sobrevivem a recarga e URLs podem ser compartilhadas;
- transições inválidas, acesso cruzado e autoaprovação são bloqueados na API;
- desktop e mobile não apresentam overflow horizontal;
- testes cobrem autorização, RLS, transições, migração, estados vazios e falhas;
- deploy piloto inclui verificação funcional, visual e de acessibilidade.
