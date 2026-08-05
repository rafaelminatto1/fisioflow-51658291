# Plano de implementação: central de notas — biblioteca conectada

1. Estender os contratos visuais de `NotesHome` e `NoteEditor` com uma ação de retorno, sem acoplar os componentes ao React Router.
2. Em `Notes.tsx`, registrar uma origem interna ao abrir Notas e resolver o retorno com fallback para `/`; proteger contra origem externa e rotas de notas.
3. Adicionar estado de espaço ativo e aplicar o escopo de espaço antes dos filtros existentes; atualizar a view model e conectar `onSelectSpace` nas duas variações de `NotesHome`.
4. Refinar a página inicial como biblioteca conectada: topo de retorno, busca, criação, coleção “Em movimento”, cartões recentes e estados vazios.
5. Adicionar o retorno no cabeçalho do editor e ajustar o layout de edição para acomodar a ação sem remover colaboração ou compartilhamento.
6. Criar/atualizar testes focados em retorno, escopo de espaços e interações principais; executar checagem de tipos e testes de notas pertinentes.
