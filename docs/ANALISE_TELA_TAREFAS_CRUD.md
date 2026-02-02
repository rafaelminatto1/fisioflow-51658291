# Análise da Tela de Tarefas – Botões e CRUD

## 1. Botões na tela

### Botões necessários (mantidos)

| Local | Botão | Função |
|-------|-------|--------|
| **KanbanBoard** | Busca (Input) | Filtrar tarefas por título, descrição ou tags |
| **KanbanBoard** | Filtro Prioridade (Select) | Filtrar por BAIXA, MÉDIA, ALTA, URGENTE |
| **KanbanBoard** | Nova Tarefa | Abre modal para criar tarefa |
| **KanbanColumn** | "+" no header | Adiciona tarefa naquela coluna |
| **KanbanCard** | Menu (⋯) > Editar | Abre modal de edição |
| **KanbanCard** | Menu (⋯) > Excluir | Abre confirmação de exclusão |
| **TarefaModal** | Cancelar | Fecha sem salvar |
| **TarefaModal** | Salvar / Criar Tarefa | Submete o formulário |
| **TarefaModal** | Item (checklist) | Adiciona item ao checklist |
| **TarefaModal** | Link (anexos) | Adiciona anexo |
| **AlertDialog** | Cancelar / Excluir | Confirma ou cancela exclusão |

### Botões removidos (redundantes)

| Local | Botão removido | Motivo |
|-------|----------------|--------|
| **KanbanColumn** | "Adicionar" no empty state | O botão "+" no header da coluna já permite adicionar tarefa |

---

## 2. CRUD – Status e melhorias

### CREATE – Implementado

- **useCreateTarefa** – Mutation no hook `useTarefas`
- **TarefaModal** – Formulário para nova tarefa
- **Botões de entrada** – "Nova Tarefa", "+" em cada coluna, "Criar Tarefa" no empty state

**Melhoria aplicada:** Nova tarefa passa a usar `order_index` correto e aparece ao final da coluna, não no início.

### READ – Implementado

- **useTarefas** – Query para listar tarefas da organização
- **KanbanBoard** – Exibe colunas por status
- **KanbanCard** – Exibe título, descrição, prioridade, data, tags, checklist, anexos
- **Busca e filtro** – Por texto e prioridade

### UPDATE – Implementado

- **useUpdateTarefa** – Mutation para atualizar
- **useBulkUpdateTarefas** – Reordenação em lote (drag & drop)
- **TarefaModal** – Edição de todos os campos
- **Drag & drop** – Muda status e ordem ao arrastar entre colunas

### DELETE – Implementado

- **useDeleteTarefa** – Mutation para excluir
- **AlertDialog** – Confirmação antes de excluir
- **Menu no card** – Opção "Excluir"

---

## 3. Melhorias futuras sugeridas

1. **Responsável (assignee)** – Campo para atribuir responsável; o modelo já suporta `responsavel_id` e `responsavel`.
2. **Duplicar tarefa** – Botão no menu do card para criar cópia da tarefa.
3. **Checklist no card** – Marcar itens do checklist como concluídos diretamente no card, sem abrir o modal.
4. **Visualização detalhada** – Modal somente leitura (opcional) antes da edição.
