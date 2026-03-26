# Requirements Document

## Introduction

Refatoração completa da aba "Templates" na página de exercícios do FisioFlow (`/exercises?tab=templates`). O objetivo é criar um fluxo clínico intuitivo onde fisioterapeutas consigam facilmente **descobrir**, **visualizar**, **aplicar** e **personalizar** templates de exercícios para seus pacientes — substituindo o fluxo atual que não reflete a prática clínica real.

A refatoração inclui também o preenchimento da base com templates reais organizados por perfil de paciente: Ortopédico, Esportivo, Pós-operatório, Prevenção e Idosos.

## Glossary

- **Template_Manager**: Componente principal da aba de templates, responsável pela listagem, busca e navegação.
- **Template**: Conjunto de exercícios pré-configurados com metadados clínicos (condição, variante, contraindicações, progressão).
- **Template_Card**: Componente visual que representa um template na listagem.
- **Template_Detail_Panel**: Painel lateral ou modal que exibe os detalhes completos de um template selecionado.
- **Template_Apply_Flow**: Fluxo de aplicação de um template a um paciente específico, gerando um plano de exercícios.
- **Template_Create_Flow**: Fluxo de criação de um novo template personalizado pelo fisioterapeuta.
- **Patient_Profile_Category**: Agrupamento clínico de templates por perfil de paciente (Ortopédico, Esportivo, Pós-operatório, Prevenção, Idosos).
- **System_Template**: Template pré-cadastrado pelo sistema, disponível para todas as organizações como ponto de partida.
- **Custom_Template**: Template criado ou personalizado por uma organização específica.
- **Fisioterapeuta**: Usuário com papel de fisioterapeuta no sistema, principal consumidor desta feature.
- **Exercise_Plan**: Plano de exercícios gerado a partir de um template e vinculado a um paciente.

## Requirements

### Requirement 1: Navegação e Descoberta de Templates por Perfil de Paciente

**User Story:** Como fisioterapeuta, quero navegar pelos templates organizados por perfil de paciente, para encontrar rapidamente o template mais adequado para cada caso clínico.

#### Acceptance Criteria

1. THE Template_Manager SHALL exibir os templates organizados em 5 categorias de perfil de paciente: Ortopédico, Esportivo, Pós-operatório, Prevenção e Idosos.
2. WHEN o fisioterapeuta seleciona uma categoria de perfil, THE Template_Manager SHALL filtrar e exibir apenas os templates pertencentes àquela categoria.
3. THE Template_Manager SHALL exibir um contador de templates disponíveis em cada categoria.
4. WHEN nenhuma categoria está selecionada, THE Template_Manager SHALL exibir todos os templates agrupados por categoria.
5. THE Template_Manager SHALL exibir para cada Template_Card: nome do template, condição clínica alvo, número de exercícios, nível de evidência (quando disponível) e badge indicando se é System_Template ou Custom_Template.
6. WHEN o fisioterapeuta digita no campo de busca, THE Template_Manager SHALL filtrar templates em tempo real por nome, condição clínica e variante, com debounce de 300ms.

---

### Requirement 2: Visualização Rápida de Template (Preview)

**User Story:** Como fisioterapeuta, quero visualizar o conteúdo de um template sem precisar abrir um modal separado, para avaliar rapidamente se ele é adequado antes de aplicar.

#### Acceptance Criteria

1. WHEN o fisioterapeuta clica em um Template_Card, THE Template_Detail_Panel SHALL abrir exibindo os detalhes completos do template sem navegar para outra página.
2. THE Template_Detail_Panel SHALL exibir: lista de exercícios com séries/repetições, observações clínicas, contraindicações, precauções e critérios de progressão.
3. THE Template_Detail_Panel SHALL exibir um botão de ação primária "Aplicar a Paciente" visível sem necessidade de scroll.
4. WHEN o template é do tipo Pós-operatório, THE Template_Detail_Panel SHALL exibir a progressão por semanas de forma visual (linha do tempo ou tabela de fases).
5. THE Template_Detail_Panel SHALL exibir o nível de evidência científica do template quando disponível (A, B, C ou D).
6. WHEN o template não possui exercícios cadastrados, THE Template_Detail_Panel SHALL exibir uma mensagem informativa indicando que o template está vazio.

---

### Requirement 3: Fluxo de Aplicação de Template a Paciente

**User Story:** Como fisioterapeuta, quero aplicar um template diretamente a um paciente a partir da visualização do template, para criar um plano de exercícios personalizado de forma rápida.

#### Acceptance Criteria

1. WHEN o fisioterapeuta clica em "Aplicar a Paciente" no Template_Detail_Panel, THE Template_Apply_Flow SHALL iniciar um fluxo de seleção de paciente.
2. THE Template_Apply_Flow SHALL permitir buscar e selecionar um paciente pelo nome ou CPF.
3. THE Template_Apply_Flow SHALL solicitar a data de início do plano de exercícios.
4. WHEN o template selecionado é do tipo Pós-operatório e o paciente possui cirurgias cadastradas, THE Template_Apply_Flow SHALL oferecer a opção de vincular o template a uma cirurgia específica para ajuste automático de fases.
5. WHEN o fisioterapeuta confirma a aplicação, THE Template_Apply_Flow SHALL criar um Exercise_Plan vinculado ao paciente com todos os exercícios do template.
6. WHEN a criação do Exercise_Plan é concluída com sucesso, THE Template_Apply_Flow SHALL exibir uma confirmação com link direto para o plano criado no perfil do paciente.
7. IF ocorrer um erro durante a criação do Exercise_Plan, THEN THE Template_Apply_Flow SHALL exibir uma mensagem de erro descritiva e permitir nova tentativa sem perder os dados preenchidos.

---

### Requirement 4: Criação de Template Personalizado com Fluxo Claro

**User Story:** Como fisioterapeuta, quero criar um template personalizado a partir de um fluxo guiado, para organizar meus protocolos clínicos de forma estruturada.

#### Acceptance Criteria

1. THE Template_Manager SHALL exibir um botão "Criar Template" claramente visível na interface principal da aba.
2. WHEN o fisioterapeuta clica em "Criar Template", THE Template_Create_Flow SHALL apresentar um formulário em etapas: (1) Informações básicas, (2) Exercícios, (3) Informações clínicas.
3. THE Template_Create_Flow SHALL exigir no mínimo: nome do template, perfil de paciente (categoria) e condição clínica alvo.
4. THE Template_Create_Flow SHALL permitir adicionar exercícios da biblioteca existente com busca por nome e categoria.
5. WHEN o fisioterapeuta adiciona um exercício ao template, THE Template_Create_Flow SHALL permitir configurar séries, repetições e duração para aquele exercício.
6. WHEN a categoria selecionada é Pós-operatório, THE Template_Create_Flow SHALL exibir campos adicionais de semana de início e semana de fim para cada exercício.
7. THE Template_Create_Flow SHALL permitir salvar o template como rascunho antes de finalizar.
8. WHEN o template é salvo com sucesso, THE Template_Manager SHALL exibir o novo template na listagem imediatamente.

---

### Requirement 5: Personalização de Template do Sistema

**User Story:** Como fisioterapeuta, quero personalizar um System_Template existente para adaptá-lo à realidade dos meus pacientes, sem perder o template original.

#### Acceptance Criteria

1. WHEN o fisioterapeuta visualiza um System_Template no Template_Detail_Panel, THE Template_Detail_Panel SHALL exibir um botão "Personalizar" além do botão "Aplicar a Paciente".
2. WHEN o fisioterapeuta clica em "Personalizar", THE Template_Create_Flow SHALL abrir pré-preenchido com os dados do System_Template original.
3. THE Template_Create_Flow SHALL criar um novo Custom_Template vinculado à organização do fisioterapeuta, sem modificar o System_Template original.
4. THE Template_Manager SHALL diferenciar visualmente System_Templates de Custom_Templates através de badges distintos.
5. WHEN o fisioterapeuta tenta editar diretamente um System_Template, THE Template_Manager SHALL exibir uma mensagem explicando que templates do sistema não podem ser editados diretamente e oferecer a opção de personalizar.

---

### Requirement 6: Templates Pré-cadastrados por Perfil de Paciente

**User Story:** Como fisioterapeuta, quero encontrar templates prontos e clinicamente embasados para os principais perfis de pacientes, para ter um ponto de partida sólido sem precisar criar tudo do zero.

#### Acceptance Criteria

1. THE Sistema SHALL disponibilizar System_Templates pré-cadastrados para o perfil Ortopédico cobrindo no mínimo: Lombalgia, Cervicalgia, Tendinite Patelar, Fascite Plantar e Síndrome do Manguito Rotador.
2. THE Sistema SHALL disponibilizar System_Templates pré-cadastrados para o perfil Esportivo cobrindo no mínimo: Retorno ao Esporte pós-entorse de tornozelo, Fortalecimento para corredores e Prevenção de lesões em atletas.
3. THE Sistema SHALL disponibilizar System_Templates pré-cadastrados para o perfil Pós-operatório cobrindo no mínimo: Reconstrução de LCA, Prótese Total de Joelho, Prótese Total de Quadril e Reparo do Manguito Rotador.
4. THE Sistema SHALL disponibilizar System_Templates pré-cadastrados para o perfil Prevenção cobrindo no mínimo: Prevenção de quedas, Fortalecimento postural e Ergonomia para trabalhadores de escritório.
5. THE Sistema SHALL disponibilizar System_Templates pré-cadastrados para o perfil Idosos cobrindo no mínimo: Equilíbrio e marcha, Fortalecimento funcional para idosos e Mobilidade articular geral.
6. WHEN um System_Template é exibido, THE Template_Detail_Panel SHALL indicar a fonte clínica ou referência bibliográfica quando disponível.

---

### Requirement 7: Estado Vazio e Onboarding da Aba

**User Story:** Como fisioterapeuta que acessa a aba de templates pela primeira vez, quero entender o que são templates e como usá-los, para começar a utilizá-los sem precisar de treinamento externo.

#### Acceptance Criteria

1. WHEN a aba de templates é acessada e não existem Custom_Templates cadastrados para a organização, THE Template_Manager SHALL exibir um estado vazio com explicação do conceito de templates e chamada para ação.
2. THE Template_Manager SHALL sempre exibir os System_Templates disponíveis, independentemente de a organização ter Custom_Templates ou não.
3. WHEN o estado vazio é exibido, THE Template_Manager SHALL apresentar um botão "Explorar Templates do Sistema" que direciona para a listagem de System_Templates.
4. WHEN o estado vazio é exibido, THE Template_Manager SHALL apresentar um botão "Criar Meu Primeiro Template" que inicia o Template_Create_Flow.

---

### Requirement 8: Exclusão de Template com Confirmação

**User Story:** Como fisioterapeuta, quero excluir templates que não utilizo mais, com uma confirmação clara sobre o impacto da ação.

#### Acceptance Criteria

1. THE Template_Manager SHALL permitir excluir apenas Custom_Templates; System_Templates não podem ser excluídos.
2. WHEN o fisioterapeuta solicita a exclusão de um Custom_Template, THE Template_Manager SHALL exibir um diálogo de confirmação informando se o template está vinculado a planos de exercícios ativos.
3. WHEN o fisioterapeuta confirma a exclusão, THE Template_Manager SHALL remover o template e atualizar a listagem sem recarregar a página.
4. IF ocorrer um erro durante a exclusão, THEN THE Template_Manager SHALL exibir uma mensagem de erro e manter o template na listagem.
