# Limite de linhas para nome do paciente nos cards da Agenda

## Objetivo

Impedir que nomes longos aumentem ou desorganizem visualmente os cards de agendamento. O nome do paciente deve ocupar no máximo três linhas e exibir reticências quando houver conteúdo além desse limite.

## Solução

Aplicar `numberOfLines={3}` e `ellipsizeMode="tail"` ao `Text` que renderiza o nome em `apps/professional-app/components/calendar/DraggableAptCard.tsx`. A regra será apenas visual: o valor completo continuará disponível no modelo e na tela de detalhes do agendamento. O ajuste vale para os cards pequenos, compactos e normais da Agenda, sem alterar dados ou comportamento de interação.

## Critérios de aceite

- Nome com até três linhas permanece legível sem alteração de conteúdo.
- Nome que ultrapassa três linhas é truncado na terceira linha com reticências.
- O status, badges e interação de arrastar/toque do card continuam funcionando.
- Não há alteração em dados, APIs ou no modelo do agendamento.
