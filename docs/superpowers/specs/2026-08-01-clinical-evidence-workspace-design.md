# Workspace Clínico Integrado — Design

Data: 2026-08-01
Status: aprovado pelo usuário

## Objetivo

Transformar a Wiki em um workspace clínico integrado para localizar, importar,
curar, comparar e consultar evidências científicas. A experiência deve reduzir
rolagem e repetição, funcionar bem em desktop e mobile e manter supervisão humana
em toda interação com IA.

## Princípios

- Evidência no ponto de uso, com autoria, data, fonte e nível sempre visíveis.
- IA sugere e resume; nunca prescreve, aplica conduta ou altera prontuário.
- Contexto do paciente é opcional, explícito, minimizado e sanitizado no servidor.
- Conteúdo integral só é armazenado quando disponibilidade e licença permitirem.
- Toda entidade pertencente à clínica respeita organização, autenticação e auditoria.
- Interfaces longas usam paginação, carregamento progressivo ou virtualização.

## Arquitetura da experiência

### Início

O Dashboard deixa de repetir o catálogo completo. Exibe busca unificada, métricas
rotuladas por domínio, itens recentes, coleções, pendências de curadoria e triagem
compacta. O hero completo existe apenas nessa tela.

### Base Clínica

Lista editorial compacta com busca, filtros, agrupamento e paginação. Um artigo
selecionado revela detalhes e ações. Especialidade, desenho do estudo, ano, nível
de evidência, curadoria e disponibilidade são filtros independentes.

### Artigos

Aceita PDF, DOI e PMID. DOI e PMID são normalizados e consultados em PubMed para
obter metadados, IDs equivalentes, PMCID e disponibilidade. O fluxo deduplica por
organização e identificadores, informa licença e envia o registro elegível para
indexação. PDF permanece limitado a 4 MB no fluxo atual.

### FisioBrain

Recebe consulta, IDs das evidências selecionadas e, opcionalmente, patientId. O
servidor monta e sanitiza o contexto clínico mínimo. A resposta cita somente as
fontes recuperadas e não modifica dados clínicos.

### Dicionário

Mantém busca bilíngue e categorias, mas renderiza resultados em lotes. Ações de
editar/excluir são acessíveis por touch, teclado e leitor de tela.

### Mobile

Páginas internas usam cabeçalho compacto. A navegação mantém rótulo no destino
ativo. Triagem vira abas; resultados usam carregamento progressivo; barras de ação
respeitam safe-area e a navegação inferior.

## Modelo de dados

Reutilizar `evidence_articles`, `knowledge_articles`, busca híbrida, indexação e
infraestrutura existente de evidência. Adicionar estruturas organizacionais:

- `evidence_collections`: nome, descrição, escopo pessoal/clínica, organização,
  proprietário e timestamps.
- `evidence_collection_items`: coleção, artigo, ordem, nota e timestamps.
- `evidence_reviews`: artigo, organização, revisor, estado, validade, observação e
  timestamps.
- `evidence_comparisons`: comparação salva opcional, organização, criador, título,
  IDs dos artigos e timestamps.

Não persistir identificação do paciente em coleções ou artigos. Consultas com
contexto podem ser auditadas por IDs e finalidade, seguindo retenção já existente,
sem duplicar conteúdo clínico.

### Isolamento físico, escopos e retenção

`evidence_articles` permanece fonte global PubMed, sem dados de paciente ou
organização. Uma nova `evidence_resources` fornece `article_id UUID` imutável e
aceita `pmid`, `doi` e `sha256` opcionais, com ao menos um identificador exigido.
Artigos PubMed existentes são backfilled e referenciados por PMID; PDFs sem PMID
usam SHA-256. Uma nova `organization_evidence` referencia
`(organization_id, article_id)` e guarda importação, indexação e curadoria da
clínica. Seu índice único torna a associação idempotente. Todas as demais tabelas
novas têm `organization_id UUID NOT NULL`, FK para a organização, índices iniciados
por `organization_id`, RLS por `current_setting('app.org_id', true)` e consultas da
API com `WHERE organization_id = user.organizationId`. FKs entre tabelas da clínica
incluem `organization_id` para impedir referências cruzadas.

Coleção `personal` é visível e editável somente pelo proprietário; administradores
não leem seu conteúdo. Coleção `organization` é visível a membros e editável pelo
proprietário ou admin. Somente proprietário/admin exclui. Ao remover um usuário,
coleções pessoais são soft-deleted e coleções da clínica passam ao primeiro admin
ativo. Coleções, comparações e revisões usam `deleted_at`, podem ser restauradas por
30 dias e depois são removidas por job. Itens filhos acompanham soft delete e
restauração atomicamente; a purga usa `ON DELETE CASCADE`. Artigos globais não são
apagados ao remover uma associação. Auditoria operacional sem patientId é retida
por cinco anos; auditoria de consulta contextual fica em tabela separada por 180
dias.

### Máquinas de estado

- Importação: `pending -> fetching -> imported | failed`; retry de `failed` volta
  a `fetching`; cancelamento só em `pending`, resultando em `cancelled`.
- Indexação: `not_started -> queued -> processing -> indexed | failed`; retry de
  `failed` volta a `queued`.
- Curadoria: `pending -> in_review -> verified | rejected | archived`; reabrir
  estado terminal exige admin e volta a `in_review`.

Qualquer profissional autenticado importa. Roles `owner`, `admin` e
`fisioterapeuta` podem promover ou rejeitar curadoria; somente `owner` e `admin`
podem reabrir ou arquivar. A API aplica `requireRole`; RLS limita organização, não
papel. Toda transição gera evento sem texto integral ou conteúdo clínico.

## Importação científica

1. Usuário informa DOI, PMID ou PDF.
2. API valida formato, autenticação e organização.
3. DOI é convertido em PMID/PMCID quando disponível.
4. PubMed fornece metadados canônicos.
5. API verifica duplicidade por PMID e DOI.
6. Disponibilidade/licença determina se apenas metadados, resumo ou texto integral
   podem ser processados.
7. Registro é persistido e enviado à indexação.
8. Interface apresenta indexação e curadoria como estados separados.

Falhas externas retornam estado recuperável e mensagem específica. Importação
duplicada retorna o registro existente. Timeout de indexação não desfaz metadados
já importados.

DOI é normalizado em lowercase, sem URL, prefixo `doi:` ou espaços. PMID aceita
somente dígitos. A associação tem unicidade por `(organization_id, article_id)`;
PMID, DOI e SHA-256 normalizados usam índices únicos parciais globais independentes.
Importação usa upsert transacional. Se DOI e
PMID existentes divergirem, marca `identifier_conflict` e exige revisão, sem merge
automático. PDF sem identificador é deduplicado por SHA-256 e organização.

PDF exige MIME e assinatura `%PDF`, máximo 4 MB e 150 páginas, passa pelo pipeline
seguro existente, rejeita arquivo criptografado/corrompido e fica em storage privado
somente durante a extração, sendo apagado em até 24 horas. Texto extraído é entrada
não confiável e nunca é interpretado como instrução do sistema.

Licença é obtida de PubMed/PMC/Europe PMC. Estados: `open_access`, `abstract_only`,
`restricted` e `unknown`. Texto integral de PMC/Europe PMC só é indexado quando a
API declara acesso aberto e licença compatível. PDF enviado pelo usuário só é
extraído/indexado após declaração explícita de direito de uso e fica privado à
organização. Sem declaração, somente hash e metadados informados são mantidos.
`abstract_only`, `restricted` e `unknown` não indexam texto integral.

## Contratos de API

Respostas usam `{ data, error?, meta? }`; erros têm `code`, mensagem segura e
`requestId`. Listagens ordenam por `updated_at DESC, id DESC`; próxima página usa
`(updated_at,id) < cursor`, página anterior inverte comparação e ordenação antes de
normalizar a resposta. O padrão é 15 e o máximo 50.
Criações aceitam `Idempotency-Key` por 24 horas, escopada por organização, ator e
operação. Repetição com o mesmo payload retorna o resultado original mesmo após
conclusão; payload diferente retorna `409 IDEMPOTENCY_CONFLICT`.

- `POST /api/evidence/import`: DOI/PMID em JSON ou PDF multipart; retorna `202`,
  `200` se duplicado, `409 IDENTIFIER_CONFLICT` ou `422` para entrada inválida.
- `GET /api/evidence/workspace`: filtros e paginação organizacional.
- `POST /api/evidence/resources/:articleId/index` e `/retry`: `202` ou
  `409 INVALID_STATE`.
- `POST /api/evidence/resources/:articleId/review`: ação, nota e validade.
- CRUD `/api/evidence/collections` e subrota `/items`, sempre org-scoped.
- `POST /api/evidence/compare`: dois a três articleIds ordenados.
- CRUD `/api/evidence/comparisons` para snapshots opcionais.
- `POST /api/evidence/ask`: consulta, articleIds e patientId opcional.

Jobs assíncronos têm status consultável na associação. Retry é idempotente. Fonte
externa falha com `502`, timeout com `504`, schema ausente com `503` e tentativa de
acesso cruzado com `404`, sem revelar existência.

## Coleções e comparação

Coleções podem ser pessoais ou compartilhadas com a clínica. Autorizações de
edição seguem proprietário/organização. A comparação aceita de dois a três
artigos e mostra população, intervenção, comparador, desfechos, desenho, tamanho
amostral, limitações, nível e conclusão. Campos ausentes são declarados como não
informados; nunca são inferidos silenciosamente.

Itens de comparação são relacionais, ordenados e protegidos por FK composta da
organização. Comparação salva guarda snapshot versionado, modelo, versão do prompt e
timestamps. Remover o artigo da clínica preserva o snapshot, mas bloqueia nova
geração. Afirmações apontam PMID/DOI quando disponíveis; PDF privado sem identificador
é citado por `article_id`, título e rótulo “documento interno da clínica”. Evidência
insuficiente produz resposta explícita sem recomendação. O servidor valida que toda
citação retornada pertence ao conjunto recuperado.

## Contexto do paciente

O seletor começa desligado. Quando habilitado, o frontend envia `patientId`, a
consulta e IDs de evidências. O backend verifica acesso ao paciente, usa
`PatientContextBuilder`, aplica minimização/sanitização e recupera evidências. A
resposta inclui aviso de apoio à decisão e exige revisão do fisioterapeuta.

Finalidade registrada: apoio à decisão em atendimento ou revisão de caso. O acesso
exige vínculo do profissional com organização e paciente. Auditoria guarda somente
organizationId, actorId, patientId, finalidade, IDs de evidências, horário, modelo
e requestId — nunca consulta livre, notas ou resumo clínico. Retenção é de 180 dias.
Conteúdo clínico não entra em logs, métricas, cache, traces ou PubMed. Provedores de
IA recebem somente contexto sanitizado para `clinical_rag_query`; falha de
sanitização bloqueia a chamada.

O payload clínico permitido contém somente faixa etária de dez anos, sexo quando
clinicamente relevante, CID-10, região corporal, queixa principal já sanitizada,
objetivos, faixa de dor, tendência agregada de desfechos e flags de contraindicação.
São removidos nome, patientId, datas exatas, data de nascimento, contatos, endereço,
profissão, nomes de familiares/profissionais e identificadores livres. A chamada
contextual usa apenas provedor contratado sem treinamento e sem retenção de prompts,
por rota configurada no AI Gateway com logging de payload desativado. Como a região
Cloudflare pode ser global, a funcionalidade exige DPA/transferência internacional
aprovada e `AI_CLINICAL_CONTEXT_ALLOWED=true`; sem essas garantias, a API não envia
contexto ao modelo e retorna busca de evidência sem personalização.

## Governança e segurança

- Autenticação obrigatória e escopo por organização em todas as rotas novas.
- Parâmetros validados com Zod e limites de paginação/tamanho.
- Consultas parametrizadas; nenhuma concatenação de SQL com entrada do usuário.
- PMID/DOI preservados para rastreabilidade.
- Fonte, licença, última revisão, revisor e validade exibidos separadamente.
- Texto integral indisponível aponta para PubMed/DOI sem contornar paywall.
- Nenhuma chamada ao PubMed recebe dados do paciente.

## Estados e erros

Cada visão diferencia carregamento, vazio, erro, retry, offline, importação,
indexação e curadoria. Ações otimistas devem ter rollback. Filtros sem resultado
oferecem limpeza completa. Erros de rede não são apresentados como ausência de
conteúdo.

## Acessibilidade

- Todos os controles possuem nome acessível e foco visível.
- Navegação ativa usa `aria-current` e rótulo textual no mobile.
- Cards navegáveis usam elemento semântico ou suporte completo de teclado.
- Ações não dependem exclusivamente de hover.
- Regiões de resultado e importação anunciam mudanças relevantes.
- Preferência de movimento reduzido é respeitada.

## Performance

- Dicionário e Base Clínica renderizam lotes de 15–24 itens.
- Componentes pesados são carregados por visão quando possível.
- Busca usa valor diferido/debounce e mantém filtros primitivos.
- Listas longas aplicam `content-visibility` ou virtualização quando compatível.
- Metadados científicos são deduplicados e cacheados no backend.

Metas: primeira interação útil abaixo de 2,5 s após o shell autenticado em conexão
móvel mediana; filtro local abaixo de 100 ms; suporte a 5.000 itens por organização
sem renderizar mais de 50 simultaneamente; nenhuma rota lista mais de 50 itens. Os
fluxos novos têm alvo WCAG 2.2 AA.

## Migração e rollout

Migração aditiva cria recursos, associações, índices e RLS sem alterar rotas atuais.
O backfill lê `knowledge_articles.organization_id`: PMID/DOI em metadata gera
recurso científico; PDF sem identificador exige cálculo de SHA-256 antes de gerar o
recurso. Conflitos entram em `identifier_conflict`; registros sem organização ficam
em relatório de órfãos e não são expostos. A compatibilidade legada termina quando
100% dos registros com organização tiverem recurso ou conflito registrado e o
relatório de órfãos estiver vazio. A UI usa feature detection durante rollout.
Rollback desliga componentes novos e mantém tabelas aditivas para evitar perda.

## Testes e aceite

- Testes de contrato para importação DOI/PMID, duplicidade e falhas externas.
- Testes de autorização e isolamento entre organizações.
- Testes de coleções, comparação e contexto sanitizado.
- Testes de navegação por URL, paginação, filtros e ações por teclado.
- TypeScript, lint, testes existentes e build de produção aprovados.
- Validação visual autenticada em 1440 px e 390 px.
- Sem overflow horizontal, erros de console ou sobreposição da barra mobile.
- Dashboard mobile sem grandes regiões vazias e páginas internas com conteúdo na
  primeira dobra.
- Duas importações concorrentes criam uma única associação.
- DOI/PMID conflitantes retornam `409` sem merge silencioso.
- Transições inválidas, retry repetido e licença desconhecida são testados.
- PDF com MIME falso, assinatura inválida, criptografia ou excesso de páginas falha
  sem persistir arquivo.
- Paciente inacessível retorna `404`; testes confirmam ausência de conteúdo clínico
  em logs, cache e chamadas externas.

## Fora do escopo desta entrega

- Alteração automática de prontuário, conduta ou prescrição.
- Monitoramento recorrente de periódicos e alertas autônomos.
- Reprodução de texto integral sem licença.
- Diagnóstico automatizado ou substituição do julgamento profissional.
