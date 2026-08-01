# Redesign da Wiki como Biblioteca Clínica

## Objetivo

Refatorar a rota `/wiki` para a experiência editorial “Biblioteca Clínica”, usando `claudedesign/fisioflow-design-system/project/ui_kits/web/wiki-clinica-v2.html` e `wiki-v2.css` como base visual. Padrões de `wiki-conhecimento-v3.html` só serão incorporados quando houver dados e integrações reais no produto.

A entrega deve preservar páginas internas, Knowledge Hub, FisioBrain, artigos científicos, dicionário, trilhas, editor, templates, triagem, curadoria, auditoria e links existentes.

## Princípios

- Traduzir o HTML exportado para React, Tailwind e componentes existentes; não incorporar HTML ou CSS global do protótipo.
- Exibir somente dados reais. Métricas e automações demonstrativas não serão apresentadas como funcionais.
- Manter separados os modelos `WikiPage` e `KnowledgeArticle`, bem como seus links por slug e ID.
- Melhorar a composição visual sem migrar banco, alterar schemas ou reescrever hooks e serviços fora das correções de contrato previstas.
- Manter alterações isoladas da worktree já existente.

## Arquitetura

`src/pages/Wiki.tsx` continuará como orquestrador de autenticação, hooks, estado, rotas internas e modais. A apresentação será dividida em unidades menores, cada uma com responsabilidade visual clara:

- shell/hero e navegação da Biblioteca Clínica;
- resumo e estatísticas reais;
- dashboard editorial;
- catálogo de páginas e seus cards/linhas;
- filtros da base clínica;
- painel de atividade/triagem;
- apresentação de papers e estados de indexação.

Os contratos públicos de `useWikiPages`, `useWikiTriage` e `useKnowledgeBase` devem ser preservados. `WikiEditor`, `WikiPageViewer`, `WikiTriageBoard`, `PhysioDictionaryView` e os diálogos existentes serão reutilizados.

## Navegação e estado de URL

A navegação principal terá:

- Dashboard;
- Base Clínica;
- FisioBrain;
- Artigos;
- Dicionário;
- Trilhas.

As views usarão o contrato fechado abaixo:

| Rótulo | Valor canônico | Componente/fonte | `search` na URL | Fallback |
| --- | --- | --- | --- | --- |
| Dashboard | `dashboard` ou ausência de `view` | dashboard de `Wiki.tsx`, `useWikiPages`, `useWikiTriage` | sim, alimenta `searchQuery` | dashboard vazio com ação de criar página |
| Base Clínica | `knowledge-hub` | `KnowledgeHubView` e `useKnowledgeBase` | não; mantém os filtros próprios de `kbFilters` | estado vazio/erro do Knowledge Hub |
| FisioBrain | `ai-hub` | `AIHubView` | não | estado inicial ou erro autenticado |
| Artigos | `papers` | `ScientificPapersView` | não | vazio ou erro de listagem separados |
| Dicionário | `dictionary` | `PhysioDictionaryView` | não | estado próprio do dicionário |
| Trilhas | sem `view`; dropdown abre páginas reais por slug | `getEvidenceTree` + `/wiki/:slug` | não | item oculto quando não houver raiz |

`page` continua sendo estado interno derivado de `/wiki/:slug` e nunca será gravado como `?view=page`. Valores desconhecidos de `view` serão normalizados para `dashboard`; o parâmetro desconhecido será removido da próxima atualização de navegação. `search` será preservado somente no Dashboard e removido ao mudar para outra view.

A troca entre views sincronizará a URL conforme essa tabela. Os seguintes deep links devem continuar funcionando:

- `/wiki`;
- `/wiki/:slug`;
- `/wiki/article/:id`;
- `/wiki/template-analytics`;
- `/wiki-hub/*`.

A navegação deve receber `activeView` explicitamente, evitando que Dashboard e outra view pareçam ativos ao mesmo tempo.

## Hero e busca

O topo usará um hero navy compacto, com título “Biblioteca Clínica”, descrição curta, estatísticas calculadas e ações “Sincronizar” e “Nova página”. “Sincronizar” reutilizará exclusivamente `wikiService.syncClinicalTestsToWiki(currentOrganizationId, currentUserId)`, ficará desabilitado durante `syncing` ou quando organização/usuário não estiverem disponíveis e manterá o `toast.promise` atual. “Nova página” reutilizará `handleCreatePage`.

As estatísticas e seus cálculos são fechados:

| Métrica | Fonte e cálculo | Loading/erro |
| --- | --- | --- |
| Páginas | `pages.length`, de `useWikiPages` | skeleton enquanto `isLoading`; omitir se a consulta falhar sem dados recuperados |
| Publicadas | `pages.filter(page => page.is_published).length` | mesmo estado de Páginas |
| Artigos verificados | `knowledgeStats.verified`, calculado por `useKnowledgeBase` | omitir quando a fonte do Knowledge Hub estiver indisponível; nunca inferir pelo status de indexação |
| Em triagem | `triageBuckets.backlog.length + triageBuckets["in-progress"].length` | mostrar zero apenas após as páginas carregarem; não somar curadoria de artigos |

Nenhuma métrica combinará modelos ou estados diferentes. Quando o hook não fornecer um sinal de erro próprio, a métrica será omitida durante o estado de indisponibilidade conhecido pela view correspondente.

A busca principal continuará cobrindo título, conteúdo, tags e consultas `#tag`, com expansão bilíngue. A interface não chamará essa busca de semântica. Busca semântica continuará identificada apenas nos fluxos que realmente a utilizam.

O antigo campo duplicado de busca do menu será removido ou convertido em atalho para a busca principal, sem alterar a semântica de filtros.

## Dashboard editorial

O Dashboard combinará:

- trilha raiz e trilhas de evidência geradas por `getEvidenceTree`;
- páginas favoritas/populares e recentes derivadas dos dados existentes;
- triagem real com buckets, WIP, drag-and-drop e status rápido;
- atividade recente real;
- catálogo geral agrupado por categoria.

As fontes e regras são fechadas:

- favoritas/populares: `favorites` de `useWikiPages`, definido por `view_count > 10`, limitado a cinco itens e mantendo a ordem das páginas;
- recentes: `recentPages` de `useWikiPages`, limitado a cinco itens por `updated_at` decrescente;
- atividade: `triageEvents` de `useWikiTriage`, retornado por `wikiService.listTriageEvents(organizationId, 20)`, exibindo no máximo seis itens na ordem fornecida;
- triagem: `triageBuckets`, `handleTriageDragEnd`, `handleQuickStatusChange` e os limites WIP existentes;
- ausência de favoritos, recentes, atividade ou trilhas: a seção correspondente será omitida, sem conteúdo simulado.

No desktop, o conteúdo principal terá uma coluna lateral para resumo da base, recentes e atividade. No mobile, essa coluna será posicionada abaixo do conteúdo principal.

Cards e linhas devem mostrar título, resumo limpo, categoria, tags, data ou contagem de visualizações quando real e ações acessíveis. Ações importantes não podem depender apenas de hover.

## Base Clínica / Knowledge Hub

`KnowledgeHubView` manterá o contrato atual e será reorganizado no padrão editorial v2:

- filtros por especialidade, evidência e status real;
- busca comum ou semântica claramente diferenciadas;
- lista/grade responsiva com spine cromática de evidência;
- metadados, resumo, curadoria e revisor quando disponíveis;
- modos de biblioteca e mapa existentes;
- criação, edição, exclusão, anotação, auditoria, sync e indexação preservados.

Não serão implementados diff “IA vs PubMed”, validade automática, uso por atendimento ou confiança clínica fixa.

## FisioBrain

O FisioBrain manterá resposta, fontes, trechos e relevância retornados pela API. A busca deve:

- usar o cliente autenticado ou token já adotado pela aplicação;
- validar `res.ok` e diferenciar erro, ausência de fontes e resposta válida;
- chamar score de relevância, não de confiança clínica;
- manter fontes clicáveis quando houver URL real.

Citações inline numeradas, salvamento de Q&A e promoção automática para diretriz ficam fora deste escopo por não terem contrato de backend comprovado.

## Artigos científicos e papers

`ScientificPapersView` será a experiência única de listagem/upload de papers. A aba duplicada em `AIHubView` deverá reutilizar essa view ou direcionar para `?view=papers`, sem manter um segundo upload divergente.

Correções obrigatórias:

- alinhar os campos consumidos com o contrato real (`type`, `createdAt`, `vectorStatus`, `status` e demais campos normalizados);
- não depender do filtro `?type=pdf` se a API não o respeitar; filtrar de forma coerente no cliente ou ajustar a chamada sem alterar o backend;
- separar status de indexação, status de curadoria e nível de evidência;
- exibir erro de listagem separadamente da lista vazia;
- enviar `title` e respeitar o limite real de 4 MB no upload;
- manter autenticação e organização em todas as requisições;
- oferecer busca e filtros apenas por campos existentes.

DOI, PMID, periódico, autores, ano, URL, achados e implicações podem aparecer quando presentes. Tamanho original, preview/download inexistente, número de vínculos com diretrizes e metadados não persistidos serão omitidos.

O MCP `rafalegollas` poderá ser usado durante validação e pesquisa de proveniência, mas esta entrega não adicionará uma integração automática PubMed ao produto.

### Contrato canônico de papers

- listagem: `knowledgeApi.listArticles()` ou `request("/api/knowledge/articles?limit=50")`, autenticada por `request` de `src/api/v2/base.ts`; a API aplica o tenant a partir de `requireAuth` e `user.organizationId`;
- resposta: `{ data: KnowledgeArticleRow[] }`, normalizada com os campos `id`, `organizationId`, `title`, `type`, `url`, `group`, `subgroup`, `evidenceLevel`, `status`, `tags`, `summary`, `keyFindings`, `clinicalImplications`, `vectorStatus`, `metadata`, `viewCount`, `citationCount`, `createdAt`, `updatedAt` e `createdBy`;
- papers: filtrar no cliente por `type === "pdf"`, pois a rota atual ignora `type` na query;
- upload: `POST /api/knowledge/upload-paper` via `request` com `FormData`, campos `file`, `title` e `area_clinica`; autenticação e refresh do token ficam a cargo de `request`;
- validação: `file.type === "application/pdf"`, título não vazio e tamanho máximo `4 * 1024 * 1024`, conforme a rota `apps/api/src/routes/knowledge.ts`;
- resposta de upload: `{ id, indexed, aiSearchId? }`; `indexed: false` é sucesso de persistência com indexação indisponível, enquanto HTTP não-2xx é erro;
- status de indexação: `pending | indexing | completed | error`; outros valores recebidos são apresentados como “status desconhecido”, não convertidos em sucesso;
- status de curadoria: `verified | pending | draft | archived`; outros valores recebidos são apresentados de forma neutra;
- nível de evidência é o valor informado em `evidenceLevel` e não implica verificação;
- lista vazia ocorre apenas após resposta bem-sucedida sem papers; erro de query preserva `isError`, mensagem e ação `refetch`.

## Dicionário, editor e detalhes

- `PhysioDictionaryView` permanece funcional e recebe apenas integração visual com o novo shell.
- `WikiEditor` e `WikiPageViewer` permanecem como implementações canônicas; o redesign não criará editor paralelo ou drawer fictício.
- O detalhe de artigo em `/wiki/article/:id` preserva o contrato atual e pode receber alinhamentos visuais de shell somente se necessários para consistência.
- Criação em branco e por template, validação de campos obrigatórios e versionamento otimista permanecem inalterados.

## Estados e tratamento de erros

- loading usa skeletons coerentes com a composição final;
- lista vazia informa que não há conteúdo e oferece limpar filtros;
- erro de API é mostrado com opção de tentar novamente quando houver handler real;
- upload diferencia validação de arquivo, falha de envio, processamento e indexação;
- exclusões destrutivas mantêm ou adicionam confirmação explícita;
- indisponibilidade de IA não deve apagar ou bloquear o conteúdo editorial local.

## Responsividade e acessibilidade

- navegação deve permitir rolagem horizontal controlada em telas estreitas ou menu compacto equivalente;
- controles interativos terão foco visível, nomes acessíveis e alvos adequados para toque;
- seleção de view/filtro será comunicada por estado sem depender somente de cor;
- ações de cards estarão disponíveis por teclado e touch;
- animações respeitarão `prefers-reduced-motion` através de classes `motion-safe`;
- o layout não criará rolagem horizontal de página.

## Fora do escopo

- migrações e alterações de schema;
- importação automática PubMed/Scholar;
- confiança clínica agregada;
- diff automático entre IA e artigo;
- lacunas cruzadas com atendimentos;
- trilhas com progresso individual ou por equipe;
- digest, gamificação ou Q&A persistente;
- reescrita dos hooks, serviços e modelos centrais.

## Verificação

- testes direcionados para navegação por view, query params, busca, filtros e estados vazios;
- testes direcionados para contrato de papers, erro de listagem e validação de upload;
- lint, Prettier e TypeScript nos arquivos alterados;
- build de produção do app web;
- inspeção visual em desktop e mobile;
- confirmação manual dos deep links, criação/edição, triagem, Knowledge Hub, FisioBrain, papers e dicionário.

Os fluxos existentes cobertos pela regressão são: Dashboard, Base Clínica, FisioBrain, Artigos, Dicionário, abertura de Trilhas por slug, visualização/edição/criação/exclusão de `WikiPage`, criação/edição/exclusão/anotação/auditoria de `KnowledgeArticle`, busca comum/tag/bilíngue, busca semântica do Knowledge Hub, triagem drag/drop e status rápido, upload/listagem de PDF e abertura de `/wiki/article/:id`.

## Critérios de aceite

1. `/wiki` usa a linguagem visual v2 do Claude Design, com hero, navegação e composição editorial responsivos.
2. Os destinos canônicos da tabela e os fluxos de regressão enumerados permanecem acessíveis, e somente uma view aparece ativa.
3. Deep links e query params documentados continuam funcionando.
4. Busca bilíngue, busca por tag, trilhas, triagem e CRUD de páginas não regrediram.
5. Knowledge Hub preserva filtros, busca semântica, curadoria, auditoria e CRUD.
6. FisioBrain autentica requisições e diferencia erro, ausência de fontes e resposta válida.
7. Papers usam o contrato real, mostram status correto, distinguem erro de vazio e respeitam upload de 4 MB.
8. A interface não exibe métricas nem funcionalidades mock como dados reais.
9. As verificações direcionadas, TypeScript e build passam, ou falhas preexistentes são documentadas separadamente.
