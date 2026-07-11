# Agenda Settings Revamp Plan

## 1. Contexto & Objetivos
O usuário solicitou uma revisão e aprimoramento completo da página de Configurações da Agenda (tabs).
Os principais objetivos selecionados foram:
- Melhorar o Design/UX da página (espaçamentos, organização, ícones).
- Adicionar novas opções de personalização (cores dos cards, arredondamento/bordas).
- Refatorar o código das abas para melhor performance e padronização.
- Melhorar o feedback visual de "Salvo com sucesso".

## 2. Refatoração Visual e Estrutural (UX/UI)
- **Feedback de Salvamento**: Atualmente o feedback pode ser sutil ou confuso. Vamos implementar um componente padronizado de "SaveFeedback" ou usar um toast não-intrusivo de "Alterações salvas" integrado ao botão ou no topo da seção.
- **Design System nas Abas**: Padronizar o layout usando cards menores por grupo de opções (ex: agrupar ajustes finos visuais separados dos presets), melhorar a hierarquia tipográfica e o espaçamento (`padding` e `gap`).
- **Animações de Transição**: Adicionar transições suaves ao alternar entre as tabs e nas áreas expansíveis (framer-motion ou utilitários CSS padrão do projeto).

## 3. Novas Opções de Personalização (`AparenciaTab`)
Novos controles serão adicionados ao `useAgendaAppearancePersistence` e ao `ScheduleEventContent.tsx`:
- **Tema de Cores**: Permitir que os cards sigam cores por status, por tipo de atendimento ou cores fixas. (Ex: "Pastel", "Vibrante", "Escuro").
- **Estilo de Borda/Arredondamento (Border Radius)**: Opção para cards "Mais arredondados" (pill shape) ou "Quadrados" (sharp edges).
- **Opção de Borda (Border width)**: Borda grossa à esquerda, borda completa, ou sem borda.

## 4. Refatoração de Código
- Extrair sub-componentes comuns de Formulário/Configuração em `/settings/shared`.
- Revisar a re-renderização pesada nas abas (`useAgendaAppearancePersistence` vs `useScheduleSettings`).
- Garantir que cada aba obedeça ao contrato da interface `TabComponentProps` com `registerHandle`, unificando a forma como o `isDirty` e o `isSaving` são gerenciados e notificados ao componente pai.

## 5. Fases de Execução
- [ ] **Fase 1**: Adicionar propriedades estruturais no state global (`useAgendaAppearance` / `useAgendaAppearancePersistence`) para suportar bordas e temas.
- [ ] **Fase 2**: Atualizar o `ScheduleEventContent.tsx` para consumir as novas variáveis CSS/propriedades (ex: `--agenda-card-radius`, `--agenda-card-border-style`).
- [ ] **Fase 3**: Refatorar a `AparenciaTab.tsx` para o novo design com feedback claro de salvamento (toast / debounce feedback).
- [ ] **Fase 4**: Padronizar as demais abas (`Atendimentos`, `Disponibilidade`, `Funcionamento`, `Politicas`) com o mesmo design visual unificado (mesmo estilo de seção, cabeçalhos e form fields).
