# Central de notas: biblioteca conectada

**Data:** 2026-07-31  
**Status:** Aprovado para planejamento  
**Escopo:** Central de notas e editor de notas do FisioFlow

## Objetivo

Transformar a página inicial de Notas em uma biblioteca conectada, inspirada nos padrões de navegação de Evernote, Obsidian e Notion, sem reproduzir suas interfaces e preservando a identidade do FisioFlow. Em qualquer tela de notas, a pessoa deve conseguir retornar de forma clara ao sistema principal.

## Decisões aprovadas

- A direção visual é **Biblioteca conectada**: navegação lateral persistente, busca no conteúdo principal e cartões de notas recentes.
- O retorno ao sistema aparece na central e no editor como ação permanente “Voltar ao FisioFlow”.
- A ação retorna à última página válida do sistema. Em acesso direto, ausência de histórico ou origem externa, usa o Dashboard (`/`) como alternativa segura.
- Notas relacionadas a pacientes continuam sinalizadas como contexto clínico e não substituem a evolução clínica oficial.

## Estrutura visual

### Navegação lateral

- Identidade “FisioFlow / Notas”.
- Ação primária “Nova nota”.
- Filtros existentes: todas, recentes, compartilhadas, favoritas, notas de pacientes, templates e arquivadas.
- Seção “Espaços” com Minhas notas, Equipe e Contexto clínico, incluindo contagem de notas.

### Conteúdo principal

- Cabeçalho com ação de retorno, título da central e criação de nota.
- Busca ampla para notas, pacientes e tarefas; a filtragem local permanece imediata e a pesquisa semântica existente permanece complementar.
- Bloco “Em movimento” para notas atualizadas recentemente, em cartões que mostram título, prévia, atualização, visibilidade e indicadores úteis existentes.
- Ações secundárias para templates e arquivadas, sem competir com a criação de nota.
- Estados explícitos de carregamento, busca sem resultado e coleção vazia, sempre com uma ação para criar nota.

### Editor

- Mantém editor, colaboração, permissões e o aviso de que a nota não substitui a evolução oficial.
- O mesmo retorno ao sistema fica disponível no cabeçalho sem retirar breadcrumbs, compartilhamento ou ferramentas de contexto.

## Arquitetura e fluxo

- A página `src/pages/Notes.tsx` continuará compondo os dados e mutações já existentes.
- `NotesHome` recebe uma callback de retorno, sem acoplar o componente visual ao roteador.
- `NoteEditor` recebe a mesma callback e a posiciona no cabeçalho.
- O componente de página resolve o destino: prioriza uma origem interna válida do histórico de navegação e, caso não exista, usa `/`.
- Não haverá mudança em API, schema, permissões, busca semântica ou dados clínicos.

## Resiliência e acessibilidade

- A ação de retorno é um botão com rótulo e foco visível.
- O fallback não deve navegar para origem externa nem provocar loop para `/notes`.
- A navegação lateral permanece responsiva: em telas pequenas, os filtros continuam horizontais ou recolhíveis conforme o padrão atual.
- Estados vazios e falhas de busca terão texto objetivo e CTA acessível.

## Verificação

- Testar o destino de retorno em navegação interna e acesso direto.
- Testar criação de nota, seleção de filtros, seleção de espaços, favoritos e abertura de uma nota.
- Garantir que notas de pacientes continuam identificadas como contexto restrito.
- Rodar os testes de notas relevantes e a checagem de tipos/lint disponível no projeto.
