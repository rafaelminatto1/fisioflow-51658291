# Benchmark de Produto (Notion, Evernote, Linear, Obsidian)

Data: 24/02/2026
Escopo: consolidacao de referencias para evoluir o FisioFlow com foco em wiki, notas, tarefas, automacao e base de conhecimento.

## Fontes consultadas
- Notion Enterprise: https://www.notion.com/pt/enterprise
- Notion Wikis: https://www.notion.com/pt/product/wikis
- Notion Developers: https://developers.notion.com/
- Notion Guides/Documentation: https://www.notion.com/help/guides/category/documentation
- Notion Templates: https://www.notion.com/pt/templates
- Notion Releases: https://www.notion.com/pt/releases
- Evernote Developers: https://dev.evernote.com/doc/
- Evernote features (web clipper / notes / professional / pdf):
  - https://evernote.com/pt-br/features/webclipper
  - https://evernote.com/pt-br/features/notes-app
  - https://evernote.com/pt-br/professional
  - https://evernote.com/pt-br/pdf-editor
- Linear Docs: https://linear.app/docs
- Obsidian Help: https://help.obsidian.md/

## Recorte das novidades relevantes (confirmadas em 24/02/2026)
- Notion: lancamento de Custom Agents (post oficial de 24/02/2026) com automacoes multi-ferramenta e MCP.
- Notion Releases recentes de 2026: Library (18/02/2026), integracoes de busca (ex. Asana em 04/02/2026), Notion 3.2 (20/01/2026) com AI mobile e novos modelos.
- Linear changelog: filtros avancados e compartilhamento pontual de issues privadas (13/02/2026).
- Evernote: foco forte em editor de notas, annotacao PDF/imagem, busca e fluxos de captura.
- Obsidian: referencia forte em local-first, backlinks, grafo e linking de conhecimento.

## Benchmark por plataforma

### Notion (wiki + database + automacao)
Padroes de maior valor para referencia:
- Blocos composaveis com slash commands.
- Wiki conectada a bancos (docs + tasks + projetos no mesmo espaco).
- Templates operacionais para acelerar padrao de trabalho.
- Busca semantica e assistente para resposta sobre base interna.
- Automacao/eventos (webhooks e integracoes).

Aplicacao no FisioFlow:
- O projeto ja possui editor estilo Notion e base wiki; ampliar com biblioteca oficial de templates e comandos de instanciacao.
- Conectar pagina wiki <-> tarefas <-> protocolos clinicos.

### Evernote (captura e anotacao)
Padroes de maior valor:
- Captura rapida de conteudo (web clipping/conversao para nota).
- Fluxo de anotacao em PDF/imagens.
- Busca por conteudo textual + metadados.

Aplicacao no FisioFlow:
- Priorizar fluxo de upload e anotacao clinica em PDF com metadados estruturados.
- Criar pipeline de ingestao de evidencias para base de conhecimento.

### Linear (execucao de trabalho)
Padroes de maior valor:
- Triage de demandas nao planejadas.
- Workflow customizavel por status, dependencias, parent/sub-issues.
- Visoes de projeto orientadas a resultado.

Aplicacao no FisioFlow:
- Estruturar fila de melhorias/bugs clinicos em fluxo de triagem.
- Definir templates de issue e postmortem.

### Obsidian (knowledge graph)
Padroes de maior valor:
- Linking entre notas e backlinks.
- Visao em grafo para navegacao de contexto.
- Modelagem local-first e markdown-centric.

Aplicacao no FisioFlow:
- Introduzir relacoes entre paginas/protocolos/artigos.
- Reforcar navegacao semantica com referencias cruzadas.

## O que ja existe no codigo atual e favorece a estrategia
- Wiki com editor de blocos, slash menu, comments e versionamento.
- Base de conhecimento com artifacts e notas.
- Indexacao e RAG no backend (functions de knowledge indexing/query).
- Infra Firebase pronta para auth/storage/firestore/functions.

## Gap principal
- Falta um catalogo padrao de templates reutilizaveis (documentacao, protocolo, incidente, PRD, etc.) integrado ao fluxo de wiki.
- Falta unificacao de governanca (triage, ownership, revisao e auditoria de conteudo).

## Entregas implementadas nesta rodada
- Catalogo inicial de templates inspirados em praticas Notion/Linear/Evernote:
  - `src/features/wiki/templates/templateCatalog.ts`
- Utilitario para instanciar templates com variaveis e validacao de campos obrigatorios:
  - `src/features/wiki/templates/templateTransform.ts`
- Testes unitarios para garantir comportamento:
  - `src/features/wiki/templates/__tests__/templateTransform.test.ts`

## Resultado esperado
Essa base reduz tempo de criacao de pagina, melhora padronizacao operacional e acelera onboarding de time para um modelo de trabalho “wiki-first”.
