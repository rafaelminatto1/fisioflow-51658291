# Abrir evolução em nova aba a partir da agenda

## Objetivo

Permitir que o profissional abra diretamente a evolução clínica vinculada a um agendamento em uma nova aba, sem interromper a visualização atual da agenda.

## Decisão de produto

Adicionar a ação secundária **"Evolução"** no rodapé do popover de detalhes do agendamento. A ação abre a rota existente `/patient-evolution/:appointmentId` em uma nova aba.

## Comportamento

- A rota recebe o ID do agendamento atualmente exibido no popover.
- A evolução usa o fluxo já existente para carregar o agendamento, paciente e demais dados clínicos vinculados.
- A agenda e o popover permanecem abertos na aba de origem.
- A janela é aberta por clique direto do usuário, com as proteções `noopener,noreferrer`.
- Em telas móveis, a mesma ação fica disponível no drawer de detalhes do agendamento.

## Limites

- Não criar rotas, telas ou persistência novas.
- Não alterar o comportamento de **"Iniciar atendimento"**, edição, reagendamento ou status do agendamento.
- Não incluir criação automática de evolução nem alteração de dados clínicos.

## Validação

- Verificar que a ação monta `/patient-evolution/{appointmentId}` corretamente.
- Verificar que a nova aba é aberta com `noopener,noreferrer`.
- Verificar que a ação não fecha o popover/drawer nem navega a aba atual.
- Executar os checks de tipo e lint aplicáveis ao componente alterado.
