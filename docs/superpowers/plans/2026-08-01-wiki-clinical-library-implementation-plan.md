# Plano de implementação — Biblioteca Clínica

## Marco 1 — Shell e navegação

- Refatorar `WikiTopNav` para receber `activeView` e expor os destinos canônicos.
- Atualizar `Wiki.tsx` para normalizar `view`, sincronizar query params e renderizar o hero editorial com métricas reais.
- Preservar deep links de páginas, artigos, analytics e wiki-hub.

## Marco 2 — Dashboard e páginas

- Reorganizar o Dashboard em trilhas, catálogo editorial, triagem e painel lateral.
- Atualizar `WikiPageCard` para o padrão visual v2 e ações acessíveis.
- Preservar busca bilíngue, `#tag`, favoritos, recentes, editor, templates e exclusão confirmada.

## Marco 3 — Base Clínica e FisioBrain

- Atualizar a apresentação de `KnowledgeHubView` mantendo seu contrato e comportamentos.
- Corrigir a requisição autenticada e os estados de resposta do FisioBrain.
- Remover o fluxo duplicado de upload dentro do AI Hub, direcionando para Artigos.

## Marco 4 — Papers

- Alinhar `ScientificPapersView` ao contrato normalizado de `KnowledgeArtifact`.
- Listar apenas PDFs, diferenciar loading/erro/vazio e mostrar indexação/curadoria/evidência separadamente.
- Reutilizar `request` autenticado para upload com limite de 4 MB.

## Marco 5 — Verificação e publicação

- Adicionar ou ajustar testes direcionados para URL/views, FisioBrain e papers.
- Executar Prettier, Oxlint, TypeScript, testes direcionados e build web.
- Revisar o diff para excluir alterações alheias.
- Criar commits isolados e fazer push para `origin/main`.
