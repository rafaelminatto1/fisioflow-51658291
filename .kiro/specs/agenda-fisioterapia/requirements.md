# Requisitos - Sistema de Agenda para Fisioterapia

## Introdução

O sistema de agenda é o coração do FisioFlow, proporcionando uma interface centralizada estilo Outlook onde fisioterapeutas e estagiários podem gerenciar todos os agendamentos, pacientes e sessões de forma eficiente. O sistema deve permitir controle completo sobre o fluxo de trabalho diário da clínica, incluindo gestão de pagamentos, status de sessões e acesso rápido aos dados dos pacientes.

## Requisitos

### Requisito 1 - Visualização da Agenda Principal

**História do Usuário:** Como fisioterapeuta, quero visualizar uma agenda semanal estilo Outlook para ter uma visão clara de todos os agendamentos da clínica.

#### Critérios de Aceitação

1. QUANDO o usuário acessar o sistema ENTÃO o sistema DEVE exibir uma agenda semanal como tela principal
2. QUANDO a agenda for carregada ENTÃO o sistema DEVE mostrar horários de 7h às 19h em intervalos de 30 minutos
3. QUANDO for o dia atual ENTÃO o sistema DEVE destacar visualmente a coluna do dia corrente
4. QUANDO houver agendamentos ENTÃO o sistema DEVE exibir blocos coloridos com nome do paciente e horário
5. QUANDO não houver agendamentos em um horário ENTÃO o sistema DEVE mostrar o slot vazio e clicável

### Requisito 2 - Gestão de Agendamentos

**História do Usuário:** Como fisioterapeuta, quero criar, editar e cancelar agendamentos diretamente na agenda para gerenciar eficientemente os horários da clínica.

#### Critérios de Aceitação

1. QUANDO o usuário clicar em um slot vazio ENTÃO o sistema DEVE abrir um modal para criar novo agendamento
2. QUANDO criar um agendamento ENTÃO o sistema DEVE permitir selecionar paciente, data, horário e observações
3. QUANDO o usuário clicar em um agendamento existente ENTÃO o sistema DEVE abrir o modal de detalhes
4. QUANDO editar um agendamento ENTÃO o sistema DEVE permitir alterar data, horário e observações
5. QUANDO cancelar um agendamento ENTÃO o sistema DEVE solicitar confirmação e motivo do cancelamento

### Requisito 3 - Modal de Detalhes do Agendamento

**História do Usuário:** Como fisioterapeuta, quero acessar rapidamente os detalhes do paciente e controlar o status da sessão através de um modal intuitivo.

#### Critérios de Aceitação

1. QUANDO clicar em um agendamento ENTÃO o sistema DEVE abrir um modal com informações do paciente
2. QUANDO o modal abrir ENTÃO o sistema DEVE exibir nome, telefone, observações importantes do paciente
3. QUANDO no modal ENTÃO o sistema DEVE mostrar botões para "Iniciar Evolução", "Marcar como Pago", "Faltou", "Remarcar"
4. QUANDO clicar em "Iniciar Evolução" ENTÃO o sistema DEVE navegar para a tela de evolução do paciente
5. QUANDO alterar o status ENTÃO o sistema DEVE atualizar visualmente o agendamento na agenda

### Requisito 4 - Controle de Pagamentos

**História do Usuário:** Como fisioterapeuta, quero controlar os pagamentos das sessões diretamente na agenda para manter o controle financeiro atualizado.

#### Critérios de Aceitação

1. QUANDO no modal do agendamento ENTÃO o sistema DEVE exibir o valor da sessão do paciente
2. QUANDO clicar em "Marcar como Pago" ENTÃO o sistema DEVE permitir selecionar tipo de pagamento (sessão avulsa, pacote)
3. QUANDO marcar como pago ENTÃO o sistema DEVE registrar a data e forma de pagamento
4. QUANDO for pacote ENTÃO o sistema DEVE permitir informar quantas sessões foram pagas
5. QUANDO marcar pagamento ENTÃO o sistema DEVE atualizar visualmente o status na agenda

### Requisito 5 - Status de Sessões

**História do Usuário:** Como fisioterapeuta, quero marcar diferentes status para as sessões (concluída, faltou, reagendada) para manter histórico preciso.

#### Critérios de Aceitação

1. QUANDO no modal ENTÃO o sistema DEVE permitir marcar sessão como "Concluída"
2. QUANDO marcar "Faltou" ENTÃO o sistema DEVE registrar a falta e permitir observações
3. QUANDO marcar "Reagendar" ENTÃO o sistema DEVE abrir interface para selecionar nova data/horário
4. QUANDO alterar status ENTÃO o sistema DEVE aplicar cores diferentes no bloco da agenda
5. QUANDO sessão for concluída ENTÃO o sistema DEVE mostrar indicador visual de conclusão

### Requisito 6 - Acesso Multi-usuário

**História do Usuário:** Como administrador, quero que fisioterapeutas e estagiários tenham acesso a todos os pacientes e agendas para facilitar a colaboração na clínica.

#### Critérios de Aceitação

1. QUANDO fisioterapeuta acessar ENTÃO o sistema DEVE mostrar todos os agendamentos da clínica
2. QUANDO estagiário acessar ENTÃO o sistema DEVE mostrar todos os agendamentos com permissões limitadas
3. QUANDO qualquer profissional acessar ENTÃO o sistema DEVE permitir visualizar dados de todos os pacientes
4. QUANDO estagiário tentar ações administrativas ENTÃO o sistema DEVE restringir conforme permissões
5. QUANDO múltiplos usuários estiverem online ENTÃO o sistema DEVE sincronizar mudanças em tempo real

### Requisito 7 - Navegação e Filtros

**História do Usuário:** Como fisioterapeuta, quero navegar facilmente entre semanas e filtrar agendamentos para encontrar rapidamente as informações que preciso.

#### Critérios de Aceitação

1. QUANDO na agenda ENTÃO o sistema DEVE permitir navegar entre semanas com botões anterior/próximo
2. QUANDO navegar ENTÃO o sistema DEVE carregar agendamentos da semana selecionada
3. QUANDO necessário ENTÃO o sistema DEVE permitir filtrar por fisioterapeuta específico
4. QUANDO filtrar ENTÃO o sistema DEVE mostrar apenas agendamentos do profissional selecionado
5. QUANDO limpar filtros ENTÃO o sistema DEVE voltar a mostrar todos os agendamentos

### Requisito 8 - Acesso do Paciente

**História do Usuário:** Como paciente, quero visualizar apenas meus próprios agendamentos em formato de lista simples para acompanhar minhas consultas.

#### Critérios de Aceitação

1. QUANDO paciente acessar ENTÃO o sistema DEVE mostrar apenas seus próprios agendamentos
2. QUANDO paciente visualizar ENTÃO o sistema DEVE exibir lista simples com datas e horários
3. QUANDO paciente acessar ENTÃO o sistema NÃO DEVE mostrar agenda em formato de calendário
4. QUANDO paciente visualizar ENTÃO o sistema DEVE mostrar apenas informações básicas (data, horário, status)
5. QUANDO paciente tentar acessar outros dados ENTÃO o sistema DEVE restringir o acesso

### Requisito 9 - Responsividade e Performance

**História do Usuário:** Como usuário, quero que a agenda funcione bem em diferentes dispositivos e carregue rapidamente para uso eficiente no dia a dia.

#### Critérios de Aceitação

1. QUANDO acessar em tablet ENTÃO o sistema DEVE adaptar a agenda para tela menor
2. QUANDO acessar em mobile ENTÃO o sistema DEVE mostrar agenda em formato de lista diária
3. QUANDO carregar a agenda ENTÃO o sistema DEVE exibir os dados em menos de 2 segundos
4. QUANDO navegar entre semanas ENTÃO o sistema DEVE carregar nova semana em menos de 1 segundo
5. QUANDO múltiplos agendamentos ENTÃO o sistema DEVE manter performance fluida