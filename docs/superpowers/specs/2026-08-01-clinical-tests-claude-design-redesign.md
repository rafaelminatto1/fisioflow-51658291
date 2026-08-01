# Redesign da Biblioteca de Testes Clínicos

## Objetivo

Aplicar à rota web `/clinical-tests` o layout do projeto Claude Design `019e1c70-8b8d-751e-a4d5-3f0d34162504`, usando como fonte local o pacote em `claudedesign/fisioflow-design-system/project`. A implementação deve preservar o comportamento, os dados, as permissões e as integrações atuais da biblioteca clínica.

## Fonte visual

Os arquivos de referência prioritários são:

- `claudedesign/fisioflow-design-system/project/testes-clinicos-biblioteca.html` para estrutura, hierarquia e interações visuais;
- `claudedesign/fisioflow-design-system/project/ui_kits/web/testes-clinicos.html` para o padrão da tela web;
- `claudedesign/fisioflow-design-system/project/colors_and_type.css`, `styles.css` e `ui_kits/web/screen-shell.css` para tokens, tipografia, espaçamento, raios, sombras e responsividade;
- `_ds_manifest.json`, `_ds_bundle.js`, fontes e assets do pacote como referências auxiliares.

O HTML exportado é uma referência de design, não um componente a ser incorporado diretamente à aplicação.

## Escopo da implementação

### Página principal

Adaptar `src/pages/ClinicalTestsLibrary.tsx` para reproduzir a composição do Claude Design dentro do shell real do FisioFlow:

- cabeçalho compacto com título, contadores do acervo, busca e ação “Novo teste”;
- filtros de categoria e região anatômica;
- faixa obrigatória de destaque para clusters clínicos disponíveis no catálogo real;
- barra de resultados com total filtrado e indicação de curadoria; o controle de ordenação demonstrativo será omitido porque a implementação atual não possui uma regra de ordenação selecionável;
- grade responsiva de testes;
- estados de falha de sincronização, carregamento, resultado vazio e carregamento incremental.

O `PageLayout`, a navegação global e as permissões existentes permanecem sob responsabilidade do shell atual. Não será recriada a sidebar estática do HTML exportado.

### Filtros

Adaptar `src/components/clinical/ClinicalTestsFilter.tsx` mantendo:

- busca por nome, nome em inglês, articulação, categoria, objetivo e tags;
- expansão bilíngue já feita pela página;
- uma seleção estruturada ativa por vez entre categoria, região e cluster, compatível com a semântica atual de `activeFilter`;
- categorias e articulações derivadas das opções do catálogo;
- indicação correta de quantidade filtrada e total.

Atalhos visuais presentes no protótipo, como `/` para focar a busca, só serão incluídos se implementados com foco acessível e sem conflitar com campos de texto ou atalhos globais.

### Grade e cards

Adaptar `src/components/clinical/ClinicalTestsGrid.tsx` para aproximar os cards do protótipo:

- mídia clínica em destaque, com fallback quando não houver imagem;
- categoria, origem built-in/customizada e região anatômica;
- nome em português e inglês;
- objetivo clínico e até três tags;
- metadados reais de evidência e materiais de apoio;
- métricas de acurácia, cadência de reteste ou outros campos somente quando existirem no tipo `ClinicalTestCatalogRecord`;
- ação principal abrindo o modal de detalhes atual;
- estados de skeleton e vazio alinhados ao novo visual.

Não serão inventadas métricas clínicas nem valores ausentes. Elementos demonstrativos do HTML devem ser omitidos ou alimentados por dados reais.

### Clusters clínicos

A página exibirá uma faixa compacta e obrigatória alimentada por `diagnosticClusters`, de `src/data/clinicalClusters.ts`. Cada destaque mostrará nome, região, quantidade de testes e regra mínima quando disponível. Ao selecionar um cluster, a página aplicará um filtro explícito pelo `cluster_id` dos testes; selecionar novamente ou usar “limpar filtros” remove esse filtro. A seleção do cluster será visualmente identificável e deverá coexistir com a busca textual. A seleção de categoria ou região remove o cluster ativo para manter o modelo atual de um único filtro estruturado por vez.

## Comportamentos preservados

- consulta e cache com React Query;
- merge dos testes remotos com o catálogo built-in;
- busca bilíngue e filtros atuais;
- carregamento incremental com `IntersectionObserver`;
- criação, edição e exclusão de testes personalizados;
- proteção contra edição e exclusão direta de built-ins;
- modal de detalhes;
- vínculo de testes personalizados a protocolos;
- mensagens de sucesso, informação e erro;
- recuperação após erro de sincronização.

## Responsividade e acessibilidade

- desktop: grade de até três colunas e composição compacta próxima ao viewport de referência de 1320 px;
- tablet: duas colunas e filtros reorganizados sem rolagem horizontal obrigatória;
- celular: uma coluna, ações empilhadas e áreas de toque de pelo menos 44 px quando aplicável;
- controles interativos devem ser elementos semânticos, navegáveis por teclado e com foco visível;
- imagens devem manter texto alternativo; informações não podem depender apenas de cor;
- animações devem respeitar `prefers-reduced-motion` por meio dos padrões já adotados no projeto.

## Arquitetura e limites

A mudança será restrita aos componentes da biblioteca de testes e, se necessário, a pequenos componentes auxiliares no mesmo domínio. Não haverá cópia integral do design system, alteração global de tokens, substituição do shell da aplicação, mudança de API, migração de banco ou edição do catálogo clínico apenas para preencher o visual.

Os arquivos em `claudedesign` permanecem como artefatos de referência. Nenhuma mudança será feita neles durante a adaptação.

## Tratamento de erros

- erro da API mantém o catálogo built-in visível e oferece nova tentativa;
- imagem inválida deve cair no fallback visual sem quebrar o card;
- lista vazia oferece limpeza dos filtros;
- operações dos modais continuam usando as mensagens e fluxos de erro existentes.

## Verificação

- executar testes direcionados existentes para a biblioteca clínica e componentes afetados;
- executar lint e checagem de tipos nos arquivos alterados, conforme scripts disponíveis;
- adicionar ou ajustar testes de interação para busca, troca de filtro, estado vazio e abertura do detalhe quando a infraestrutura atual permitir;
- validar visualmente a rota em desktop e viewport móvel, comparando-a com os HTMLs de referência;
- confirmar que criação, edição, exclusão, modal de detalhes e vínculo a protocolo continuam acessíveis.

## Critérios de aceite

1. `/clinical-tests` apresenta a hierarquia visual e os cards do Claude Design sem incorporar o HTML estático.
2. Busca, filtros, carregamento incremental e contagens continuam corretos.
3. Dados demonstrativos do protótipo não aparecem como se fossem dados reais.
4. Todos os modais e integrações existentes continuam funcionando.
5. A página funciona em desktop e celular, com navegação por teclado e foco visível.
6. As verificações direcionadas passam ou qualquer falha preexistente é documentada separadamente.
7. A faixa de clusters usa `diagnosticClusters`, filtra a grade por `cluster_id` e permite remover a seleção sem afetar a busca textual.
